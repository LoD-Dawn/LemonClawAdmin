import type { ResourceCatalogItem } from '@/lib/resource-access'

export type ClientSkillTagDto = {
  id: string
  en: string
  zh: string
}

export type ClientSkillDto = {
  id: string
  resourceId: string
  name: string
  description: {
    en: string | null
    zh: string | null
  }
  tags: ClientSkillTagDto[]
  tagIds: string[]
  url: string | null
  version: string | null
  source: {
    from: string | null
    url: string | null
    author: string | null
  }
  permission: {
    accessState: ResourceCatalogItem['accessState']
    canUse: boolean
    canApply: boolean
    grantStatus: ResourceCatalogItem['grantStatus']
    applicationStatus: ResourceCatalogItem['applicationStatus']
    sensitiveFieldsHidden: boolean
  }
}

export function parseTagsJson(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) {
    return []
  }

  try {
    const parsed = JSON.parse(tagsJson) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((tag) => String(tag).trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export function buildTagsJson(tags: string[]): string | null {
  const normalized = tags
    .map((tag) => tag.trim())
    .filter(Boolean)

  return normalized.length > 0 ? JSON.stringify(normalized) : null
}

function buildFallbackTag(tagId: string): ClientSkillTagDto {
  return {
    id: tagId,
    en: tagId,
    zh: tagId,
  }
}

export function toClientSkillDto(
  skill: ResourceCatalogItem,
  tagDictionary: ReadonlyMap<string, ClientSkillTagDto>
): ClientSkillDto {
  const tagIds = parseTagsJson(skill.tagsJson)

  return {
    id: skill.identifier,
    resourceId: skill.id,
    name: skill.name,
    description: {
      en: skill.descriptionEn,
      zh: skill.descriptionZh,
    },
    tags: tagIds.map((tagId) => tagDictionary.get(tagId) ?? buildFallbackTag(tagId)),
    tagIds,
    url: skill.sensitiveFieldsHidden ? null : skill.packageUrl,
    version: skill.version,
    source: {
      from: skill.sourceFrom,
      url: skill.sourceUrl,
      author: skill.sourceAuthor,
    },
    permission: {
      accessState: skill.accessState,
      canUse: skill.canUse,
      canApply: skill.canApply,
      grantStatus: skill.grantStatus,
      applicationStatus: skill.applicationStatus,
      sensitiveFieldsHidden: skill.sensitiveFieldsHidden,
    },
  }
}
