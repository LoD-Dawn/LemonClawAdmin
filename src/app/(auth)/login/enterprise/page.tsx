import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { LoginSkeleton } from '@/components/auth/login-page-shell'

export default function EnterpriseLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#fff8ef_100%)]">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10 sm:px-8">
          <div className="w-full max-w-[560px]">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                企业用户登录
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                登录企业工作台
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                适用于企业成员、部门管理员和平台管理员。企业账号通常由管理员统一开通。
              </p>
            </div>

            <LoginFormClient entryMode="enterprise" showEntrySwitcher={false} />
          </div>
        </div>
      </div>
    </Suspense>
  )
}
