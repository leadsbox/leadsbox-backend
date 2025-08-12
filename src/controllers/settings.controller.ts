import { Request, Response } from 'express';
import { Types } from 'mongoose';
import OrgBankDetails from '../models/orgBankDetails.model';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';

class SettingsCtrl {
  static async getBankDetails(req: Request, res: Response): Promise<void> {
    const orgIdHeader = req.header('x-org-id');
    if (!orgIdHeader)
      ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
    const orgId = new Types.ObjectId(orgIdHeader);
    const bank = await OrgBankDetails.findOne({ orgId });
    ResponseUtils.success(
      res,
      { bank },
      'Bank details retrieved successfully',
      StatusCode.OK
    );
  }

  static async updateBankDetails(req: Request, res: Response): Promise<void> {
    const orgIdHeader = req.header('x-org-id');
    if (!orgIdHeader)
      ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
    const orgId = new Types.ObjectId(orgIdHeader);
    const update = { ...req.body, orgId };
    const bank = await OrgBankDetails.findOneAndUpdate({ orgId }, update, {
      upsert: true,
      new: true,
    });
    res.json(bank);
  }
}

export { SettingsCtrl };
