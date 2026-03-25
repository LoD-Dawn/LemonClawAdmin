import 'server-only'

import { db } from '@/lib/db'

function normalizeTagIds(tagIds: string[]): string[] {
  const seen = new Set<string>()

  return tagIds.reduce<string[]>((result, tagId) => {
    const normalized = tagId.trim()
    if (!normalized || seen.has(normalized)) {
      return result
    }

    seen.add(normalized)
    result.push(normalized)
    return result
  }, [])
}

export async function findUnknownSkillTagIds(tagIds: string[], allowedTagIds: string[] = []) {
  const normalizedTagIds = normalizeTagIds(tagIds)
  if (normalizedTagIds.length === 0) {
    return []
  }

  const allowed = new Set(normalizeTagIds(allowedTagIds))
  const managedTags = await db.skillTag.findMany({
    where: {
      id: { in: normalizedTagIds },
      isActive: true,
    },
    select: { id: true },
  })

  for (const tag of managedTags) {
    allowed.add(tag.id)
  }

  return normalizedTagIds.filter((tagId) => !allowed.has(tagId))
}
