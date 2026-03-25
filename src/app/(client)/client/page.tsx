import Link from 'next/link'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  groupResourcesByVisibility,
  listConsumableResources,
  listDiscoverableResources,
  type ResourceCatalogItem,
} from '@/lib/resource-access'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApplyButton } from '@/components/client/apply-button'
import { ClientCreateActions } from '@/components/client/client-create-actions'
import {
  ArrowRight,
  Box,
  Building2,
  CheckCircle2,
  Clock3,
  Cpu,
  Download,
  ExternalLink,
  FolderLock,
  Laptop,
  Layers3,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Workflow,
} from 'lucide-react'

export const runtime = 'nodejs'

const WINDOWS_DESKTOP_DOWNLOAD_URL =
  'https://lemonclaw-1370027379.cos.ap-guangzhou.myqcloud.com/version/LemonClaw%20Setup%200.2.3.exe'

const visibilityLabels: Record<string, string> = {
  company: '公共',
  department: '部门',
  personal: '个人',
}

const visibilityStyles: Record<string, string> = {
  company: 'border-sky-200 bg-sky-50 text-sky-700',
  department: 'border-amber-200 bg-amber-50 text-amber-700',
  personal: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

type ClientSessionUser = {
  id: string
  isSuperAdmin: boolean
  isDepartmentAdmin: boolean
  organizationId: string | null
  departmentId: string | null
  name?: string | null
  email?: string | null
}

function getRoleMeta(user: Pick<ClientSessionUser, 'isSuperAdmin' | 'isDepartmentAdmin'>) {
  if (user.isSuperAdmin) {
    return {
      label: '超级管理员',
      description: '你可以在客户端视角下体验资源，同时随时切换到管理控制台处理全局事务。',
    }
  }

  if (user.isDepartmentAdmin) {
    return {
      label: '部门管理员',
      description: '你可以浏览自己的可用资源，也可以进入管理控制台处理本部门审批与授权。',
    }
  }

  return {
    label: '客户端用户',
    description: '这里是统一查看已开通能力、发现资源和提交申请的入口。',
  }
}

function StatusBadge({ resource }: { resource: ResourceCatalogItem }) {
  const badge = resource.canUse
    ? {
        label: resource.visibility === 'personal' ? '我的资源' : '已开通',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      }
    : resource.applicationStatus === 'pending'
      ? {
          label: '待审批',
          className: 'border-amber-200 bg-amber-50 text-amber-700',
        }
      : resource.applicationStatus === 'rejected'
        ? {
            label: '已拒绝',
            className: 'border-rose-200 bg-rose-50 text-rose-700',
          }
        : resource.applicationStatus === 'revoked'
          ? {
              label: '已撤销',
              className: 'border-slate-200 bg-slate-100 text-slate-600',
            }
          : {
              label: '可申请',
              className: 'border-violet-200 bg-violet-50 text-violet-700',
            }

  return <Badge className={cn('px-3 py-1 text-xs font-semibold', badge.className)}>{badge.label}</Badge>
}

function ResourceInfo({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
        <span className="text-slate-500">{icon}</span>
        {label}
      </div>
      <p className="mt-2 line-clamp-2 text-sm text-slate-700">{value}</p>
    </div>
  )
}

function MetricCard({
  label,
  value,
  note,
  icon,
  inverse = false,
}: {
  label: string
  value: number
  note: string
  icon: React.ReactNode
  inverse?: boolean
}) {
  return (
    <Card
      className={cn(
        'shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)]',
        inverse ? 'border-white/10 bg-white/10' : 'border-white/60 bg-white/75'
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={cn('text-xs uppercase tracking-[0.24em]', inverse ? 'text-slate-300' : 'text-slate-400')}>
              {label}
            </p>
            <p className={cn('mt-3 text-3xl font-semibold', inverse ? 'text-white' : 'text-slate-900')}>
              {value}
            </p>
          </div>
          <div
            className={cn(
              'rounded-2xl border p-3',
              inverse ? 'border-white/10 bg-white/10 text-white' : 'border-slate-200/80 bg-white/90 text-slate-700'
            )}
          >
            {icon}
          </div>
        </div>
        <p className={cn('mt-3 text-sm', inverse ? 'text-slate-300' : 'text-slate-500')}>{note}</p>
      </CardContent>
    </Card>
  )
}

function DesktopDownloadPanel() {
  return (
    <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">
              <Laptop className="mr-1.5 h-3.5 w-3.5" />
              桌面程序下载
            </Badge>
            <Badge className="border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">Windows 已支持</Badge>
            <Badge className="border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">mac 待更新</Badge>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            如需使用桌面客户端，可直接下载 Windows 安装包。mac 版本暂不支持，待更新中。
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
            <a href={WINDOWS_DESKTOP_DOWNLOAD_URL} target="_blank" rel="noreferrer">
              下载 Windows 版
              <Download className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <div className="rounded-full border border-slate-200 bg-slate-100/80 px-4 py-2 text-sm text-slate-500">mac：待更新中</div>
        </div>
      </div>
    </div>
  )
}

function GuestLanding() {
  const roleGuides = [
    {
      title: '客户端用户',
      description: '登录后查看自己已开通的 Skill 和 MCP，并按需申请新的部门资源。',
      badge: '使用者视角',
      icon: Sparkles,
    },
    {
      title: '部门管理员',
      description: '登录后进入部门审批、授权和资源维护入口，集中处理本部门工作。',
      badge: '部门管理',
      icon: Building2,
    },
    {
      title: '超级管理员',
      description: '登录后进入平台级控制台，管理用户、组织架构、资源目录和审批流程。',
      badge: '平台管理',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <Card className="relative overflow-hidden border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82)_55%,rgba(226,232,240,0.9))] shadow-[0_28px_80px_-45px_rgba(15,23,42,0.55)]">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_rgba(125,211,252,0.18),_transparent_48%)] lg:block" />
          <CardContent className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] lg:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-slate-200 bg-white px-3 py-1 text-slate-700">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Client Home
                </Badge>
                <Badge className="border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">项目唯一入口</Badge>
                <Badge className="border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">支持未登录访问</Badge>
              </div>

              <h1 className="mt-5 font-client-serif text-4xl leading-tight text-slate-950 sm:text-5xl">
                LemonClaw
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                这里是项目唯一入口。未登录时仅展示平台介绍、使用路径和角色说明；登录后才会看到详细资源目录、
                已开通能力、申请状态，以及与你角色对应的后台入口。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
                  <Link href="/login?callbackUrl=%2Fclient">
                    立即登录查看详情
                    <LogIn className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  登录后按角色展示不同入口
                </div>
              </div>

              <DesktopDownloadPanel />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <MetricCard
                label="资源目录"
                value={2}
                note="包含 Skill 能力与 MCP 服务两类目录"
                icon={<Layers3 className="h-5 w-5" />}
              />
              <MetricCard
                label="使用路径"
                value={3}
                note="浏览、申请、使用三个阶段清晰分层"
                icon={<Workflow className="h-5 w-5" />}
              />
              <MetricCard
                label="角色入口"
                value={3}
                note="普通用户、部门管理员、超级管理员分别分流"
                icon={<ShieldCheck className="h-5 w-5" />}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 bg-slate-950 text-white shadow-[0_28px_80px_-45px_rgba(15,23,42,0.8)]">
          <CardHeader className="pb-4">
            <Badge className="w-fit border-white/10 bg-white/10 px-3 py-1 text-slate-200">访问说明</Badge>
            <CardTitle className="font-client-serif text-[30px] text-white">先了解，再登录</CardTitle>
            <CardDescription className="text-slate-300">
              游客阶段只保留必要说明，不展示敏感资源信息与后台细节。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <Layers3 className="h-5 w-5 text-sky-300" />
                <div>
                  <p className="font-medium text-white">先看平台能力</p>
                  <p className="mt-1 text-sm text-slate-400">了解系统能提供哪些资源类型和基础流程。</p>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <LogIn className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="font-medium text-white">登录解锁详情</p>
                  <p className="mt-1 text-sm text-slate-400">详细资源列表、审批状态和管理入口都需要登录后展示。</p>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="font-medium text-white">按角色进入工作区</p>
                  <p className="mt-1 text-sm text-slate-400">不同账号登录后，会看到对应的资源工作台和管理快捷入口。</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Role Overview</p>
          <h2 className="mt-2 font-client-serif text-3xl text-slate-950">登录后会看到什么</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            进入系统后，页面会基于账号角色自动切换可见信息和可进入的后台路径。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roleGuides.map((guide) => {
            const Icon = guide.icon

            return (
              <Card
                key={guide.title}
                className="border-slate-200/80 bg-white/90 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.5)]"
              >
                <CardHeader className="space-y-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Badge className="border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">{guide.badge}</Badge>
                    <CardTitle className="mt-4 font-client-serif text-[28px] text-slate-950">{guide.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-slate-500">{guide.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function ResourceCard({
  resource,
  resourceType,
}: {
  resource: ResourceCatalogItem
  resourceType: 'skill' | 'mcp'
}) {
  const primaryAddress = resourceType === 'skill' ? resource.packageUrl : resource.command
  const sourceLabel = resourceType === 'skill'
    ? '客户端包地址'
    : '启动命令'
  const sourceIcon = resourceType === 'skill'
    ? <ExternalLink className="h-3.5 w-3.5" />
    : <Layers3 className="h-3.5 w-3.5" />
  const actionTitle = resource.canUse
    ? '已具备使用权限'
    : resource.applicationStatus === 'pending'
      ? '申请正在审批中'
      : resource.applicationStatus === 'rejected'
        ? '本次申请未通过'
        : resource.applicationStatus === 'revoked'
          ? '权限已被撤销'
          : '可提交资源申请'
  const actionDescription = resource.canUse
    ? '当前账号已经可以直接使用这项资源。'
    : resource.applicationStatus === 'pending'
      ? '无需重复提交，等待管理员完成处理即可。'
      : resource.applicationStatus === 'rejected'
        ? '你可以根据需要再次提交申请。'
        : resource.applicationStatus === 'revoked'
          ? '如仍有业务需求，可以重新发起申请。'
          : '提交后将进入部门或平台审批流程。'

  return (
    <Card className="group relative overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_80px_-40px_rgba(15,23,42,0.55)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-slate-200 bg-slate-100 px-3 py-1 text-slate-700">
                {resourceType === 'skill' ? <Sparkles className="mr-1.5 h-3.5 w-3.5" /> : <Cpu className="mr-1.5 h-3.5 w-3.5" />}
                {resourceType === 'skill' ? 'Skill 能力' : 'MCP 服务'}
              </Badge>
              <Badge
                className={cn(
                  'px-3 py-1',
                  visibilityStyles[resource.visibility] ?? 'border-slate-200 bg-slate-100 text-slate-700'
                )}
              >
                {visibilityLabels[resource.visibility] ?? resource.visibility}
              </Badge>
            </div>
            <div>
              <CardTitle className="font-client-serif truncate text-[22px] leading-snug text-slate-950">
                {resource.name}
              </CardTitle>
              <code className="mt-2 block truncate text-xs text-slate-500">{resource.identifier}</code>
            </div>
          </div>
          <div className="shrink-0">
            <StatusBadge resource={resource} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <CardDescription className="min-h-[48px] text-sm leading-6 text-slate-600">
          {resource.description || `这项${resourceType === 'skill' ? ' Skill' : ' MCP'} 已进入资源目录，可用于个人工作或团队协作场景。`}
        </CardDescription>

        <div className="grid gap-3 sm:grid-cols-2">
          {primaryAddress ? (
            <ResourceInfo
              icon={sourceIcon}
              label={sourceLabel}
              value={primaryAddress}
            />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber-700">
                <FolderLock className="h-3.5 w-3.5" />
                地址信息
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                {resourceType === 'skill' ? '客户端下载地址已隐藏，授权通过后可见。' : '敏感配置已隐藏，授权通过后可见。'}
              </p>
            </div>
          )}

          <ResourceInfo
            icon={resource.visibility === 'personal' ? <UserCircle2 className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
            label={resource.visibility === 'personal' ? '归属类型' : '所属范围'}
            value={resource.organization?.name ?? (resource.visibility === 'personal' ? '个人专属资源' : '平台公共资源')}
          />

          {resourceType === 'mcp' && (
            <ResourceInfo
              icon={<Cpu className="h-3.5 w-3.5" />}
              label="传输与分类"
              value={[resource.transportType, resource.category].filter(Boolean).join(' / ') || '未配置'}
            />
          )}

          {resourceType === 'mcp' && resource.defaultArgs.length > 0 && (
            <ResourceInfo
              icon={<Workflow className="h-3.5 w-3.5" />}
              label="默认参数"
              value={resource.defaultArgs.join(' ')}
            />
          )}
        </div>

        <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">{actionTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{actionDescription}</p>
            </div>
            {resource.canApply ? (
              <ApplyButton
                className="border-slate-300 bg-white/90 text-slate-800 hover:bg-white"
                resourceType={resourceType}
                resourceId={resource.id}
                applicationStatus={resource.applicationStatus}
                grantStatus={resource.grantStatus}
              />
            ) : (
              <div className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                {resource.canUse ? '可直接使用' : '当前无需操作'}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ResourceSection({
  title,
  resources,
  emptyMessage,
  resourceType,
}: {
  title: string
  resources: ResourceCatalogItem[]
  emptyMessage: string
  resourceType: 'skill' | 'mcp'
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-client-serif text-2xl text-slate-950">{title}</h2>
        <Badge className="border-slate-200 bg-white px-3 py-1 text-slate-700">{resources.length}</Badge>
      </div>
      {resources.length === 0 ? (
        <Card className="border-dashed border-slate-200 bg-white/60">
          <CardContent className="py-10 text-center text-sm text-slate-500">{emptyMessage}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              resourceType={resourceType}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ResourcePanel({
  consumable,
  discoverable,
  resourceType,
}: {
  consumable: ResourceCatalogItem[]
  discoverable: ResourceCatalogItem[]
  resourceType: 'skill' | 'mcp'
}) {
  const discoverableGroups = groupResourcesByVisibility(discoverable)
  const pendingCount = discoverable.filter((resource) => resource.applicationStatus === 'pending').length
  const applicableCount = discoverable.filter((resource) => resource.canApply).length

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.88)_58%,rgba(71,85,105,0.78))] text-white shadow-[0_28px_80px_-45px_rgba(15,23,42,0.75)]">
        <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-300">
              {resourceType === 'skill' ? 'Skill Workspace' : 'MCP Workspace'}
            </p>
            <h2 className="mt-3 font-client-serif text-3xl text-white">
              {resourceType === 'skill' ? '能力目录' : '服务目录'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              先从已开通资源开始使用，再在可发现目录中查找你需要的{resourceType === 'skill' ? '技能能力' : '服务接口'}。
              部门级资源会在授权通过后开放敏感信息与完整入口。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              label="当前可用"
              value={consumable.length}
              note="已具备直接使用权限"
              icon={<CheckCircle2 className="h-5 w-5" />}
              inverse
            />
            <MetricCard
              label="资源发现"
              value={discoverable.length}
              note="可浏览的目录总数"
              icon={<Layers3 className="h-5 w-5" />}
              inverse
            />
            <MetricCard
              label="待审批"
              value={pendingCount}
              note="已经提交，等待处理"
              icon={<Clock3 className="h-5 w-5" />}
              inverse
            />
            <MetricCard
              label="可立即申请"
              value={applicableCount}
              note="尚未申请的部门资源"
              icon={<LockKeyhole className="h-5 w-5" />}
              inverse
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <ResourceSection
          title="我的可用资源"
          resources={consumable}
          emptyMessage={`当前还没有可直接使用的${resourceType === 'skill' ? ' Skill' : ' MCP'}。`}
          resourceType={resourceType}
        />

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-client-serif text-2xl text-slate-950">可发现资源池</h2>
            <Badge className="border-slate-200 bg-white px-3 py-1 text-slate-700">{discoverable.length}</Badge>
          </div>
          <p className="text-sm leading-7 text-slate-500">
            按资源可见范围拆分展示，方便你快速判断哪些资源能直接使用、哪些需要走申请流程。
          </p>
        </div>

        <ResourceSection
          title="公共资源"
          resources={discoverableGroups.company}
          emptyMessage="暂无公共资源"
          resourceType={resourceType}
        />
        <ResourceSection
          title="部门资源"
          resources={discoverableGroups.department}
          emptyMessage="暂无部门资源"
          resourceType={resourceType}
        />
        <ResourceSection
          title="个人资源"
          resources={discoverableGroups.personal}
          emptyMessage="暂无个人资源"
          resourceType={resourceType}
        />
      </div>
    </div>
  )
}

export default async function ClientPage() {
  const session = await auth()

  if (!session?.user) {
    return <GuestLanding />
  }

  const user = session.user as ClientSessionUser
  const userId = user.id
  const organizationId = user.organizationId
  const showConsoleEntry = user.isSuperAdmin || user.isDepartmentAdmin
  const canCreatePersonalResources = !showConsoleEntry
  const organization = organizationId
    ? await db.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      })
    : null
  const roleMeta = getRoleMeta(user)

  const [discoverableSkills, discoverableMcps, consumableSkills, consumableMcps] = await Promise.all([
    listDiscoverableResources({
      userId,
      organizationId,
      resourceType: 'skill',
    }),
    listDiscoverableResources({
      userId,
      organizationId,
      resourceType: 'mcp',
    }),
    listConsumableResources({
      targetUserId: userId,
      includePersonal: true,
      resourceType: 'skill',
    }),
    listConsumableResources({
      targetUserId: userId,
      includePersonal: true,
      resourceType: 'mcp',
    }),
  ])

  const totalAvailable = consumableSkills.length + consumableMcps.length
  const totalDiscoverable = discoverableSkills.length + discoverableMcps.length
  const totalPending = [...discoverableSkills, ...discoverableMcps].filter(
    (resource) => resource.applicationStatus === 'pending'
  ).length
  const totalApplicable = [...discoverableSkills, ...discoverableMcps].filter(
    (resource) => resource.canApply
  ).length

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <Card className="relative overflow-hidden border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.82)_55%,rgba(226,232,240,0.9))] shadow-[0_28px_80px_-45px_rgba(15,23,42,0.55)]">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_rgba(125,211,252,0.18),_transparent_48%)] lg:block" />
          <CardContent className="relative grid gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] lg:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-slate-200 bg-white px-3 py-1 text-slate-700">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Client Home
                </Badge>
                <Badge className="border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">{roleMeta.label}</Badge>
                <Badge className="border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                  {organization?.name ?? '未绑定组织'}
                </Badge>
              </div>

              <h1 className="mt-5 font-client-serif text-4xl leading-tight text-slate-950 sm:text-5xl">
                你的资源工作台
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                {roleMeta.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  先查看已开通资源，再决定是否申请更多能力
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  部门级资源默认隐藏敏感信息，审批通过后开放
                </div>
              </div>

              <DesktopDownloadPanel />

              {showConsoleEntry && (
                <div className="mt-6">
                  <Button asChild className="rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800">
                    <Link href="/dashboard">
                      进入总控台
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}

              {canCreatePersonalResources && (
                <div className="mt-6">
                  <ClientCreateActions />
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <MetricCard
                label="总可用资源"
                value={totalAvailable}
                note="已经可直接访问"
                icon={<ShieldCheck className="h-5 w-5" />}
              />
              <MetricCard
                label="可发现目录"
                value={totalDiscoverable}
                note="当前账号可浏览的资源总数"
                icon={<Box className="h-5 w-5" />}
              />
              <MetricCard
                label="待处理申请"
                value={totalPending}
                note="审批中的请求"
                icon={<Clock3 className="h-5 w-5" />}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 bg-slate-950 text-white shadow-[0_28px_80px_-45px_rgba(15,23,42,0.8)]">
          <CardHeader className="pb-4">
            <Badge className="w-fit border-white/10 bg-white/10 px-3 py-1 text-slate-200">使用路径</Badge>
            <CardTitle className="font-client-serif text-[30px] text-white">浏览 -&gt; 申请 -&gt; 使用</CardTitle>
            <CardDescription className="text-slate-300">
              页面按照真实客户端流程组织，不再只是后台式资源堆叠。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <Workflow className="h-5 w-5 text-sky-300" />
                <div>
                  <p className="font-medium text-white">先看已开通</p>
                  <p className="mt-1 text-sm text-slate-400">直接使用你已经拥有权限的 Skill 或 MCP。</p>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <LockKeyhole className="h-5 w-5 text-amber-300" />
                <div>
                  <p className="font-medium text-white">再看可申请</p>
                  <p className="mt-1 text-sm text-slate-400">部门资源支持直接提交申请，当前可申请 {totalApplicable} 项。</p>
                </div>
              </div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="font-medium text-white">最后回到使用</p>
                  <p className="mt-1 text-sm text-slate-400">
                    审批通过后，完整资源信息会自动对你开放。
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Resource Catalog</p>
            <h2 className="mt-2 font-client-serif text-3xl text-slate-950">按资源类型浏览</h2>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              分别查看 Skill 能力和 MCP 服务，每个目录都区分了“已开通”和“可发现”两种状态。
            </p>
          </div>
        </div>

        <Tabs defaultValue="skills" className="w-full">
          <TabsList className="h-auto rounded-[20px] border border-slate-200 bg-white/75 p-1.5">
            <TabsTrigger
              value="skills"
              className="gap-2 rounded-2xl px-4 py-3 text-slate-600 data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <Box className="h-4 w-4" />
              Skill 能力
            </TabsTrigger>
            <TabsTrigger
              value="mcps"
              className="gap-2 rounded-2xl px-4 py-3 text-slate-600 data-[state=active]:bg-slate-950 data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <Cpu className="h-4 w-4" />
              MCP 服务
            </TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="mt-5">
            <ResourcePanel
              consumable={consumableSkills}
              discoverable={discoverableSkills}
              resourceType="skill"
            />
          </TabsContent>

          <TabsContent value="mcps" className="mt-5">
            <ResourcePanel
              consumable={consumableMcps}
              discoverable={discoverableMcps}
              resourceType="mcp"
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
