import { redirect } from 'next/navigation'
import { CalendarDays, Download, MonitorSmartphone } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getDesktopVersionReleaseConfig, isDesktopVersionConfigured } from '@/lib/desktop-version'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { DesktopVersionClient } from './DesktopVersionClient'
import { Main } from '@/components/layout/main'

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
    <Main className="space-y-4">
      <AdminPageHeader
        title="桌面端版本"
        description="统一发布并维护桌面客户端的版本信息与下载分发地址。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="当前版本"
          value={config.version || '未发布'}
          icon={Download}
          hint="最新版本标识"
        />
        <AdminStatCard
          label="发布日期"
          value={config.date || '--'}
          icon={CalendarDays}
          hint="版本生效日期"
        />
        <AdminStatCard
          label="配置状态"
          value={readyToPublish ? '已就绪' : `${configuredPlatforms}/3 平台`}
          icon={MonitorSmartphone}
          hint={readyToPublish ? '检查更新服务正常' : '平台补齐中'}
        />
      </div>
      <DesktopVersionClient
        initialConfig={{
          ...config,
          createdAt: config.createdAt.toISOString(),
          updatedAt: config.updatedAt.toISOString(),
        }}
      />
    </Main>
  )
}
