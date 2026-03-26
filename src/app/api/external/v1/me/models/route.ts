import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserModelConfig } from '@/lib/external-api'
import { getCurrentUserModelCatalog } from '@/lib/claw-quota'
import { externalErrorFromUnknown } from '@/lib/external-v1'
import { requireApiAuth } from '@/middleware/api-auth'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['models:read'] })
  if (authResult instanceof NextResponse) return authResult

  try {
    const [legacyConfig, catalog] = await Promise.all([
      getCurrentUserModelConfig(authResult.user),
      getCurrentUserModelCatalog(authResult.user),
    ])

    return NextResponse.json({
      code: 'OK',
      message: '',
      data: {
        defaultModel: legacyConfig.model.defaultModel,
        defaultModelProvider: legacyConfig.model.defaultModelProvider,
        providers: catalog.providers.map((provider) => {
          const legacyProvider = legacyConfig.providers[provider.provider]

          return {
            provider: provider.provider,
            enabled: legacyProvider?.enabled ?? provider.models.some((model) => model.enabled),
            apiKey: legacyProvider?.apiKey ?? provider.apiKey,
            baseUrl: legacyProvider?.baseUrl ?? '',
            apiFormat: legacyProvider?.apiFormat ?? 'openai',
            codingPlanEnabled: legacyProvider?.codingPlanEnabled ?? false,
            models: provider.models.map((model) => {
              const legacyModel = legacyProvider?.models.find((entry) => entry.id === model.model)

              return {
                id: model.model,
                model: model.model,
                name: legacyModel?.name ?? model.displayName,
                displayName: model.displayName,
                supportsImage: legacyModel?.supportsImage ?? false,
                enabled: model.enabled,
                usageMeta: model.usageMeta,
              }
            }),
          }
        }),
        updatedAt: catalog.updatedAt,
      },
    })
  } catch (error) {
    return externalErrorFromUnknown(error)
  }
}
