'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Cpu, Globe, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'

interface LoginFormClientProps {
  oauthParams?: {
    client_id: string
    redirect_uri: string
    state: string
    scope: string
  }
}

export function LoginFormClient({ oauthParams }: LoginFormClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const callbackUrl = searchParams.get('callbackUrl') || '/client'

  const oauth = oauthParams || {
    client_id: searchParams.get('client_id') || '',
    redirect_uri: searchParams.get('redirect_uri') || '',
    state: searchParams.get('state') || '',
    scope: searchParams.get('scope') || 'skills:read mcps:read models:read'
  }

  const hasRedirectUri = !!oauth.redirect_uri
  const isOAuthFlow = !!oauth.client_id
  const isDesktopAuthFlow = hasRedirectUri && !oauth.client_id
  const isAuthFlow = isOAuthFlow || isDesktopAuthFlow
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false
    })

    if (result?.error) {
      setError('Invalid email or password')
      setIsLoading(false)
      return
    }

    if (isOAuthFlow) {
      // Generate auth code and redirect for browser-based OAuth clients.
      try {
        const response = await fetch('/api/v1/auth/authorize/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: oauth.client_id,
            redirect_uri: oauth.redirect_uri,
            state: oauth.state,
            scope: oauth.scope
          })
        })

        if (response.ok) {
          const { code } = await response.json()
          const redirectUrl = new URL(oauth.redirect_uri)
          redirectUrl.searchParams.set('code', code)
          if (oauth.state) redirectUrl.searchParams.set('state', oauth.state)
          router.push(redirectUrl.toString())
        } else {
          setError('Authorization failed')
          setIsLoading(false)
        }
      } catch {
        setError('Authorization failed')
        setIsLoading(false)
      }
    } else if (isDesktopAuthFlow) {
      try {
        const response = await fetch('/api/v1/auth/desktop/authorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            redirect_uri: oauth.redirect_uri,
            state: oauth.state,
            scope: oauth.scope
          })
        })

        if (response.ok) {
          const { callback_url } = await response.json()
          window.location.href = callback_url
        } else {
          setError('Desktop authorization failed')
          setIsLoading(false)
        }
      } catch {
        setError('Desktop authorization failed')
        setIsLoading(false)
      }
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <Card className="login-panel login-panel-glow w-full max-w-[460px] overflow-hidden rounded-[2rem] border-white/10 bg-slate-950/75 text-white shadow-[0_32px_80px_rgba(2,6,23,0.48)] backdrop-blur-xl">
      <CardHeader className="space-y-6 p-7 pb-0 sm:p-8 sm:pb-0">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-slate-200 backdrop-blur-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-200 to-orange-300 text-slate-950 shadow-lg shadow-amber-500/20">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Skill Hub</p>
              <p className="text-sm font-medium text-white">Access Console</p>
            </div>
          </div>
          <div className="hidden rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100 sm:block">
            已启用安全验证
          </div>
        </div>

        <div className="space-y-3">
          <CardTitle className="font-client-serif text-3xl font-bold tracking-tight text-white sm:text-[2.15rem]">
            {isOAuthFlow ? '继续授权此应用' : isDesktopAuthFlow ? '继续授权桌面端' : '欢迎回到管理入口'}
          </CardTitle>
          <CardDescription className="max-w-md text-sm leading-6 text-slate-300 sm:text-[15px]">
            {isAuthFlow
              ? '登录后即可完成授权，系统会根据申请的权限范围继续跳转到目标应用。'
              : '使用您的账号进入 Skill 与 MCP 管理系统，继续处理资源、审批与接入流程。'}
          </CardDescription>
        </div>

        {isAuthFlow ? (
          <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-amber-100/70">授权应用</p>
                  <p className="mt-1 font-medium text-white">
                    {isDesktopAuthFlow ? '桌面客户端' : oauthClientLabel || oauth.client_id}
                  </p>
                </div>
                {redirectHost ? (
                  <div className="flex items-center gap-2 text-amber-50/80">
                    <Globe className="h-4 w-4" />
                    <span className="truncate">{redirectHost}</span>
                  </div>
                ) : null}
                {scopeTokens.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {scopeTokens.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-white/90"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-200 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">统一入口</p>
              <p className="mt-2 leading-6 text-slate-100">登录后自动进入对应工作台</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">OAuth</p>
              <p className="mt-2 leading-6 text-slate-100">兼容授权流程直接跳转</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">安全审计</p>
              <p className="mt-2 leading-6 text-slate-100">面向后台和资源调用场景</p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-7 pt-7 sm:p-8 sm:pt-7">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-sm font-medium text-slate-200">邮箱</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="name@company.com"
                className="h-12 rounded-2xl border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-slate-500 focus-visible:border-amber-300/50 focus-visible:ring-amber-200/20"
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm font-medium text-slate-200">密码</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="输入您的登录密码"
                className="h-12 rounded-2xl border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-slate-500 focus-visible:border-amber-300/50 focus-visible:ring-amber-200/20"
              />
            </div>
          </div>
          {error ? (
            <p className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            className="group h-12 w-full rounded-2xl bg-gradient-to-r from-amber-300 via-amber-200 to-orange-300 text-slate-950 shadow-[0_18px_40px_rgba(251,191,36,0.24)] hover:from-amber-200 hover:via-amber-100 hover:to-orange-200"
            disabled={isLoading}
          >
            <span>{isLoading ? '处理中...' : isAuthFlow ? '登录并授权' : '进入系统'}</span>
            {!isLoading ? <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" /> : null}
          </Button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400">
          <p className="max-w-[15rem]">
            登录即表示您将按照系统角色权限访问对应资源与功能。
          </p>
          <div className="rounded-full border border-white/10 px-3 py-1 text-slate-300">
            TLS / OAuth / Audit
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
