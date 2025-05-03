// src/middleware/auth.middleware.ts
import { RequestHandler, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { mongoUserService } from '../service/mongo';

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
  console.log('Auth cookies:', req.cookies);

  if (!token) {
    res.status(401).json({ message: 'Missing authentication token' });
    return; // <-- void
  }

  try {
    // 2️⃣ Verify JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    // 3️⃣ Lookup user
    const result = await mongoUserService.findOne(
      { userId: payload.userId },
      { session: null }
    );

    if (!result.status || !result.data) {
      res.status(401).json({ message: 'User not found' });
      return; // <-- void
    }

    // 4️⃣ Attach user to req
    (req as AuthRequest).user = {
      ...result.data,
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
