import { Request, Response } from 'express';
import { organizationService } from '../service/org.service';
import { userService } from '../service/user.service';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';
import OrgValidations from '../validations/org.validation';

// Extend the Express Request type to include user
type AuthenticatedRequest = import('../middleware/auth.middleware').AuthRequest;

export class OrgController {
  /**
   * Create a new organization
   */
  async createOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return ResponseUtils.error(
          res,
          'User not authenticated',
          StatusCode.UNAUTHORIZED
        );
      }

      // Validate request body
      const validationResult = await OrgValidations.createOrg(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(
          res,
          validationResult,
          StatusCode.BAD_REQUEST
        );
      }

      const { name, description } = req.body;

      // Get the Postgres user to obtain the internal id
      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      const org = await organizationService.create({
        name,
        description,
        owner: { connect: { id: user.id } },
        members: {
          create: [
            {
              user: { connect: { id: user.id } },
              role: 'ADMIN',
            },
          ],
        },
      });

      ResponseUtils.success(
        res,
        { org },
        'Organization created successfully',
        StatusCode.CREATED
      );
    } catch (e: any) {
      ResponseUtils.error(
        res,
        e.message,
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * List all organizations for the current user
   */
  public async listMyOrgs(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return ResponseUtils.error(
          res,
          'User not authenticated',
          StatusCode.UNAUTHORIZED
        );
      }

      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      const orgs = await organizationService.listUserOrganizations(user.id);

      ResponseUtils.success(
        res,
        { orgs },
        'Organizations retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(
        res,
        e.message,
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get organization details
   */
  public async getOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId } = req.params;

      if (!userId) {
        return ResponseUtils.error(
          res,
          'User not authenticated',
          StatusCode.UNAUTHORIZED
        );
      }

      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      const org = await organizationService.findById(orgId);

      if (
        !org ||
        (org.ownerId !== user.id &&
          !org.members.some((m: any) => m.userId === user.id))
      ) {
        return ResponseUtils.error(
          res,
          'Organization not found or access denied',
          StatusCode.NOT_FOUND
        );
      }

      ResponseUtils.success(
        res,
        { org },
        'Organization retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(
        res,
        e.message,
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update organization
   */
  public async updateOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId } = req.params;

      if (!userId) {
        return ResponseUtils.error(
          res,
          'User not authenticated',
          StatusCode.UNAUTHORIZED
        );
      }

      // Validate request body
      const validationResult = await OrgValidations.updateOrg(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(
          res,
          validationResult,
          StatusCode.BAD_REQUEST
        );
      }

      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      const { name, description, logoUrl, settings } = req.body;

      const org = await organizationService.update(
        orgId,
        { name, description, logoUrl, settings },
        user.id
      );

      ResponseUtils.success(
        res,
        { org },
        'Organization updated successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(
        res,
        e.message,
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Add bank account to organization
   */
  public async addBankAccount(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId } = req.params;

      if (!userId) {
        return ResponseUtils.error(
          res,
          'User not authenticated',
          StatusCode.UNAUTHORIZED
        );
      }

      // Validate bank account data
      const validationResult = await OrgValidations.bankAccount(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(
          res,
          validationResult,
          StatusCode.BAD_REQUEST
        );
      }

      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      const { bankName, accountName, accountNumber, notes, isDefault } =
        req.body;

      const bankAccount = await organizationService.addBankAccount(
        orgId,
        { bankName, accountName, accountNumber, notes, isDefault },
        user.id
      );

      ResponseUtils.success(
        res,
        { bankAccount },
        'Bank account added successfully',
        StatusCode.CREATED
      );
    } catch (e: any) {
      ResponseUtils.error(
        res,
        e.message,
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update bank account
   */
  public async updateBankAccount(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;
      const { bankName, accountName, accountNumber, notes, isDefault } =
        req.body;

      if (!userId) {
        return ResponseUtils.error(
          res,
          'User not authenticated',
          StatusCode.UNAUTHORIZED
        );
      }

      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      const bankAccount = await organizationService.updateBankAccount(
        accountId,
        { bankName, accountName, accountNumber, notes, isDefault },
        user.id
      );

      ResponseUtils.success(
        res,
        { bankAccount },
        'Bank account updated successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(
        res,
        e.message,
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete bank account
   */
  public async deleteBankAccount(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { accountId } = req.params;

      if (!userId) {
        return ResponseUtils.error(
          res,
          'User not authenticated',
          StatusCode.UNAUTHORIZED
        );
      }

      const user = await userService.findByUserId(userId);
      if (!user) {
        return ResponseUtils.error(
          res,
          'User not found',
          StatusCode.UNAUTHORIZED
        );
      }

      await organizationService.removeBankAccount(accountId, user.id);

      ResponseUtils.success(
        res,
        {},
        'Bank account deleted successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(
        res,
        e.message,
        StatusCode.INTERNAL_SERVER_ERROR
      );
    }
  }
}

export const OrgCtrl = new OrgController();

