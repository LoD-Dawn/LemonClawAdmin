import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { LoginSkeleton } from '@/components/auth/login-page-shell'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <div className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#fff8ef_100%)]">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10 sm:px-8">
          <div className="w-full max-w-[560px]">
            <div className="mb-8 text-center">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                统一认证中心
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-500 sm:text-base">
                请输入手机号并完成验证码校验。企业账号请使用单独的企业登录入口。
              </p>
            </div>

            <LoginFormClient
              entryMode="consumer"
              showEntrySwitcher={false}
              minimal
              titleOverride="手机号验证码登录"
              descriptionOverride="用于普通用户统一认证。首次使用的手机号在验证码校验通过后会自动创建账号。"
            />
          </div>
        </div>
      </div>
    </Suspense>
  )
}
