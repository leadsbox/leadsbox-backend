import { CryptoUtils } from '../utils/crypto';
import { Request, Response } from 'express';
import { Toolbox } from '../utils/tools';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { mongoUserService } from '../service/mongo';
import { UserProvider } from '../types';
import axios from 'axios';
class GoogleAuthController {
  public async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const state = CryptoUtils.createRandomBytes(16);
      res.cookie('ga_oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60_000,
      });

      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID as string,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
        state,
      });
      res.redirect(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      );
    } catch (err: any) {
      console.error('googleLogin error:', err);
      ResponseUtils.error(
        res,
        'Google login failed',
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  public async googleCallback(req: Request, res: Response): Promise<void> {
    console.log('Received Google callback');
    const user = req.user as any; 
    console.log('User:', user);

    if (!user || !user.token) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3010';
      return res.redirect(`${clientUrl}/login?error=google_auth_failed`);
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3010';
    const redirectUrl = `${clientUrl}/google?token=${encodeURIComponent(
      user.token
    )}`;
    console.log('Redirecting to:', redirectUrl);

    return res.redirect(redirectUrl);
  }
}

export const GoogleAuthCtrl = new GoogleAuthController();
