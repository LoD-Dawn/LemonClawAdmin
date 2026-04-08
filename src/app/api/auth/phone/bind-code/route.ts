import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isPhoneFormatValid } from '@/lib/phone'
import {
  PHONE_VERIFICATION_CODE_LENGTH,
  sendBindPhoneVerificationCode,
} from '@/lib/phone-verification'
import { SMS_VERIFICATION_CODE_EXPIRES_MINUTES } from '@/lib/sms'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: '未登录或登录已过期。', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => null) as { phone?: string } | null
  const phone = body?.phone?.trim() || ''

  if (!phone || !isPhoneFormatValid(phone)) {
    return NextResponse.json(
      { error: '手机号格式不正确。', code: 'VALIDATION_PHONE_INVALID' },
      { status: 400 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, phone: true },
  })

  if (!user) {
    return NextResponse.json(
      { error: '用户不存在。', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  if (user.phone) {
    return NextResponse.json(
      { error: '当前账号已绑定手机号。', code: 'PHONE_ALREADY_BOUND' },
      { status: 409 }
    )
  }

  try {
    const result = await sendBindPhoneVerificationCode(phone, user.id)
    return NextResponse.json({
      data: result,
      message: `验证码已发送，请在 ${SMS_VERIFICATION_CODE_EXPIRES_MINUTES} 分钟内完成绑定。`,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'PHONE_ALREADY_BOUND') {
      return NextResponse.json(
        { error: '该手机号已绑定其他账号。', code: 'CONFLICT_PHONE_EXISTS' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'PHONE_VERIFICATION_CODE_RESEND_COOLDOWN') {
      const cooldownRemaining = (error as Error & { cooldownRemaining?: number }).cooldownRemaining ?? 0

      return NextResponse.json(
        {
          error: `发送过于频繁，请 ${cooldownRemaining} 秒后再试。`,
          code: 'PHONE_VERIFICATION_CODE_RESEND_COOLDOWN',
          data: { cooldownRemaining },
        },
        { status: 429 }
      )
    }

    if (error instanceof Error && error.message === 'SMS_CONFIG_MISSING') {
      return NextResponse.json(
        { error: '短信服务未配置，请联系管理员。', code: 'SMS_CONFIG_MISSING' },
        { status: 500 }
      )
    }

    console.error('[auth.phone.bind-code] failed to send verification sms:', error)

    return NextResponse.json(
      {
        error: `验证码发送失败，请稍后重试。验证码为 ${PHONE_VERIFICATION_CODE_LENGTH} 位数字。`,
        code: 'SMS_SEND_FAILED',
      },
      { status: 500 }
    )
  }
}
