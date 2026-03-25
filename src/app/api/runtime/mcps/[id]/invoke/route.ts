import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { toMcpConfigPayload } from '@/lib/mcp-config'
import { resolveRuntimeResourceAccess, RuntimeAccessError } from '@/lib/runtime-access'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['mcps:invoke'] })
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { id } = await params
  const input = await request.json().catch(() => null)

  try {
    const { resource, grantId } = await resolveRuntimeResourceAccess({
      userId: authResult.user.id,
      resourceType: 'mcp',
      resourceId: id,
    })

    return NextResponse.json({
      data: {
        resource: {
          ...toMcpConfigPayload({
            mcpId: resource.identifier,
            name: resource.name,
            descriptionZh: null,
            descriptionEn: null,
            category: resource.category ?? 'developer',
            transportType: resource.transportType ?? 'stdio',
            command: resource.command ?? '',
            defaultArgsJson: JSON.stringify(resource.defaultArgs),
            requiredEnvKeysJson: JSON.stringify(resource.requiredEnvKeys),
            optionalEnvKeysJson: JSON.stringify(resource.optionalEnvKeys),
          }),
          recordId: resource.id,
          visibility: resource.visibility,
        },
        grantId,
        input,
        forwarded: false,
        message: 'Runtime access verified. Forwarding to the actual MCP executor is not configured yet.',
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
