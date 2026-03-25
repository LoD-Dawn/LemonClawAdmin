import { redirect } from 'next/navigation'
import { AppWindow, KeyRound, Link2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { getDesktopOAuthClientConfig } from '@/lib/oauth-clients'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { DesktopAuthConfigClient } from './DesktopAuthConfigClient'

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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Desktop"
        title="桌面端登录"
        description="集中维护桌面客户端使用的登录授权配置，包括允许回调地址、客户端状态和密钥轮换。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="客户端标识"
          value={client.clientId}
          icon={AppWindow}
          hint="桌面端固定使用的 OAuth Client"
        />
        <AdminStatCard
          label="允许回调"
          value={client.allowedRedirectUris.length}
          icon={Link2}
          tone="sky"
          hint="每个地址都需要与桌面端传参完全一致"
        />
        <AdminStatCard
          label="状态"
          value={client.isActive ? '已启用' : '已停用'}
          icon={KeyRound}
          tone={client.isActive ? 'emerald' : 'amber'}
          hint="停用后桌面端将无法继续完成授权"
        />
      </div>
      <DesktopAuthConfigClient
        initialConfig={{
          ...client,
          createdAt: client.createdAt.toISOString(),
          updatedAt: client.updatedAt.toISOString(),
        }}
      />
    </div>
  )
}
