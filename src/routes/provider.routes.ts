import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { FacebookAuthCtrl } from '../controllers/facebook.controller';
import { TelegramCtrl, WhatsappCtrl } from '../controllers';
import authMiddleware, { AuthRequest } from '../middleware/auth.middleware';
import { CryptoUtils } from '../utils/crypto';
import { mongoLinkStateService } from '../service/mongo';

const router = Router();
router.get(
  '/facebook/link',
  authMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user!.userId;
    const state = CryptoUtils.createRandomBytes(16);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await mongoLinkStateService.create({ state, userId, expiresAt });
    passport.authenticate('facebook', {
      session: false,
      scope: [
        'email',
        'business_management',
        'whatsapp_business_messaging',
        'pages_show_list',
      ],
      state,
    })(req, res, next);
  }
);

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req: AuthRequest, res: Response) => {
    const state = req.query.state as string;
    await mongoLinkStateService.deleteOne({ state });

    const client = process.env.CLIENT_URL || 'http://localhost:3000';
    res.redirect(`${client}/settings?linked=facebook`);
  }
);

// Telegram authentication
router.get('/telegram/sign-in', TelegramCtrl.signIn.bind(TelegramCtrl));

// Whatsapp authentication
router.get('/whatsapp', WhatsappCtrl.startLogin);
router.get('/whatsapp/callback', WhatsappCtrl.handleCallback);
router.post('/whatsapp/select-business', WhatsappCtrl.selectBusiness);
router.post('/whatsapp/select-waba', WhatsappCtrl.selectWaba);
router.post('/whatsapp/connect', WhatsappCtrl.connect);

// Authenicated routes
// router.use(authMiddleware);

export default router;
