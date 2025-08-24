import { Router } from 'express';
import passport from 'passport';
import { AuthCtrl } from '../controllers/auth.controller';
import { GoogleAuthCtrl } from '../controllers/google.controller';
import { tokenController } from '../controllers';
import authMiddleware from '../middleware/auth.middleware';
import { userService } from '../service/user.service';

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

router.get('/me', authMiddleware, AuthCtrl.me);

router.post('/refresh', AuthCtrl.refresh);
router.post('/logout', AuthCtrl.logout);

export default router;
