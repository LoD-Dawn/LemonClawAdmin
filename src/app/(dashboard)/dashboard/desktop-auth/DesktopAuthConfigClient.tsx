'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Copy, Link2, LockKeyhole, RefreshCcw, ShieldCheck } from 'lucide-react'

interface DesktopAuthConfig {
  id: string
  clientId: string
  name: string
  isActive: boolean
  allowedRedirectUris: string[]
  createdAt: string | Date
  updatedAt: string | Date
}

interface DesktopAuthConfigClientProps {
  initialConfig: DesktopAuthConfig
}

function toRedirectUriLines(uris: string[]) {
  return uris.join('\n')
}

function parseRedirectUriLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  )
}

export function DesktopAuthConfigClient({ initialConfig }: DesktopAuthConfigClientProps) {
  const { toast } = useToast()
  const [savedConfig, setSavedConfig] = useState(initialConfig)
  const [name, setName] = useState(initialConfig.name)
  const [status, setStatus] = useState(initialConfig.isActive ? 'active' : 'inactive')
  const [redirectUriText, setRedirectUriText] = useState(toRedirectUriLines(initialConfig.allowedRedirectUris))
  const [origin, setOrigin] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRotatingSecret, setIsRotatingSecret] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState('')
  const [updatedAt, setUpdatedAt] = useState(initialConfig.updatedAt)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const redirectUris = useMemo(() => parseRedirectUriLines(redirectUriText), [redirectUriText])
  const primaryRedirectUri = redirectUris[0] || 'diclaw://auth/callback'
  const loginUrlPreview = origin
    ? `${origin}/login?redirect_uri=${encodeURIComponent(primaryRedirectUri)}&state=RANDOM_STATE`
    : `/login?redirect_uri=${encodeURIComponent(primaryRedirectUri)}&state=RANDOM_STATE`

  async function copyText(value: string, successTitle: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: successTitle })
    } catch {
      toast({ title: '复制失败', description: '请手动复制内容', variant: 'destructive' })
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: '名称不能为空', variant: 'destructive' })
      return
    }

    if (redirectUris.length === 0) {
      toast({ title: '请至少配置一个回调地址', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/v1/admin/desktop-auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          isActive: status === 'active',
          allowedRedirectUris: redirectUris,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        toast({
          title: '保存失败',
          description: result.error || '桌面端登录配置保存失败',
          variant: 'destructive',
        })
        return
      }

      setSavedConfig(result.data)
      setName(result.data.name)
      setStatus(result.data.isActive ? 'active' : 'inactive')
      setRedirectUriText(toRedirectUriLines(result.data.allowedRedirectUris))
      setUpdatedAt(result.data.updatedAt)
      toast({ title: '桌面端登录配置已保存' })
    } catch {
      toast({
        title: '保存失败',
        description: '网络异常，请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRotateSecret() {
    setIsRotatingSecret(true)
    try {
      const response = await fetch('/api/v1/admin/desktop-auth/rotate-secret', {
        method: 'POST',
      })

      const result = await response.json()
      if (!response.ok) {
        toast({
          title: '重置失败',
          description: result.error || '客户端密钥重置失败',
          variant: 'destructive',
        })
        return
      }

      setRevealedSecret(result.data.clientSecret)
      setUpdatedAt(result.data.updatedAt)
      toast({
        title: '客户端密钥已重置',
        description: '新密钥只会展示这一次，请及时保存到桌面端配置里。',
      })
    } catch {
      toast({
        title: '重置失败',
        description: '网络异常，请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setIsRotatingSecret(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-sky-100 bg-white/80 px-3 py-2 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.85)]">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Desktop Auth</p>
                  <p className="text-sm font-medium text-slate-900">浏览器登录授权</p>
                </div>
              </div>
              <Badge variant={status === 'active' ? 'success' : 'warning'}>
                {status === 'active' ? '已启用' : '已停用'}
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">桌面端统一登录配置</CardTitle>
              <CardDescription className="max-w-2xl text-[15px] leading-7 text-slate-600">
                管理桌面客户端发起登录时使用的授权名称、允许回调地址和客户端密钥。配置保存后，桌面端只需要把浏览器打开地址切到新的管理后台域名或 IP。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/90 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">步骤 1</p>
              <p className="mt-3 text-sm font-medium text-slate-900">桌面端打开登录页</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">携带 `redirect_uri` 和 `state` 即可复用后台登录页。</p>
            </div>
            <div className="rounded-[22px] border border-white/90 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">步骤 2</p>
              <p className="mt-3 text-sm font-medium text-slate-900">后台发放 token</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">用户完成登录后，服务端直接创建 access / refresh token。</p>
            </div>
            <div className="rounded-[22px] border border-white/90 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">步骤 3</p>
              <p className="mt-3 text-sm font-medium text-slate-900">系统跳回桌面协议</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">`/api/v1/auth/desktop-callback` 会把参数中转到你的桌面协议地址。</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-slate-950 text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.85)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <Link2 className="h-5 w-5 text-sky-300" />
              启动地址预览
            </CardTitle>
            <CardDescription className="text-slate-300">
              桌面端打开浏览器时，可以直接拼这条地址；只需要把 host 换成当前管理后台即可。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Launch URL</p>
              <p className="mt-3 break-all font-mono text-sm leading-6 text-slate-100">{loginUrlPreview}</p>
            </div>
            <div className="space-y-2 rounded-[22px] border border-sky-400/20 bg-sky-400/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200/70">当前主回调地址</p>
              <p className="break-all font-mono text-sm text-sky-50">{primaryRedirectUri}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                className="border-white/10 bg-white/10 text-white hover:bg-white/15"
                onClick={() => copyText(loginUrlPreview, '启动地址已复制')}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制启动地址
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => copyText(primaryRedirectUri, '回调地址已复制')}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制回调地址
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-xl">基础配置</CardTitle>
            <CardDescription>
              回调地址按每行一个填写。桌面端登录时传入的 `redirect_uri` 必须与这里完全一致。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="desktop-auth-name">显示名称</Label>
                <Input
                  id="desktop-auth-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Desktop Client"
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>启用状态</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用桌面端登录</SelectItem>
                    <SelectItem value="inactive">暂停桌面端登录</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="desktop-auth-client-id">客户端 ID</Label>
                <Input
                  id="desktop-auth-client-id"
                  value={initialConfig.clientId}
                  readOnly
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desktop-auth-updated-at">最近更新</Label>
                <Input
                  id="desktop-auth-updated-at"
                  value={new Date(updatedAt).toLocaleString('zh-CN')}
                  readOnly
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desktop-auth-redirect-uris">允许回调地址</Label>
              <Textarea
                id="desktop-auth-redirect-uris"
                value={redirectUriText}
                onChange={(event) => setRedirectUriText(event.target.value)}
                placeholder={'diclaw://auth/callback\nmyapp://login/callback'}
                className="min-h-[180px] rounded-[20px] border-slate-200 bg-white font-mono text-sm leading-6"
              />
              <p className="text-sm leading-6 text-slate-500">
                支持自定义协议。示例：`diclaw://auth/callback`。如果桌面端传入未登记的 URI，授权会被拒绝。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存配置'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setName(savedConfig.name)
                  setStatus(savedConfig.isActive ? 'active' : 'inactive')
                  setRedirectUriText(toRedirectUriLines(savedConfig.allowedRedirectUris))
                  setUpdatedAt(savedConfig.updatedAt)
                  setRevealedSecret('')
                }}
              >
                恢复初始值
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LockKeyhole className="h-5 w-5 text-amber-500" />
                客户端密钥
              </CardTitle>
              <CardDescription>
                需要重新发放桌面端客户端密钥时，在这里重置。新密钥只展示一次。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleRotateSecret}
                disabled={isRotatingSecret}
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                {isRotatingSecret ? '重置中...' : '重置客户端密钥'}
              </Button>

              {revealedSecret ? (
                <div className="space-y-3 rounded-[22px] border border-amber-200 bg-amber-50/80 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-700/70">New Secret</p>
                    <p className="mt-2 break-all font-mono text-sm leading-6 text-amber-950">{revealedSecret}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => copyText(revealedSecret, '客户端密钥已复制')}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    复制新密钥
                  </Button>
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                  目前不展示明文密钥。点击上方按钮后，系统会生成并返回一份新的客户端密钥。
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle className="text-xl">接入提醒</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
              <div className="rounded-[20px] bg-slate-50 p-4">
                浏览器地址只需要改后台 host。
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                `state` 由桌面端自行生成并校验。
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                token 最终会经 `/api/v1/auth/desktop-callback` 中转回桌面协议地址。
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
