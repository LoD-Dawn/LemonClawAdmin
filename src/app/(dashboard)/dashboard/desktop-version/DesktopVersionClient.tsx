'use client'

import { useState } from 'react'
import { Copy, Download, FileJson, Rocket } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface DesktopVersionConfig {
  id: string
  version: string
  date: string
  changeLog: {
    ch: {
      title: string
      content: string[]
    }
    en: {
      title: string
      content: string[]
    }
  }
  macIntel: {
    url: string
  }
  macArm: {
    url: string
  }
  windowsX64: {
    url: string
  }
  createdAt: string
  updatedAt: string
}

interface DesktopVersionFormState {
  version: string
  date: string
  changeLogChTitle: string
  changeLogChContent: string
  changeLogEnTitle: string
  changeLogEnContent: string
  macIntelUrl: string
  macArmUrl: string
  windowsX64Url: string
}

interface DesktopVersionClientProps {
  initialConfig: DesktopVersionConfig
}

function toContentLines(items: string[]) {
  return items.join('\n')
}

function parseContentLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  )
}

function toFormState(config: DesktopVersionConfig): DesktopVersionFormState {
  return {
    version: config.version,
    date: config.date,
    changeLogChTitle: config.changeLog.ch.title,
    changeLogChContent: toContentLines(config.changeLog.ch.content),
    changeLogEnTitle: config.changeLog.en.title,
    changeLogEnContent: toContentLines(config.changeLog.en.content),
    macIntelUrl: config.macIntel.url,
    macArmUrl: config.macArm.url,
    windowsX64Url: config.windowsX64.url,
  }
}

function toPayload(form: DesktopVersionFormState) {
  return {
    version: form.version.trim(),
    date: form.date.trim(),
    changeLog: {
      ch: {
        title: form.changeLogChTitle.trim(),
        content: parseContentLines(form.changeLogChContent),
      },
      en: {
        title: form.changeLogEnTitle.trim(),
        content: parseContentLines(form.changeLogEnContent),
      },
    },
    macIntel: {
      url: form.macIntelUrl.trim(),
    },
    macArm: {
      url: form.macArmUrl.trim(),
    },
    windowsX64: {
      url: form.windowsX64Url.trim(),
    },
  }
}

export function DesktopVersionClient({ initialConfig }: DesktopVersionClientProps) {
  const { toast } = useToast()
  const [savedConfig, setSavedConfig] = useState(initialConfig)
  const [form, setForm] = useState<DesktopVersionFormState>(() => toFormState(initialConfig))
  const [updatedAt, setUpdatedAt] = useState(initialConfig.updatedAt)
  const [isSaving, setIsSaving] = useState(false)

  const payload = toPayload(form)
  const preview = {
    code: 0,
    data: {
      value: payload,
    },
  }
  const isReady =
    Boolean(payload.version)
    && Boolean(payload.date)
    && payload.changeLog.ch.content.length > 0
    && payload.changeLog.en.content.length > 0
    && Boolean(payload.macIntel.url)
    && Boolean(payload.macArm.url)
    && Boolean(payload.windowsX64.url)

  async function copyText(value: string, title: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title })
    } catch {
      toast({ title: '复制失败', description: '请手动复制', variant: 'destructive' })
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch('/api/v1/admin/desktop-version', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        toast({
          title: '保存失败',
          description: result.error || '桌面端版本配置保存失败',
          variant: 'destructive',
        })
        return
      }

      const nextConfig = {
        ...result.data,
        createdAt: new Date(result.data.createdAt).toISOString(),
        updatedAt: new Date(result.data.updatedAt).toISOString(),
      }

      setSavedConfig(nextConfig)
      setForm(toFormState(nextConfig))
      setUpdatedAt(nextConfig.updatedAt)
      toast({ title: '桌面端版本配置已保存' })
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden border-slate-200/80 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-3 rounded-full border border-sky-100 bg-white/80 px-3 py-2 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.85)]">
                  <Rocket className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Desktop Release</p>
                  <p className="text-sm font-medium text-slate-900">更新接口配置</p>
                </div>
              </div>
              <Badge variant={isReady ? 'success' : 'warning'}>
                {isReady ? '已就绪' : '待补充'}
              </Badge>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">桌面端最新版本管理</CardTitle>
              <CardDescription className="max-w-2xl text-[15px] leading-7 text-slate-600">
                这里维护的是桌面客户端“检查更新”接口返回的当前版本。保存后，桌面端请求 `/api/v1/desktop/version` 就能拿到同一份结构化数据。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[22px] border border-white/90 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">版本号</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{payload.version || '未设置'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">建议与桌面端安装包文件名保持一致。</p>
            </div>
            <div className="rounded-[22px] border border-white/90 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">发布日期</p>
              <p className="mt-3 text-lg font-semibold text-slate-900">{payload.date || '--'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">桌面端可直接展示这一天作为最新版本发布时间。</p>
            </div>
            <div className="rounded-[22px] border border-white/90 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">最近保存</p>
              <p className="mt-3 text-sm font-semibold text-slate-900">{new Date(updatedAt).toLocaleString('zh-CN')}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">后台修改后，桌面端接口会立即读取新配置。</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-slate-950 text-white shadow-[0_28px_70px_-38px_rgba(15,23,42,0.85)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl text-white">
              <FileJson className="h-5 w-5 text-sky-300" />
              接口预览
            </CardTitle>
            <CardDescription className="text-slate-300">
              桌面端读取接口会返回这份 JSON 结构，和你给的格式一致。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-slate-100">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                className="border-white/10 bg-white/10 text-white hover:bg-white/15"
                onClick={() => copyText(JSON.stringify(preview, null, 2), '接口 JSON 已复制')}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制 JSON
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => copyText('/api/v1/desktop/version', '接口地址已复制')}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制接口路径
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-slate-200/80">
          <CardHeader>
            <CardTitle className="text-xl">基础信息</CardTitle>
            <CardDescription>
              更新说明按每行一条填写，保存后会转换为数组输出到桌面端接口。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="desktop-version-number">版本号</Label>
                <Input
                  id="desktop-version-number"
                  value={form.version}
                  onChange={(event) => setForm((current) => ({ ...current, version: event.target.value }))}
                  placeholder="0.2.4"
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desktop-version-date">发布日期</Label>
                <Input
                  id="desktop-version-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="desktop-version-ch-title">中文标题</Label>
                <Input
                  id="desktop-version-ch-title"
                  value={form.changeLogChTitle}
                  onChange={(event) => setForm((current) => ({ ...current, changeLogChTitle: event.target.value }))}
                  placeholder="更新内容"
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desktop-version-en-title">英文标题</Label>
                <Input
                  id="desktop-version-en-title"
                  value={form.changeLogEnTitle}
                  onChange={(event) => setForm((current) => ({ ...current, changeLogEnTitle: event.target.value }))}
                  placeholder="What's New"
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="desktop-version-ch-content">中文更新说明</Label>
                <Textarea
                  id="desktop-version-ch-content"
                  value={form.changeLogChContent}
                  onChange={(event) => setForm((current) => ({ ...current, changeLogChContent: event.target.value }))}
                  placeholder={'修复若干问题\n优化更新流程'}
                  className="min-h-[180px] rounded-[20px] border-slate-200 bg-white text-sm leading-6"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desktop-version-en-content">英文更新说明</Label>
                <Textarea
                  id="desktop-version-en-content"
                  value={form.changeLogEnContent}
                  onChange={(event) => setForm((current) => ({ ...current, changeLogEnContent: event.target.value }))}
                  placeholder={'Bug fixes\nImproved update flow'}
                  className="min-h-[180px] rounded-[20px] border-slate-200 bg-white text-sm leading-6"
                />
              </div>
            </div>

            <div className="grid gap-5">
              <div className="space-y-2">
                <Label htmlFor="desktop-version-mac-intel-url">macOS Intel 安装包</Label>
                <Input
                  id="desktop-version-mac-intel-url"
                  value={form.macIntelUrl}
                  onChange={(event) => setForm((current) => ({ ...current, macIntelUrl: event.target.value }))}
                  placeholder="https://example.com/DiClaw-0.2.4-mac-x64.dmg"
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desktop-version-mac-arm-url">macOS Apple Silicon 安装包</Label>
                <Input
                  id="desktop-version-mac-arm-url"
                  value={form.macArmUrl}
                  onChange={(event) => setForm((current) => ({ ...current, macArmUrl: event.target.value }))}
                  placeholder="https://example.com/DiClaw-0.2.4-mac-arm64.dmg"
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desktop-version-windows-url">Windows x64 安装包</Label>
                <Input
                  id="desktop-version-windows-url"
                  value={form.windowsX64Url}
                  onChange={(event) => setForm((current) => ({ ...current, windowsX64Url: event.target.value }))}
                  placeholder="https://example.com/DiClaw-0.2.4-win-x64.exe"
                  className="h-11 rounded-xl border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : '保存配置'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(toFormState(savedConfig))
                  setUpdatedAt(savedConfig.updatedAt)
                }}
              >
                恢复已保存内容
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Download className="h-5 w-5 text-amber-500" />
                发布校验
              </CardTitle>
              <CardDescription>
                保存前建议确认这几个关键字段，避免桌面端检查更新后拿到不完整数据。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
              <div className="rounded-[20px] bg-slate-50 p-4">
                版本号、发布日期和三个下载地址都需要填写。
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                中英文更新说明会按数组返回，建议每次发版都至少保留一条说明。
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                桌面端接口路径固定为 `/api/v1/desktop/version`。
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80">
            <CardHeader>
              <CardTitle className="text-xl">当前状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
              <div className="rounded-[20px] bg-slate-50 p-4">
                当前已保存版本：{savedConfig.version || '未设置'}
              </div>
              <div className="rounded-[20px] bg-slate-50 p-4">
                上次保存时间：{new Date(savedConfig.updatedAt).toLocaleString('zh-CN')}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
