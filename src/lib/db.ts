import 'server-only'

import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '@prisma/client'

type PrismaClientInstance = InstanceType<typeof PrismaClient>

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientInstance
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  // If no DATABASE_URL or using local file (SQLite), use default client
  if (!databaseUrl || databaseUrl.startsWith('file:')) {
    return new PrismaClient()
  }

  // Use libsql adapter for Turso (libsql:// URLs)
  const adapter = new PrismaLibSql({ url: databaseUrl })
  return new PrismaClient({ adapter })
}

const legacyPrisma = globalForPrisma.prisma
export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db

  if (legacyPrisma && legacyPrisma !== db) {
    void legacyPrisma.$disconnect().catch(() => undefined)
  }
}
