import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { TelegramService } from '../service/telegram.service';
import { LeadService } from '../service/leads.service';
import { LeadCtrl } from './leads.controller';
import { LeadLabel } from '../types/leads';
import { mongoLeadService } from '../service/mongo';
import { UserProvider } from '../types';
import crypto from 'crypto';
import { Toolbox } from '../utils/tools';
import { CryptoUtils } from '../utils/crypto';
import { mongoUserService } from '../service/mongo';
import { mongoose } from '../config/db';

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
            username: (username || `${first_name}${last_name}`).toString(),
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
