import { prisma, InvoiceStatus, Prisma } from '../lib/db/prisma';
import { sendWhatsAppText, receiptService } from './receipt.service';

export class PaymentClaimService {
  async createClaim(data: {
    orgId: string;
    invoiceCode: string;
    amount: number;
    refText?: string;
    payerBank?: string;
    payerName?: string;
    proofFileUrl?: string;
    source?: string;
  }) {
    const {
      orgId,
      invoiceCode,
      amount,
      refText,
      payerBank,
      payerName,
      proofFileUrl,
      source = 'buyer',
    } = data;

    const invoice = await prisma.invoice.findFirst({
      where: { organizationId: orgId, code: invoiceCode },
    });
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    return prisma.paymentClaim.create({
      data: {
        organizationId: orgId,
        invoiceId: invoice.id,
        amountClaimed: amount,
        refText,
        payerBank,
        payerName,
        proofFileUrl,
        source,
      },
    });
  }

  async getPendingClaims(orgId: string) {
    return prisma.paymentClaim.findMany({
      where: { organizationId: orgId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      include: { invoice: true },
    });
  }

  async approveClaim(data: {
    id: string;
    orgId: string;
    approvedBy: string;
  }) {
    const { id, orgId, approvedBy } = data;
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const claim = await tx.paymentClaim.findFirst({
        where: { id, organizationId: orgId },
        include: { invoice: true, organization: true },
      });
      if (!claim) {
        throw new Error('Claim not found');
      }

      const updatedClaim = await tx.paymentClaim.update({
        where: { id },
        data: {
          status: 'approved',
          approvedBy,
          approvedAt: new Date(),
        },
        include: { invoice: true, organization: true },
      });

      const invoice = await tx.invoice.update({
        where: { id: claim.invoiceId },
        data: { status: InvoiceStatus.PAID },
        include: { organization: true },
      });

      const receipt = await receiptService.create({
        orgId: invoice.organizationId,
        invoiceId: invoice.id,
        amount: invoice.total,
        sellerName: invoice.organization.name,
        buyerName: claim.payerName || 'Customer',
      });

      if (invoice.contactPhone) {
        const receiptUrl = `${process.env.PUBLIC_APP_URL || ''}/api/invoices/receipts/${receipt.id}`;
        const msg = `Payment Receipt: ${receipt.receiptNumber}\n\nYour payment of ₦${invoice.total} to ${invoice.organization.name} for invoice ${invoice.code} has been confirmed.\n\nView your receipt: ${receiptUrl}\n\nThank you for your business!`;
        await sendWhatsAppText(invoice.contactPhone, msg);
      }

      return { claim: updatedClaim, invoice, receipt };
    });
  }

  async rejectClaim(data: {
    id: string;
    orgId: string;
    rejectedBy: string;
    rejectionReason?: string;
  }) {
    const { id, orgId, rejectedBy, rejectionReason } = data;
    return prisma.paymentClaim.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectedBy,
        rejectedAt: new Date(),
        rejectionReason,
      },
    });
  }
}

export const paymentClaimService = new PaymentClaimService();
