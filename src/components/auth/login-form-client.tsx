'use client'

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
  BriefcaseBusiness,
  Globe,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react'

interface LoginFormClientProps {
  oauthParams?: {
    client_id: string
    redirect_uri: string
    state: string
    scope: string
  }
}

type EntryMode = 'consumer' | 'enterprise'
type FormMode = 'login' | 'register'

export function LoginFormClient({ oauthParams }: LoginFormClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialEntryMode: EntryMode = (() => {
    const queryEntryMode = searchParams.get('entryMode')
    if (queryEntryMode === 'enterprise') {
      return 'enterprise'
    }

    const callbackUrl = searchParams.get('callbackUrl') || ''
    if (callbackUrl.startsWith('/dashboard')) {
      return 'enterprise'
    }

    return 'consumer'
  })()
  const [entryMode, setEntryMode] = useState<EntryMode>(initialEntryMode)
  const [formMode, setFormMode] = useState<FormMode>('login')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registerPhone, setRegisterPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
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
  const allowRegistration = entryMode === 'consumer'
  const scopeTokens = oauth.scope.split(/\s+/).filter(Boolean)

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

  const title = isAuthFlow
    ? '登录并继续授权'
    : formMode === 'register'
      ? '创建普通用户账号'
      : entryMode === 'enterprise'
        ? '企业用户登录'
        : '欢迎登录'

  const description = isAuthFlow
    ? '完成登录后，系统会继续当前授权流程并跳转回目标应用。'
    : formMode === 'register'
      ? '注册后会自动登录并进入普通用户工作台，邮箱会保留为资料字段。'
      : entryMode === 'enterprise'
        ? '适用于企业成员、部门管理员和平台管理员。企业账号通常由管理员统一开通。'
        : '适用于普通用户查看资源、提交申请和管理个人工作区。没有账号时可直接注册；历史未绑定手机号的账号可先用邮箱完成补绑。'

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
      if (oauth.state) redirectUrl.searchParams.set('state', oauth.state)
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
      redirect: false,
    })

    if (result?.error) {
      throw new Error(
        loginEntryMode === 'enterprise'
          ? '邮箱或密码错误，或该账号不属于企业用户入口。'
          : '手机号或密码错误；若你是历史未绑定手机号的普通用户，也可暂时输入邮箱完成补绑。'
      )
    }

    await finishAuthFlow()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const identifier = String(formData.get('identifier') || '').trim()
    const phone = String(formData.get('phone') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')
    const submittedSmsCode = String(formData.get('smsCode') || '').trim()

    try {
      if (formMode === 'register') {
        if (!allowRegistration) {
          throw new Error('企业用户暂不支持自助注册，请联系管理员开通账号。')
        }

        if (password.length < 8) {
          throw new Error('密码至少需要 8 位。')
        }

        if (password !== confirmPassword) {
          throw new Error('两次输入的密码不一致。')
        }

        if (!isPhoneFormatValid(phone)) {
          throw new Error('请输入有效的中国大陆手机号。')
        }

        if (!/^\d{6}$/.test(submittedSmsCode)) {
          throw new Error('请输入 6 位短信验证码。')
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, email, password, smsCode: submittedSmsCode }),
        })

        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(result.error || '注册失败，请稍后重试。')
        }

        setSuccessMessage('注册成功，正在为你登录...')
        await loginWithCredentials(phone, password, entryMode)
        return
      }

      if (entryMode === 'consumer' && !identifier) {
        throw new Error('请输入手机号；历史未绑定手机号的账号可输入邮箱。')
      }

      await loginWithCredentials(identifier, password, entryMode)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetRegisterState() {
    setRegisterPhone('')
    setSmsCode('')
    setSmsCooldown(0)
    setIsSendingSmsCode(false)
  }

  function handleEntryModeChange(nextMode: EntryMode) {
    setEntryMode(nextMode)
    setError('')
    setSuccessMessage('')
    if (nextMode !== 'consumer') {
      resetRegisterState()
    }
    if (nextMode === 'enterprise' && formMode === 'register') {
      setFormMode('login')
    }
  }

  const isRegisterMode = formMode === 'register'

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
    const phone = registerPhone.trim()
    setError('')
    setSuccessMessage('')

    if (!phone || !isPhoneFormatValid(phone)) {
      setError('请先输入有效的中国大陆手机号。')
      return
    }

    setIsSendingSmsCode(true)

    try {
      const response = await fetch('/api/auth/register/phone-code', {
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
    <Card className="login-panel login-panel-glow w-full overflow-hidden rounded-[2rem] border-white/70 bg-white/90">
      <CardHeader className={cn('space-y-3 p-5 pb-0 sm:p-6 sm:pb-0', isRegisterMode && 'space-y-2')}>
        <div className="flex items-start justify-between gap-4">
          <div className={cn(
            'inline-flex items-center gap-3 rounded-full border border-orange-100 bg-orange-50/90 px-4 py-2 text-sm text-orange-800',
            isRegisterMode && 'px-3 py-1.5'
          )}>
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-orange-400 to-amber-300 text-white shadow-[0_14px_24px_-18px_rgba(249,115,22,0.85)]',
              isRegisterMode && 'h-8 w-8 rounded-xl'
            )}>
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-orange-500">Secure Entry</p>
              <p className="font-medium text-slate-900">Access Portal</p>
            </div>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            {isAuthFlow ? '授权流程' : '统一登录'}
          </div>
        </div>

        <div className={cn('space-y-3', isRegisterMode && 'space-y-2')}>
          <CardTitle className={cn(
            'font-client-serif text-3xl tracking-tight text-slate-950 sm:text-[1.95rem]',
            isRegisterMode && 'text-[2rem] leading-none sm:text-[2.1rem]'
          )}>
            {title}
          </CardTitle>
          <CardDescription className={cn(
            'max-w-[34rem] text-sm leading-6 text-slate-500',
            isRegisterMode && 'leading-5'
          )}>
            {description}
          </CardDescription>
        </div>

        {isAuthFlow ? (
          <div className="rounded-[1.6rem] border border-amber-200 bg-amber-50/80 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-700/70">授权目标</p>
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
                        className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs text-slate-700"
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

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => handleEntryModeChange('consumer')}
            className={cn(
              'flex min-h-[72px] cursor-pointer items-center gap-3 rounded-[1.5rem] border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2',
              isRegisterMode && 'min-h-[64px] p-3.5',
              entryMode === 'consumer'
                ? 'border-orange-200 bg-orange-50/90 shadow-[0_18px_36px_-30px_rgba(249,115,22,0.65)]'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900">普通用户</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleEntryModeChange('enterprise')}
            className={cn(
              'flex min-h-[72px] cursor-pointer items-center gap-3 rounded-[1.5rem] border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2',
              isRegisterMode && 'min-h-[64px] p-3.5',
              entryMode === 'enterprise'
                ? 'border-slate-900 bg-slate-900 text-white shadow-[0_20px_42px_-34px_rgba(15,23,42,0.85)]'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full',
                entryMode === 'enterprise' ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'
              )}
            >
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
            <div>
              <p className={cn('font-medium', entryMode === 'enterprise' ? 'text-white' : 'text-slate-900')}>企业用户</p>
            </div>
          </button>
        </div>

        {allowRegistration && !isAuthFlow ? (
          <div className="grid grid-cols-2 gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setFormMode('login')
                setError('')
                setSuccessMessage('')
                resetRegisterState()
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                formMode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              )}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => {
                setFormMode('register')
                setError('')
                setSuccessMessage('')
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                formMode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              )}
            >
              注册
            </button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="p-5 pt-4 sm:p-6 sm:pt-4">
        <form onSubmit={handleSubmit} className={cn('space-y-4', isRegisterMode && 'space-y-3')}>
          {isRegisterMode ? (
            <div className="space-y-4 rounded-[1.6rem] border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                    昵称
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={50}
                    placeholder="请输入你的昵称"
                    className="h-11 rounded-2xl border-white bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  />
                </div>

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
                      value={registerPhone}
                      onChange={(event) => setRegisterPhone(event.target.value)}
                      className="h-11 rounded-2xl border-white bg-white pl-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="smsCode" className="text-sm font-medium text-slate-700">
                    短信验证码
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="smsCode"
                      name="smsCode"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="请输入 6 位验证码"
                      value={smsCode}
                      onChange={(event) => setSmsCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-11 flex-1 rounded-2xl border-white bg-white text-base tracking-[0.25em] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] placeholder:tracking-normal"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSendingSmsCode || smsCooldown > 0}
                      onClick={handleSendVerificationCode}
                      className="h-11 min-w-[148px] rounded-2xl border-orange-200 bg-white px-4 text-slate-800 hover:border-orange-300 hover:bg-orange-50"
                    >
                      {isSendingSmsCode
                        ? '发送中...'
                        : smsCooldown > 0
                          ? `${smsCooldown}s`
                          : '发送验证码'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    邮箱
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      className="h-11 rounded-2xl border-white bg-white pl-11 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                    />
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    邮箱继续保留为资料字段和通知字段，不再用于注册验证码。
                  </p>
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
                      placeholder="至少 8 位密码"
                      className="h-11 rounded-2xl border-slate-200 bg-white pl-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                    确认密码
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    placeholder="再次输入密码"
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {!isRegisterMode ? (
            <div className="space-y-2">
              <Label htmlFor="identifier" className="text-sm font-medium text-slate-700">
                {entryMode === 'enterprise' ? '邮箱' : '手机号'}
              </Label>
              <div className="relative">
                {entryMode === 'enterprise' ? (
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                ) : (
                  <Smartphone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                )}
                <Input
                  id="identifier"
                  name="identifier"
                  type={entryMode === 'enterprise' ? 'email' : 'text'}
                  required
                  placeholder={entryMode === 'enterprise' ? 'name@company.com' : '请输入手机号，如 13812345678'}
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-11"
                />
              </div>
              {entryMode === 'consumer' ? (
                <p className="text-xs leading-5 text-slate-500">
                  历史普通用户如果尚未绑定手机号，可临时输入邮箱登录并在个人概览中完成补绑。
                </p>
              ) : null}
            </div>
          ) : null}

          {!isRegisterMode ? (
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
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-11"
                />
              </div>
            </div>
          ) : null}

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
            className={cn(
              'group h-11 w-full rounded-2xl text-sm shadow-[0_22px_40px_-28px_rgba(15,23,42,0.45)]',
              entryMode === 'enterprise'
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 text-white hover:from-orange-600 hover:via-orange-500 hover:to-amber-400'
            )}
          >
            <span>
              {isSubmitting
                ? '处理中...'
                : formMode === 'register'
                  ? '注册'
                  : '登录'}
            </span>
            {!isSubmitting ? (
              <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            ) : null}
          </Button>
        </form>

        <div className={cn(
          'mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-400',
          isRegisterMode && 'mt-3 pt-3'
        )}>
          <p className="max-w-[16rem]">
            登录后将按角色权限访问对应资源。
          </p>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-500">
            TLS / OAuth
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
