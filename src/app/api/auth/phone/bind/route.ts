import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isPhoneFormatValid, maskPhone } from '@/lib/phone'
import {
  consumePhoneVerificationCode,
  getPhoneVerificationCodeErrorMessage,
  PHONE_VERIFICATION_PURPOSE_BIND,
} from '@/lib/phone-verification'
import { recordOperationLog } from '@/lib/operation-log'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: '未登录或登录已过期。', code: 'UNAUTHORIZED' },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => null) as { phone?: string; smsCode?: string } | null
  const phone = body?.phone?.trim() || ''
  const smsCode = body?.smsCode?.trim() || ''

  if (!phone || !isPhoneFormatValid(phone)) {
    return NextResponse.json(
      { error: '手机号格式不正确。', code: 'VALIDATION_PHONE_INVALID' },
      { status: 400 }
    )
  }

  const verificationError = getPhoneVerificationCodeErrorMessage(smsCode)
  if (verificationError) {
    return NextResponse.json(
      { error: verificationError, code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  try {
    const updatedUser = await db.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          accountType: true,
          organizationId: true,
        },
      })

      if (!existingUser) {
        throw new Error('NOT_FOUND_USER')
      }

      if (existingUser.phone) {
        throw new Error('PHONE_ALREADY_BOUND')
      }

      const normalizedPhone = await consumePhoneVerificationCode(
        tx,
        phone,
        PHONE_VERIFICATION_PURPOSE_BIND,
        smsCode
      )

      const conflictUser = await tx.user.findUnique({
        where: { phone: normalizedPhone },
        select: { id: true },
      })

      if (conflictUser && conflictUser.id !== existingUser.id) {
        throw new Error('CONFLICT_PHONE_EXISTS')
      }

      return tx.user.update({
        where: { id: existingUser.id },
        data: { phone: normalizedPhone },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          accountType: true,
          organizationId: true,
        },
      })
    })

    await recordOperationLog({
      request,
      actor: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
      },
      module: 'auth',
      action: 'auth.phone.bind',
      targetType: 'user',
      targetId: updatedUser.id,
      targetName: updatedUser.email,
      targetUserId: updatedUser.id,
      summary: `用户绑定手机号 ${maskPhone(updatedUser.phone ?? phone)}`,
      metadata: {
        email: updatedUser.email,
        phone: updatedUser.phone,
        accountType: updatedUser.accountType,
        organizationId: updatedUser.organizationId,
      },
    })

    return NextResponse.json({
      data: {
        phone: updatedUser.phone,
      },
      message: '手机号绑定成功。',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND_USER') {
      return NextResponse.json(
        { error: '用户不存在。', code: 'NOT_FOUND_USER' },
        { status: 404 }
      )
    }

    if (error instanceof Error && error.message === 'PHONE_ALREADY_BOUND') {
      return NextResponse.json(
        { error: '当前账号已绑定手机号。', code: 'PHONE_ALREADY_BOUND' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'CONFLICT_PHONE_EXISTS') {
      return NextResponse.json(
        { error: '该手机号已绑定其他账号。', code: 'CONFLICT_PHONE_EXISTS' },
        { status: 409 }
      )
    }

    if (error instanceof Error && error.message === 'PHONE_VERIFICATION_CODE_INVALID') {
      return NextResponse.json(
        { error: '短信验证码错误，请重新输入。', code: 'PHONE_VERIFICATION_CODE_INVALID' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'PHONE_VERIFICATION_CODE_EXPIRED') {
      return NextResponse.json(
        { error: '短信验证码已过期，请重新获取。', code: 'PHONE_VERIFICATION_CODE_EXPIRED' },
        { status: 400 }
      )
    }

    throw error
  }
}
