import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from './api-auth'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { isAdminActor } from '@/lib/admin-access'

async function authenticateApiKeyActor(request: NextRequest) {
  const apiKey = request.headers.get('X-API-Key')
  if (!apiKey) {
    return null
  }

  const clients = await db.oAuthClient.findMany({
    where: { isActive: true, apiKeyHash: { not: null } }
  })

  for (const client of clients) {
    if (client.apiKeyHash && await bcrypt.compare(apiKey, client.apiKeyHash)) {
      return {
        isApiKey: true,
        client,
        user: {
          id: client.id,
          isSuperAdmin: true,
          isDepartmentAdmin: false,
          departmentId: null,
          organizationId: null,
        },
      }
    }
  }

  return null
}

export async function requireManagementAuth(request: NextRequest) {
  const apiKeyAuth = await authenticateApiKeyActor(request)
  if (apiKeyAuth) {
    return apiKeyAuth
  }

  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  return { ...authResult, isApiKey: false }
}

export async function requireAdmin(
  request: NextRequest,
  options?: { allowDepartmentAdmin?: boolean }
) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  if (!isAdminActor(authResult.user, options?.allowDepartmentAdmin)) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  return { ...authResult, isApiKey: false }
}
