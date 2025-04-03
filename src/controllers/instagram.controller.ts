import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { InstagramService } from '../service/instagram.service';

class InstagramController {
  /**
   * Fetch Instagram conversations (DMs) for the connected Business account.
   */
  public async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await InstagramService.fetchConversations();
      return ResponseUtils.success(res, { conversations }, 'Conversations retrieved successfully', StatusCode.OK);
    } catch (error: any) {
      console.error('Error fetching Instagram conversations:', error);
      return ResponseUtils.error(res, 'Failed to fetch conversations', StatusCode.INTERNAL_SERVER_ERROR, error.message || error);
    }
  }

  /**
   * Send a reply to a specific Instagram conversation.
   */
  public async postReply(req: Request, res: Response): Promise<void> {
    const { conversationId, message } = req.body;
    if (!conversationId || !message) {
      return ResponseUtils.error(res, 'conversationId and message are required', StatusCode.BAD_REQUEST);
    }

    try {
      const result = await InstagramService.sendReply(conversationId, message);
      return ResponseUtils.success(res, { result }, 'Reply sent successfully', StatusCode.OK);
    } catch (error: any) {
      console.error('Error sending Instagram reply:', error);
      return ResponseUtils.error(res, 'Failed to send reply', StatusCode.INTERNAL_SERVER_ERROR, error.message || error);
    }
  }
}

export const InstagramCtrl = new InstagramController();
