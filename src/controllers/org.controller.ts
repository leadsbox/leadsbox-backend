import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Org, { IBankAccount } from '../models/org.model';
import { ResponseUtils } from '../utils/reponse';
import { StatusCode } from '../types';
import OrgValidations from '../validations/org.validation';

// Extend the Express Request type to include user
type AuthenticatedRequest = import('../middleware/auth.middleware').AuthRequest;

export class OrgController {
  // Create a new organization
  async createOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
      }

      // Validate request body
      const validationResult = await OrgValidations.createOrg(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(res, validationResult, StatusCode.BAD_REQUEST);
      }

      const { name, description } = req.body;
      
      const org = await Org.create({
        name,
        description,
        owner: userId,
        members: [{
          user: userId,
          role: 'admin',
          addedAt: new Date()
        }]
      });

      ResponseUtils.success(
        res,
        { org },
        'Organization created successfully',
        StatusCode.CREATED
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // List all organizations for the current user
  public async listMyOrgs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
        return;
      }

      const orgs = await Org.find({
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      });

      ResponseUtils.success(
        res,
        { orgs },
        'Organizations retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // Get organization details
  public async getOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId } = req.params;
      
      if (!userId) {
        ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
        return;
      }

      const org = await Org.findOne({
        _id: orgId,
        $or: [
          { owner: userId },
          { 'members.user': userId }
        ]
      });

      if (!org) {
        ResponseUtils.error(res, 'Organization not found or access denied', StatusCode.NOT_FOUND);
        return;
      }

      ResponseUtils.success(
        res,
        { org },
        'Organization retrieved successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // Update organization
  public async updateOrg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId } = req.params;
      
      if (!userId) {
        return ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
      }

      // Validate request body
      const validationResult = await OrgValidations.updateOrg(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(res, validationResult, StatusCode.BAD_REQUEST);
      }

      const { name, description, logoUrl, settings } = req.body;

      const org = await Org.findOneAndUpdate(
        {
          _id: orgId,
          $or: [
            { owner: userId },
            { 'members.user': userId, 'members.role': 'admin' }
          ]
        },
        { $set: { name, description, logoUrl, settings } },
        { new: true, runValidators: true }
      );

      if (!org) {
        ResponseUtils.error(res, 'Organization not found or access denied', StatusCode.NOT_FOUND);
        return;
      }

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

  // Add bank account to organization
  public async addBankAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId } = req.params;
      
      if (!userId) {
        return ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
      }

      // Validate bank account data
      const validationResult = await OrgValidations.bankAccount(req.body);
      if (validationResult !== true) {
        return ResponseUtils.error(res, validationResult, StatusCode.BAD_REQUEST);
      }

      const { bankName, accountName, accountNumber, notes, isDefault } = req.body;

      const org = await Org.findOne({
        _id: orgId,
        $or: [
          { owner: userId },
          { 'members.user': userId, 'members.role': 'admin' }
        ]
      });

      if (!org) {
        ResponseUtils.error(res, 'Organization not found or access denied', StatusCode.NOT_FOUND);
        return;
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await Org.updateOne(
          { _id: orgId, 'bankAccounts.isDefault': true },
          { $set: { 'bankAccounts.$.isDefault': false } }
        );
      }

      const newBankAccount: IBankAccount = {
        bankName,
        accountName,
        accountNumber,
        isDefault: isDefault || false,
        notes
      };

      org.bankAccounts.push(newBankAccount);
      await org.save();

      ResponseUtils.success(
        res,
        { bankAccount: newBankAccount },
        'Bank account added successfully',
        StatusCode.CREATED
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // Update bank account
  public async updateBankAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId, accountId } = req.params;
      const { bankName, accountName, accountNumber, notes, isDefault } = req.body;
      
      if (!userId) {
        ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
        return;
      }

      const org = await Org.findOne({
        _id: orgId,
        $or: [
          { owner: userId },
          { 'members.user': userId, 'members.role': 'admin' }
        ]
      });

      if (!org) {
        ResponseUtils.error(res, 'Organization not found or access denied', StatusCode.NOT_FOUND);
        return;
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await Org.updateOne(
          { _id: orgId, 'bankAccounts.isDefault': true },
          { $set: { 'bankAccounts.$.isDefault': false } }
        );
      }

      const updateData: any = {};
      if (bankName) updateData['bankAccounts.$.bankName'] = bankName;
      if (accountName) updateData['bankAccounts.$.accountName'] = accountName;
      if (accountNumber) updateData['bankAccounts.$.accountNumber'] = accountNumber;
      if (notes !== undefined) updateData['bankAccounts.$.notes'] = notes;
      if (isDefault !== undefined) updateData['bankAccounts.$.isDefault'] = isDefault;

      const result = await Org.updateOne(
        { 
          _id: orgId, 
          'bankAccounts._id': accountId,
          $or: [
            { owner: userId },
            { 'members.user': userId, 'members.role': 'admin' }
          ]
        },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        ResponseUtils.error(res, 'Bank account not found or access denied', StatusCode.NOT_FOUND);
        return;
      }

      const updatedOrg = await Org.findById(orgId);
      const updatedAccount = updatedOrg?.bankAccounts.find(
        (acc: IBankAccount) => acc._id?.toString() === accountId
      );

      ResponseUtils.success(
        res,
        { bankAccount: updatedAccount },
        'Bank account updated successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }

  // Delete bank account
  public async deleteBankAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { orgId, accountId } = req.params;

      if (!userId) {
        return ResponseUtils.error(res, 'User not authenticated', StatusCode.UNAUTHORIZED);
      }

      const result = await Org.updateOne(
        { 
          _id: orgId,
          $or: [
            { owner: userId },
            { 'members.user': userId, 'members.role': 'admin' }
          ]
        },
        { $pull: { bankAccounts: { _id: accountId } } }
      );

      if (result.matchedCount === 0) {
        ResponseUtils.error(res, 'Bank account not found or access denied', StatusCode.NOT_FOUND);
        return;
      }

      ResponseUtils.success(
        res,
        {},
        'Bank account deleted successfully',
        StatusCode.OK
      );
    } catch (e: any) {
      ResponseUtils.error(res, e.message, StatusCode.INTERNAL_SERVER_ERROR);
    }
  }
}

export const OrgCtrl = new OrgController();
