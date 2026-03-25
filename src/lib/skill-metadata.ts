import { z } from 'zod'
import { buildTagsJson } from '@/lib/skill-catalog'

const identifierPattern = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$/

const optionalText = (max: number) => z.string().max(max).nullable().optional()

export const skillMetadataSchema = z.object({
  name: z.string().min(1).max(255),
  identifier: z.string().regex(identifierPattern, 'Invalid identifier format'),
  description: optionalText(2000),
  descriptionEn: optionalText(2000),
  descriptionZh: optionalText(2000),
  tags: z.array(z.string().min(1).max(64)).max(20).optional().default([]),
  packageUrl: optionalText(1000),
  version: optionalText(255),
  sourceFrom: optionalText(255),
  sourceUrl: optionalText(1000),
  sourceAuthor: optionalText(255),
  visibility: z.enum(['company', 'department', 'personal']),
  ownerId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
})

export const skillMetadataUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: optionalText(2000),
  descriptionEn: optionalText(2000),
  descriptionZh: optionalText(2000),
  tags: z.array(z.string().min(1).max(64)).max(20).optional(),
  packageUrl: optionalText(1000),
  version: optionalText(255),
  sourceFrom: optionalText(255),
  sourceUrl: optionalText(1000),
  sourceAuthor: optionalText(255),
  isActive: z.boolean().optional(),
})

export function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeTags(tags: string[] | undefined): string[] {
  if (!tags) {
    return []
  }

  const seen = new Set<string>()

  return tags.reduce<string[]>((result, tag) => {
    const normalized = tag.trim()
    if (!normalized) {
      return result
    }

    const key = normalized.toLowerCase()
    if (seen.has(key)) {
      return result
    }

    seen.add(key)
    result.push(normalized)
    return result
  }, [])
}

export function buildSkillMetadataData(input: {
  description?: string | null
  descriptionEn?: string | null
  descriptionZh?: string | null
  tags?: string[]
  packageUrl?: string | null
  version?: string | null
  sourceFrom?: string | null
  sourceUrl?: string | null
  sourceAuthor?: string | null
}) {
  const data: Record<string, string | null> = {}

  if ('description' in input) {
    data.description = normalizeOptionalString(input.description)
  }

  if ('descriptionEn' in input) {
    data.descriptionEn = normalizeOptionalString(input.descriptionEn)
  }

  if ('descriptionZh' in input) {
    data.descriptionZh = normalizeOptionalString(input.descriptionZh)
  }

  if ('tags' in input) {
    data.tagsJson = buildTagsJson(normalizeTags(input.tags))
  }

  if ('packageUrl' in input) {
    data.packageUrl = normalizeOptionalString(input.packageUrl)
  }

  if ('version' in input) {
    data.version = normalizeOptionalString(input.version)
  }

  if ('sourceFrom' in input) {
    data.sourceFrom = normalizeOptionalString(input.sourceFrom)
  }

  if ('sourceUrl' in input) {
    data.sourceUrl = normalizeOptionalString(input.sourceUrl)
  }

  if ('sourceAuthor' in input) {
    data.sourceAuthor = normalizeOptionalString(input.sourceAuthor)
  }

  return data
}
