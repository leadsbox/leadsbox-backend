import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { TelegramService } from '../service/telegram.service';
import { LeadService } from '../service/leads.service';

class TelegramController {
  /**
   * Handles incoming webhook updates from Telegram.
   * Parses the update, stores the message as a lead, and triggers auto-reply if needed.
   */
  public async handleUpdate(req: Request, res: Response): Promise<void> {
    const update = req.body;
    console.log('Received Telegram update:', update);

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const userId = update.message.from?.id; // Extract user ID from the sender info

      if (!userId) {
        return ResponseUtils.error(res, 'User ID not found in message', StatusCode.BAD_REQUEST);
      }
      await LeadService.storeTelegramLead(chatId, userId.toString(), text);

      if (text && text.toLowerCase().includes('price')) {
        try {
          await TelegramService.sendMessage(chatId, 'Thank you for your inquiry! Please visit https://example.com/pricing for details.');
        } catch (error) {
          console.error('Auto-reply error:', error);
        }
      }
    }

    return ResponseUtils.success(res, update, 'Update processed', StatusCode.OK);
  }

  /**
   * Sends a reply to a specific Telegram chat.
   */
  public async sendReply(req: Request, res: Response): Promise<void> {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
      return ResponseUtils.error(res, 'chatId and message are required', StatusCode.BAD_REQUEST);
    }
    try {
      const result = await TelegramService.sendMessage(chatId, message);
      return ResponseUtils.success(res, { result }, 'Reply sent successfully', StatusCode.OK);
    } catch (error: any) {
      return ResponseUtils.error(res, 'Failed to send reply', StatusCode.INTERNAL_SERVER_ERROR, error.message);
    }
  }
}

export const TelegramCtrl = new TelegramController();
