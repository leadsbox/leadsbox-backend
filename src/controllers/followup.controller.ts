import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { FollowUpService } from '../service/followup.service';

class TelegramFollowUpController {
  public async createFollowUp(req: Request, res: Response): Promise<void> {
    const { chatId, followUpTime } = req.body;
    if (!chatId || !followUpTime) {
      return ResponseUtils.error(
        res,
        'chatId and followUpTime are required',
        StatusCode.BAD_REQUEST,
      );
    }
    try {
      const followUp = await FollowUpService.scheduleTelegramFollowUp(
        chatId,
        followUpTime,
      );
      return ResponseUtils.success(
        res,
        { followUp },
        'Follow-up scheduled successfully',
        StatusCode.OK,
      );
    } catch (error: any) {
      return ResponseUtils.error(
        res,
        'Failed to schedule follow-up',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message,
      );
    }
  }
}

export const TelegramFollowUpCtrl = new TelegramFollowUpController();
