import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AuthLayout 
        title="统一认证登录" 
        subtitle="请输入您的凭据以访问 LemonClaw 管理系统"
      >
        <LoginFormClient entryMode="consumer" showEntrySwitcher={true} minimal />
      </AuthLayout>
    </Suspense>
  )
}

function LoginSkeleton() {
    return (
        <div className="flex h-svh items-center justify-center">
            <div className="w-[400px] space-y-4">
                <Skeleton className="h-10 w-10 mx-auto rounded-xl" />
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-4 w-64 mx-auto" />
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full bg-primary/20" />
                </div>
            </div>
        </div>
    )
}
