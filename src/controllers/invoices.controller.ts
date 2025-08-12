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
Invoice ${code} ${businessName} — ₦${total}
Pay to ${bankLine}
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
      ResponseUtils.success(
        res,
        { ok: true },
        'Claim approved successfully',
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
