import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  PHONE_VERIFICATION_CODE_LENGTH,
  sendLoginPhoneVerificationCode,
} from '@/lib/phone-verification'
import { isPhoneFormatValid } from '@/lib/phone'
import { SMS_VERIFICATION_CODE_EXPIRES_MINUTES } from '@/lib/sms'

const sendCodeSchema = z.object({
  phone: z.string().trim().min(1).max(32),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = sendCodeSchema.safeParse(body)

  if (!parsed.success || !isPhoneFormatValid(parsed.data.phone)) {
    return NextResponse.json(
      { error: '手机号格式不正确。', code: 'VALIDATION_PHONE_INVALID' },
      { status: 400 }
    )
  }

  try {
    const result = await sendLoginPhoneVerificationCode(parsed.data.phone)
    return NextResponse.json({
      data: result,
      message: `验证码已发送，请在 ${SMS_VERIFICATION_CODE_EXPIRES_MINUTES} 分钟内完成登录。`,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'PHONE_LOGIN_NOT_SUPPORTED_FOR_ACCOUNT') {
      return NextResponse.json(
        { error: '该手机号不支持普通用户验证码登录，请使用企业用户入口。', code: 'PHONE_LOGIN_NOT_SUPPORTED_FOR_ACCOUNT' },
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

    console.error('[auth.login.phone-code] failed to send verification sms:', error)

    return NextResponse.json(
      {
        error: `验证码发送失败，请稍后重试。验证码为 ${PHONE_VERIFICATION_CODE_LENGTH} 位数字。`,
        code: 'SMS_SEND_FAILED',
      },
      { status: 500 }
    )
  }
}
