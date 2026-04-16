'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import { ClientSidebar } from '@/components/layout/client-sidebar'
import { ClientHeader } from '@/components/layout/client-header'
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
    <div className="min-h-screen bg-slate-50/60 transition-colors duration-500">
      <ClientHeader user={user} />
      <div className="h-[calc(100vh-64px)] overflow-hidden">
        <main id="client-workspace" className="h-full overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:sticky lg:top-0 h-fit">
                <ClientSidebar user={user} />
              </div>
              <div className="flex-1 min-w-0">
                {shouldBlockWorkspace ? (
                  <div className="mx-auto flex items-center justify-center py-12">
                    <Card className="w-full border-slate-200 shadow-sm bg-slate-50/50">
                        <CardHeader className="text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                            <ShieldAlert className="h-5 w-5" />
                          </div>
                          <CardTitle className="mt-4 font-black">先完成手机号绑定</CardTitle>
                          <CardDescription className="leading-6 text-slate-500 font-medium">
                            当前账号是历史普通用户，尚未绑定手机号。绑定成功后才能继续使用系统工作台。
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="flex justify-center pb-8">
                          <Button asChild className="bg-emerald-500 hover:bg-emerald-600 font-bold">
                            <Link href="/profile">前往个人设置绑定手机号</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    children
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
  )
}
