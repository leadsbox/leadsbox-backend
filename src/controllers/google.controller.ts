import { CryptoUtils } from '../utils/crypto';
import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';

class GoogleAuthController {
  public async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      res.clearCookie('ga_oauth_state');
      const state = CryptoUtils.createRandomBytes(16);
      res.cookie('ga_oauth_state', state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 10 * 60_000,
      });
      console.log('[GoogleLogin] New state generated:', state);

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
    // 1) CSRF check for OAuth
    const stateFromQuery = (req.query.state || '') as string;
    const stateFromCookie = req.cookies?.ga_oauth_state || '';
    if (!stateFromQuery || stateFromQuery !== stateFromCookie) {
      return res.redirect(
        `${process.env.PUBLIC_APP_URL}/login?error=bad_state`
      );
    }
    res.clearCookie('ga_oauth_state', { path: '/' });

    // 2) user comes from your strategy (unchanged)
    const user = req.user as any;
    console.log('[GoogleCallback] User:', user);
    if (!user?.token) {
      return res.redirect(
        `${process.env.PUBLIC_APP_URL}/login?error=google_auth_failed`
      );
    }

    // 3) Issue the httpOnly session cookie for the API origin
    res.cookie('leadsbox_token', user.token, {
      httpOnly: true,
      secure: true, // required with SameSite=None
      sameSite: 'none', // cross-site (ngrok API <-> localhost FE)
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    console.log('[GoogleCallback] New cookie set:', user.token);

    // 4) Go back to FE
    res.redirect(`${process.env.PUBLIC_APP_URL}/dashboard`);
  }
}

export const GoogleAuthCtrl = new GoogleAuthController();
