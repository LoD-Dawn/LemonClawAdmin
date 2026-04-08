import 'server-only'

import { createHmac, randomUUID } from 'crypto'
import { maskPhone } from '@/lib/phone'

export const SMS_VERIFICATION_CODE_EXPIRES_MINUTES = 10
export const SMS_VERIFICATION_CODE_RESEND_SECONDS = 60

type SmsScene = 'register' | 'bind_phone'

type SendVerificationSmsInput = {
  phone: string
  code: string
  minutes: number
  scene: SmsScene
}

type AliyunSmsConfig = {
  accessKeyId: string
  accessKeySecret: string
  signName: string
  templateCode: string
  region: string
  endpoint: string
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

function getSmsDeliveryMode() {
  return (process.env.SMS_DELIVERY_MODE?.trim().toLowerCase() || 'mock') as 'mock' | 'aliyun'
}

function getAliyunSmsConfig(): AliyunSmsConfig {
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID?.trim() || ''
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET?.trim() || ''
  const signName = process.env.ALIYUN_SMS_SIGN_NAME?.trim() || ''
  const templateCode = process.env.ALIYUN_SMS_REGISTER_TEMPLATE_CODE?.trim() || ''
  const region = process.env.ALIYUN_SMS_REGION?.trim() || 'cn-hangzhou'
  const endpoint = process.env.ALIYUN_SMS_ENDPOINT?.trim() || 'dysmsapi.aliyuncs.com'

  return {
    accessKeyId,
    accessKeySecret,
    signName,
    templateCode,
    region,
    endpoint,
  }
}

export function isSmsConfigured() {
  if (getSmsDeliveryMode() === 'mock') {
    return true
  }

  const config = getAliyunSmsConfig()
  return Boolean(
    config.accessKeyId
      && config.accessKeySecret
      && config.signName
      && config.templateCode
      && config.region
      && config.endpoint
  )
}

export function buildAliyunSmsUrl(input: SendVerificationSmsInput, now = new Date()) {
  const config = getAliyunSmsConfig()
  if (!config.accessKeyId || !config.accessKeySecret || !config.signName || !config.templateCode) {
    throw new Error('SMS_CONFIG_MISSING')
  }

  const timestamp = now.toISOString().replace('.000Z', 'Z')
  const params = {
    AccessKeyId: config.accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    PhoneNumbers: input.phone.replace(/^\+86/, ''),
    RegionId: config.region,
    SignMethod: 'HMAC-SHA1',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: randomUUID(),
    SignatureVersion: '1.0',
    SignName: config.signName,
    TemplateCode: config.templateCode,
    TemplateParam: JSON.stringify({
      code: input.code,
      minutes: String(input.minutes),
    }),
    Timestamp: timestamp,
    Version: '2017-05-25',
  }

  const canonicalized = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&')

  const stringToSign = `GET&${percentEncode('/')}&${percentEncode(canonicalized)}`
  const signature = createHmac('sha1', `${config.accessKeySecret}&`)
    .update(stringToSign)
    .digest('base64')

  const url = new URL(`https://${config.endpoint}/`)
  url.searchParams.set('Signature', signature)

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return url.toString()
}

async function sendAliyunSms(input: SendVerificationSmsInput) {
  const response = await fetch(buildAliyunSmsUrl(input), {
    method: 'GET',
    cache: 'no-store',
  })

  const result = await response.json().catch(() => null)
  if (!response.ok || !result || result.Code !== 'OK') {
    const error = new Error('SMS_SEND_FAILED')
    ;(error as Error & { details?: unknown }).details = {
      status: response.status,
      result,
    }
    throw error
  }
}

async function sendMockSms(input: SendVerificationSmsInput) {
  console.info('[sms:mock] verification code generated', {
    scene: input.scene,
    phone: maskPhone(input.phone),
    code: input.code,
    minutes: input.minutes,
  })
}

async function sendVerificationSms(input: SendVerificationSmsInput) {
  if (!isSmsConfigured()) {
    throw new Error('SMS_CONFIG_MISSING')
  }

  if (getSmsDeliveryMode() === 'mock') {
    await sendMockSms(input)
    return
  }

  await sendAliyunSms(input)
}

export async function sendRegisterSmsCode(input: { phone: string; code: string; minutes: number }) {
  await sendVerificationSms({
    ...input,
    scene: 'register',
  })
}

export async function sendBindPhoneSmsCode(input: { phone: string; code: string; minutes: number }) {
  await sendVerificationSms({
    ...input,
    scene: 'bind_phone',
  })
}
