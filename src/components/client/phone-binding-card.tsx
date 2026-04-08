'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Smartphone, ShieldCheck } from 'lucide-react'
import { isPhoneFormatValid } from '@/lib/phone'
import { Button } from '@/components/ui/button'
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
    <div className="rounded-[30px] border border-amber-200/90 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))] p-6 shadow-[0_28px_70px_-48px_rgba(245,158,11,0.4)]">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-xs font-medium text-amber-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              账号安全校验
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">绑定手机号</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {required
                ? '你的普通用户账号还没有绑定手机号。绑定完成前，普通用户工作台会保持锁定。'
                : '绑定手机号后，普通用户入口会统一使用手机号 + 验证码登录。'}
            </p>
          </div>
        </div>

        <form onSubmit={handleBindPhone} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="space-y-2">
              <Label htmlFor="bind-phone" className="text-sm font-medium text-slate-700">
                手机号
              </Label>
              <Input
                id="bind-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="请输入手机号，如 13812345678"
                className="h-11 rounded-2xl border-white bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bind-sms-code" className="text-sm font-medium text-slate-700">
                短信验证码
              </Label>
              <div className="flex gap-3">
                <Input
                  id="bind-sms-code"
                  value={smsCode}
                  onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="请输入 6 位验证码"
                  className="h-11 rounded-2xl border-white bg-white tracking-[0.25em] placeholder:tracking-normal"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSendingCode || cooldown > 0}
                  onClick={handleSendCode}
                  className="h-11 min-w-[148px] rounded-2xl border-amber-200 bg-white px-4 text-slate-800 hover:border-amber-300 hover:bg-amber-50"
                >
                  {isSendingCode ? '发送中...' : cooldown > 0 ? `${cooldown}s` : '发送验证码'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-2xl bg-slate-950 px-6 text-white hover:bg-slate-800 lg:w-auto"
            >
              {isSubmitting ? '绑定中...' : '确认绑定'}
            </Button>
          </div>
        </form>

        {success ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
