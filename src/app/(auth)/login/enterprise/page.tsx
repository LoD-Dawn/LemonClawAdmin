import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { LoginPageShell, LoginSkeleton } from '@/components/auth/login-page-shell'

export default function EnterpriseLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageShell
        modeLabel="企业用户登录"
        title="企业登录"
        showcaseTitle="统一入口"
        showcaseDescription="面向团队与后台权限。"
        footerText="按角色进入后台"
      >
        <LoginFormClient entryMode="enterprise" showEntrySwitcher={false} minimal />
      </LoginPageShell>
    </Suspense>
  )
}
