// src/controllers/telegramAuth.controller.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import crypto from 'crypto';
import { Toolbox } from '../utils/tools';

class TelegramAuthController {
  /**
   * Verifies data from the Telegram login widget.
   */
  public async signIn(req: Request, res: Response): Promise<void> {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN as string;
    if (!botToken) {
      return ResponseUtils.error(res, "Bot token not configured", StatusCode.INTERNAL_SERVER_ERROR);
    }

    // Build data check string per Telegram documentation
    const dataCheckArr = [];
    if (id) dataCheckArr.push(`id=${id}`);
    if (first_name) dataCheckArr.push(`first_name=${first_name}`);
    if (last_name) dataCheckArr.push(`last_name=${last_name}`);
    if (username) dataCheckArr.push(`username=${username}`);
    if (photo_url) dataCheckArr.push(`photo_url=${photo_url}`);
    if (auth_date) dataCheckArr.push(`auth_date=${auth_date}`);
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');

    // Calculate HMAC with SHA-256 using your bot token
    const hmac = crypto.createHmac('sha256', botToken);
    hmac.update(dataCheckString);
    const calculatedHash = hmac.digest('hex');

    if (calculatedHash !== hash) {
      return ResponseUtils.error(res, "Data is not from Telegram", StatusCode.UNAUTHORIZED);
    }
    
    try {
      const payload = {
        id,
        first_name,
        last_name,
        username,
        photo_url,
        auth_date
      };
      const token = await Toolbox.createToken(payload);
      console.log("Generated JWT Token:", token);
      return ResponseUtils.success(
        res,
        { user: req.body, token },
        "Telegram login successful",
        StatusCode.OK
      );
    } catch (error: any) {
      return ResponseUtils.error(
        res,
        "Error generating token",
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error
      );
    }
  }
}

export const TelegramAuthCtrl = new TelegramAuthController();
