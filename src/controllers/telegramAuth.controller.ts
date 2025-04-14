// src/controllers/telegramAuth.controller.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import crypto from 'crypto';
import { Toolbox } from '../utils/tools';

/**
 * Verifies data from the Telegram login widget.
 */
class TelegramAuthController {
  public async signIn(req: Request, res: Response): Promise<void> {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = req.query;
    const botToken = process.env.TELEGRAM_BOT_TOKEN as string;
    if (!botToken) {
      return ResponseUtils.error(res, 'Bot token not configured', StatusCode.INTERNAL_SERVER_ERROR);
    }
    const dataCheckArr: string[] = [];
    if (id) dataCheckArr.push(`id=${id}`);
    if (first_name) dataCheckArr.push(`first_name=${first_name}`);
    if (last_name) dataCheckArr.push(`last_name=${last_name}`);
    if (username) dataCheckArr.push(`username=${username}`);
    if (photo_url) dataCheckArr.push(`photo_url=${photo_url}`);
    if (auth_date) dataCheckArr.push(`auth_date=${auth_date}`);
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join('\n');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(dataCheckString);
    const calculatedHash = hmac.digest('hex');
    if (calculatedHash !== hash) {
      return ResponseUtils.error(res, 'Data is not from Telegram', StatusCode.UNAUTHORIZED);
    }
    try {
      const payload = {
        id,
        first_name,
        last_name,
        username,
        photo_url,
        auth_date,
      };
      const token = await Toolbox.createToken(payload);
      console.log('Generated JWT Token:', token);
      console.log('Telegram login successful:', payload);
      return ResponseUtils.success(res, { user: req.query, token }, 'Telegram login successful', StatusCode.OK);
    } catch (error: any) {
      return ResponseUtils.error(res, 'Error generating token', StatusCode.INTERNAL_SERVER_ERROR, error.message || error);
    }
  }
}

export const TelegramAuthCtrl = new TelegramAuthController();
