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
      `
    )
    console.log('[db:ensure-schema] users.account_type values backfilled')
  } else {
    console.log('[db:ensure-schema] users.account_type values already valid')
  }
}

async function ensureOAuthClientDefaultOrganizationColumn(prisma) {
  const columns = await prisma.$queryRawUnsafe("PRAGMA table_info('oauth_clients')")
  const hasDefaultOrganizationId = columns.some((column) => column.name === 'default_organization_id')

  if (!hasDefaultOrganizationId) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "oauth_clients" ADD COLUMN "default_organization_id" TEXT;'
    )
    console.log('[db:ensure-schema] Added oauth_clients.default_organization_id column')
  } else {
    console.log('[db:ensure-schema] oauth_clients.default_organization_id already exists')
  }
}

async function ensureUserPhoneColumn(prisma) {
  const columns = await prisma.$queryRawUnsafe("PRAGMA table_info('users')")
  const hasPhone = columns.some((column) => column.name === 'phone')

  if (!hasPhone) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "users" ADD COLUMN "phone" TEXT;'
    )
    console.log('[db:ensure-schema] Added users.phone column')
  } else {
    console.log('[db:ensure-schema] users.phone already exists')
  }

  const indexes = await prisma.$queryRawUnsafe("PRAGMA index_list('users')")
  const hasPhoneUniqueIndex = indexes.some((index) => index.name === 'users_phone_key')

  if (!hasPhoneUniqueIndex) {
    await prisma.$executeRawUnsafe(
      'CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");'
    )
    console.log('[db:ensure-schema] Created users.phone unique index')
  } else {
    console.log('[db:ensure-schema] users.phone unique index already exists')
  }
}

async function ensurePhoneVerificationCodesTable(prisma) {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'phone_verification_codes'"
  )
  const hasTable = tables.length > 0

  if (!hasTable) {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "phone_verification_codes" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "phone" TEXT NOT NULL,
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
      'CREATE UNIQUE INDEX "phone_verification_codes_phone_purpose_key" ON "phone_verification_codes"("phone", "purpose");'
    )
    await prisma.$executeRawUnsafe(
      'CREATE INDEX "phone_verification_codes_expires_at_idx" ON "phone_verification_codes"("expires_at");'
    )
    console.log('[db:ensure-schema] Created phone_verification_codes table')
  } else {
    console.log('[db:ensure-schema] phone_verification_codes already exists')
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
    await ensureUserPhoneColumn(prisma)
    await ensureOAuthClientDefaultOrganizationColumn(prisma)
    await ensurePhoneVerificationCodesTable(prisma)
    await ensureDefaultOrganizations(prisma)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('[db:ensure-schema] failed:', error)
  process.exit(1)
})
