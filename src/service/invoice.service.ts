import { InvoiceStatus, Prisma, prisma } from '../lib/db/prisma';
import { generateInvoiceCode } from '../utils/invoiceCode';

// Define types based on Prisma schema
export type Invoice = Prisma.InvoiceGetPayload<{
  include: {
    organization: true;
    receipts: true;
  };
}>;

export type Receipt = Prisma.ReceiptGetPayload<{
  include: {
    invoice: true;
    organization: true;
  };
}>;

type InvoiceWithOrgReceipts = Prisma.InvoiceGetPayload<{
  include: { organization: true; receipts: true };
}>;

type BankAccountWithOrg = Prisma.BankAccountGetPayload<{
  include: { organization: true };
}>;

export type Organization = Prisma.OrganizationGetPayload<{
  include: {
    owner: true;
    bankAccounts: true;
  };
}>;

type InvoiceWithOrgAndReceipts = Prisma.InvoiceGetPayload<{
  include: {
    organization: true;
    receipts: {
      orderBy: { createdAt: 'desc' };
      take: 1;
      include: { organization: true; invoice: true };
    };
  };
}>;

type ReceiptWithOrgAndInvoice = Prisma.ReceiptGetPayload<{
  include: { organization: true; invoice: true };
}>;

// Type for invoice items
interface InvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
}

type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: {
    organization: true;
    receipts: true;
  };
}>;

class InvoiceService {
  /**
   * Create a new invoice
   */
  async create(data: {
    orgId: string;
    contactPhone?: string;
    items: InvoiceItem[];
    currency?: string;
  }): Promise<InvoiceWithRelations> {
    const { orgId, items, currency = 'NGN' } = data;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    if (!org) {
      throw new Error('Organization not found');
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.qty * item.unitPrice,
      0
    );
    const total = subtotal;

    let code: string;
    while (true) {
      code = generateInvoiceCode();
      const exists = await prisma.invoice.findFirst({
        where: { organizationId: orgId, code },
        select: { id: true },
      });
      if (!exists) break;
    }

    return prisma.invoice.create({
      data: {
        organizationId: orgId, // <-- use organizationId
        contactPhone: data.contactPhone ?? null,
        code,
        currency,
        items: items as unknown as Prisma.InputJsonValue, // JSON column
        subtotal,
        total,
        status: InvoiceStatus.SENT,
      },
      include: {
        organization: true,
        receipts: true,
      },
    });
  }

  /**
   * Get an invoice by code with organization details
   */
  async getByCode(
    code: string,
    orgId: string
  ): Promise<{
    invoice: InvoiceWithOrgReceipts;
    bankAccount?: BankAccountWithOrg | null;
  } | null> {
    // Use the compound unique constraint for lookup
    const invoice = await prisma.invoice.findUnique({
      where: {
        organizationId_code: {
          code,
          organizationId: orgId, // <- correct field name
        },
      },
      include: {
        organization: true,
        receipts: true,
      },
    });

    if (!invoice) return null;

    // Get default bank account (include organization to match the return type)
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        organizationId: invoice.organizationId, // <- correct field name
        isDefault: true,
      },
      include: { organization: true },
    });

    return { invoice, bankAccount };
  }

  /**
   * Confirm payment for an invoice
   */
  async confirmPayment(
    code: string,
    amount: number
  ): Promise<{ invoice: Invoice; receipt: Receipt }> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update invoice status
      // First find the invoice to get its ID
      const existingInvoice = await tx.invoice.findFirst({
        where: { code },
        select: { id: true, organizationId: true },
      });

      if (!existingInvoice) {
        throw new Error('Invoice not found');
      }

      const invoice = await tx.invoice.update({
        where: {
          id: existingInvoice.id,
          organizationId: existingInvoice.organizationId,
        },
        data: {
          status: 'PAID' as const,
          // Add payment date or other relevant fields
        },
        include: {
          organization: true,
          receipts: true,
        },
      });

      // 2. Create receipt
      const receipt = await tx.receipt.create({
        data: {
          organization: { connect: { id: invoice.organizationId } },
          invoice: { connect: { id: invoice.id } },
          amount,
          receiptNumber: `RCPT-${Date.now()}`,
          sellerName: invoice.organization.name,
          buyerName: invoice.contactPhone || 'Customer',
        },
        include: {
          invoice: true,
          organization: true,
        },
      });

      return { invoice, receipt };
    });
  }

  /**
   * Verify payment status
   */
  async verifyPayment(
    code: string,
    amount: number,
    orgId: string
  ): Promise<{
    invoice: InvoiceWithOrgAndReceipts | null;
    isPaid: boolean;
    status: 'NOT_FOUND' | 'PENDING' | 'PAID';
    receipt?: ReceiptWithOrgAndInvoice;
  }> {
    const invoice = await prisma.invoice.findUnique({
      where: { organizationId_code: { code, organizationId: orgId } },
      include: {
        organization: true,
        receipts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { organization: true, invoice: true },
        },
      },
    });

    if (!invoice) {
      return { invoice: null, isPaid: false, status: 'NOT_FOUND' };
    }

    // If you truly want total paid, fetch all receipts (separate query) or remove take:1 above.
    // Here we'll compute from all (cheapest is a second query):
    const receiptsSum = await prisma.receipt.aggregate({
      _sum: { amount: true },
      where: { invoiceId: invoice.id },
    });
    const totalPaid = receiptsSum._sum.amount ?? 0;

    const isPaid = totalPaid >= invoice.total;
    const status: 'PENDING' | 'PAID' = isPaid ? 'PAID' : 'PENDING';

    return {
      invoice,
      isPaid,
      status,
      receipt: invoice.receipts[0], // now has organization & invoice included
    };
  }

  /**
   * Update invoice status
   */
  async updateStatus(
    code: string,
    status: InvoiceStatus,
    orgId: string
  ): Promise<Invoice> {
    return prisma.invoice.update({
      where: {
        organizationId_code: {
          organizationId: orgId,
          code: code,
        },
      },
      data: { status },
      include: { organization: true, receipts: true },
    });
  }
}

export const invoiceService = new InvoiceService();
