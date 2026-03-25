type ProviderWithApiKey = {
  apiKey?: string | null
}

export function sanitizeManagementModelProvider<T extends ProviderWithApiKey>(provider: T) {
  const { apiKey, ...rest } = provider

  return {
    ...rest,
    hasApiKey: Boolean(apiKey),
  }
}

export function sanitizeManagementModelProviders<T extends ProviderWithApiKey>(providers: T[]) {
  return providers.map((provider) => sanitizeManagementModelProvider(provider))
}
