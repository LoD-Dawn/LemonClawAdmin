'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Smartphone } from 'lucide-react'
import { isPhoneFormatValid } from '@/lib/phone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function PhoneBindingCard({
  initialPhone,
  required,
}: {
  initialPhone?: string | null
  required?: boolean
}) {
  const router = useRouter()
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [smsCode, setSmsCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function handleSendCode() {
    setError('')
    setSuccess('')

    if (!phone.trim() || !isPhoneFormatValid(phone)) {
      setError('请输入有效的中国大陆手机号。')
      return
    }

    setIsSendingCode(true)
    try {
      const response = await fetch('/api/auth/phone/bind-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (result?.data?.cooldownRemaining) {
          setCooldown(Number(result.data.cooldownRemaining) || 0)
        }
        throw new Error(result.error || '验证码发送失败，请稍后重试。')
      }

      setCooldown(Number(result?.data?.resendInSeconds) || 60)
      setSuccess(result.message || '验证码已发送。')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '验证码发送失败，请稍后重试。')
    } finally {
      setIsSendingCode(false)
    }
  }

  async function handleBindPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!phone.trim() || !isPhoneFormatValid(phone)) {
      setError('请输入有效的中国大陆手机号。')
      return
    }

    if (!/^\d{6}$/.test(smsCode)) {
      setError('请输入 6 位短信验证码。')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/phone/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, smsCode }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || '手机号绑定失败，请稍后重试。')
      }

      setSuccess(result.message || '手机号绑定成功。')
      router.refresh()
    } catch (bindError) {
      setError(bindError instanceof Error ? bindError.message : '手机号绑定失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-foreground">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">绑定手机号</CardTitle>
            <CardDescription className="leading-6">
              {required
                ? '当前普通用户入口需要手机号验证，绑定完成后才能继续使用工作台。'
                : '绑定后，普通用户入口会统一使用手机号加短信验证码登录。'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleBindPhone} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="space-y-2">
              <Label htmlFor="bind-phone">手机号</Label>
              <Input
                id="bind-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="请输入手机号，如 13812345678"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bind-sms-code">短信验证码</Label>
              <div className="flex gap-3">
                <Input
                  id="bind-sms-code"
                  value={smsCode}
                  onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="请输入 6 位验证码"
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingCode || cooldown > 0}
                  onClick={handleSendCode}
                  className="h-10 min-w-[128px]"
                >
                  {isSendingCode ? '发送中...' : cooldown > 0 ? `${cooldown}s` : '发送验证码'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={isSubmitting} className="h-10 w-full lg:w-auto">
              {isSubmitting ? '绑定中...' : '确认绑定'}
            </Button>
          </div>
        </form>

        {success ? (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{success}</span>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
