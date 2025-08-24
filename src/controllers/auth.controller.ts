import { Request, Response } from 'express';
import { CryptoUtils } from '../utils/crypto';
import { Toolbox } from '../utils/tools';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import AuthValidations from '../validations/auth.validation';
import { mongoose } from '../config/db';
import { mongoUserService } from '../service/mongo';
import { userService } from '../service/user.service';
import { v4 as uuidv4 } from 'uuid';
import { mailerService } from '../service/nodemailer';
import { UserProvider } from '../types';
import { AuthRequest } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';

class AuthController {
  public async register(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = await AuthValidations.register(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(
          res,
          validationResult,
          StatusCode.BAD_REQUEST
        );
      }

      const { username, email, password } = req.body;

      const usernameExists = await userService.findByUsername(username);
      if (usernameExists) {
        return ResponseUtils.error(
          res,
          'Username is already taken',
          StatusCode.ALREADY_EXISTS
        );
      }

      const emailExists = await userService.findByEmail(email);
      if (emailExists) {
        return ResponseUtils.error(
          res,
          'Email is already registered',
          StatusCode.ALREADY_EXISTS
        );
      }

      const userId = uuidv4();
      const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
      const Auth = {
        PUBLIC_KEY,
        ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
          PRIVATE_KEY,
          process.env.JWT_SECRET as string
        ),
      };

      const token = await Toolbox.createToken({
        userId,
        email,
        username,
        provider: UserProvider.LEADSBOX,
        Auth,
      });

      const newUser = await userService.create({
        userId,
        username,
        email,
        password: CryptoUtils.hashPassword(password),
        token,
        provider: UserProvider.LEADSBOX,
        providerId: userId,
      });

      return ResponseUtils.success(
        res,
        { profile: newUser },
        'User registered successfully!',
        StatusCode.CREATED
      );
    } catch (error: any) {
      console.error('Error during registration:', error);
      return ResponseUtils.error(
        res,
        'Server error',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error
      );
    }
  }

  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body;
      const validationResult = await AuthValidations.login(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(
          res,
          validationResult,
          StatusCode.BAD_REQUEST
        );
      }

      const user = await userService.findByEmailOrUsername(identifier);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      if (!CryptoUtils.checkPassword(password, user.password ?? '')) {
        return ResponseUtils.error(
          res,
          'Invalid password',
          StatusCode.UNAUTHORIZED
        );
      }

      const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
      const Auth = {
        PUBLIC_KEY,
        ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
          PRIVATE_KEY,
          process.env.JWT_SECRET as string
        ),
      };

      const token = await Toolbox.createToken({
        userId: user.userId,
        email: user.email,
        username: user.username || '',
        provider: user.provider as UserProvider,
        Auth,
      });

      await userService.update(user.id, { token });
      return ResponseUtils.success(
        res,
        { profile: user, token, PUBLIC_KEY },
        'Login successful',
        StatusCode.OK
      );
    } catch (error: any) {
      console.error('Login Error:', error);
      return ResponseUtils.error(
        res,
        'Server error',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error
      );
    }
  }

  public async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    const validationResult = await AuthValidations.forgotPassword(req.body);
    if (validationResult !== true) {
      return ResponseUtils.error(res, validationResult, StatusCode.BAD_REQUEST);
    }

    try {
      const user = await mongoUserService.findOne({ email });
      if (!user.status || !user.data) {
        return ResponseUtils.error(res, 'User not found', StatusCode.NOT_FOUND);
      }

      const resetToken = await Toolbox.createToken({
        userId: user.data._id?.toString(),
        email: user.data.email,
        username: user.data.username,
      });

      await mongoUserService.updateOne(
        { _id: user.data._id },
        { token: resetToken }
      );

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      const emailTemplate = `
        <h1>Password Reset Request</h1>
        <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
      `;

      await mailerService.sendMail(
        email,
        'Password Reset Request',
        emailTemplate
      );

      return ResponseUtils.success(
        res,
        null,
        'Password reset link sent to your email.',
        StatusCode.OK
      );
    } catch (error: any) {
      console.error('Forgot Password Error:', error);
      return ResponseUtils.error(
        res,
        'Server error',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error
      );
    }
  }

  public async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPassword } = req.body;
    const validationResult = await AuthValidations.resetPassword(req.body);
    if (validationResult !== true) {
      return ResponseUtils.error(res, validationResult, StatusCode.BAD_REQUEST);
    }

    try {
      const tokenPayload = await Toolbox.verifyToken(token);
      if (!tokenPayload || !tokenPayload.userId) {
        return ResponseUtils.error(
          res,
          'Invalid or expired token',
          StatusCode.BAD_REQUEST
        );
      }

      const userId = tokenPayload.userId;

      const hashedPassword = CryptoUtils.hashPassword(newPassword);

      const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
      const Auth = {
        PUBLIC_KEY,
        ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
          PRIVATE_KEY,
          process.env.JWT_SECRET as string
        ),
      };

      const newAuthToken = await Toolbox.createToken({
        userId,
        Auth,
      });

      const updateResult = await mongoUserService.updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { password: hashedPassword, token: newAuthToken }
      );

      if (!updateResult.status) {
        return ResponseUtils.error(
          res,
          'Failed to reset password',
          StatusCode.BAD_REQUEST
        );
      }

      return ResponseUtils.success(
        res,
        null,
        'Password has been reset successfully',
        StatusCode.OK
      );
    } catch (error: any) {
      console.error('Reset Password Error:', error);
      return ResponseUtils.error(
        res,
        'Server error',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error
      );
    }
  }

  public async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const authReq = req as AuthRequest;
      console.log('[Me] Authenticated user:', authReq.user);
      const raw = authReq.user;

      if (!raw) {
        res.status(401).json({ message: 'Unauthenticated' });
        return;
      }

      // Prefer cookie (session) token; fallback to bearer if present
      const cookieToken =
        (req.cookies && (req.cookies.leadsbox_token as string)) || undefined;
      const headerToken =
        (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
        undefined;
      const accessToken = cookieToken || headerToken;

      const user = await userService.findByUserId(raw.userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      res.status(200).json({ user, accessToken });
    } catch (err) {
      console.error('ME error:', err);
      res.status(500).json({ message: 'Failed to load profile' });
    }
  }

  public async refresh(req: Request, res: Response): Promise<void> {
    try {
      const fromCookie = (req.cookies?.leadsbox_token as string) || undefined;
      const fromHeader =
        (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
        undefined;
      const existing = fromCookie || fromHeader;
      if (!existing) {
        res.status(401).json({ message: 'No session' });
        return;
      }

      let payload: any;
      try {
        payload = jwt.verify(existing, process.env.JWT_SECRET!);
      } catch {
        res.status(401).json({ message: 'Invalid or expired token' });
        return;
      }

      // Ensure user still exists
      const u = await userService.findByUserId(payload.userId);
      if (!u) {
        res.status(401).json({ message: 'User not found' });
        return;
      }

      // Rotate token (preserve fields you already embed)
      const newToken = await Toolbox.createToken({
        userId: u.userId,
        email: u.email,
        username: u.username || '',
        provider: u.provider,
        Auth: payload?.Auth, // keep existing Auth bundle if you include it
      });

      // Best-effort: persist new token if you store it
      try {
        await userService.update(u.id, { token: newToken });
      } catch (_) {
        // ignore if your storage is stateless
      }

      res.cookie('leadsbox_token', newToken, {
        httpOnly: true,
        secure: true, // required with SameSite=None
        sameSite: 'none', // cross-site (ngrok API <-> localhost FE)
        path: '/',
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(204).end();
    } catch (err) {
      console.error('Refresh error:', err);
      res.status(500).json({ message: 'Failed to refresh session' });
    }
  }

  public async logout(req: Request, res: Response): Promise<void> {
    try {
      const fromCookie = (req.cookies?.leadsbox_token as string) || undefined;
      const fromHeader =
        (req.headers.authorization || '').replace(/^Bearer\s+/i, '') ||
        undefined;
      const tok = fromCookie || fromHeader;

      if (tok) {
        try {
          const decoded: any = jwt.decode(tok);
          const userId = decoded?.userId;
          if (userId) {
            const u = await userService.findByUserId(userId);
            if (u) {
              try {
                await userService.update(u.id, { token: null });
              } catch (_) {
                // ignore if you don't persist token
              }
            }
          }
        } catch (_) {
          // ignore decode errors; still clear cookie
        }
      }

      res.clearCookie('leadsbox_token', {
        path: '/',
        sameSite: 'none',
        secure: true,
      });

      res.status(204).end();
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({ message: 'Failed to logout' });
    }
  }
}

export const AuthCtrl = new AuthController();
