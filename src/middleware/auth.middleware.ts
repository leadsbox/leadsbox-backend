// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Toolbox } from '../utils/tools';
import { mongoUserService } from '../service/mongo';
import { StatusCode } from '../types/response';
import { ResponseUtils } from '../utils/reponse';
import { IUser } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export async function AuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ResponseUtils.error(
      res,
      'Unauthorized: No token provided',
      StatusCode.UNAUTHORIZED
    );
  }

  const token = authHeader.split(' ')[1];
  const payload = await Toolbox.verifyToken(token);

  if (!payload || !payload.userId) {
    return ResponseUtils.error(
      res,
      'Unauthorized: Invalid token',
      StatusCode.UNAUTHORIZED
    );
  }

  const userResult = await mongoUserService.findOne({ userId: payload.userId });
  if (!userResult.status || !userResult.data) {
    return ResponseUtils.error(
      res,
      'Unauthorized: User not found',
      StatusCode.UNAUTHORIZED
    );
  }

  req.user = userResult.data;
  next();
}
