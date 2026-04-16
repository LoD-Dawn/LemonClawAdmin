import { redirect } from 'next/navigation'
import { Globe2, KeyRound, Link2, PlugZap } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { DEFAULT_DESKTOP_CLIENT_ID, parseAllowedRedirectUris } from '@/lib/oauth-clients'
import { OAuthClientsManager } from './oauth-clients-manager'
import { Main } from '@/components/layout/main'

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

  const organizations = await db.organization.findMany({
    orderBy: [
      { path: 'asc' },
      { name: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      type: true,
    },
  })

  const serializedClients = clients.map((client) => ({
    id: client.id,
    clientId: client.clientId,
    name: client.name,
    isActive: client.isActive,
    allowedRedirectUris: parseAllowedRedirectUris(client.allowedRedirectUris),
    defaultOrganizationId: client.defaultOrganizationId,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  }))

  const activeClients = serializedClients.filter((client) => client.isActive).length
  const redirectUriCount = serializedClients.reduce((sum, client) => sum + client.allowedRedirectUris.length, 0)

  return (
    <Main className="space-y-4">
      <AdminPageHeader
        title="第三方接入"
        description="管理 OAuth 客户端，维护系统的外部接入权限与回调范围。"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="客户端总数"
          value={serializedClients.length}
          icon={PlugZap}
          hint="仅统计第三方接入"
        />
        <AdminStatCard
          label="启用中"
          value={activeClients}
          icon={KeyRound}
          hint="当前可授权客户端"
        />
        <AdminStatCard
          label="已登记回调"
          value={redirectUriCount}
          icon={Link2}
          hint="Redirect URIs 汇总"
        />
        <AdminStatCard
          label="推荐流程"
          value="OAuth 2.0"
          icon={Globe2}
          hint="基于 Authorization Code"
        />
      </div>
      <OAuthClientsManager initialClients={serializedClients} organizations={organizations} />
    </Main>
  )
}
