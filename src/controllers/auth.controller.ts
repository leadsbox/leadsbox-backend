import { Request, Response } from 'express';
import { CryptoUtils } from '../utils/crypto';
import { Toolbox } from '../utils/tools';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import AuthValidations from '../validations/auth.validation';
import { mongoose } from '../config/db';
import { mongoUserService } from '../service/mongo';
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

      const usernameExists = await mongoUserService.findOne(
        { username },
        { session: null }
      );
      if (usernameExists.status && usernameExists.data) {
        return ResponseUtils.error(
          res,
          'Username is already taken',
          StatusCode.ALREADY_EXISTS
        );
      }

      const emailExists = await mongoUserService.findOne(
        { email },
        { session: null }
      );
      if (emailExists.status && emailExists.data) {
        return ResponseUtils.error(
          res,
          'Email is already registered',
          StatusCode.ALREADY_EXISTS
        );
      }

      const _id = new mongoose.Types.ObjectId();
      const { PUBLIC_KEY, PRIVATE_KEY } = CryptoUtils.generateUserKeyPair();
      const Auth = {
        PUBLIC_KEY,
        ENCRYPTED_PRIVATE_KEY: CryptoUtils.encrypt(
          PRIVATE_KEY,
          process.env.JWT_SECRET as string
        ),
      };

      const token = await Toolbox.createToken({
        userId: _id.toString(),
        email,
        username,
        provider: UserProvider.LEADSBOX,
        Auth,
      });

      const newUser = await mongoUserService.updateOne(
        {
          _id,
        },
        {
          userId: _id.toString(),
          username,
          email,
          password: CryptoUtils.hashPassword(password),
          token,
          provider: UserProvider.LEADSBOX,
          providerId: _id.toString(),
        }
      );

      if (!newUser.status) {
        return ResponseUtils.error(
          res,
          'Failed to create user',
          StatusCode.BAD_REQUEST
        );
      }

      return ResponseUtils.success(
        res,
        { profile: newUser.data },
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

      const user = await mongoUserService.findOneMongo({
        $or: [{ email: identifier }, { username: identifier }],
      });
      if (!user.status) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      if (
        user.data &&
        !CryptoUtils.checkPassword(password, user.data.password ?? '')
      ) {
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
        userId: user.data!.userId,
        email: user.data!.email,
        username: user.data!.username,
        provider: user.data!.provider,
        Auth,
      });

      await mongoUserService.updateOne({ _id: user.data!._id }, { token });
      return ResponseUtils.success(
        res,
        { profile: user.data, token, PUBLIC_KEY },
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
}

export const AuthCtrl = new AuthController();
