import { redirect } from 'next/navigation'
import { Globe2, KeyRound, Link2, PlugZap } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { DEFAULT_DESKTOP_CLIENT_ID, parseAllowedRedirectUris } from '@/lib/oauth-clients'
import { OAuthClientsManager } from './oauth-clients-manager'

export default async function OAuthClientsPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  if (!session.user.isSuperAdmin) {
    redirect('/dashboard')
  }

  const clients = await db.oAuthClient.findMany({
    where: {
      clientId: {
        not: DEFAULT_DESKTOP_CLIENT_ID,
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { updatedAt: 'desc' },
      { createdAt: 'desc' },
    ],
  })

  const serializedClients = clients.map((client) => ({
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    isActive: client.isActive,
    allowedRedirectUris: parseAllowedRedirectUris(client.allowedRedirectUris),
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }))

  const activeClients = serializedClients.filter((client) => client.isActive).length
  const redirectUriCount = serializedClients.reduce((sum, client) => sum + client.allowedRedirectUris.length, 0)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="OAuth"
        title="第三方接入"
        description="集中维护外部平台接入本系统时使用的 OAuth 客户端，包括客户端标识、回调地址、启停状态和密钥轮换。创建完成后，第三方平台即可按授权码模式登录并获取用户对应模型。"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatCard
          label="客户端总数"
          value={serializedClients.length}
          icon={PlugZap}
          hint="仅统计第三方接入客户端"
        />
        <AdminStatCard
          label="启用中"
          value={activeClients}
          icon={KeyRound}
          tone={activeClients > 0 ? 'emerald' : 'amber'}
          hint="停用后将无法继续完成授权"
        />
        <AdminStatCard
          label="已登记回调"
          value={redirectUriCount}
          icon={Link2}
          tone="sky"
          hint="回调地址必须与第三方平台传参完全一致"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="推荐流程"
          value="OAuth 2.0"
          icon={Globe2}
          hint="使用 authorization_code 获取 access_token"
          className="md:col-span-2 xl:col-span-1"
        />
      </div>
      <OAuthClientsManager initialClients={serializedClients} />
    </div>
  )
}
