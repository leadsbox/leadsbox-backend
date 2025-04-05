// src/controllers/telegram.controller.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { TelegramService } from '../service/telegram.service';

class TelegramController {
  /**
   * Handles incoming webhook updates from Telegram.
   */
  public async handleUpdate(req: Request, res: Response): Promise<void> {
    const update = req.body;
    console.log("Received Telegram update:", update);
    // Here, you would typically parse the update, store message data as a lead,
    // trigger auto-replies, etc.
    return ResponseUtils.success(res, update, "Update processed", StatusCode.OK);
  }

  /**
   * Sends a reply message to a specific Telegram chat.
   */
  public async sendReply(req: Request, res: Response): Promise<void> {
    const { chatId, message } = req.body;
    if (!chatId || !message) {
      return ResponseUtils.error(res, "chatId and message are required", StatusCode.BAD_REQUEST);
    }
    try {
      const result = await TelegramService.sendMessage(chatId, message);
      return ResponseUtils.success(res, { result }, "Reply sent successfully", StatusCode.OK);
    } catch (error: any) {
      return ResponseUtils.error(res, "Failed to send reply", StatusCode.INTERNAL_SERVER_ERROR, error.message);
    }
  }
}

export const TelegramCtrl = new TelegramController();
