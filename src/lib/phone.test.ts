import { describe, expect, it } from 'vitest'
import { isPhoneFormatValid, maskPhone, normalizePhone } from './phone'

describe('phone utils', () => {
  it('normalizes mainland phones to +86 format', () => {
    expect(normalizePhone('13812345678')).toBe('+8613812345678')
    expect(normalizePhone('+8613812345678')).toBe('+8613812345678')
    expect(normalizePhone('86 138-1234-5678')).toBe('+8613812345678')
  })

  it('rejects invalid mainland phones', () => {
    expect(isPhoneFormatValid('123456')).toBe(false)
    expect(() => normalizePhone('123456')).toThrow('PHONE_INVALID')
  })

  it('masks normalized phones safely', () => {
    expect(maskPhone('13812345678')).toBe('+86138****5678')
  })
})
