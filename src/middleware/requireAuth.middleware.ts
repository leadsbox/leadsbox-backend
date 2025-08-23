import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token =
    (req.cookies?.leadsbox_token as string) ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);
  if (!token)
    return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET!) as any;
    (req as any).auth = claims;
    return next();
  } catch {
    return res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
}
