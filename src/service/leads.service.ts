import { Prisma, prisma } from '../lib/db/prisma';
import { UserProvider } from '../types';

class LeadService {
  async updateConversationTag(
    conversationId: string,
    tag: string,
    provider: UserProvider,
    providerId: string,
    userId: string
  ) {
    return prisma.lead.upsert({
      where: { provider_providerId: { provider, providerId } },
      update: {
        conversationId,
        transactions: {
          create: {
            amount: 0,
            currency: 'NGN',
            status: tag,
            type: 'TAG',
          },
        },
      },
      create: {
        conversationId,
        provider,
        providerId,
        user: { connect: { id: userId } },
        transactions: {
          create: {
            amount: 0,
            currency: 'NGN',
            status: tag,
            type: 'TAG',
          },
        },
      },
      include: { transactions: true },
    });
  }

  async getLeads() {
    return prisma.lead.findMany({ include: { transactions: true } });
  }

  async getAllLeads() {
    return prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: { transactions: true },
    });
  }

  async getLeadsByUserId(userId: string) {
    return prisma.lead.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { transactions: true },
    });
  }
}

export const leadService = new LeadService();
