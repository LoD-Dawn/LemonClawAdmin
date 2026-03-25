import { redirect } from 'next/navigation'
import { CalendarDays, Download, MonitorSmartphone } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getDesktopVersionReleaseConfig, isDesktopVersionConfigured } from '@/lib/desktop-version'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { DesktopVersionClient } from './DesktopVersionClient'

export default async function DesktopVersionPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const config = await getDesktopVersionReleaseConfig()
  const configuredPlatforms = [config.macIntel.url, config.macArm.url, config.windowsX64.url].filter(Boolean).length
  const readyToPublish = isDesktopVersionConfigured({
    version: config.version,
    date: config.date,
    changeLog: config.changeLog,
    macIntel: config.macIntel,
    macArm: config.macArm,
    windowsX64: config.windowsX64,
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Desktop"
        title="桌面端版本"
        description="统一维护桌面客户端的最新版本信息、更新说明和各平台下载地址，供管理后台和桌面端检查更新接口共用。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="当前版本"
          value={config.version || '未发布'}
          icon={Download}
          hint="桌面端接口返回的最新版本号"
        />
        <AdminStatCard
          label="发布日期"
          value={config.date || '--'}
          icon={CalendarDays}
          tone="sky"
          hint="建议与实际发版日期保持一致"
        />
        <AdminStatCard
          label="配置状态"
          value={readyToPublish ? '已就绪' : `${configuredPlatforms}/3 平台`}
          icon={MonitorSmartphone}
          tone={readyToPublish ? 'emerald' : 'amber'}
          hint={readyToPublish ? '桌面端已可正常检查更新' : '还需要补齐版本信息和下载地址'}
        />
      </div>
      <DesktopVersionClient
        initialConfig={{
          ...config,
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString(),
        }}
      />
    </div>
  )
}
