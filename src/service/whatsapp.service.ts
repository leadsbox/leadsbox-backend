import axios from 'axios';
import { prisma, WhatsAppConnection } from '../lib/db/prisma';

const GRAPH = 'https://graph.facebook.com/v19.0';

export class WhatsappService {
  static async getBusinesses(accessToken: string) {
    const { data } = await axios.get(`${GRAPH}/me/businesses`, {
      params: { access_token: accessToken, fields: 'id,name' },
    });
    return data;
  }

  // ②  Inside that Business, list owned WABAs
  static async getBusinessAccounts(businessId: string, accessToken: string) {
    const { data } = await axios.get(
      `${GRAPH}/${businessId}/owned_whatsapp_business_accounts`,
      { params: { access_token: accessToken, fields: 'id,name' } }
    );
    return data;
  }

  static async getPhoneNumbers(wabaId: string, accessToken: string) {
    const { data } = await axios.get(`${GRAPH}/${wabaId}/phone_numbers`, {
      params: { access_token: accessToken },
    });
    return data;
  }

  static async registerWebhook(wabaId: string, accessToken: string) {
    const url = `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps?access_token=${accessToken}`;
    const { data } = await axios.post(url, {});
    return data;
  }

  static async saveConnection({
    userId,
    wabaId,
    phoneNumberId,
    accessToken,
  }: {
    userId: string;
    wabaId: string;
    phoneNumberId: string;
    accessToken: string;
  }): Promise<WhatsAppConnection> {
    return prisma.whatsAppConnection.upsert({
      where: {
        userId_wabaId_phoneNumberId: { userId, wabaId, phoneNumberId },
      },
      update: { accessToken },
      create: { userId, wabaId, phoneNumberId, accessToken },
    });
  }
}
