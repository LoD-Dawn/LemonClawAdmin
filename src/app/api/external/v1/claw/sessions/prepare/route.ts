import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prepareClawSession } from '@/lib/claw-quota'
import { externalErrorFromUnknown, externalOk } from '@/lib/external-v1'
import { requireApiAuth } from '@/middleware/api-auth'

const prepareSchema = z.object({
  clientSessionId: z.string().trim().min(1).max(128),
  provider: z.string().trim().min(1).max(64),
  model: z.string().trim().min(1).max(128),
  entry: z.enum(['cowork_start', 'cowork_continue']),
  workspacePath: z.string().trim().min(1).max(2000).optional().nullable(),
  estimatedSeconds: z.number().int().min(1).max(86400).optional().nullable(),
  idempotencyKey: z.string().trim().min(1).max(128),
})

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['claw:sessions:write'] })
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const input = prepareSchema.parse(body)
    const result = await prepareClawSession(authResult.user, input)

    if (result.code === 'OK') {
      return externalOk(result.data)
    }

    return NextResponse.json(
      {
        code: result.code,
        message: result.message,
        data: result.data,
      },
      { status: result.status }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          code: 'INVALID_PARAMS',
          message: '请求参数不合法',
          data: {
            issues: error.flatten(),
          },
        },
        { status: 400 }
      )
    }

    return externalErrorFromUnknown(error)
  }
}
