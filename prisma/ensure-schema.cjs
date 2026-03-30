/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaLibSql } = require('@prisma/adapter-libsql')
const { PrismaClient } = require('@prisma/client')

const ROOT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001'
const DEFAULT_CONSUMER_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000002'
const ROOT_ORGANIZATION_NAME = '总公司'
const DEFAULT_CONSUMER_ORGANIZATION_NAME = '普通用户组织'
const ROOT_ORGANIZATION_PATH = '/root-company'
const DEFAULT_CONSUMER_ORGANIZATION_PATH = `${ROOT_ORGANIZATION_PATH}/consumer-users`

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl || databaseUrl.startsWith('file:')) {
    return new PrismaClient()
  }

  const adapter = new PrismaLibSql({ url: databaseUrl })
  return new PrismaClient({ adapter })
}

async function ensureUserAccountTypeColumn(prisma) {
  const columns = await prisma.$queryRawUnsafe("PRAGMA table_info('users')")
  const hasAccountType = columns.some((column) => column.name === 'account_type')

  if (!hasAccountType) {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE \"users\" ADD COLUMN \"account_type\" TEXT NOT NULL DEFAULT 'enterprise';"
    )
    console.log('[db:ensure-schema] Added users.account_type column')
  } else {
    console.log('[db:ensure-schema] users.account_type already exists')
  }

  const rowsNeedingBackfill = await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*) AS count
      FROM "users"
      WHERE "account_type" IS NULL
        OR "account_type" NOT IN ('consumer', 'enterprise')
        OR ("organization_id" = '${DEFAULT_CONSUMER_ORGANIZATION_ID}' AND "account_type" <> 'consumer')
        OR ("organization_id" <> '${DEFAULT_CONSUMER_ORGANIZATION_ID}' AND "account_type" <> 'enterprise')
    `
  )

  const needsBackfill = Number(rowsNeedingBackfill[0]?.count ?? 0) > 0
  if (needsBackfill) {
    await prisma.$executeRawUnsafe(
      `
        UPDATE "users"
        SET "account_type" = CASE
          WHEN "organization_id" = '${DEFAULT_CONSUMER_ORGANIZATION_ID}' THEN 'consumer'
          ELSE 'enterprise'
        END
        WHERE "account_type" IS NULL
          OR "account_type" NOT IN ('consumer', 'enterprise')
          OR ("organization_id" = '${DEFAULT_CONSUMER_ORGANIZATION_ID}' AND "account_type" <> 'consumer')
          OR ("organization_id" <> '${DEFAULT_CONSUMER_ORGANIZATION_ID}' AND "account_type" <> 'enterprise')
      `
    )
    console.log('[db:ensure-schema] users.account_type values backfilled')
  } else {
    console.log('[db:ensure-schema] users.account_type values already valid')
  }
}

async function ensureEmailVerificationCodesTable(prisma) {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'email_verification_codes'"
  )
  const hasTable = tables.length > 0

  if (!hasTable) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "email_verification_codes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "purpose" TEXT NOT NULL,
        "code_hash" TEXT NOT NULL,
        "expires_at" DATETIME NOT NULL,
        "last_sent_at" DATETIME NOT NULL,
        "consumed_at" DATETIME,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL
      );
    `)
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "email_verification_codes_email_purpose_key" ON "email_verification_codes"("email", "purpose");'
    )
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "email_verification_codes_expires_at_idx" ON "email_verification_codes"("expires_at");'
    )
    console.log('[db:ensure-schema] Created email_verification_codes table')
  } else {
    console.log('[db:ensure-schema] email_verification_codes already exists')
  }
}

async function ensureDefaultOrganizations(prisma) {
  const rootOrganization = await prisma.organization.upsert({
    where: { id: ROOT_ORGANIZATION_ID },
    update: {
      name: ROOT_ORGANIZATION_NAME,
      type: 'company',
      path: ROOT_ORGANIZATION_PATH,
      level: 0,
      parentId: null,
    },
    create: {
      id: ROOT_ORGANIZATION_ID,
      name: ROOT_ORGANIZATION_NAME,
      type: 'company',
      path: ROOT_ORGANIZATION_PATH,
      level: 0,
    },
  })

  await prisma.organization.upsert({
    where: { id: DEFAULT_CONSUMER_ORGANIZATION_ID },
    update: {
      name: DEFAULT_CONSUMER_ORGANIZATION_NAME,
      type: 'department',
      parentId: rootOrganization.id,
      path: DEFAULT_CONSUMER_ORGANIZATION_PATH,
      level: 1,
    },
    create: {
      id: DEFAULT_CONSUMER_ORGANIZATION_ID,
      name: DEFAULT_CONSUMER_ORGANIZATION_NAME,
      type: 'department',
      parentId: rootOrganization.id,
      path: DEFAULT_CONSUMER_ORGANIZATION_PATH,
      level: 1,
    },
  })

  console.log('[db:ensure-schema] Default organizations ensured')
}

async function main() {
  const prisma = createPrismaClient()

  try {
    await ensureUserAccountTypeColumn(prisma)
    await ensureEmailVerificationCodesTable(prisma)
    await ensureDefaultOrganizations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('[db:ensure-schema] failed:', error)
  process.exit(1)
})
