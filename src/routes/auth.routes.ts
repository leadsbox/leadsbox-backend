import { Router } from 'express';
import passport from 'passport';
import { FacebookAuthCtrl } from '../controllers/facebookAuth.controller';
import { TelegramAuthCtrl } from '../controllers/telegramAuth.controller';
import { AuthCtrl } from '../controllers/auth.controller';

const router = Router();

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));

router.get('/facebook/callback', passport.authenticate('facebook', { session: false }), (req, res) => {
  FacebookAuthCtrl.facebookCallback(req, res);
});

router.get('/telegram/sign-in', TelegramAuthCtrl.signIn.bind(TelegramAuthCtrl));

router.post('/login', AuthCtrl.login);
router.post('/register', AuthCtrl.register);

export default router;
