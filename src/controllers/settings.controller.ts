import { Response } from 'express';
import { organizationService } from '../service/org.service';
import { userService } from '../service/user.service';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';

type AuthenticatedRequest = import('../middleware/auth.middleware').AuthRequest;

class SettingsCtrl {
  static async getBankDetails(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    const orgId = req.header('x-org-id');
    if (!orgId) {
      return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
    }
    try {
      const org = await organizationService.findById(orgId);
      if (!org) {
        return ResponseUtils.error(
          res,
          'Organization not found',
          StatusCode.NOT_FOUND
        );
      }
      const bank = org.bankAccounts.find((b) => b.isDefault) || null;
      ResponseUtils.success(
        res,
        { bank },
        'Bank details retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  static async updateBankDetails(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    const orgId = req.header('x-org-id');
    if (!orgId) {
      return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
    }
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
    }
    try {
      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(res, 'User not found', StatusCode.UNAUTHORIZED);
      }
      const bank = await organizationService.addBankAccount(orgId, req.body, user.id);
      ResponseUtils.success(
        res,
        { bank },
        'Bank details updated successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  static async updateOrgDetails(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    const orgId = req.header('x-org-id');
    if (!orgId) {
      return ResponseUtils.error(res, 'Missing X-Org-Id', StatusCode.BAD_REQUEST);
    }
    const userId = req.user?.userId;
    if (!userId) {
      return ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
    }
    try {
      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(res, 'User not found', StatusCode.UNAUTHORIZED);
      }
      const org = await organizationService.update(orgId, req.body, user.id);
      ResponseUtils.success(
        res,
        { org },
        'Organization updated successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}

export { SettingsCtrl };
