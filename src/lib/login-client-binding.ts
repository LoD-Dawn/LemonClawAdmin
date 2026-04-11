import type { Prisma } from '@prisma/client'

export type LoginClientBinding = {
  clientId: string
  organizationId: string
  organizationName: string
  organizationType: string
}

type PrismaLike = Prisma.TransactionClient | {
  oAuthClient: {
    findUnique: Prisma.TransactionClient['oAuthClient']['findUnique']
  }
  organization: {
    findUnique: Prisma.TransactionClient['organization']['findUnique']
  }
}

export async function resolveLoginClientBinding(
  prisma: PrismaLike,
  clientId: string | null | undefined
): Promise<LoginClientBinding | null> {
  const normalizedClientId = clientId?.trim()
  if (!normalizedClientId) {
    return null
  }

  const client = await prisma.oAuthClient.findUnique({
    where: { clientId: normalizedClientId },
    select: {
      clientId: true,
      isActive: true,
      defaultOrganizationId: true,
    },
  })

  if (!client || !client.isActive || !client.defaultOrganizationId) {
    return null
  }

  const organization = await prisma.organization.findUnique({
    where: { id: client.defaultOrganizationId },
    select: {
      id: true,
      name: true,
      type: true,
    },
  })

  if (!organization) {
    throw new Error('LOGIN_CLIENT_BINDING_ORGANIZATION_NOT_FOUND')
  }

  return {
    clientId: client.clientId,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationType: organization.type,
  }
}
