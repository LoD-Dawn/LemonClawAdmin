import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  REGISTER_EMAIL_VERIFICATION_CODE_LENGTH,
  REGISTER_EMAIL_VERIFICATION_EXPIRES_MINUTES,
  sendRegisterVerificationCode,
} from '@/lib/email-verification'

const sendCodeSchema = z.object({
  email: z.string().trim().email().max(255),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = sendCodeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: '邮箱格式不正确。', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const result = await sendRegisterVerificationCode(parsed.data.email)
    return NextResponse.json({
      data: result,
      message: `验证码已发送，请在 ${REGISTER_EMAIL_VERIFICATION_EXPIRES_MINUTES} 分钟内完成注册。`,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'MAILER_CONFIG_MISSING') {
      return NextResponse.json(
        { error: '邮件服务未配置，请联系管理员。', code: 'MAILER_CONFIG_MISSING' },
        { status: 500 }
      )
    }

    if (error instanceof Error && error.message === 'EMAIL_ALREADY_REGISTERED') {
      return NextResponse.json(
        { error: '该邮箱已注册，请直接登录。', code: 'CONFLICT_EMAIL_EXISTS' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'VERIFICATION_CODE_RESEND_COOLDOWN') {
      const cooldownRemaining = (error as Error & { cooldownRemaining?: number }).cooldownRemaining ?? 0

      return NextResponse.json(
        {
          error: `发送过于频繁，请 ${cooldownRemaining} 秒后再试。`,
          code: 'VERIFICATION_CODE_RESEND_COOLDOWN',
          data: { cooldownRemaining },
        },
        { status: 429 }
      )
    }

    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2021') {
      return NextResponse.json(
        { error: '数据库未初始化，请先同步最新数据表后再发送验证码。', code: 'DATABASE_SCHEMA_MISSING' },
        { status: 500 }
      )
    }

    console.error('[auth.register.email-code] failed to send verification email:', error)

    return NextResponse.json(
      {
        error: `验证码发送失败，请稍后重试。验证码为 ${REGISTER_EMAIL_VERIFICATION_CODE_LENGTH} 位数字。`,
        code: 'EMAIL_SEND_FAILED',
      },
      { status: 500 }
    )
  }
}
