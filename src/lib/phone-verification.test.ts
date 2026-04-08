import { describe, expect, it } from 'vitest'
import {
  getPhoneVerificationCodeErrorMessage,
  getPhoneVerificationCooldownRemaining,
  isPhoneVerificationCodeFormatValid,
} from './phone-verification'

describe('phone verification helpers', () => {
  it('validates 6-digit verification codes', () => {
    expect(isPhoneVerificationCodeFormatValid('123456')).toBe(true)
    expect(isPhoneVerificationCodeFormatValid('12345')).toBe(false)
    expect(getPhoneVerificationCodeErrorMessage('12a456')).toContain('6 位数字')
  })

  it('calculates resend cooldown remaining', () => {
    const now = new Date('2026-04-08T12:00:00.000Z')
    const lastSentAt = new Date('2026-04-08T11:59:30.000Z')

    expect(getPhoneVerificationCooldownRemaining(lastSentAt, now)).toBe(30)
  })
})
