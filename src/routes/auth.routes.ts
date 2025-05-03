import { Router } from 'express';
import passport from 'passport';
import { AuthCtrl } from '../controllers/auth.controller';
import { GoogleAuthCtrl } from '../controllers/google.controller';
import { tokenController } from '../controllers';

const router = Router();

// Leadsbox authentication
router.post('/login', AuthCtrl.login);
router.post('/register', AuthCtrl.register);

// Google authentication
router.get('/google', GoogleAuthCtrl.googleLogin);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    GoogleAuthCtrl.googleCallback(req, res);
  }
);

router.get('/check-token', tokenController.checkToken);

export default router;
