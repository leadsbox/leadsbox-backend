import { prisma } from '../lib/db/prisma';
import type { Prisma } from '../generated/prisma';

// Define types based on Prisma schema
type Organization = Prisma.OrganizationGetPayload<{
  include: {
    owner: true;
    members: {
      include: {
        user: true;
      };
    };
    bankAccounts: true;
  };
}>;

type OrganizationMember = Prisma.OrganizationMemberGetPayload<{
  include: {
    user: true;
    organization: true;
  };
}>;

type BankAccount = Prisma.BankAccountGetPayload<{
  include: {
    organization: true;
  };
}>;

type User = Prisma.UserGetPayload<{
  include: {
    organizations: true;
    ownedOrganizations: true;
  };
}>;

class OrganizationService {
  /**
   * Create a new organization
   */
  async create(data: Prisma.OrganizationCreateInput & {
    settings?: {
      currency?: string;
      timezone?: string;
      dateFormat?: string;
    };
  }): Promise<Organization> {
    return prisma.organization.create({
      data: {
        ...data,
        settings: data.settings || {
          currency: 'NGN',  // Default currency
          timezone: 'UTC',  // Default timezone
          dateFormat: 'YYYY-MM-DD'  // Default date format
        }
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        bankAccounts: true
      }
    });
  }

  /**
   * Find an organization by ID with optional relations
   */
  async findById(
    id: string,
    include: Prisma.OrganizationInclude = {
      owner: true,
      members: {
        include: {
          user: true
        }
      },
      bankAccounts: true
    }
  ): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
      include
    });
  }

  /**
   * List all organizations for a user (where user is owner or member)
   */
  async listUserOrganizations(userId: string): Promise<Organization[]> {
    return prisma.organization.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        bankAccounts: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Update an organization
   */
  async update(
    id: string,
    data: Prisma.OrganizationUpdateInput,
    userId: string
  ): Promise<Organization> {
    // Verify user has permission to update this organization
    const org = await this.verifyUserAccess(id, userId);
    if (!org) {
      throw new Error('Organization not found or access denied');
    }

    return prisma.organization.update({
      where: { id },
      data,
      include: {
        owner: true,
        members: {
          include: {
            user: true
          }
        },
        bankAccounts: true
      }
    });
  }

  /**
   * Add a member to an organization
   */
  async addMember(
    orgId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER' = 'MEMBER',
    currentUserId: string
  ): Promise<OrganizationMember> {
    // Verify current user has permission to add members
    await this.verifyUserAccess(orgId, currentUserId, ['ADMIN', 'OWNER']);

    return prisma.organizationMember.create({
      data: {
        organization: { connect: { id: orgId } },
        user: { connect: { id: userId } },
        role
      },
      include: {
        user: true,
        organization: true
      }
    });
  }

  /**
   * Remove a member from an organization
   */
  async removeMember(orgId: string, userId: string, currentUserId: string): Promise<void> {
    // Verify current user has permission to remove members
    await this.verifyUserAccess(orgId, currentUserId, ['ADMIN', 'OWNER']);

    await prisma.organizationMember.deleteMany({
      where: {
        organizationId: orgId,
        userId,
        // Prevent removing the last owner
        NOT: {
          AND: [
            { role: 'OWNER' },
            {
              organization: {
                members: {
                  every: {
                    role: 'OWNER',
                    userId: userId
                  }
                }
              }
            }
          ]
        }
      }
    });
  }

  /**
   * Add a bank account to an organization
   */
  async addBankAccount(
    orgId: string,
    data: Omit<Prisma.BankAccountCreateInput, 'organization'>,
    userId: string
  ): Promise<BankAccount> {
    // Verify user has permission to add bank accounts
    await this.verifyUserAccess(orgId, userId, ['ADMIN', 'OWNER']);

    // If setting as default, unset any existing default
    if (data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false }
      });
    }

    return prisma.bankAccount.create({
      data: {
        ...data,
        organization: { connect: { id: orgId } }
      },
      include: {
        organization: true
      }
    });
  }

  /**
   * Update a bank account
   */
  async updateBankAccount(
    accountId: string,
    data: Prisma.BankAccountUpdateInput,
    userId: string
  ): Promise<BankAccount> {
    // Get the account to verify organization
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      include: { organization: true }
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    // Verify user has permission to update this bank account
    await this.verifyUserAccess(account.organizationId, userId, ['ADMIN', 'OWNER']);

    // If setting as default, unset any existing default
    if (data.isDefault === true) {
      await prisma.bankAccount.updateMany({
        where: { 
          organizationId: account.organizationId,
          id: { not: accountId },
          isDefault: true 
        },
        data: { isDefault: false }
      });
    }

    return prisma.bankAccount.update({
      where: { id: accountId },
      data,
      include: {
        organization: true
      }
    });
  }

  /**
   * Remove a bank account
   */
  async removeBankAccount(accountId: string, userId: string): Promise<void> {
    // Get the account to verify organization
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      include: { organization: true }
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    // Verify user has permission to remove this bank account
    await this.verifyUserAccess(account.organizationId, userId, ['ADMIN', 'OWNER']);

    await prisma.bankAccount.delete({
      where: { id: accountId }
    });
  }

  /**
   * Verify user has access to an organization with optional required role
   */
  private async verifyUserAccess(
    orgId: string,
    userId: string,
    requiredRoles: Array<'ADMIN' | 'MEMBER' | 'OWNER'> = ['MEMBER']
  ): Promise<Organization> {
    const org = await prisma.organization.findFirst({
      where: {
        id: orgId,
        OR: [
          // User is the owner
          { ownerId: userId },
          // Or user is a member with required role
          {
            members: {
              some: {
                userId,
                role: {
                  in: requiredRoles
                }
              }
            }
          }
        ]
      },
      include: {
        members: true
      }
    });

    if (!org) {
      throw new Error('Organization not found or access denied');
    }

    return org;
  }
}

export const organizationService = new OrganizationService();
