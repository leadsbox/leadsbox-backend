// src/controllers/telegram.controller.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { TelegramService } from '../service/telegram.service';
import { LeadService } from '../service/leads.service';
import { LeadModel } from '../models/leads.model';
import { LeadCtrl } from './leads.controller';
import { LeadLabel } from '../types/leads';
import { mongoLeadService } from '../service/mongo';
import { UserProvider } from '../types';

class TelegramController {
  /**
   * Handles incoming webhook updates from Telegram.
   * Parses the update, tags the conversation, stores the lead, and triggers auto-reply if needed.
   */
  public async handleUpdate(req: Request, res: Response): Promise<void> {
    const update = req.body;

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const providerId = update.message.from?.id;

      if (!providerId) {
        return ResponseUtils.error(
          res,
          'Telegram User ID not found in message',
          StatusCode.BAD_REQUEST
        );
      }

      if (text) {
        const tag = await LeadCtrl.tagConversation(text);
        console.log('Determined tag:', tag);

        if (tag !== LeadLabel.NOT_A_LEAD) {
          await mongoLeadService.create(
            {
              conversationId: chatId.toString(),
              providerId: providerId.toString(),
              provider: UserProvider.TELEGRAM,
              transactions: [
                {
                  tag: tag,
                  notes: text,
                },
              ],
            },
            { session: null }
          );
        }

        if (text.toLowerCase().includes('price')) {
          try {
            await TelegramService.sendMessage(
              chatId,
              'Thank you for your inquiry! Please visit https://leadsboxapp.com/pricing for details.'
            );
          } catch (error) {
            console.error('Auto-reply error:', error);
          }
        }

        if (text.startsWith('/start')) {
          await TelegramService.sendMessage(
            chatId,
            'Welcome to Leadsbox! I’m here to help you with your inquiries. How can I assist you today?'
          );
          return ResponseUtils.success(
            res,
            update,
            'Welcome message sent',
            StatusCode.OK
          );
        }
      } else {
        console.log('No text found in the message; likely a non-text update.');
      }
    }

    return ResponseUtils.success(
      res,
      update,
      'Update processed',
      StatusCode.OK
    );
  }

  /**
   * Sends a reply to a specific Telegram chat.
   */
  public async sendReply(req: Request, res: Response): Promise<void> {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
      return ResponseUtils.error(
        res,
        'chatId and message are required',
        StatusCode.BAD_REQUEST
      );
    }
    try {
      const result = await TelegramService.sendMessage(chatId, message);
      return ResponseUtils.success(
        res,
        { result },
        'Reply sent successfully',
        StatusCode.OK
      );
    } catch (error: any) {
      return ResponseUtils.error(
        res,
        'Failed to send reply',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message
      );
    }
  }

  public async getAllLeads(req: Request, res: Response): Promise<void> {
    const leads = await LeadService.getAllLeads();
    return ResponseUtils.success(
      res,
      { leads },
      'Leads fetched successfully',
      StatusCode.OK
    );
  }

  public async getLeadsByUserId(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;

    if (!userId) {
      return ResponseUtils.error(
        res,
        'userId is required in the request body',
        StatusCode.BAD_REQUEST
      );
    }

    try {
      const leads = await LeadService.getLeadsByUserId(userId);
      return ResponseUtils.success(
        res,
        { leads },
        'Leads fetched successfully',
        StatusCode.OK
      );
    } catch (error) {
      console.error('Error fetching user leads:', error);
      return ResponseUtils.error(
        res,
        'Failed to fetch user leads',
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export const TelegramCtrl = new TelegramController();
