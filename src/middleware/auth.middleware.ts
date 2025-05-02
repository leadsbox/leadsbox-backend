// src/middleware/auth.middleware.ts
import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { mongoUserService } from '../service/mongo';

export interface AuthRequest extends Request {
  user?: any;
}

const authMiddleware: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res
      .status(401)
      .json({ message: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const userId = payload.userId;

    const user = await mongoUserService.findOne({userId}, { session: null });
    
    if (!user.status || !user.data) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    (req as unknown as AuthRequest).user = user.data;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }
};

export default authMiddleware;
