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
    console.log('Received Google callback ✅');
    const user = req.user as any;

    // If no token, redirect to login
    if (!user?.token) {
      return res.redirect(
        'http://localhost:3000/login?error=google_auth_failed'
      );
    }

    // Build the cookie string — first-party context on the API domain
    const isProd = process.env.NODE_ENV === 'dev';
    const parts = [
      `leadsbox_token=${user.token}`,
      `Path=/`,
      `Max-Age=${24 * 60 * 60}`, // 1 day
      isProd ? `Secure` : ``,
      isProd ? `SameSite=None` : `SameSite=Lax`,
    ].filter(Boolean);

    // Serve an HTML page that sets the cookie in JS, then redirects to React
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html><body>
        <script>
          // Set the cookie from the API domain (this runs in the browser on the API origin)
          document.cookie = "${parts.join('; ')}";
          // Then navigate to your React app
          window.location.href = "http://localhost:3000";
        </script>
      </body></html>
    `);
  }
}

export const GoogleAuthCtrl = new GoogleAuthController();
