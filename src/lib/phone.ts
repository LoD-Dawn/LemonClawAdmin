const CHINA_MAINLAND_PHONE_PATTERN = /^1[3-9]\d{9}$/

function stripPhoneSeparators(input: string) {
  return input.replace(/[\s\-()]/g, '')
}

function toChinaMainlandDigits(input: string) {
  const sanitized = stripPhoneSeparators(input.trim())

  if (sanitized.startsWith('+86')) {
    return sanitized.slice(3)
  }

  if (sanitized.startsWith('0086')) {
    return sanitized.slice(4)
  }

  if (sanitized.startsWith('86') && sanitized.length === 13) {
    return sanitized.slice(2)
  }

  return sanitized
}

export function normalizePhone(input: string) {
  const digits = toChinaMainlandDigits(input)

  if (!CHINA_MAINLAND_PHONE_PATTERN.test(digits)) {
    throw new Error('PHONE_INVALID')
  }

  return `+86${digits}`
}

export function isPhoneFormatValid(input: string) {
  try {
    normalizePhone(input)
    return true
  } catch {
    return false
  }
}

export function maskPhone(input: string) {
  const normalized = normalizePhone(input)
  return `${normalized.slice(0, 6)}****${normalized.slice(-4)}`
}
