import { Suspense } from 'react'
import { LoginFormClient } from '@/components/auth/login-form-client'
import { ShieldCheck, Sparkles, Workflow } from 'lucide-react'

function LoginSkeleton() {
  return (
    <div className="login-shell flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div className="login-grid-overlay absolute inset-0" />
      <div className="relative grid w-full max-w-6xl animate-pulse gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="hidden rounded-[2rem] border border-white/10 bg-white/5 p-10 lg:block">
          <div className="mb-6 h-5 w-28 rounded-full bg-white/10" />
          <div className="mb-4 h-16 w-4/5 rounded-2xl bg-white/10" />
          <div className="mb-8 h-5 w-3/5 rounded-full bg-white/10" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-white/10" />
            <div className="h-28 rounded-2xl bg-white/10" />
            <div className="h-28 rounded-2xl bg-white/10" />
          </div>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="mb-4 h-5 w-24 rounded-full bg-white/10" />
          <div className="mb-4 h-12 w-2/3 rounded-2xl bg-white/10" />
          <div className="space-y-4">
            <div className="h-14 rounded-2xl bg-white/10" />
            <div className="h-14 rounded-2xl bg-white/10" />
            <div className="h-12 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <div className="login-shell relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
        <div className="login-grid-overlay absolute inset-0" />
        <div className="login-orb login-orb-primary absolute left-[-8rem] top-[-6rem]" />
        <div className="login-orb login-orb-secondary absolute right-[-10rem] top-1/4" />
        <div className="login-orb login-orb-accent absolute bottom-[-8rem] left-1/3" />

        <div className="relative z-10 grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="hidden lg:block">
            <div className="login-panel login-panel-glow overflow-hidden rounded-[2rem] p-10 xl:p-12">
              <div className="mb-8 flex items-center gap-3">
                <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">
                  Secure Access Layer
                </div>
              </div>

              <div className="max-w-xl space-y-6">
                <h1 className="font-client-serif text-5xl font-black leading-[1.08] text-white xl:text-6xl">LemonClaw</h1>
                <p className="max-w-lg text-base leading-7 text-slate-300 xl:text-lg">
                  一个更像产品首页而不是默认表单的登入页，既保留后台系统的专业感，也让首次进入时的信任感和完成度更强。
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <div className="login-info-card">
                  <ShieldCheck className="mb-4 h-5 w-5 text-amber-200" />
                  <h2 className="mb-2 text-sm font-semibold text-white">权限可信</h2>
                  <p className="text-sm leading-6 text-slate-300">
                    OAuth 授权、后台登录与访问控制在同一入口统一收口。
                  </p>
                </div>
                <div className="login-info-card">
                  <Workflow className="mb-4 h-5 w-5 text-sky-200" />
                  <h2 className="mb-2 text-sm font-semibold text-white">流程清晰</h2>
                  <p className="text-sm leading-6 text-slate-300">
                    技能申请、审批、授权与调用路径在视觉上更一致、更易理解。
                  </p>
                </div>
                <div className="login-info-card">
                  <Sparkles className="mb-4 h-5 w-5 text-emerald-200" />
                  <h2 className="mb-2 text-sm font-semibold text-white">体验升级</h2>
                  <p className="text-sm leading-6 text-slate-300">
                    通过层次、光影和排版优化，让后台入口不再显得“只够用”。
                  </p>
                </div>
              </div>

              <div className="mt-10 grid gap-4 rounded-[1.75rem] border border-white/10 bg-black/15 p-5 backdrop-blur-sm md:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">System Snapshot</p>
                  <p className="mt-3 text-2xl font-semibold text-white">统一的资源管理入口</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
                    登录后可根据角色跳转到客户端或管理后台，同时兼容授权场景，减少切换与理解成本。
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Role Aware</p>
                    <p className="mt-2 text-sm font-medium text-slate-100">按角色分流访问路径</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">OAuth Ready</p>
                    <p className="mt-2 text-sm font-medium text-slate-100">支持授权请求直接登录</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="relative z-10">
            <LoginFormClient />
          </div>
        </div>
      </div>
    </Suspense>
  )
}
