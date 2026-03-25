import { NextRequest } from 'next/server'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  try {
    return new URL(trimmed).origin.replace(/\/+$/, '')
  } catch {
    return null
  }
}

function getRequestOrigin(request: Request | NextRequest) {
  return normalizeOrigin(request.url)
}

function getForwardedOrigin(request: Request | NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host')?.trim()

  if (!host) {
    return null
  }

  const requestOrigin = getRequestOrigin(request)
  const requestProtocol = requestOrigin ? new URL(requestOrigin).protocol.replace(':', '') : 'http'
  const protocol = forwardedProto || requestProtocol

  return normalizeOrigin(`${protocol}://${host}`)
}

function isLocalOrigin(origin: string) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname)
  } catch {
    return false
  }
}

export function getConfiguredAppOrigin() {
  const configuredOriginCandidates = [
    process.env.APP_BASE_URL,
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.OPENAPI_SERVER_URL,
  ]

  for (const candidate of configuredOriginCandidates) {
    const origin = normalizeOrigin(candidate)
    if (origin) {
      return origin
    }
  }

  return null
}

export function getAppOrigin(request: Request | NextRequest) {
  const configuredOrigin = getConfiguredAppOrigin()
  const forwardedOrigin = getForwardedOrigin(request)
  const requestOrigin = getRequestOrigin(request)

  if (configuredOrigin) {
    // Ignore localhost-style config when the incoming request clearly targets a public host.
    if (!isLocalOrigin(configuredOrigin) || !forwardedOrigin || isLocalOrigin(forwardedOrigin)) {
      return configuredOrigin
    }
  }

  return forwardedOrigin || requestOrigin
}

export function buildAppUrl(pathname: string, request: Request | NextRequest) {
  const origin = getAppOrigin(request)

  return origin ? new URL(pathname, origin) : new URL(pathname, request.url)
}
