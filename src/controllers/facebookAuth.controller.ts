import { Request, Response } from 'express';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types/response';
import { Toolbox } from '../utils/tools'; 

class FacebookAuthController {
  public async facebookCallback(req: Request, res: Response): Promise<void> {
    const user = req.user as any; 
    if (!user) {
      return ResponseUtils.error(res, 'Authentication failed', StatusCode.UNAUTHORIZED);
    }
    
    try {
      const token = await Toolbox.createToken({ userId: user.userId });
      return ResponseUtils.success(
        res,
        { user, token },
        'Facebook login successful',
        StatusCode.OK
      );
    } catch (error: any) {
      return ResponseUtils.error(
        res,
        'Error generating token',
        StatusCode.INTERNAL_SERVER_ERROR,
        error.message || error
      );
    }
  }
}

export const FacebookAuthCtrl = new FacebookAuthController();
