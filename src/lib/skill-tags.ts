import { z } from 'zod'

const skillTagIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/

const normalizeLabel = (max: number) =>
  z.string().trim().min(1).max(max)

export const skillTagIdSchema = z.string().regex(skillTagIdPattern, 'Invalid tag id format')

export const skillTagSchema = z.object({
  id: skillTagIdSchema,
  en: normalizeLabel(64),
  zh: normalizeLabel(64),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
})

export const skillTagUpdateSchema = z.object({
  en: normalizeLabel(64).optional(),
  zh: normalizeLabel(64).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
})

export type SkillTagOption = {
  id: string
  en: string
  zh: string
  sortOrder?: number
  isActive?: boolean
}
