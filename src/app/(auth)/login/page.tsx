import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { LoginPageShell, LoginSkeleton } from '@/components/auth/login-page-shell'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageShell
        modeLabel="统一认证中心"
        title="快速登录"
        showcaseTitle="安全登录"
        showcaseDescription="只保留必要操作。"
        footerText="按角色进入工作区"
      >
        <LoginFormClient entryMode="consumer" showEntrySwitcher={false} minimal />
      </LoginPageShell>
    </Suspense>
  )
}
