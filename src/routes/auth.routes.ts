import { Router } from 'express';
import passport from 'passport';
import { FacebookAuthCtrl } from '../controllers/facebook.controller';
import { AuthCtrl } from '../controllers/auth.controller';
import { TelegramCtrl, WhatsappCtrl } from '../controllers';

const router = Router();

// Facebook authentication
router.get(
  '/facebook',
  passport.authenticate('facebook', {
    scope: [
      'email',
      'business_management',
      'whatsapp_business_messaging',
      'pages_show_list',
    ],
  })
);
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false }),
  async (req, res) => {
    FacebookAuthCtrl.facebookCallback(req, res);
  }
);

// Telegram authentication
router.get('/telegram/sign-in', TelegramCtrl.signIn.bind(TelegramCtrl));

// Whatsapp authentication
router.get('/whatsapp', WhatsappCtrl.startLogin);
router.get('/whatsapp/callback', WhatsappCtrl.handleCallback);
router.post('/whatsapp/select-business', WhatsappCtrl.selectBusiness);
router.post( '/whatsapp/select-waba', WhatsappCtrl.selectWaba);
router.post('/whatsapp/connect', WhatsappCtrl.connect);


// Leadsbox authentication
router.post('/login', AuthCtrl.login);
router.post('/register', AuthCtrl.register);

export default router;
