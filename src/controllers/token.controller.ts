import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

class TokenController {
  /**
   * Check the validity of the JWT stored in the "leadsbox_token" cookie (or Authorization header).
   */
  public async checkToken(req: Request, res: Response): Promise<void> {
    // Try to read from cookie first
    const token = req.cookies['leadsbox_token']
      // Fallback to Authorization header if needed
      || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
      res.status(401).json({ ok: false, message: 'No token provided' });
      return;
    }

    try {
      // Verify the token
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, any>;
      res.json({ ok: true, payload });
    } catch (err) {
      res.status(401).json({ ok: false, message: 'Invalid or expired token' });
    }
  }
}

export const tokenController = new TokenController();