import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'

const DEFAULT_DESKTOP_CLIENT_ID = process.env.DESKTOP_OAUTH_CLIENT_ID || 'desktop-client'
const DEFAULT_DESKTOP_CLIENT_NAME = process.env.DESKTOP_OAUTH_CLIENT_NAME || 'Desktop Client'
const DEFAULT_DESKTOP_CLIENT_SECRET = process.env.DESKTOP_OAUTH_CLIENT_SECRET || 'desktop-direct-flow'
const DEFAULT_DESKTOP_REDIRECT_URIS = process.env.DESKTOP_OAUTH_ALLOWED_REDIRECT_URIS || 'diclaw://auth/callback'

function normalizeUri(uri: string) {
  return uri.trim()
}

export function parseAllowedRedirectUris(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map(normalizeUri).filter(Boolean)
  }

  if (!value) {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeUri)
        .filter(Boolean)
    }
  } catch {
    // Fall through to delimiter parsing for legacy string storage.
  }

  return trimmed
    .split(/\r?\n|,/)
    .map(normalizeUri)
    .filter(Boolean)
}

export function serializeAllowedRedirectUris(uris: string[]) {
  return uris.map(normalizeUri).filter(Boolean).join('\n')
}

export function matchesAllowedRedirectUri(
  allowedRedirectUris: string | string[] | null | undefined,
  redirectUri: string
) {
  const normalizedRedirectUri = normalizeUri(redirectUri)
  return parseAllowedRedirectUris(allowedRedirectUris).includes(normalizedRedirectUri)
}

export function getDesktopAllowedRedirectUris() {
  return parseAllowedRedirectUris(DEFAULT_DESKTOP_REDIRECT_URIS)
}

export function generateDesktopClientSecret() {
  return `desktop_${randomBytes(24).toString('hex')}`
}

export async function ensureDesktopOAuthClient() {
  const allowedRedirectUris = getDesktopAllowedRedirectUris()
  const existingClient = await db.oAuthClient.findUnique({
    where: { clientId: DEFAULT_DESKTOP_CLIENT_ID }
  })

  if (existingClient) {
    return existingClient
  }

  const clientSecretHash = await bcrypt.hash(DEFAULT_DESKTOP_CLIENT_SECRET, 12)

  return db.oAuthClient.create({
    data: {
      clientId: DEFAULT_DESKTOP_CLIENT_ID,
      clientSecretHash,
      name: DEFAULT_DESKTOP_CLIENT_NAME,
      allowedRedirectUris: serializeAllowedRedirectUris(allowedRedirectUris),
      isActive: true
    }
  })
}

export async function getDesktopOAuthClientConfig() {
  const client = await ensureDesktopOAuthClient()

  return {
    ...client,
    allowedRedirectUris: parseAllowedRedirectUris(client.allowedRedirectUris),
  }
}
