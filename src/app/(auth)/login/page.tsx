import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <AuthLayout
        title="LemonClaw 手机号验证码登录"
        subtitle="适用于普通用户查看资源、提交申请和管理个人工作区。首次使用的手机号完成验证码校验后会自动创建账号。"
      >
        <LoginFormClient entryMode="consumer" showEntrySwitcher={true} minimal />
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
          <Skeleton className="h-[26rem] w-full rounded-[2rem]" />
        </div>
      </div>
    </div>
  )
}
