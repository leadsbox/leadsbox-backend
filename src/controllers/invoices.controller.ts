import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Invoice from '../models/invoice.model';
import Org from '../models/org.model';
import PaymentClaim from '../models/paymentClaim.model';
import OrgBankDetails from '../models/orgBankDetails.model';
import { generateInvoiceCode } from '../utils/invoiceCode';
import receiptService, { sendWhatsAppText } from '../service/receipt.service';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';
import { prisma } from '../lib/db/prisma';
import { generateReceiptCode } from '../utils/receiptCode';
import Receipt from '../models/receipt.model';
import { invoiceService } from '../service/invoice.service';
import {
  generateInvoiceHtml,
  generateReceiptHtml,
} from '../utils/documentTemplates';

interface InvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
}

export class InvoiceController {
  public async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const {
        orgId,
        items = [],
        currency = 'NGN',
        autoSendTo,
        contactPhone,
        sendText,
      } = req.body || {};

      const invoice = await invoiceService.create({
        orgId,
        contactPhone,
        items,
        currency,
      });

      // optionally auto-send (basic text MVP)
      if (autoSendTo && contactPhone && sendText) {
        const [bank, org] = await Promise.all([
          prisma.bankAccount.findFirst({
            where: {
              organizationId: orgId,
              isDefault: true,
            },
          }),
          prisma.organization.findUnique({
            where: { id: orgId },
          }),
        ]);

        const bankLine = bank
          ? `${bank.bankName} • ${bank.accountName} • ${bank.accountNumber}`
          : 'your bank details';

        const businessName = org?.name || 'Your Business';
        const msg = `
        Payment Invoice for: ${businessName}
        Invoice: ${invoice.code}
        Invoice Amount: ₦${invoice.total}   
        Items: ${((invoice.items as unknown as InvoiceItem[]) || [])
          .map((item) => `${item.name} ${item.qty} - ₦${item.unitPrice}`)
          .join('\n')}
        Pay to: ${bankLine}
        Confirm: ${process.env.PUBLIC_APP_URL || ''}/invoice/${invoice.code}
        
        Powered by LeadsBox
        `;

        await receiptService.sendWhatsAppText(contactPhone, msg);
      }

      ResponseUtils.success(
        res,
        { invoice },
        'Invoice created successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { orgId, amount } = req.body;
      console.log('orgId', orgId);

      const invoice = await invoiceService.confirmPayment(code);
      console.log('invoice', invoice);

      if (!invoice) {
        ResponseUtils.error(
          res,
          'Invoice not found or already processed',
          StatusCode.NOT_FOUND
        );
        return;
      }

      // TODO: Notify admin that a payment has been confirmed

      ResponseUtils.success(
        res,
        { invoice },
        'Payment confirmation received. Awaiting verification.',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { orgId } = req.body;

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

      // Create receipt
      const receipt = new Receipt({
        orgId: invoice.orgId,
        invoiceId: invoice._id,
        receiptNumber: generateReceiptCode(),
        amount: invoice.total,
        sellerName,
        buyerName: 'Customer',
      });
      await receipt.save();

      // Generate receipt URL
      const receiptUrl = `https://800281810a4d.ngrok-free.app/api/invoices/receipts/${receipt._id}`;

      // Send WhatsApp with receipt info
      if (invoice.contactPhone) {
        const receiptMsg = `
*Payment Receipt: ${receipt.receiptNumber}*

Dear Customer,

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
          url: receiptUrl,
        },
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
      const html = generateInvoiceHtml({
        code: invoice.code,
        amount: invoice.total,
        currency: invoice.currency,
        status: invoice.status,
        date: invoice.createdAt || new Date(),
        buyerName: invoice.contactPhone || 'Customer',
      });
      ResponseUtils.success(
        res,
        { invoice, bank, html },
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

      const html = generateReceiptHtml({
        amount: receipt.amount,
        currency: 'NGN',
        date: receipt.createdAt,
        sellerName: receipt.sellerName,
        buyerName: receipt.buyerName,
        receiptNumber: receipt.receiptNumber,
        sessionId: receipt._id.toString(),
      });
      ResponseUtils.success(
        res,
        {
          receipt: {
            ...receipt,
            invoiceCode: (receipt as any).invoiceId?.code,
          },
          html,
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

      const contactPhone = invoice.contactPhone;
      if (!contactPhone) {
        console.warn('No contact phone found on invoice for notification');
      }

      // Create receipt
      const receipt = await Receipt.create({
        orgId: invoice.orgId,
        invoiceId: invoice._id,
        receiptNumber: generateReceiptCode(),
        amount: invoice.total,
        sellerName: org?.name || 'Your Business',
        buyerName: 'Customer',
        items: invoice.items,
        paymentMethod: 'cash',
        reference: 'cash',
        status: 'completed',
      });

      // Send enhanced WhatsApp receipt
      if (invoice.contactPhone) {
        const receiptMsg = `
*Payment Receipt: ${receipt.receiptNumber}*

Dear Customer,

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
          invoice: invoice,
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
