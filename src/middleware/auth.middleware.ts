// src/middleware/auth.middleware.ts
import { RequestHandler, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { userService } from '../service/user.service';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';

export interface AuthRequest extends Request {
  user?: any;
}

const authMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // 1️⃣ Grab token from cookie or header
  const token =
    req.cookies?.leadsbox_token ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ message: 'Missing authentication token' });
    return; // <-- void
  }

  try {
    // 2️⃣ Verify JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await userService.findByUserId(payload.userId);
    if (!user) {
      return ResponseUtils.error(
        res,
        'User not found',
        StatusCode.UNAUTHORIZED
      );
    }

    // 4️⃣ Attach user to req
    (req as AuthRequest).user = {
      ...user,
      userId: payload.userId,
    };

    next(); // continue
  } catch (err) {
    res
      .status(401)
      .json({ message: 'Invalid or expired authentication token' });
    return; // <-- void
  }
};

export default authMiddleware;
