import { Request, Response } from 'express';
import { StatusCode } from '../types/response';
import { LeadService } from '../service/leads.service';
import { LeadCtrl } from './leads.controller';
import { ResponseUtils } from '../utils/reponse';
import crypto from 'crypto';
import { WhatsappService } from '../service/whatsapp.service';
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

        try {
          await LeadService.storeWhatsAppLead({
            conversationId: convId,
            userId,
            message: text || '',
            tag: 'New',
          });
        } catch (err) {
          console.error('Error storing WhatsApp lead:', err);
        }

        if (text) {
          try {
            const newTag =
              (await LeadCtrl.tagConversation(text)) || 'Uncategorized';
            await LeadService.updateLeadTag(convId, newTag);
            console.log(`WhatsApp lead ${convId} tagged as ${newTag}`);
          } catch (err) {
            console.error('Error tagging WhatsApp lead:', err);
          }
        }
      }
    }

    return ResponseUtils.success(res, null, 'Update processed', StatusCode.OK);
  }

  public async connectWhatsapp(req: Request, res: Response) {
    const { accessToken } = req.body;
    const userId = (req.user as any)._id;

    try {
      const accounts = await WhatsappService.getBusinessAccounts(accessToken);
      const wabaId = accounts.data?.[0]?.id;
      if (!wabaId) throw new Error('No WhatsApp Business Account found');

      const numbers = await WhatsappService.getPhoneNumbers(
        wabaId,
        accessToken
      );
      const phoneNumberId = numbers.data?.[0]?.id;
      if (!phoneNumberId) throw new Error('No phone number found');

      await WhatsappService.registerWebhook(wabaId, accessToken);

      const connection = await WhatsappService.saveConnection({
        userId,
        wabaId,
        phoneNumberId,
        accessToken,
      });

      return res.status(200).json({
        message: 'WhatsApp connected successfully',
        connection,
      });
    } catch (err: any) {
      console.error('WhatsApp Connect Error:', err);
      return res.status(500).json({ message: err.message });
    }
  }
}

export const WhatsappCtrl = new WhatsappController();
