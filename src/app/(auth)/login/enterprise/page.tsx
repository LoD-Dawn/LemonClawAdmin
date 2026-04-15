import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function EnterpriseLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AuthLayout
        title="企业成员登录"
        subtitle="请输入您的企业邮箱和密码以进入管理后台"
      >
        <LoginFormClient entryMode="enterprise" showEntrySwitcher={false} minimal />
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
