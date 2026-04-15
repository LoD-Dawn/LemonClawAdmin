import { redirect } from 'next/navigation'
import { AppWindow, KeyRound, Link2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getDesktopOAuthClientConfig } from '@/lib/oauth-clients'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { DesktopAuthConfigClient } from './DesktopAuthConfigClient'
import { Main } from '@/components/layout/main'

export default async function DesktopAuthPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const client = await getDesktopOAuthClientConfig()

  return (
    <Main className="space-y-4">
      <AdminPageHeader
        title="桌面端登录"
        description="管理桌面客户端的 OAuth 授权配置与安全策略。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="客户端标识"
          value={client.clientId}
          icon={AppWindow}
          hint="固定 OAuth 标识符"
        />
        <AdminStatCard
          label="允许回调"
          value={client.allowedRedirectUris.length}
          icon={Link2}
          hint="登记的回调地址总数"
        />
        <AdminStatCard
          label="状态"
          value={client.isActive ? '已启用' : '已停用'}
          icon={KeyRound}
          hint="当前登录服务状态"
        />
      </div>
      <DesktopAuthConfigClient
        initialConfig={{
          ...client,
          createdAt: client.createdAt.toISOString(),
          updatedAt: client.updatedAt.toISOString(),
        }}
      />
    </Main>
  )
}
