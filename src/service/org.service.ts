import { Prisma, prisma, UserRole } from '../lib/db/prisma';

const OrgIncludeFull = {
  owner: true,
  members: { include: { user: true } },
  bankAccounts: true,
} as const;
type Organization = Prisma.OrganizationGetPayload<{
  include: typeof OrgIncludeFull;
}>;

type OrganizationMember = Prisma.OrganizationMemberGetPayload<{
  include: { user: true; organization: true };
}>;

type BankAccount = Prisma.BankAccountGetPayload<{
  include: { organization: true };
}>;

type User = Prisma.UserGetPayload<{
  include: { organizations: true; ownedOrganizations: true };
}>;

class OrganizationService {
  /**
   * Create a new organization
   */
  async create(
    data: Prisma.OrganizationCreateInput & {
      settings?: {
        currency?: string;
        timezone?: string;
        dateFormat?: string;
      };
    }
  ): Promise<Organization> {
    return prisma.organization.create({
      data: {
        ...data,
        settings: data.settings || {
          currency: 'NGN', // Default currency
          timezone: 'UTC', // Default timezone
          dateFormat: 'YYYY-MM-DD', // Default date format
        },
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
        bankAccounts: true,
      },
    });
  }

  /**
   * Find an organization by ID (always returns full shape)
   * If you really need a customizable include, I show a generic overload below.
   */
  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
      include: OrgIncludeFull,
    });
  }

  /**
   * List all organizations for a user (where user is owner or member)
   */
  async listUserOrganizations(userId: string): Promise<Organization[]> {
    return prisma.organization.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
        bankAccounts: true,
      },
      orderBy: { createdAt: 'desc' },
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
            user: true,
          },
        },
        bankAccounts: true,
      },
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
        role,
      },
      include: {
        user: true,
        organization: true,
      },
    });
  }

  /**
   * Remove a member (two-step safety; prevents removing the last owner)
   */
  async removeMember(
    orgId: string,
    userId: string,
    currentUserId: string
  ): Promise<void> {
    await this.verifyUserAccess(orgId, currentUserId, [
      UserRole.ADMIN,
      UserRole.OWNER,
    ]);

    const member = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, userId },
      select: { id: true, role: true },
    });
    if (!member) return;

    if (member.role === UserRole.OWNER) {
      const ownerCount = await prisma.organizationMember.count({
        where: { organizationId: orgId, role: UserRole.OWNER },
      });
      if (ownerCount <= 1) {
        throw new Error('Cannot remove the last owner of the organization');
      }
    }

    await prisma.organizationMember.deleteMany({
      where: { organizationId: orgId, userId },
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
        data: { isDefault: false },
      });
    }

    return prisma.bankAccount.create({
      data: {
        ...data,
        organization: { connect: { id: orgId } },
      },
      include: {
        organization: true,
      },
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
      include: { organization: true },
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    // Verify user has permission to update this bank account
    await this.verifyUserAccess(account.organizationId, userId, [
      'ADMIN',
      'OWNER',
    ]);

    // If setting as default, unset any existing default
    if (data.isDefault === true) {
      await prisma.bankAccount.updateMany({
        where: {
          organizationId: account.organizationId,
          id: { not: accountId },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return prisma.bankAccount.update({
      where: { id: accountId },
      data,
      include: {
        organization: true,
      },
    });
  }

  /**
   * Remove a bank account
   */
  async removeBankAccount(accountId: string, userId: string): Promise<void> {
    // Get the account to verify organization
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      include: { organization: true },
    });

    if (!account) {
      throw new Error('Bank account not found');
    }

    // Verify user has permission to remove this bank account
    await this.verifyUserAccess(account.organizationId, userId, [
      'ADMIN',
      'OWNER',
    ]);

    await prisma.bankAccount.delete({
      where: { id: accountId },
    });
  }

  /**
   * Verify user has access to an organization with optional required role
   */
  private async verifyUserAccess(
    orgId: string,
    userId: string,
    requiredRoles: UserRole[] = [UserRole.MEMBER]
  ): Promise<Organization> {
    const org = await prisma.organization.findFirst({
      where: {
        id: orgId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                role: { in: requiredRoles }, // enum array, not strings
              },
            },
          },
        ],
      },
      include: OrgIncludeFull, // must match the Organization alias
    });

    if (!org) throw new Error('Organization not found or access denied');
    return org;
  }
}

export const organizationService = new OrganizationService();
