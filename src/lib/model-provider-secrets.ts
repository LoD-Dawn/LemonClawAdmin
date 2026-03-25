import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const MODEL_PROVIDER_API_KEY_PREFIX = 'enc:v1'
const MODEL_PROVIDER_API_KEY_ALGORITHM = 'aes-256-gcm'
const MODEL_PROVIDER_API_KEY_IV_LENGTH = 12

function getModelProviderApiKeySecret() {
  const secret = process.env.MODEL_API_KEY_ENCRYPTION_SECRET
    ?? process.env.JWT_SECRET
    ?? process.env.NEXTAUTH_SECRET

  if (!secret || secret.trim().length === 0) {
    throw new Error('Missing MODEL_API_KEY_ENCRYPTION_SECRET (or JWT_SECRET / NEXTAUTH_SECRET fallback)')
  }

  return secret
}

function deriveEncryptionKey(secret: string) {
  return createHash('sha256').update(secret).digest()
}

export function isEncryptedModelProviderApiKey(value: string | null | undefined) {
  return typeof value === 'string' && value.startsWith(`${MODEL_PROVIDER_API_KEY_PREFIX}:`)
}

export function encryptModelProviderApiKey(value: string) {
  if (isEncryptedModelProviderApiKey(value)) {
    return value
  }

  const iv = randomBytes(MODEL_PROVIDER_API_KEY_IV_LENGTH)
  const key = deriveEncryptionKey(getModelProviderApiKeySecret())
  const cipher = createCipheriv(MODEL_PROVIDER_API_KEY_ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    MODEL_PROVIDER_API_KEY_PREFIX,
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptModelProviderApiKey(value: string) {
  if (!isEncryptedModelProviderApiKey(value)) {
    return value
  }

  const [prefixType, prefixVersion, ivBase64, authTagBase64, payloadBase64, ...rest] = value.split(':')
  if (
    prefixType !== 'enc'
    || prefixVersion !== 'v1'
    || !ivBase64
    || !authTagBase64
    || !payloadBase64
    || rest.length > 0
  ) {
    throw new Error('Invalid encrypted model provider API key format')
  }

  const key = deriveEncryptionKey(getModelProviderApiKeySecret())
  const decipher = createDecipheriv(MODEL_PROVIDER_API_KEY_ALGORITHM, key, Buffer.from(ivBase64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagBase64, 'base64'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payloadBase64, 'base64')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
