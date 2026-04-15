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
    <div className="grid min-h-screen bg-[#fcfcfb] lg:grid-cols-2">
      <div className="hidden bg-[#717d93] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="space-y-8">
          <Skeleton className="h-10 w-48 rounded-full bg-white/15" />
          <div className="flex min-h-[26rem] items-center justify-center">
            <Skeleton className="h-28 w-full max-w-[30rem] rounded-[2rem] bg-white/15" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-8 w-full max-w-[30rem] rounded-full bg-white/15" />
          <Skeleton className="h-6 w-48 rounded-full bg-white/15" />
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-8 sm:px-8 lg:px-10 xl:px-14">
        <div className="w-full max-w-[428px] space-y-6">
          <div className="space-y-4 lg:hidden">
            <Skeleton className="h-10 w-48 rounded-full" />
            <Skeleton className="h-16 w-64 rounded-[1.25rem]" />
            <Skeleton className="h-5 w-full rounded-full" />
          </div>
          <Skeleton className="h-[24rem] w-full rounded-[2rem]" />
        </div>
      </div>
    </div>
  )
}
