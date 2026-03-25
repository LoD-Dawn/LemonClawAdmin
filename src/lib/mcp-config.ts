import { z } from 'zod'

export const mcpConfigIdPattern = /^[a-z0-9][a-z0-9_-]{0,62}$/

const stringArraySchema = z.array(z.string().trim().min(1)).max(100)

export const mcpConfigSchema = z.object({
  id: z.string().regex(mcpConfigIdPattern, 'Invalid MCP id format'),
  name: z.string().min(1).max(255),
  description_zh: z.string().trim().max(1000).optional(),
  description_en: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(1).max(64),
  transportType: z.string().trim().min(1).max(64),
  command: z.string().trim().min(1).max(255),
  defaultArgs: stringArraySchema.default([]),
  requiredEnvKeys: stringArraySchema.default([]),
  optionalEnvKeys: stringArraySchema.default([]),
})

export type McpConfigPayload = z.infer<typeof mcpConfigSchema>

export function parseLineSeparatedValues(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function toLineSeparatedValues(values: string[] | null | undefined): string {
  return (values ?? []).join('\n')
}

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((value) => String(value).trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

export function stringifyJsonStringArray(values: string[] | null | undefined): string {
  return JSON.stringify(
    (values ?? [])
      .map((value) => value.trim())
      .filter(Boolean)
  )
}

export function toMcpConfigPayload(mcp: {
  mcpId: string
  name: string
  descriptionZh: string | null
  descriptionEn: string | null
  category: string
  transportType: string
  command: string
  defaultArgsJson: string
  requiredEnvKeysJson: string
  optionalEnvKeysJson: string
}): McpConfigPayload {
  return {
    id: mcp.mcpId,
    name: mcp.name,
    description_zh: mcp.descriptionZh ?? undefined,
    description_en: mcp.descriptionEn ?? undefined,
    category: mcp.category,
    transportType: mcp.transportType,
    command: mcp.command,
    defaultArgs: parseJsonStringArray(mcp.defaultArgsJson),
    requiredEnvKeys: parseJsonStringArray(mcp.requiredEnvKeysJson),
    optionalEnvKeys: parseJsonStringArray(mcp.optionalEnvKeysJson),
  }
}

export function toMcpStorageFields(config: McpConfigPayload) {
  return {
    mcpId: config.id,
    name: config.name,
    descriptionZh: config.description_zh?.trim() || null,
    descriptionEn: config.description_en?.trim() || null,
    category: config.category.trim(),
    transportType: config.transportType.trim(),
    command: config.command.trim(),
    defaultArgsJson: stringifyJsonStringArray(config.defaultArgs),
    requiredEnvKeysJson: stringifyJsonStringArray(config.requiredEnvKeys),
    optionalEnvKeysJson: stringifyJsonStringArray(config.optionalEnvKeys),
  }
}
