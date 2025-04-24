// src/controllers/telegramAuth.controller.ts
import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import crypto from 'crypto';
import { Toolbox } from '../utils/tools';
import { CryptoUtils } from '../utils/crypto';
import { UserProvider } from '../types';
import { mongoUserService } from '../service/mongo';
import { mongoose } from '../config/db';

/**
 * Verifies data from the Telegram login widget.
 */
class TelegramAuthController {
  public async signIn(req: Request, res: Response): Promise<void> {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } =
      req.query;
    const botToken = process.env.TELEGRAM_BOT_TOKEN as string;

    if (!botToken) {
      return ResponseUtils.error(
        res,
        'Bot token not configured',
        StatusCode.INTERNAL_SERVER_ERROR
      );
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
    const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString);
    const calculatedHash = hmac.digest('hex');

    if (calculatedHash !== hash) {
      return ResponseUtils.error(
        res,
        'Data is not from Telegram',
        StatusCode.UNAUTHORIZED
      );
    }

    try {
      let existing = await mongoUserService.findOneMongo(
        {
          $or: [
            { provider: UserProvider.TELEGRAM },
            { providerId: id?.toString() },
          ],
        },
        { session: null }
      );
      console.log('Existing user:', existing);

      if (!existing.status || !existing.data) {
        const _id = new mongoose.Types.ObjectId();

        const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
        const Auth = {
          PUBLIC_KEY,
          ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
            PRIVATE_KEY,
            process.env.JWT_SECRET as string
          ),
        };
        const token = await Toolbox.createToken({
          userId: _id.toString(),
          email: null,
          username: username,
          provider: UserProvider.FACEBOOK,
          Auth,
        });

        const createPayload = {
          userId: _id.toString(),
          username: (username || `${first_name} ${last_name}`).toString(),
          email: '',
          provider: UserProvider.TELEGRAM,
          token,
          providerId: id?.toString(),
        };
        const created = await mongoUserService.updateOne(
          { _id },
          createPayload
        );
        if (!created.status || !created.data) {
          throw new Error('Failed to create Telegram user');
        }
        existing = created;
      }

      const userData = existing.data!;

      const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
      const Auth = {
        PUBLIC_KEY,
        ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
          PRIVATE_KEY,
          process.env.JWT_SECRET as string
        ),
      };
      const token = await Toolbox.createToken({
        userId: userData.userId,
        email: userData.email,
        username: userData.username,
        provider: UserProvider.TELEGRAM,
        Auth,
      });

      await mongoUserService.updateOne({ _id: userData._id }, { token });

      return ResponseUtils.success(
        res,
        { user: userData, token },
        'Telegram login successful',
        StatusCode.OK
      );
    } catch (error: any) {
      console.error('Telegram auth error:', error);
      return ResponseUtils.error(
        res,
        'Error during Telegram sign-in',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error
      );
    }
  }
}

export const TelegramAuthCtrl = new TelegramAuthController();
