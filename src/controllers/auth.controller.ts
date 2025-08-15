import { Request, Response } from 'express';
import { CryptoUtils } from '../utils/crypto';
import { Toolbox } from '../utils/tools';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import AuthValidations from '../validations/auth.validation';
import { userService } from '../service/user.service';
import { v4 as uuidv4 } from 'uuid';
import { mailerService } from '../service/nodemailer';
import { UserProvider } from '../types';

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
      const user = await userService.findByEmail(email);
      if (!user) {
        return ResponseUtils.error(res, 'User not found', StatusCode.NOT_FOUND);
      }

      const resetToken = await Toolbox.createToken({
        userId: user.id,
        email: user.email,
        username: user.username || '',
      });

      await userService.update(user.id, { token: resetToken });

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

      const userId = tokenPayload.userId as string;
      const user = await userService.findById(userId);
      if (!user) {
        return ResponseUtils.error(res, 'User not found', StatusCode.NOT_FOUND);
      }

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
        userId: user.userId,
        Auth,
      });

      await userService.update(user.id, {
        password: hashedPassword,
        token: newAuthToken,
      });

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
}

export const AuthCtrl = new AuthController();
