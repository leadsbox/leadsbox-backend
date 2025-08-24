// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// If you need Prisma types elsewhere, import them directly where needed:
//   import type { Prisma } from '@prisma/client';

// Handy shutdown for tests
export const disconnect = async (): Promise<void> => {
  await prisma.$disconnect();
};
