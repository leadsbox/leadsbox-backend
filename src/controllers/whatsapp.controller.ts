import { Request, Response } from 'express';
import { StatusCode } from '../types/response';
import { LeadCtrl } from './leads.controller';
import { ResponseUtils } from '../utils/reponse';
import crypto from 'crypto';
import { WhatsappService } from '../service/whatsapp.service';
import { LeadLabel } from '../types/leads';
import { mongoLeadService } from '../service/mongo';
import { UserProvider, UserType } from '../types';
import axios from 'axios';
declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
  }
}

class WhatsappController {
  /**
   * GET /api/whatsapp/webhook
   * Meta’s verification handshake
   */
  public verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'] as string;

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified');
      res.status(StatusCode.OK).send(challenge);
      return;
    }

    console.warn('❌ WhatsApp webhook verification failed');
    return ResponseUtils.error(
      res,
      'Webhook verification failed',
      StatusCode.BAD_REQUEST
    );
  }

  public async handleUpdate(req: Request, res: Response): Promise<void> {
    const rawBody = req.rawBody!;
    const sigHeader = req.get('x-hub-signature-256') || '';
    if (process.env.APP_SECRET) {
      const expected =
        'sha256=' +
        crypto
          .createHmac('sha256', process.env.APP_SECRET)
          .update(rawBody)
          .digest('hex');

      if (sigHeader !== expected) {
        console.warn(
          `Invalid signature: received ${sigHeader}, expected ${expected}`
        );
        return ResponseUtils.error(
          res,
          'Invalid signature on incoming WhatsApp webhook',
          StatusCode.UNAUTHORIZED
        );
      }
    }

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') {
      return ResponseUtils.error(
        res,
        'Unsupported callback object',
        StatusCode.NOT_FOUND
      );
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const msg = change.value.messages?.[0];
        console.log('WhatsApp message:', msg);
        if (!msg) continue;

        const text = msg.text?.body;
        const userId = msg.from;
        const convId = msg.id;

        if (!userId) {
          console.error('User ID missing on WhatsApp message');
          continue;
        }

        if (text) {
          try {
            const tag = await LeadCtrl.tagConversation(text);
            console.log('Determined tag:', tag);

            if (tag !== LeadLabel.NOT_A_LEAD) {
              await mongoLeadService.create({
                conversationId: convId,
                providerId: userId,
                provider: UserProvider.WHATSAPP,
                transactions: [
                  {
                    tag: tag,
                    notes: text,
                  },
                ],
              });
            }
          } catch (err) {
            console.error('Error tagging WhatsApp lead:', err);
          }
        }
      }
    }

    return ResponseUtils.success(res, null, 'Update processed', StatusCode.OK);
  }

  public startLogin(req: Request, res: Response): void {
    const state = crypto.randomBytes(16).toString('hex'); 
    const redirectUri = process.env.WHATSAPP_REDIRECT_URI!; 

    res.cookie('wa_oauth_state', state, { httpOnly: true, secure: true });

    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set(
      'scope',
      [
        'whatsapp_business_management',
        'whatsapp_business_messaging',
        'business_management',
      ].join(',')
    );
    url.searchParams.set('state', state);
    console.log('Redirecting to WhatsApp login:', url.toString());

    res.redirect(url.toString());
  }

  public async handleCallback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query as { code?: string; state?: string };

    if (!code || !state || req.cookies.wa_oauth_state !== state) {
      return ResponseUtils.error(res, 'Invalid OAuth state', StatusCode.BAD_REQUEST);
    }

    const tokenResp = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id:     process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri:  process.env.WHATSAPP_REDIRECT_URI,
        code
      }
    });
    console.log('WhatsApp accessToken response:', tokenResp.data);
    const accessToken = tokenResp.data.access_token;           

    const bizAcc  = await WhatsappService.getBusinessAccounts(accessToken);
    const wabaId  = bizAcc?.data?.[0]?.id;
    if (!wabaId)  return ResponseUtils.error(res,'No WABA found',StatusCode.BAD_REQUEST);

    const numbers = await WhatsappService.getPhoneNumbers(wabaId, accessToken);
    const phoneId = numbers?.data?.[0]?.id;
    if (!phoneId) return ResponseUtils.error(res,'No phone number found',StatusCode.BAD_REQUEST);

    const user = req.user as UserType | undefined;
    const userId = user?._id;               
    await WhatsappService.saveConnection({ userId, wabaId, phoneNumberId: phoneId, accessToken });

    await WhatsappService.registerWebhook(wabaId, accessToken);

    return ResponseUtils.success(res, null, 'WhatsApp account linked', StatusCode.OK);
  }

}

export const WhatsappCtrl = new WhatsappController();
