import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db/prisma';
import { generateReceiptCode } from '../utils/receiptCode';
import type { Receipt } from './invoice.service';

// Define the include type for receipts
interface ReceiptInclude {
  invoice?: boolean;
  organization?: boolean;
}

type ReceiptWhereInput = {
  id?: string;
  orgId?: string;
  receiptNumber?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  amount?: {
    gte?: number;
    lte?: number;
  };
};

type ReceiptWithInvoiceOrg = Prisma.ReceiptGetPayload<{
  include: {
    invoice: {
      include: {
        organization: { include: { owner: true; bankAccounts: true } };
        receipts: true;
      };
    };
    organization: { include: { owner: true; bankAccounts: true } };
  };
}>;

class ReceiptService {
  /**
   * Create a new receipt for an invoice
   */
  async create(data: {
    orgId: string;
    invoiceId: string;
    amount: number;
    sellerName: string;
    buyerName: string;
  }): Promise<ReceiptWithInvoiceOrg> {
    const { orgId, invoiceId, amount, sellerName, buyerName } = data;

    // Generate unique receipt number
    let receiptNumber: string;
    let receiptExists = true;

    while (receiptExists) {
      receiptNumber = generateReceiptCode();
      const exists = await prisma.receipt.findFirst({
        where: { receiptNumber },
      });
      if (!exists) receiptExists = false;
    }

    return prisma.receipt.create({
      data: {
        organizationId: orgId,
        invoiceId,
        receiptNumber: receiptNumber!,
        amount,
        sellerName,
        buyerName,
      },
      include: {
        invoice: {
          include: {
            organization: { include: { owner: true, bankAccounts: true } },
            receipts: true,
          },
        },
        organization: { include: { owner: true, bankAccounts: true } },
      },
    });
  }

  /**
   * Get a receipt by ID with related data
   */
  async getById(
    id: string,
    include: ReceiptInclude = {
      invoice: true,
      organization: true,
    }
  ): Promise<Prisma.ReceiptGetPayload<{
    include: typeof include;
  }> | null> {
    return prisma.receipt.findUnique({
      where: { id },
      include,
    }) as Promise<Prisma.ReceiptGetPayload<{
      include: typeof include;
    }> | null>;
  }

  /**
   * List receipts for an organization with optional filters
   */
  async listByOrg(
    orgId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      minAmount?: number;
      maxAmount?: number;
    } = {}
  ): Promise<Receipt[]> {
    const { startDate, endDate, minAmount, maxAmount } = filters;

    const where: ReceiptWhereInput = { orgId };

    // Apply date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Apply amount filters
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    return prisma.receipt.findMany({
      where,
      include: {
        invoice: true,
        organization: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Send receipt via WhatsApp
   */
  async sendWhatsAppReceipt(
    receiptId: string,
    phoneNumber: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const receipt = await this.getById(receiptId, {
        invoice: true,
        organization: true,
      });

      if (!receipt) {
        return { success: false, message: 'Receipt not found' };
      }

      // Generate receipt URL
      const receiptUrl = `${
        process.env.PUBLIC_APP_URL || ''
      }/receipts/${receiptId}`;

      // Create receipt message
      // Safely access organization currency with a default value
      const currency = (receipt.organization as any)?.currency || 'NGN';

      const message = `
*Payment Receipt: ${receipt.receiptNumber}*

*Seller:* ${receipt.sellerName}
*Buyer:* ${receipt.buyerName}
*Amount:* ${receipt.amount} ${currency}
*Date:* ${receipt.createdAt.toLocaleDateString()}

View your receipt: ${receiptUrl}
      `.trim();

      // Send WhatsApp message
      await this.sendWhatsAppText(phoneNumber, message);

      return { success: true };
    } catch (error) {
      console.error('Error sending WhatsApp receipt:', error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to send receipt',
      };
    }
  }

  /**
   * Send a simple WhatsApp text message
   */
  async sendWhatsAppText(to: string, text: string): Promise<any> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !token) {
      throw new Error('Missing WhatsApp configuration');
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      });

      const bodyText = await response.text();
      let data: any;
      try {
        data = JSON.parse(bodyText);
      } catch {
        data = bodyText;
      }

      if (!response.ok) {
        throw new Error(
          `WhatsApp API error: ${
            typeof data === 'string' ? data : JSON.stringify(data)
          }`
        );
      }

      return data; // <-- now you get a value in sentToWhatsApp
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  }
}

export const receiptService = new ReceiptService();

export { receiptService as default };

// Keep the original sendWhatsAppText function for backward compatibility
export async function sendWhatsAppText(to: string, text: string) {
  return receiptService.sendWhatsAppText(to, text);
}
