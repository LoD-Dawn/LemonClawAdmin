import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  DEFAULT_CONSUMER_ORGANIZATION_ID,
  DEFAULT_CONSUMER_ORGANIZATION_NAME,
  DEFAULT_CONSUMER_ORGANIZATION_PATH,
  ROOT_ORGANIZATION_ID,
  ROOT_ORGANIZATION_NAME,
  ROOT_ORGANIZATION_PATH,
} from '../src/lib/default-organizations'

const prisma = new PrismaClient()

async function main() {
  // Create root organization
  const org = await prisma.organization.upsert({
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
      parentId: org.id,
      path: DEFAULT_CONSUMER_ORGANIZATION_PATH,
      level: 1,
    },
    create: {
      id: DEFAULT_CONSUMER_ORGANIZATION_ID,
      name: DEFAULT_CONSUMER_ORGANIZATION_NAME,
      type: 'department',
      parentId: org.id,
      path: DEFAULT_CONSUMER_ORGANIZATION_PATH,
      level: 1,
    },
  })

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@local.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Administrator',
      accountType: 'enterprise',
      organizationId: org.id,
      isSuperAdmin: true,
      isActive: true,
    },
  })

  await prisma.userClawQuota.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      creditBalance: 680,
      pricingVersion: '2026-03-v2',
    },
  })

  await prisma.skillTag.upsert({
    where: { id: 'productivity' },
    update: {
      en: 'Productivity',
      zh: '效率',
      sortOrder: 0,
      isActive: true,
    },
    create: {
      id: 'productivity',
      en: 'Productivity',
      zh: '效率',
      sortOrder: 0,
      isActive: true,
    },
  })

  console.log('Seed data created, including default consumer organization')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
