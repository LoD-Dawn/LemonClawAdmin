import { z } from 'zod'

export const modelProviderKeyPattern = /^[a-z0-9][a-z0-9_-]{0,62}$/
export const modelItemIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

const optionalTrimmedString = z.string().trim().max(2000).nullable().optional()

export const modelEntrySchema = z.object({
  id: z.string().trim().regex(modelItemIdPattern, 'Invalid model id format'),
  name: z.string().trim().min(1).max(255),
  supportsImage: z.boolean().default(false),
})

const modelProviderBaseSchema = z.object({
  providerKey: z.string().trim().regex(modelProviderKeyPattern, 'Invalid provider key format'),
  name: z.string().trim().min(1).max(255),
  enabled: z.boolean().default(true),
  apiKey: optionalTrimmedString,
  baseUrl: optionalTrimmedString,
  apiFormat: z.string().trim().min(1).max(64).default('openai'),
  codingPlanEnabled: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  defaultModelId: z.string().trim().regex(modelItemIdPattern, 'Invalid default model id').nullable().optional(),
  models: z.array(modelEntrySchema).min(1).max(100),
  visibility: z.enum(['company', 'department', 'personal']),
  ownerId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
})

export const modelProviderSchema = modelProviderBaseSchema.superRefine((value, context) => {
  const modelIds = value.models.map((model) => model.id)
  const uniqueModelIds = new Set(modelIds)

  if (uniqueModelIds.size !== modelIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Model ids must be unique within a provider',
      path: ['models'],
    })
  }

  if (value.defaultModelId && !uniqueModelIds.has(value.defaultModelId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Default model id must exist in models',
      path: ['defaultModelId'],
    })
  }
})

const modelProviderUpdateBaseSchema = modelProviderBaseSchema
  .omit({ providerKey: true, visibility: true, ownerId: true })
  .extend({
    enabled: z.boolean().optional(),
    apiKey: optionalTrimmedString,
    clearApiKey: z.boolean().optional(),
    baseUrl: optionalTrimmedString,
    apiFormat: z.string().trim().min(1).max(64).optional(),
    codingPlanEnabled: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    defaultModelId: z.string().trim().regex(modelItemIdPattern, 'Invalid default model id').nullable().optional(),
    models: z.array(modelEntrySchema).min(1).max(100).optional(),
    organizationId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
  })

export const modelProviderUpdateSchema = modelProviderUpdateBaseSchema.superRefine((value, context) => {
  if (value.models && value.defaultModelId && !value.models.some((model) => model.id === value.defaultModelId)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Default model id must exist in models',
      path: ['defaultModelId'],
    })
  }
})

export type ModelEntryInput = z.infer<typeof modelEntrySchema>
export type ModelProviderInput = z.infer<typeof modelProviderSchema>
export type ModelProviderUpdateInput = z.infer<typeof modelProviderUpdateSchema>

export type ClientModelEntry = {
  id: string
  name: string
  supportsImage: boolean
}

export type ClientProviderConfig = {
  enabled: boolean
  apiKey: string
  baseUrl: string
  apiFormat: string
  codingPlanEnabled: boolean
  models: ClientModelEntry[]
}

export type ClientModelConfig = {
  model: {
    defaultModel: string
    defaultModelProvider: string
  }
  providers: Record<string, ClientProviderConfig>
}

type ProviderWithModels = {
  providerKey: string
  name: string
  enabled: boolean
  apiKey: string | null
  baseUrl: string | null
  apiFormat: string
  codingPlanEnabled: boolean
  isDefault: boolean
  defaultModelId: string | null
  visibility: 'company' | 'department' | 'personal'
  updatedAt: Date
  organization?: {
    level: number
  } | null
  models: Array<{
    modelId: string
    name: string
    supportsImage: boolean
    sortOrder: number
    isActive: boolean
  }>
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

export function normalizeModelEntries(models: ModelEntryInput[]): Array<{
  modelId: string
  name: string
  supportsImage: boolean
  sortOrder: number
}> {
  return models.map((model, index) => ({
    modelId: model.id.trim(),
    name: model.name.trim(),
    supportsImage: model.supportsImage,
    sortOrder: index,
  }))
}

export function toModelProviderStorage(input: ModelProviderInput | ModelProviderUpdateInput) {
  const hasModels = 'models' in input && Array.isArray(input.models)
  const providerInput = input as Partial<ModelProviderInput & ModelProviderUpdateInput>

  return {
    ...(Object.prototype.hasOwnProperty.call(input, 'name') ? { name: providerInput.name?.trim() } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'enabled') ? { enabled: providerInput.enabled } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'apiKey') ? { apiKey: normalizeOptionalString(providerInput.apiKey) } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'clearApiKey') ? { clearApiKey: providerInput.clearApiKey } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'baseUrl') ? { baseUrl: normalizeOptionalString(providerInput.baseUrl) } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'apiFormat') ? { apiFormat: providerInput.apiFormat?.trim() } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'codingPlanEnabled') ? { codingPlanEnabled: providerInput.codingPlanEnabled } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'isDefault') ? { isDefault: providerInput.isDefault } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'defaultModelId')
      ? { defaultModelId: normalizeOptionalString(providerInput.defaultModelId) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'providerKey') ? { providerKey: providerInput.providerKey?.trim() } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'visibility') ? { visibility: providerInput.visibility } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'ownerId') ? { ownerId: providerInput.ownerId ?? null } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'organizationId') ? { organizationId: providerInput.organizationId ?? null } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, 'isActive') ? { isActive: providerInput.isActive } : {}),
    ...(hasModels ? { models: normalizeModelEntries(providerInput.models ?? []) } : {}),
  }
}

function getVisibilityPriority(visibility: ProviderWithModels['visibility']) {
  if (visibility === 'personal') return 3
  if (visibility === 'department') return 2
  return 1
}

export function pickPreferredProviders<T extends ProviderWithModels>(providers: T[]): T[] {
  const winnerByKey = new Map<string, T>()

  for (const provider of providers) {
    const current = winnerByKey.get(provider.providerKey)
    if (!current) {
      winnerByKey.set(provider.providerKey, provider)
      continue
    }

    const currentScore = [
      getVisibilityPriority(current.visibility),
      current.organization?.level ?? -1,
      current.updatedAt.getTime(),
    ]
    const nextScore = [
      getVisibilityPriority(provider.visibility),
      provider.organization?.level ?? -1,
      provider.updatedAt.getTime(),
    ]

    const isBetter = nextScore[0] > currentScore[0]
      || (nextScore[0] === currentScore[0] && nextScore[1] > currentScore[1])
      || (nextScore[0] === currentScore[0] && nextScore[1] === currentScore[1] && nextScore[2] > currentScore[2])

    if (isBetter) {
      winnerByKey.set(provider.providerKey, provider)
    }
  }

  return [...winnerByKey.values()].sort((left, right) => left.providerKey.localeCompare(right.providerKey))
}

export function buildClientModelConfig(providers: ProviderWithModels[]): ClientModelConfig {
  const preferredProviders = pickPreferredProviders(providers)
  const providerEntries = preferredProviders
    .map((provider) => ({
      providerKey: provider.providerKey,
      config: {
        enabled: provider.enabled,
        apiKey: provider.apiKey ?? '',
        baseUrl: provider.baseUrl ?? '',
        apiFormat: provider.apiFormat,
        codingPlanEnabled: provider.codingPlanEnabled,
        models: provider.models
          .filter((model) => model.isActive)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((model) => ({
            id: model.modelId,
            name: model.name,
            supportsImage: model.supportsImage,
          })),
      },
      isDefault: provider.isDefault,
      defaultModelId: provider.defaultModelId,
    }))
    .filter((entry) => entry.config.models.length > 0)

  const providersRecord = Object.fromEntries(
    providerEntries.map((entry) => [entry.providerKey, entry.config])
  )

  const enabledProviders = providerEntries.filter((entry) => entry.config.enabled)
  const defaultProviderEntry = enabledProviders.find((entry) => entry.isDefault)
    ?? enabledProviders[0]
    ?? providerEntries.find((entry) => entry.isDefault)
    ?? providerEntries[0]

  const defaultModel = defaultProviderEntry?.defaultModelId
    && defaultProviderEntry.config.models.some((model) => model.id === defaultProviderEntry.defaultModelId)
      ? defaultProviderEntry.defaultModelId
      : defaultProviderEntry?.config.models[0]?.id ?? ''

  return {
    model: {
      defaultModel,
      defaultModelProvider: defaultProviderEntry?.providerKey ?? '',
    },
    providers: providersRecord,
  }
}
