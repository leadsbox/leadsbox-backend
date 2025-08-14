import { Prisma, prisma } from '../lib/db/prisma';
import { UserProvider } from '../types';

// Define the User type with related fields
type User = Prisma.UserGetPayload<{
  include?: {
    organizations?: true;
    organizationMemberships?: true;
    ownedOrganizations?: true;
    whatsAppConnections?: true;
    leads?: true;
  };
}>;

class UserService {
  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find a user by their userId (external ID)
   */
  async findByUserId(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { userId },
    });
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find a user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  /**
   * Find a user by either email or username
   */
  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });
  }

  /**
   * Find a user by provider and provider ID
   */
  async findByProvider(
    provider: UserProvider,
    providerId: string
  ): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  }

  /**
   * Create a new user
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Update a user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<User> {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Create or update a user based on provider information
   */
  async upsertByProvider(
    provider: UserProvider,
    providerId: string,
    data: Prisma.UserCreateInput
  ): Promise<User> {
    return prisma.user.upsert({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      update: {
        ...data,
        provider,
        providerId,
      },
      create: {
        ...data,
        provider,
        providerId,
        userId: data.userId || providerId, // Use providerId as userId if not provided
      },
    });
  }
}

export const userService = new UserService();
