import { Router } from 'express';
import passport from 'passport';
import { FacebookAuthCtrl } from '../controllers/facebook.controller';
import { TelegramCtrl, WhatsappCtrl } from '../controllers';
import SSOAuth from '../middleware/SSOAuth.middleware';

const router = Router();
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res) => {
    FacebookAuthCtrl.facebookCallback(req, res);
  }
);

router.get(
  '/facebook',
  SSOAuth,
  passport.authenticate('facebook', {
    scope: [
      'email',
      'business_management',
      'whatsapp_business_messaging',
      'pages_show_list',
    ],
  })
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
