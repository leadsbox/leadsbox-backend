// src/controllers/telegram.controller.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { TelegramService } from '../service/telegram.service';
import { LeadService } from '../service/leads.service';
import { LeadModel } from '../models/leads.model';

class TelegramController {
  /**
   * Private helper to tag a conversation message based on keywords.
   * @param message - The conversation text.
   * @returns A string representing the status tag.
   */
  private tagConversation(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('cancel') || lowerMessage.includes('not interested') || lowerMessage.includes('lost')) {
      return 'Closed Lost';
    }

    if (
      lowerMessage.includes('paid') ||
      lowerMessage.includes('completed') ||
      lowerMessage.includes('successful') ||
      lowerMessage.includes('received')
    ) {
      return 'Transaction Successful';
    }

    if (lowerMessage.includes('payment') || lowerMessage.includes('transfer') || lowerMessage.includes('awaiting payment')) {
      return 'Payment Pending';
    }

    if (lowerMessage.includes('order') || lowerMessage.includes('purchase') || lowerMessage.includes('confirm')) {
      return 'Transaction in Progress';
    }

    if (
      lowerMessage.includes('follow-up') ||
      lowerMessage.includes('reminder') ||
      lowerMessage.includes('call me') ||
      lowerMessage.includes('schedule')
    ) {
      return 'Follow-Up Required';
    }

    if (lowerMessage.includes('inquiry') || lowerMessage.includes('question') || lowerMessage.includes('info')) {
      return 'New Inquiry';
    }

    return 'Engaged';
  }

  /**
   * Handles incoming webhook updates from Telegram.
   * Parses the update, tags the conversation, stores the lead, and triggers auto-reply if needed.
   */
  public async handleUpdate(req: Request, res: Response): Promise<void> {
    const update = req.body;
    console.log('Received Telegram update:', update);

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text;
      const userId = update.message.from?.id;

      if (!userId) {
        return ResponseUtils.error(res, 'User ID not found in message', StatusCode.BAD_REQUEST);
      }

      // Determine the tag based on the message text
      const tag = this.tagConversation(text);
      console.log('Determined tag:', tag);

      // Store the lead (assuming LeadService.storeTelegramLead accepts chatId, userId, message, and tag)
      try {
        await LeadService.storeTelegramLead(chatId, userId.toString(), text, tag);
      } catch (error) {
        console.error('Error storing Telegram lead:', error);
      }

      // Optionally trigger an auto-reply if the message contains the keyword "price"
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

  public async getAllLeads(req: Request, res: Response): Promise<void> {
    const leads = await LeadService.getAllLeads();
    return ResponseUtils.success(res, { leads }, 'Leads fetched successfully', StatusCode.OK);
  }

  public async getLeadsByUserId(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;

    if (!userId) {
      return ResponseUtils.error(res, 'userId is required in the request body', StatusCode.BAD_REQUEST);
    }

    try {
      const leads = await LeadService.getLeadsByUserId(userId);
      return ResponseUtils.success(res, { leads }, 'Leads fetched successfully', StatusCode.OK);
    } catch (error) {
      console.error('Error fetching user leads:', error);
      return ResponseUtils.error(res, 'Failed to fetch user leads', StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}

export const TelegramCtrl = new TelegramController();
