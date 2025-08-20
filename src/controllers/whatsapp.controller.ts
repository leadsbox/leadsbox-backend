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
    if (process.env.FACEBOOK_APP_SECRET) {
      const expected =
        'sha256=' +
        crypto
          .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
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
    const redirectUri =
    'https://800281810a4d.ngrok-free.app/api/provider/whatsapp/callback';

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
    console.log(
      'Whatsapp login called - Redirecting to WhatsApp callback:',
      url.toString()
    );

    res.redirect(url.toString());
  }

  public async handleCallback(req: Request, res: Response) {
    console.log('Handling WhatsApp OAuth callback:');
    const { code, state } = req.query as Record<string, string | undefined>;
    if (!code || !state || state !== req.cookies.wa_oauth_state) {
      return ResponseUtils.error(
        res,
        'Invalid OAuth state',
        StatusCode.BAD_REQUEST
      );
    }

    try {
      const { data: tokenData } = await axios.get(
        'https://graph.facebook.com/v19.0/oauth/access_token',
        {
          params: {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            redirect_uri: process.env.WHATSAPP_REDIRECT_URI,
            code,
          },
        }
      );
      const accessToken = tokenData.access_token;

      const bizResp = await WhatsappService.getBusinesses(accessToken); // {data:[…]}
      if (!bizResp.data?.length) {
        return ResponseUtils.error(
          res,
          'No Business Manager found',
          StatusCode.BAD_REQUEST
        );
      }

      return ResponseUtils.success(res, {
        accessToken,
        businesses: bizResp.data.map((b: any) => ({ id: b.id, name: b.name })),
      });
    } catch (err: any) {
      console.error('handleCallback error:', err.response?.data || err.message);
      return ResponseUtils.error(
        res,
        err.response?.data?.error?.message || 'OAuth callback failed',
        StatusCode.BAD_REQUEST
      );
    }
  }

  public async selectBusiness(req: Request, res: Response) {
    const { accessToken, businessId } = req.body as {
      accessToken: string;
      businessId: string;
    };

    try {
      const wabaResp = await WhatsappService.getBusinessAccounts(
        businessId,
        accessToken
      );
      if (!wabaResp.data?.length) {
        return ResponseUtils.error(
          res,
          'No WABA in that business',
          StatusCode.BAD_REQUEST
        );
      }

      return ResponseUtils.success(res, {
        accessToken, // pass through
        wabas: wabaResp.data.map((w: { id: any; name: any }) => ({
          id: w.id,
          name: w.name,
        })),
      });
    } catch (err: any) {
      console.error('selectBusiness error:', err.response?.data || err.message);
      return ResponseUtils.error(
        res,
        err.response?.data?.error?.message || 'Fetching WABAs failed',
        StatusCode.BAD_REQUEST
      );
    }
  }

  public async selectWaba(req: Request, res: Response) {
    const { accessToken, wabaId } = req.body as {
      accessToken: string;
      wabaId: string;
    };

    try {
      const phoneResp = await WhatsappService.getPhoneNumbers(
        wabaId,
        accessToken
      );
      if (!phoneResp.data?.length) {
        return ResponseUtils.error(
          res,
          'No phone number in that WABA',
          StatusCode.BAD_REQUEST
        );
      }

      return ResponseUtils.success(res, {
        accessToken,
        wabaId,
        phoneNumbers: phoneResp.data.map(
          (p: { id: any; display_phone_number: any; verified_name: any }) => ({
            id: p.id,
            display: p.display_phone_number || p.verified_name || 'Unknown',
          })
        ),
      });
    } catch (err: any) {
      console.error('selectWaba error:', err.response?.data || err.message);
      return ResponseUtils.error(
        res,
        err.response?.data?.error?.message || 'Fetching phone numbers failed',
        StatusCode.BAD_REQUEST
      );
    }
  }

  public async connect(req: Request, res: Response) {
    const { accessToken, wabaId, phoneId, userId } = req.body as {
      accessToken: string;
      wabaId: string;
      phoneId: string;
      userId: string;
    };

    try {
      await WhatsappService.saveConnection({
        userId,
        wabaId,
        phoneNumberId: phoneId,
        accessToken,
      });
      await WhatsappService.registerWebhook(wabaId, accessToken);

      return ResponseUtils.success(
        res,
        null,
        'WhatsApp account linked',
        StatusCode.OK
      );
    } catch (err: any) {
      console.error('finalize error:', err.response?.data || err.message);
      return ResponseUtils.error(
        res,
        err.response?.data?.error?.message || 'Finalising WhatsApp link failed',
        StatusCode.BAD_REQUEST
      );
    }
  }
}

export const WhatsappCtrl = new WhatsappController();
