import axios from 'axios';
import { TelegramBotToken } from '../config/dotenv';

const TELEGRAM_BOT_TOKEN = TelegramBotToken;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error(
    'TELEGRAM_BOT_TOKEN must be defined in your environment variables',
  );
}

const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export class TelegramService {
  public static async sendMessage(
    chatId: number | string,
    message: string,
  ): Promise<any> {
    try {
      const url = `${TELEGRAM_API_URL}/sendMessage`;
      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }
}
