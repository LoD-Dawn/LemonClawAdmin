import { afterEach, describe, expect, it } from 'vitest'
import { buildAliyunSmsUrl } from './sms'

describe('sms helpers', () => {
  afterEach(() => {
    delete process.env.ALIYUN_SMS_ACCESS_KEY_ID
    delete process.env.ALIYUN_SMS_ACCESS_KEY_SECRET
    delete process.env.ALIYUN_SMS_SIGN_NAME
    delete process.env.ALIYUN_SMS_REGISTER_TEMPLATE_CODE
    delete process.env.ALIYUN_SMS_REGION
    delete process.env.ALIYUN_SMS_ENDPOINT
  })

  it('builds an aliyun sms request with expected parameters', () => {
    process.env.ALIYUN_SMS_ACCESS_KEY_ID = 'test-ak'
    process.env.ALIYUN_SMS_ACCESS_KEY_SECRET = 'test-sk'
    process.env.ALIYUN_SMS_SIGN_NAME = 'LemonClaw'
    process.env.ALIYUN_SMS_REGISTER_TEMPLATE_CODE = 'SMS_123456789'
    process.env.ALIYUN_SMS_REGION = 'cn-hangzhou'
    process.env.ALIYUN_SMS_ENDPOINT = 'dysmsapi.aliyuncs.com'

    const url = new URL(buildAliyunSmsUrl({
      phone: '+8613812345678',
      code: '123456',
      minutes: 10,
      scene: 'register',
    }, new Date('2026-04-08T12:00:00.000Z')))

    expect(url.hostname).toBe('dysmsapi.aliyuncs.com')
    expect(url.searchParams.get('Action')).toBe('SendSms')
    expect(url.searchParams.get('PhoneNumbers')).toBe('13812345678')
    expect(url.searchParams.get('SignName')).toBe('LemonClaw')
    expect(url.searchParams.get('TemplateCode')).toBe('SMS_123456789')
    expect(url.searchParams.get('TemplateParam')).toContain('"code":"123456"')
    expect(url.searchParams.get('Signature')).toBeTruthy()
  })
})
