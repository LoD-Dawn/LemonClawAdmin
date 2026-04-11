'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { CheckCircle2, Copy, KeyRound, Link2, Plus, RefreshCcw, ShieldCheck } from 'lucide-react'

type OAuthClientItem = {
  id: string
  clientId: string
  name: string
  isActive: boolean
  allowedRedirectUris: string[]
  createdAt: string
  updatedAt: string
}

interface OAuthClientsManagerProps {
  initialClients: OAuthClientItem[]
}

function toRedirectUriLines(uris: string[]) {
  return uris.join('\n')
}

function parseRedirectUriLines(value: string) {
  return Array.from(new Set(value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)))
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}

export function OAuthClientsManager({ initialClients }: OAuthClientsManagerProps) {
  const { toast } = useToast()
  const [origin, setOrigin] = useState('')
  const [clients, setClients] = useState(initialClients)
  const [selectedClientId, setSelectedClientId] = useState(initialClients[0]?.id ?? '')

  const [name, setName] = useState(initialClients[0]?.name ?? '')
  const [status, setStatus] = useState(initialClients[0]?.isActive ? 'active' : 'inactive')
  const [redirectUriText, setRedirectUriText] = useState(toRedirectUriLines(initialClients[0]?.allowedRedirectUris ?? []))
  const [updatedAt, setUpdatedAt] = useState(initialClients[0]?.updatedAt ?? '')

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createClientId, setCreateClientId] = useState('')
  const [createStatus, setCreateStatus] = useState('active')
  const [createRedirectUriText, setCreateRedirectUriText] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isRotatingSecret, setIsRotatingSecret] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState('')
  const [revealedSecretClientId, setRevealedSecretClientId] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null
  const redirectUris = parseRedirectUriLines(redirectUriText)
  const primaryRedirectUri = redirectUris[0] || 'https://your-app.example.com/oauth/callback'

  useEffect(() => {
    if (!selectedClient) {
      return
    }

    setName(selectedClient.name)
    setStatus(selectedClient.isActive ? 'active' : 'inactive')
    setRedirectUriText(toRedirectUriLines(selectedClient.allowedRedirectUris))
    setUpdatedAt(selectedClient.updatedAt)
    setRevealedSecret('')
    setRevealedSecretClientId('')
  }, [selectedClient])

  async function copyText(value: string, successTitle: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: successTitle })
    } catch {
      toast({ title: '复制失败', description: '请手动复制内容', variant: 'destructive' })
    }
  }

  function authorizeUrlFor(client: OAuthClientItem | null) {
    if (!client) return ''
    const previewOrigin = origin || 'https://your-admin.example.com'
    const url = new URL('/api/v1/auth/authorize', previewOrigin)
    url.searchParams.set('client_id', client.clientId)
    url.searchParams.set('redirect_uri', client.allowedRedirectUris[0] || primaryRedirectUri)
    url.searchParams.set('state', 'RANDOM_STATE')
    url.searchParams.set('scope', 'models:read quota:read')
    return url.toString()
  }

  function upsertClient(nextClient: OAuthClientItem) {
    setClients((current) => {
      const existingIndex = current.findIndex((item) => item.id === nextClient.id)
      if (existingIndex === -1) {
        return [nextClient, ...current]
      }

      const next = [...current]
      next[existingIndex] = nextClient
      return next
    })
  }

  async function handleCreate() {
    const createRedirectUris = parseRedirectUriLines(createRedirectUriText)
    if (!createName.trim() || !createClientId.trim() || createRedirectUris.length === 0) {
      toast({ title: '请完整填写客户端名称、ID 和回调地址', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/v1/admin/oauth-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          clientId: createClientId.trim(),
          isActive: createStatus === 'active',
          allowedRedirectUris: createRedirectUris,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        toast({ title: '创建失败', description: result.error || 'OAuth 客户端创建失败', variant: 'destructive' })
        return
      }

      const nextClient: OAuthClientItem = {
        id: result.data.id,
        clientId: result.data.clientId,
        name: result.data.name,
        isActive: result.data.isActive,
        allowedRedirectUris: result.data.allowedRedirectUris,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      }
      upsertClient(nextClient)
      setSelectedClientId(nextClient.id)
      setCreateOpen(false)
      setCreateName('')
      setCreateClientId('')
      setCreateStatus('active')
      setCreateRedirectUriText('')
      setRevealedSecret(result.data.clientSecret || '')
      setRevealedSecretClientId(nextClient.clientId)
      toast({ title: 'OAuth 客户端已创建', description: '客户端密钥已生成，请立即复制保存。' })
    } catch {
      toast({ title: '创建失败', description: '网络异常，请稍后重试', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  async function handleSave() {
    if (!selectedClient) return
    if (!name.trim() || redirectUris.length === 0) {
      toast({ title: '请完整填写名称和回调地址', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/v1/admin/oauth-clients/${selectedClient.id}`, {
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
        toast({ title: '保存失败', description: result.error || 'OAuth 客户端保存失败', variant: 'destructive' })
        return
      }

      upsertClient(result.data)
      setUpdatedAt(result.data.updatedAt)
      toast({ title: 'OAuth 客户端配置已保存' })
    } catch {
      toast({ title: '保存失败', description: '网络异常，请稍后重试', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRotateSecret() {
    if (!selectedClient) return

    setIsRotatingSecret(true)
    try {
      const response = await fetch(`/api/v1/admin/oauth-clients/${selectedClient.id}/rotate-secret`, {
        method: 'POST',
      })

      const result = await response.json()
      if (!response.ok) {
        toast({ title: '重置失败', description: result.error || '客户端密钥重置失败', variant: 'destructive' })
        return
      }

      setRevealedSecret(result.data.clientSecret)
      setRevealedSecretClientId(result.data.clientId)
      setUpdatedAt(result.data.updatedAt)
      upsertClient({ ...selectedClient, updatedAt: result.data.updatedAt })
      toast({ title: '客户端密钥已重置', description: '新密钥只展示一次，请及时保存。' })
    } catch {
      toast({ title: '重置失败', description: '网络异常，请稍后重试', variant: 'destructive' })
    } finally {
      setIsRotatingSecret(false)
    }
  }

  const tokenCurl = `curl -X POST '${origin || 'https://your-admin.example.com'}/api/v1/auth/token' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "grant_type":"authorization_code",
    "code":"AUTH_CODE",
    "client_id":"${selectedClient?.clientId ?? 'YOUR_CLIENT_ID'}",
    "client_secret":"YOUR_CLIENT_SECRET",
    "redirect_uri":"${primaryRedirectUri}"
  }'`

  const modelsCurl = `curl '${origin || 'https://your-admin.example.com'}/api/external/v1/me/models' \\
  -H 'Authorization: Bearer ACCESS_TOKEN'`

  return (
    <div className="space-y-6">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>新建第三方 OAuth 客户端</DialogTitle>
            <DialogDescription>创建后会返回一份明文 `client_secret`，只展示一次。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label>显示名称</Label>
              <Input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Acme Chat" />
            </div>
            <div className="space-y-2">
              <Label>客户端 ID</Label>
              <Input value={createClientId} onChange={(event) => setCreateClientId(event.target.value)} placeholder="acme-chat-web" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>允许回调地址</Label>
              <Textarea value={createRedirectUriText} onChange={(event) => setCreateRedirectUriText(event.target.value)} placeholder={'https://app.example.com/oauth/callback\nhttps://staging.example.com/oauth/callback'} className="min-h-[160px] font-mono text-sm leading-6" />
            </div>
            <div className="space-y-2">
              <Label>启用状态</Label>
              <Select value={createStatus} onValueChange={setCreateStatus}>
                <SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">创建后立即启用</SelectItem>
                  <SelectItem value="inactive">先创建，暂不启用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button type="button" onClick={handleCreate} disabled={isCreating}>{isCreating ? '创建中...' : '创建客户端'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
        <Card className="border-slate-200/80">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="text-xl">客户端列表</CardTitle>
              <CardDescription>每个客户端对应一个外部平台，客户端 ID 创建后保持不变。</CardDescription>
            </div>
            <Button type="button" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />新建客户端</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {clients.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm leading-6 text-slate-500">还没有第三方 OAuth 客户端。先创建一个客户端，再把 `client_id`、`client_secret` 和回调地址配置到外部平台。</div>
            ) : clients.map((client) => {
              const isSelected = client.id === selectedClientId
              return (
                <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className={cn('w-full rounded-[24px] border p-4 text-left transition-all duration-200', isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-[0_24px_48px_-36px_rgba(15,23,42,0.8)]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-900')}>{client.name}</p>
                      <p className={cn('mt-1 break-all font-mono text-xs', isSelected ? 'text-slate-300' : 'text-slate-500')}>{client.clientId}</p>
                    </div>
                    <Badge variant={client.isActive ? 'success' : 'warning'}>{client.isActive ? '已启用' : '已停用'}</Badge>
                  </div>
                  <div className={cn('mt-4 flex items-center gap-2 text-xs', isSelected ? 'text-slate-300' : 'text-slate-500')}>
                    <Link2 className="h-3.5 w-3.5" />
                    {client.allowedRedirectUris.length} 个回调地址
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]">
          <CardHeader>
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-sky-100 bg-white/80 px-3 py-2 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white"><ShieldCheck className="h-4 w-4" /></div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Authorization Code</p>
                <p className="text-sm font-medium text-slate-900">第三方接入流程</p>
              </div>
            </div>
            <CardTitle className="text-2xl">接入预览</CardTitle>
            <CardDescription className="text-[15px] leading-7 text-slate-600">外部平台使用当前客户端配置发起 OAuth 登录，换取 `access_token` 后即可按登录用户获取模型和配额数据。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/90 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Authorize URL</p>
              <p className="mt-3 break-all font-mono text-sm leading-6 text-slate-900">{authorizeUrlFor(selectedClient)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => copyText(authorizeUrlFor(selectedClient), '授权地址已复制')} disabled={!selectedClient}><Copy className="mr-2 h-4 w-4" />复制授权地址</Button>
              <Button type="button" variant="outline" onClick={() => copyText(primaryRedirectUri, '回调地址已复制')} disabled={!selectedClient}><Copy className="mr-2 h-4 w-4" />复制回调地址</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedClient ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle className="text-xl">基础配置</CardTitle>
              <CardDescription>`client_id` 不允许修改，避免影响第三方平台既有配置。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>显示名称</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>启用状态</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue placeholder="选择状态" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">允许第三方发起授权</SelectItem>
                      <SelectItem value="inactive">暂停第三方发起授权</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>客户端 ID</Label>
                  <Input value={selectedClient.clientId} readOnly className="bg-slate-50 font-mono text-slate-500" />
                </div>
                <div className="space-y-2">
                  <Label>最近更新</Label>
                  <Input value={updatedAt ? formatDateTime(updatedAt) : ''} readOnly className="bg-slate-50 text-slate-500" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>允许回调地址</Label>
                <Textarea value={redirectUriText} onChange={(event) => setRedirectUriText(event.target.value)} className="min-h-[180px] font-mono text-sm leading-6" />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={handleSave} disabled={isSaving}>{isSaving ? '保存中...' : '保存配置'}</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setName(selectedClient.name)
                  setStatus(selectedClient.isActive ? 'active' : 'inactive')
                  setRedirectUriText(toRedirectUriLines(selectedClient.allowedRedirectUris))
                  setUpdatedAt(selectedClient.updatedAt)
                  setRevealedSecret('')
                  setRevealedSecretClientId('')
                }}>恢复当前值</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-amber-500" />客户端密钥</CardTitle>
                <CardDescription>第三方平台服务端换 token 时使用 `client_secret`，建议只保存在服务端。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button type="button" variant="outline" className="w-full" onClick={handleRotateSecret} disabled={isRotatingSecret}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  {isRotatingSecret ? '重置中...' : '重置客户端密钥'}
                </Button>
                {revealedSecret && revealedSecretClientId === selectedClient.clientId ? (
                  <div className="space-y-3 rounded-[22px] border border-amber-200 bg-amber-50/80 p-4">
                    <p className="break-all font-mono text-sm leading-6 text-amber-950">{revealedSecret}</p>
                    <Button type="button" variant="secondary" className="w-full" onClick={() => copyText(revealedSecret, '客户端密钥已复制')}><Copy className="mr-2 h-4 w-4" />复制新密钥</Button>
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">当前不展示明文密钥。点击上方按钮后，系统会生成并返回一份新的客户端密钥。</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200/80">
              <CardHeader>
                <CardTitle className="text-xl">接入命令示例</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="overflow-x-auto rounded-[22px] border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">{tokenCurl}</pre>
                <pre className="overflow-x-auto rounded-[22px] border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">{modelsCurl}</pre>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}

      {revealedSecret && revealedSecretClientId ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">最新明文密钥已生成</p>
              <p className="mt-1 leading-6">当前展示的是客户端 <span className="font-mono">{revealedSecretClientId}</span> 的新密钥，请在离开页面前完成复制。</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
