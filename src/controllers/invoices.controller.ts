import { Request, Response } from 'express';
import { invoiceService } from '../service/invoice.service';
import { receiptService, sendWhatsAppText } from '../service/receipt.service';
import { paymentClaimService } from '../service/paymentClaim.service';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';

export class InvoiceController {
  public async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const {
        orgId,
        items = [],
        currency = 'NGN',
        contactPhone,
        autoSendTo,
        sendText,
      } = req.body || {};

      const invoice = await invoiceService.create({
        orgId,
        items,
        currency,
        contactPhone,
      });

      if (autoSendTo && contactPhone && sendText) {
        await sendWhatsAppText(contactPhone, sendText);
      }

      ResponseUtils.success(
        res,
        { invoice },
        'Invoice created successfully',
        StatusCode.CREATED
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      const { amount } = req.body;
      const result = await invoiceService.confirmPayment(code, Number(amount));
      ResponseUtils.success(
        res,
        result,
        'Payment confirmed successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async verifyPayment(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.header('x-org-id');
      if (!orgId) {
        return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      }
      const { code } = req.params;
      const { amount } = req.body;
      const result = await invoiceService.verifyPayment(
        code,
        Number(amount),
        orgId
      );
      ResponseUtils.success(
        res,
        result,
        'Payment verification result',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async getInvoice(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.header('x-org-id');
      if (!orgId) {
        return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      }
      const result = await invoiceService.getByCode(req.params.code, orgId);
      if (!result) {
        return ResponseUtils.error(res, 'Invoice not found', StatusCode.NOT_FOUND);
      }
      ResponseUtils.success(
        res,
        result,
        'Invoice retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async createClaim(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.header('x-org-id');
      if (!orgId) {
        return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      }
      const claim = await paymentClaimService.createClaim({
        orgId,
        invoiceCode: req.params.code,
        amount: Number(req.body.amount),
        refText: req.body.refText,
        payerBank: req.body.payerBank,
        payerName: req.body.payerName,
        proofFileUrl: req.body.proofFileUrl,
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
      const orgId = req.header('x-org-id');
      if (!orgId) {
        return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      }
      const items = await paymentClaimService.getPendingClaims(orgId);
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
      const orgId = req.header('x-org-id');
      if (!orgId) {
        return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      }
      const result = await paymentClaimService.approveClaim({
        id: req.params.id,
        orgId,
        approvedBy: req.body.approvedBy,
      });
      ResponseUtils.success(
        res,
        result,
        'Payment verified and receipt sent successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async rejectClaim(req: Request, res: Response): Promise<void> {
    try {
      const orgId = req.header('x-org-id');
      if (!orgId) {
        return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
      }
      const claim = await paymentClaimService.rejectClaim({
        id: req.params.id,
        orgId,
        rejectedBy: req.body.rejectedBy,
        rejectionReason: req.body.rejectionReason,
      });
      ResponseUtils.success(
        res,
        { claim },
        'Claim rejected successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  public async getReceipt(req: Request, res: Response): Promise<void> {
    try {
      const receipt = await receiptService.getById(req.params.receiptId, {
        invoice: true,
        organization: true,
      });
      if (!receipt) {
        return ResponseUtils.error(res, 'Receipt not found', StatusCode.NOT_FOUND);
      }
      ResponseUtils.success(
        res,
        { receipt },
        'Receipt retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}

export const InvoiceCtrl = new InvoiceController();
