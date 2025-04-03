// services/instagramService.ts
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const INSTAGRAM_API_VERSION = process.env.INSTAGRAM_API_VERSION || 'v14.0';
const BASE_URL = `https://graph.facebook.com/${INSTAGRAM_API_VERSION}`;
const PAGE_ID = process.env.INSTAGRAM_PAGE_ID;
const ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;

if (!PAGE_ID || !ACCESS_TOKEN) {
  throw new Error('INSTAGRAM_PAGE_ID and IG_ACCESS_TOKEN must be set in the environment variables.');
}

export class InstagramService {
  /**
   * Fetches Instagram conversations (DMs) for the connected Business account.
   */
  public static async fetchConversations(): Promise<any> {
    try {
      const url = `${BASE_URL}/${PAGE_ID}/conversations`;
      const response = await axios.get(url, {
        params: { access_token: ACCESS_TOKEN },
      });
      return response.data;
    } catch (error) {
      console.error('Error in fetchConversations:', error);
      throw error;
    }
  }

  /**
   * Sends a reply message to a specified conversation.
   * @param conversationId - The Instagram conversation ID.
   * @param message - The message to send.
   */
  public static async sendReply(conversationId: string, message: string): Promise<any> {
    try {
      const url = `${BASE_URL}/${conversationId}/messages`;
      const response = await axios.post(url, null, {
        params: { access_token: ACCESS_TOKEN, message },
      });
      return response.data;
    } catch (error) {
      console.error('Error in sendReply:', error);
      throw error;
    }
  }
}
