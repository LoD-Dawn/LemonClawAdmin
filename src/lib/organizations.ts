import { db } from '@/lib/db'

export async function buildOrganizationPath(parentId: string | null, currentName: string): Promise<{ path: string; level: number }> {
  const baseSlug = generateSlug(currentName) || 'organization'

  if (!parentId) {
    const slug = await ensureUniqueSlug(parentId, baseSlug)
    return { path: `/${slug}`, level: 0 }
  }

  const parent = await db.organization.findUnique({ where: { id: parentId } })
  if (!parent) {
    throw new Error('Parent organization not found')
  }

  const slug = await ensureUniqueSlug(parentId, baseSlug)
  const path = `${parent.path}/${slug}`

  return { path, level: parent.level + 1 }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

async function ensureUniqueSlug(parentId: string | null, baseSlug: string): Promise<string> {
  const siblings = await db.organization.findMany({
    where: { parentId },
    select: { path: true }
  })

  const existingSlugs = new Set(
    siblings
      .map((organization) => organization.path.split('/').filter(Boolean).at(-1))
      .filter((slug): slug is string => Boolean(slug))
  )

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  let index = 2
  while (existingSlugs.has(`${baseSlug}-${index}`)) {
    index += 1
  }

  return `${baseSlug}-${index}`
}

export async function getOrganizationDescendants(path: string): Promise<string[]> {
  const orgs = await db.organization.findMany({
    where: {
      OR: [
        { path },
        { path: { startsWith: `${path}/` } },
      ],
    },
    select: { id: true }
  })
  return orgs.map(o => o.id)
}

export async function getOrganizationScopeIds(organizationId: string | null | undefined): Promise<string[]> {
  if (!organizationId) {
    return []
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { path: true },
  })

  if (!organization) {
    return []
  }

  return getOrganizationDescendants(organization.path)
}

export async function isOrganizationInScope(
  candidateOrganizationId: string | null | undefined,
  rootOrganizationId: string | null | undefined
): Promise<boolean> {
  if (!candidateOrganizationId || !rootOrganizationId) {
    return false
  }

  const scopedOrganizationIds = await getOrganizationScopeIds(rootOrganizationId)
  return scopedOrganizationIds.includes(candidateOrganizationId)
}
