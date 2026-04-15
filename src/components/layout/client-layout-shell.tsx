'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { ClientSidebar } from '@/components/layout/client-sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ClientLayoutShellProps {
  children: React.ReactNode
  user: {
    name?: string | null
    email?: string | null
    phone?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
    organizationName?: string | null
    requiresPhoneBinding?: boolean
  }
}

export function ClientLayoutShell({ children, user }: ClientLayoutShellProps) {
  const pathname = usePathname()
  const shouldBlockWorkspace = user.accountType === 'consumer' && user.requiresPhoneBinding && pathname !== '/profile'

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <ClientSidebar user={user} />
        <div className="min-w-0 flex-1">
          <main id="client-workspace" className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
            {shouldBlockWorkspace ? (
              <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-2xl items-center justify-center">
                <Card className="w-full">
                  <CardHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <CardTitle className="mt-2">先完成手机号绑定</CardTitle>
                    <CardDescription className="leading-6">
                      当前账号是历史普通用户，尚未绑定手机号。绑定成功后才能继续使用普通用户工作台。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Button asChild>
                      <Link href="/profile">前往个人设置绑定手机号</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
