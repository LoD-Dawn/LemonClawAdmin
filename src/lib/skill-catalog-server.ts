import 'server-only'

import { db } from '@/lib/db'
import type { ResourceCatalogItem } from '@/lib/resource-access'
import { type ClientSkillDto, type ClientSkillTagDto, parseTagsJson, toClientSkillDto } from '@/lib/skill-catalog'

export async function buildClientSkillDtos(skills: ResourceCatalogItem[]): Promise<ClientSkillDto[]> {
  const tagIds = [...new Set(skills.flatMap((skill) => parseTagsJson(skill.tagsJson)))]
  const tagDictionary = new Map<string, ClientSkillTagDto>()

  if (tagIds.length > 0) {
    const managedTags = await db.skillTag.findMany({
      where: {
        id: {
          in: tagIds,
        },
      },
      select: {
        id: true,
        en: true,
        zh: true,
      },
    })

    for (const tag of managedTags) {
      tagDictionary.set(tag.id, tag)
    }
  }

  return skills.map((skill) => toClientSkillDto(skill, tagDictionary))
}
