import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { heartbeatClawSession } from '@/lib/claw-quota'
import { externalErrorFromUnknown, externalOk } from '@/lib/external-v1'
import { requireApiAuth } from '@/middleware/api-auth'

const heartbeatSchema = z.object({
  reservationId: z.string().trim().min(1).max(128),
  clientSessionId: z.string().trim().min(1).max(128),
  activeSecondsDelta: z.number().int().min(0).max(86400),
  totalActiveSeconds: z.number().int().min(0).max(86400),
  status: z.enum(['running', 'paused', 'waiting_user']),
  sentAt: z.string().datetime().optional().nullable(),
  idempotencyKey: z.string().trim().min(1).max(128),
})

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request, { requiredScopes: ['claw:sessions:write'] })
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = await request.json()
    const input = heartbeatSchema.parse(body)
    const result = await heartbeatClawSession(authResult.user.id, input)

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
