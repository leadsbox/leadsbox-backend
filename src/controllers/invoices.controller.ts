import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Invoice from '../models/invoice.model';
import Org from '../models/org.model';
import PaymentClaim from '../models/paymentClaim.model';
import OrgBankDetails from '../models/orgBankDetails.model';
import { generateInvoiceCode } from '../utils/invoiceCode';
import { sendWhatsAppText } from '../service/receipt.service';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';
import { generateReceiptCode } from '../utils/receiptCode';
import Receipt from '../models/receipt.model';
import { LeadModel } from '../models/leads.model';
import { UserModel } from '../models/user.model';

export class InvoiceController {
  public async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const orgIdHeader = req.header('x-org-id');
      if (!orgIdHeader)
        ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      const orgId = new Types.ObjectId(orgIdHeader);
      const {
        contactId,
        items = [],
        currency = 'NGN',
        autoSendTo,
        contactPhone,
        sendText,
      } = req.body || {};

      const subtotal = items.reduce(
        (s: number, it: any) => s + (it.qty ?? 1) * Number(it.unitPrice),
        0
      );
      const total = subtotal;
      let code: string;

      // ensure uniqueness per org
      while (true) {
        code = generateInvoiceCode();
        const exists = await Invoice.findOne({ orgId, code });
        if (!exists) break;
      }

      const invoice = await Invoice.create({
        orgId,
        contactId,
        contactPhone,
        code,
        currency,
        items,
        subtotal,
        total,
        status: 'sent',
      });

      // optionally auto-send (basic text MVP)
      if (autoSendTo && contactPhone && sendText) {
        const bank = await OrgBankDetails.findOne({ orgId }).lean();
        const bankLine = bank
          ? `${bank.bankName} • ${bank.accountName} • ${bank.accountNumber}`
          : 'your bank details';
        const org = await Org.findById(orgId).lean();
        const businessName = org?.name || 'Your Business';
        const msg = `
Invoice ${code} for ${businessName}
Amount: ₦${total}
Pay to: ${bankLine}
Narration: ${code}
Confirm: ${process.env.PUBLIC_APP_URL || ''}/invoice/${code}

Powered by LeadsBox`;
        const sentToWhatsApp = await sendWhatsAppText(contactPhone, msg);
        console.log('sentToWhatsApp', sentToWhatsApp);
      }

      res.json({ ok: true, invoice });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  public async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const orgId = req.header('x-org-id');

      const invoice = await Invoice.findOneAndUpdate(
        { code, orgId, status: { $in: ['sent', 'viewed'] } },
        { status: 'pending_confirmation' },
        { new: true }
      );
      console.log('invoice', invoice)

      if (!invoice) {
        res
          .status(404)
          .json({ error: 'Invoice not found or already processed' });
        return;
      }

      // TODO: Notify admin that a payment has been confirmed

      res.json({
        ok: true,
        message: 'Payment confirmation received. Awaiting verification.',
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  public async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const orgId = req.header('x-org-id');

      const invoice = await Invoice.findOneAndUpdate(
        { code, orgId, status: 'pending_confirmation' },
        { status: 'paid' },
        { new: true }
      );

      if (!invoice) {
        res
          .status(404)
          .json({ error: 'Invoice not found or not pending confirmation' });
        return;
      }

      // Get business and customer info
      const org = await Org.findById(orgId).lean();
      const sellerName = org?.name || 'Your Business';
      
      // Get buyer name from Lead and User models
      let buyerName = 'Valued Customer';
      try {
        // First try to find the lead using contactId
        const lead = await LeadModel.findOne({ _id: invoice.contactId }).lean();
        
        // If no lead found by _id, try to find by conversationId as a fallback
        const foundLead = lead || await LeadModel.findOne({ conversationId: invoice.contactId }).lean();
        
        if (foundLead?.userId) {
          const user = await UserModel.findById(foundLead.userId).lean();
          if (user?.username) {
            buyerName = user.username;
          } else if (user?.email) {
            buyerName = user.email.split('@')[0]; // Use email prefix if username not available
          }
        } else if (foundLead?.providerId) {
          // If no userId but we have providerId, use that as the name
          buyerName = `Customer ${foundLead.providerId.substring(0, 6)}`;
        }
      } catch (e) {
        console.error('Error fetching buyer info:', e);
      }

      // Create receipt
      const receipt = new Receipt({
        orgId: invoice.orgId,
        invoiceId: invoice._id,
        contactId: invoice.contactId,
        receiptNumber: generateReceiptCode(),
        amount: invoice.total,
        sellerName,
        buyerName,
      });
      await receipt.save();

      // Generate receipt URL
      const receiptUrl = `https://800281810a4d.ngrok-free.app/api/invoices/receipts/${receipt._id}`;

      // Send WhatsApp with receipt info
      if (invoice.contactPhone) {
        const receiptMsg = `
*Payment Receipt: ${receipt.receiptNumber}*

Dear ${buyerName},

Your payment of ₦${invoice.total} to ${sellerName} for invoice ${invoice.code} has been confirmed.

View your receipt: ${receiptUrl}

Thank you for your business!

Powered by LeadsBox`;
        await sendWhatsAppText(invoice.contactPhone, receiptMsg);
      }

      res.json({ 
        ok: true, 
        invoice,
        receipt: {
          id: receipt._id,
          number: receipt.receiptNumber,
          url: receiptUrl
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  public async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const orgIdHeader = req.header('x-org-id');
      if (!orgIdHeader)
        ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      const orgId = new Types.ObjectId(orgIdHeader);
      const invoice = await Invoice.findOne({
        orgId,
        code: req.params.code,
      }).lean();
      if (!invoice)
        return ResponseUtils.error(
          res,
          'Invoice not found',
          StatusCode.NOT_FOUND
        );
      const bank = await OrgBankDetails.findOne({ orgId }).lean();
      ResponseUtils.success(
        res,
        { invoice, bank },
        'Invoice retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async createClaim(req: Request, res: Response): Promise<void> {
    try {
      const orgIdHeader = req.header('x-org-id');
      if (!orgIdHeader)
        ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      const orgId = new Types.ObjectId(orgIdHeader);
      const invoice = await Invoice.findOne({ orgId, code: req.params.code });
      if (!invoice) {
        ResponseUtils.error(res, 'Invoice not found', StatusCode.NOT_FOUND);
        return;
      }
      const claim = await PaymentClaim.create({
        orgId,
        invoiceId: invoice._id,
        amountClaimed: Number(req.body.amount),
        refText: req.body.refText,
        payerBank: req.body.payerBank,
        payerName: req.body.payerName,
        proofFileUrl: req.body.proofFileUrl,
        source: 'buyer',
      });
      ResponseUtils.success(
        res,
        { claim },
        'Claim created successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async getVerifyQueue(req: Request, res: Response): Promise<void> {
    try {
      const orgIdHeader = req.header('x-org-id');
      if (!orgIdHeader)
        ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      const orgId = new Types.ObjectId(orgIdHeader);
      const items = await PaymentClaim.find({ orgId, status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      ResponseUtils.success(
        res,
        { items },
        'Verify queue retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const { receiptId } = req.params;
      const receipt = await Receipt.findById(receiptId)
        .populate('invoiceId', 'code')
        .lean();

      if (!receipt) {
        ResponseUtils.error(res, 'Receipt not found', StatusCode.NOT_FOUND);
        return;
      }

      ResponseUtils.success(
        res,
        {
          receipt: {
            ...receipt,
            invoiceCode: (receipt as any).invoiceId?.code
          }
        },
        'Receipt retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async approveClaim(req: Request, res: Response): Promise<void> {
    try {
      const orgIdHeader = req.header('x-org-id');
      if (!orgIdHeader)
        ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      const orgId = new Types.ObjectId(orgIdHeader);
      const claim = await PaymentClaim.findById(req.params.id);
      if (!claim) {
        ResponseUtils.error(res, 'Claim not found', StatusCode.NOT_FOUND);
        return;
      }
      if (claim.orgId.toString() !== orgId.toString()) {
        ResponseUtils.error(res, 'Unauthorized', StatusCode.UNAUTHORIZED);
        return;
      }

      await claim.updateOne({
        status: 'approved',
        approvedBy: req.body.approvedBy,
        approvedAt: new Date(),
      });

      const invoice = await Invoice.findById(claim.invoiceId);
      if (!invoice) {
        ResponseUtils.error(res, 'Invoice not found', StatusCode.NOT_FOUND);
        return;
      }

      await invoice.updateOne({ status: 'paid' });
      
      // Fetch seller and buyer names
      const org = await Org.findById(orgId).lean();
      const sellerName = org?.name || 'Your Business';

      const lead = await LeadModel.findById(invoice.contactId);
      let buyerName = 'Valued Customer'; // Default name
      if (lead) {
        const user = await UserModel.findById(lead.userId);
        if (user && user.username) {
          buyerName = user.username;
        }
      }

      // Create and save the receipt
      const receipt = new Receipt({
        orgId: invoice.orgId,
        invoiceId: invoice._id,
        contactId: invoice.contactId,
        receiptNumber: generateReceiptCode(),
        amount: invoice.total,
        sellerName: sellerName,
        buyerName: buyerName,
      });
      await receipt.save();

      // Send enhanced WhatsApp receipt
      if (invoice.contactPhone) {
        const receiptMsg = `
*Payment Receipt: ${receipt.receiptNumber}*

Dear ${buyerName},

Your payment of ₦${invoice.total} to ${sellerName} for invoice ${invoice.code} has been confirmed.

Thank you for your business!

Powered by LeadsBox`;
        await sendWhatsAppText(invoice.contactPhone, receiptMsg);
      }

      // Generate the receipt URL
      const receiptUrl = `https://800281810a4d.ngrok-free.app/api/invoices/receipts/${receipt._id}`;
      
      ResponseUtils.success(
        res,
        { 
          ok: true, 
          receiptNumber: receipt.receiptNumber,
          receiptUrl,
          receiptId: receipt._id,
          invoice: invoice
        },
        'Payment verified and receipt sent successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async rejectClaim(req: Request, res: Response): Promise<void> {
    try {
      const orgIdHeader = req.header('x-org-id');
      if (!orgIdHeader)
        ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      const orgId = new Types.ObjectId(orgIdHeader);
      const claim = await PaymentClaim.findById(req.params.id);
      if (!claim) {
        ResponseUtils.error(res, 'Claim not found', StatusCode.NOT_FOUND);
        return;
      }
      if (claim.orgId.toString() !== orgId.toString()) {
        ResponseUtils.error(res, 'Unauthorized', StatusCode.UNAUTHORIZED);
        return;
      }

      await claim.updateOne({
        status: 'rejected',
        rejectedBy: req.body.rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: req.body.rejectionReason,
      });
      ResponseUtils.success(
        res,
        { ok: true },
        'Claim rejected successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}

export const InvoiceCtrl = new InvoiceController();
