import { SignJWT, jwtVerify } from 'jose'
import { randomBytes } from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret')
const ACCESS_TOKEN_EXPIRY = 3600 // 1 hour
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 3600 // 7 days
const AUTH_CODE_EXPIRY = 10 * 60 // 10 minutes

export interface TokenPayload {
  sub: string
  userId: string
  clientId: string
  scope: string
  type?: 'access' | 'refresh'
}

export async function createAccessToken(userId: string, clientId: string, scope: string): Promise<string> {
  return new SignJWT({ userId, clientId, scope, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setSubject(userId)
    .sign(JWT_SECRET)
}

export async function createRefreshToken(userId: string, clientId: string): Promise<string> {
  return new SignJWT({ userId, clientId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setSubject(userId)
    .sign(JWT_SECRET)
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.type && payload.type !== 'access') {
      return null
    }
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.type !== 'refresh') return null
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export function generateAuthCode(): string {
  return randomBytes(16).toString('hex')
}

export function generateApiKey(): string {
  return `sk_${randomBytes(24).toString('hex')}`
}

export function normalizeScopes(scope: string): string[] {
  return scope
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function hasRequiredScopes(scope: string, requiredScopes: string[]): boolean {
  if (requiredScopes.length === 0) {
    return true
  }

  const grantedScopes = new Set(normalizeScopes(scope))
  return requiredScopes.every((requiredScope) => grantedScopes.has(requiredScope))
}

export { AUTH_CODE_EXPIRY, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY }
