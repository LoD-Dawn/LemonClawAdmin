import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create root organization
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: '总公司',
      type: 'company',
      path: '/root-company',
      level: 0,
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

  console.log('Seed data created')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
