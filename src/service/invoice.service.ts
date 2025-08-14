import { prisma } from '../lib/db/prisma';
import type { Prisma, InvoiceStatus } from '../generated/prisma';
import { generateInvoiceCode } from '../utils/invoiceCode';

// Define types based on Prisma schema
type Invoice = Prisma.InvoiceGetPayload<{
  include: {
    organization: true;
    receipts: true;
  };
}>;

type Receipt = Prisma.ReceiptGetPayload<{
  include: {
    invoice: true;
    organization: true;
  };
}>;

type Organization = Prisma.OrganizationGetPayload<{
  include: {
    owner: true;
    bankAccounts: true;
  };
}>;

// Type for invoice items
interface InvoiceItem {
  name: string;
  qty: number;
  unitPrice: number;
}

class InvoiceService {
  /**
   * Create a new invoice
   */
  async create(data: {
    orgId: string;
    contactPhone?: string;
    items: InvoiceItem[];
    currency?: string;
  }): Promise<Invoice> {
    const { orgId, items, currency = 'NGN' } = data;
    
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    const total = subtotal; // Add tax, discount, etc. if needed

    // Generate unique invoice code
    let code: string;
    let codeExists = true;
    
    while (codeExists) {
      code = generateInvoiceCode();
      const exists = await prisma.invoice.findFirst({
        where: { orgId, code }
      });
      if (!exists) codeExists = false;
    }

    return prisma.invoice.create({
      data: {
        orgId,
        contactPhone: data.contactPhone,
        code: code!,
        currency,
        items: items as unknown as Prisma.InputJsonValue, // Proper type for JSON fields
        subtotal,
        total,
        status: 'SENT' as const
      },
      include: {
        organization: true,
        receipts: true
      }
    });
  }

  /**
   * Get an invoice by code with organization details
   */
  async getByCode(
    code: string, 
    orgId: string
  ): Promise<{
    invoice: Invoice;
    bankAccount?: Prisma.BankAccountGetPayload<{ include: { organization: true } }> | null;
  } | null> {
    // Use the compound unique constraint for lookup
    const invoice = await prisma.invoice.findUnique({
      where: { 
        organizationId_code: { 
          code, 
          organizationId: orgId 
        } 
      },
      include: {
        organization: true,
        receipts: true
      }
    });

    if (!invoice) return null;

    // Get default bank account if needed
    const bankAccount = await prisma.bankAccount.findFirst({
      where: {
        organizationId: invoice.orgId,
        isDefault: true
      }
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
        select: { id: true, organizationId: true }
      });

      if (!existingInvoice) {
        throw new Error('Invoice not found');
      }

      const invoice = await tx.invoice.update({
        where: { 
          id: existingInvoice.id,
          organizationId: existingInvoice.organizationId
        },
        data: {
          status: 'PAID' as const,
          // Add payment date or other relevant fields
        },
        include: { 
          organization: true,
          receipts: true
        }
      });

      // 2. Create receipt
      const receipt = await tx.receipt.create({
        data: {
          organization: { connect: { id: invoice.organizationId } },
          invoice: { connect: { id: invoice.id } },
          amount,
          receiptNumber: `RCPT-${Date.now()}`,
          sellerName: invoice.organization.name,
          buyerName: invoice.contactPhone || 'Customer'
        },
        include: {
          invoice: true,
          organization: true
        }
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
    invoice: Invoice | null;
    isPaid: boolean;
    status: string;
    receipt?: Receipt;
  }> {
    // Find invoice using the compound unique constraint
    const invoice = await prisma.invoice.findUnique({
      where: { 
        organizationId_code: { 
          code, 
          organizationId: orgId 
        } 
      },
      include: {
        organization: true,
        receipts: true
      }
    });

    if (!invoice) {
      return { 
        isPaid: false, 
        invoice: null, 
        status: 'NOT_FOUND' 
      };
    }

    const totalPaid = invoice.receipts.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);
    const isPaid = totalPaid >= invoice.total;
    const status = isPaid ? 'PAID' : 'PENDING';

    return {
      isPaid,
      invoice,
      status,
      receipt: isPaid ? invoice.receipts[0] : undefined
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
          code: code
        }
      },
      data: { status },
      include: { organization: true, receipts: true }
    });
  }
}

export const invoiceService = new InvoiceService();
