import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { resolveRuntimeResourceAccess, RuntimeAccessError } from '@/lib/runtime-access'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['skills:invoke'] })
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { id } = await params
  const input = await request.json().catch(() => null)

  try {
    const { resource, grantId } = await resolveRuntimeResourceAccess({
      userId: authResult.user.id,
      resourceType: 'skill',
      resourceId: id,
    })

    return NextResponse.json({
      data: {
        resource: {
          id: resource.id,
          identifier: resource.identifier,
          name: resource.name,
          packageUrl: resource.packageUrl,
          visibility: resource.visibility,
        },
        grantId,
        input,
        forwarded: false,
        message: 'Runtime access verified. Forwarding to the actual skill executor is not configured yet.',
      },
    })
  } catch (error) {
    if (error instanceof RuntimeAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      )
    }

    throw error
  }
}
