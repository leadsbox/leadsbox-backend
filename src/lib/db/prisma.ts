import { PrismaClient } from '@prisma/client';

// Extend the NodeJS global type with our prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Create a single PrismaClient instance
const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Export the PrismaClient instance
export const prisma = global.prisma || prismaClient;

// In development, store the PrismaClient instance in the global object
// to prevent multiple instances in development when using HMR
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prismaClient;
}

// Export all Prisma types and utilities
export type { Prisma } from '@prisma/client';

// Export a function to disconnect Prisma (useful for testing)
export const disconnect = async (): Promise<void> => {
  await prisma.$disconnect();
};

// Re-export all types from @prisma/client
export * from '@prisma/client';
