import axios from 'axios';
import { WhatsappConnection, IWhatsappConnection } from '../models/whatsappConnection.model';

export class WhatsappService {
  static async getBusinessAccounts(accessToken: string) {
    const url = `https://graph.facebook.com/v19.0/me/owned_whatsapp_business_accounts?access_token=${accessToken}`;
    const { data } = await axios.get(url);
    return data;
  }

  static async getPhoneNumbers(wabaId: string, accessToken: string) {
    const url = `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
    const { data } = await axios.get(url);
    return data;
  }

  static async registerWebhook(wabaId: string, accessToken: string) {
    const url = `https://graph.facebook.com/v19.0/${wabaId}/subscribed_apps?access_token=${accessToken}`;
    const { data } = await axios.post(url, {});
    return data;
  }

  static async saveConnection({ userId, wabaId, phoneNumberId, accessToken }: {
    userId: string;
    wabaId: string;
    phoneNumberId: string;
    accessToken: string;
  }): Promise<IWhatsappConnection> {
    return WhatsappConnection.findOneAndUpdate(
      { userId, wabaId, phoneNumberId },
      { accessToken },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
