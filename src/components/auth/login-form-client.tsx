'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LoginEntryMode } from '@/lib/default-organizations'
import { isPhoneFormatValid } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowRight,
  Globe,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'

interface LoginFormClientProps {
  entryMode: EntryMode
  showEntrySwitcher?: boolean
  minimal?: boolean
  titleOverride?: string
  descriptionOverride?: string
  oauthParams?: {
    client_id: string
    redirect_uri: string
    state: string
    scope: string
  }
}

type EntryMode = 'consumer' | 'enterprise'

export function LoginFormClient({
  entryMode,
  showEntrySwitcher = true,
  minimal = false,
  titleOverride,
  descriptionOverride,
  oauthParams,
}: LoginFormClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [consumerPhone, setConsumerPhone] = useState('')
  const [consumerSmsCode, setConsumerSmsCode] = useState('')
  const [isSendingSmsCode, setIsSendingSmsCode] = useState(false)
  const [smsCooldown, setSmsCooldown] = useState(0)

  const oauth = oauthParams || {
    client_id: searchParams.get('client_id') || '',
    redirect_uri: searchParams.get('redirect_uri') || '',
    state: searchParams.get('state') || '',
    scope: searchParams.get('scope') || 'skills:read mcps:read models:read quota:read claw:sessions:write',
  }

  const requestedCallbackUrl = searchParams.get('callbackUrl')
  const callbackUrl = requestedCallbackUrl || (entryMode === 'enterprise' ? '/dashboard' : '/profile')
  const hasRedirectUri = !!oauth.redirect_uri
  const isOAuthFlow = !!oauth.client_id
  const isDesktopAuthFlow = hasRedirectUri && !oauth.client_id
  const isAuthFlow = isOAuthFlow || isDesktopAuthFlow
  const scopeTokens = oauth.scope.split(/\s+/).filter(Boolean)
  const queryString = searchParams.toString()
  const alternateEntryMode: EntryMode = entryMode === 'enterprise' ? 'consumer' : 'enterprise'
  const alternateEntryLabel = entryMode === 'enterprise' ? '普通用户登录' : '企业用户登录'
  const alternateEntryHref = `/login/${alternateEntryMode}${queryString ? `?${queryString}` : ''}`

  let redirectHost = ''
  if (oauth.redirect_uri) {
    try {
      redirectHost = new URL(oauth.redirect_uri).host
    } catch {
      redirectHost = oauth.redirect_uri
    }
  }

  const oauthClientLabel = oauth.client_id
    ? oauth.client_id
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : ''

  const defaultTitle = isAuthFlow
    ? '登录并继续授权'
    : entryMode === 'enterprise'
      ? '企业用户登录'
      : '手机号验证码登录'

  const defaultDescription = isAuthFlow
    ? '完成登录后，系统会继续当前授权流程并跳转回目标应用。'
    : entryMode === 'enterprise'
      ? '适用于企业成员、部门管理员和平台管理员。企业账号通常由管理员统一开通。'
      : '适用于普通用户查看资源、提交申请和管理个人工作区。首次使用的手机号完成验证码校验后会自动创建账号。'

  const title = titleOverride || defaultTitle
  const description = descriptionOverride || defaultDescription
  const showTitleBlock = !minimal
  const showHeader = showTitleBlock || isAuthFlow || showEntrySwitcher

  async function finishAuthFlow() {
    if (isOAuthFlow) {
      const response = await fetch('/api/v1/auth/authorize/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: oauth.client_id,
          redirect_uri: oauth.redirect_uri,
          state: oauth.state,
          scope: oauth.scope,
        }),
      })

      if (!response.ok) {
        throw new Error('授权失败，请稍后重试。')
      }

      const { code } = await response.json()
      const redirectUrl = new URL(oauth.redirect_uri)
      redirectUrl.searchParams.set('code', code)
      if (oauth.state) {
        redirectUrl.searchParams.set('state', oauth.state)
      }
      router.push(redirectUrl.toString())
      return
    }

    if (isDesktopAuthFlow) {
      const response = await fetch('/api/v1/auth/desktop/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirect_uri: oauth.redirect_uri,
          state: oauth.state,
          scope: oauth.scope,
        }),
      })

      if (!response.ok) {
        throw new Error('桌面端授权失败，请稍后重试。')
      }

      const { callback_url } = await response.json()
      window.location.href = callback_url
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  async function loginWithCredentials(identifier: string, password: string, loginEntryMode: LoginEntryMode) {
    const result = await signIn('credentials', {
      identifier,
      password,
      entryMode: loginEntryMode,
      clientId: oauth.client_id || undefined,
      redirect: false,
    })

    if (result?.error) {
      throw new Error('邮箱或密码错误，或该账号不属于企业用户入口。')
    }

    await finishAuthFlow()
  }

  async function loginWithPhoneCode(phone: string, smsCode: string) {
    const result = await signIn('consumer-phone-code', {
      phone,
      smsCode,
      clientId: oauth.client_id || undefined,
      redirect: false,
    })

    if (result?.error) {
      throw new Error('验证码错误、已过期，或该手机号不支持普通用户入口。')
    }

    await finishAuthFlow()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      if (entryMode === 'consumer') {
        const phone = String(formData.get('phone') || '').trim()
        const smsCode = String(formData.get('smsCode') || '').trim()

        if (!isPhoneFormatValid(phone)) {
          throw new Error('请输入有效的中国大陆手机号。')
        }

        if (!/^\d{6}$/.test(smsCode)) {
          throw new Error('请输入 6 位短信验证码。')
        }

        await loginWithPhoneCode(phone, smsCode)
        return
      }

      const identifier = String(formData.get('identifier') || '').trim()
      const password = String(formData.get('password') || '')

      if (!identifier) {
        throw new Error('请输入企业账号邮箱。')
      }

      await loginWithCredentials(identifier, password, entryMode)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (smsCooldown <= 0) {
      return
    }

    const timer = window.setTimeout(() => {
      setSmsCooldown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [smsCooldown])

  async function handleSendVerificationCode() {
    const phone = consumerPhone.trim()
    setError('')
    setSuccessMessage('')

    if (!phone || !isPhoneFormatValid(phone)) {
      setError('请先输入有效的中国大陆手机号。')
      return
    }

    setIsSendingSmsCode(true)

    try {
      const response = await fetch('/api/auth/login/phone-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (result?.data?.cooldownRemaining) {
          setSmsCooldown(Number(result.data.cooldownRemaining) || 0)
        }
        throw new Error(result.error || '验证码发送失败，请稍后重试。')
      }

      setSmsCooldown(Number(result?.data?.resendInSeconds) || 60)
      setSuccessMessage(result.message || '验证码已发送，请查收短信。')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '验证码发送失败，请稍后重试。')
    } finally {
      setIsSendingSmsCode(false)
    }
  }

  return (
    <Card className="login-panel login-panel-glow w-full overflow-hidden rounded-[2rem] border border-black/10 bg-white">
      {showHeader ? (
        <CardHeader className="space-y-4 p-5 pb-0 sm:p-6 sm:pb-0">
          {!minimal ? (
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_16px_24px_-18px_rgba(15,23,42,0.8)]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Secure Entry</p>
                  <p className="font-medium text-slate-900">Access Portal</p>
                </div>
              </div>

              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                {isAuthFlow ? '授权流程' : '统一登录'}
              </div>
            </div>
          ) : null}

          {showTitleBlock ? (
            <div className="space-y-3">
              <CardTitle className="font-client-serif text-3xl tracking-tight text-slate-950 sm:text-[1.95rem]">
                {title}
              </CardTitle>
              <CardDescription className="max-w-[34rem] text-sm leading-6 text-slate-500">
                {description}
              </CardDescription>
            </div>
          ) : null}

          {isAuthFlow ? (
            <div className="rounded-[1.5rem] border border-red-200/80 bg-red-50/70 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-red-700" />
                <div className="space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-red-700/70">授权目标</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {isDesktopAuthFlow ? '桌面客户端' : oauthClientLabel || oauth.client_id}
                    </p>
                  </div>
                  {redirectHost ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Globe className="h-4 w-4 text-slate-400" />
                      <span className="truncate">{redirectHost}</span>
                    </div>
                  ) : null}
                  {scopeTokens.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {scopeTokens.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-full border border-red-200 bg-white px-2.5 py-1 text-xs text-slate-700"
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {showEntrySwitcher ? (
            <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              当前入口：<span className="font-medium text-slate-900">{entryMode === 'enterprise' ? '企业用户登录' : '普通用户登录'}</span>
              <Link href={alternateEntryHref} className="ml-2 font-medium text-red-700 underline-offset-4 hover:underline">
                切换到{alternateEntryLabel}
              </Link>
            </div>
          ) : null}
        </CardHeader>
      ) : null}

      <CardContent className={cn('p-5 sm:p-6', showHeader ? 'pt-4 sm:pt-4' : 'pt-5 sm:pt-6')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {entryMode === 'consumer' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                  手机号
                </Label>
                <div className="relative">
                  <Smartphone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="请输入手机号，如 13812345678"
                    value={consumerPhone}
                    onChange={(event) => setConsumerPhone(event.target.value)}
                    className="h-12 rounded-2xl border-black/12 bg-white pl-11 shadow-none placeholder:text-slate-400 focus-visible:border-red-700 focus-visible:ring-red-100 focus-visible:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="smsCode" className="text-sm font-medium text-slate-700">
                  短信验证码
                </Label>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_148px]">
                  <Input
                    id="smsCode"
                    name="smsCode"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="请输入 6 位验证码"
                    value={consumerSmsCode}
                    onChange={(event) => setConsumerSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="h-12 rounded-2xl border-black/12 bg-white text-base tracking-[0.25em] shadow-none placeholder:text-slate-400 focus-visible:border-red-700 focus-visible:ring-red-100 focus-visible:bg-white placeholder:tracking-normal"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSendingSmsCode || smsCooldown > 0}
                    onClick={handleSendVerificationCode}
                    className="h-12 rounded-2xl border-black/12 bg-white px-4 text-slate-900 shadow-none hover:border-red-300 hover:bg-red-50 focus-visible:ring-red-100"
                  >
                    {isSendingSmsCode
                      ? '发送中...'
                      : smsCooldown > 0
                        ? `${smsCooldown}s`
                        : '发送验证码'}
                  </Button>
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  未注册手机号在验证码校验通过后会自动创建普通用户账号。
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                  邮箱
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="identifier"
                    name="identifier"
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="h-12 rounded-2xl border-black/12 bg-white pl-11 shadow-none placeholder:text-slate-400 focus-visible:border-red-700 focus-visible:ring-red-100 focus-visible:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  密码
                </Label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    placeholder="请输入登录密码"
                    className="h-12 rounded-2xl border-black/12 bg-white pl-11 shadow-none placeholder:text-slate-400 focus-visible:border-red-700 focus-visible:ring-red-100 focus-visible:bg-white"
                  />
                </div>
              </div>
            </>
          )}

          {successMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="group h-12 w-full rounded-2xl bg-[#171717] text-sm text-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.65)] hover:bg-black focus-visible:ring-red-100"
          >
            <span>
              {isSubmitting
                ? '处理中...'
                : entryMode === 'enterprise'
                  ? '登录'
                  : '验证码登录'}
            </span>
            {!isSubmitting ? (
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            ) : null}
          </Button>
        </form>

        {!minimal ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-400">
            <p className="max-w-[16rem]">
              登录后将按角色权限访问对应资源。
            </p>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
              TLS / OAuth
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
