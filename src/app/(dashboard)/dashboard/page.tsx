import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Building2, Box, Bot, Cpu, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { getManagementMode } from '@/lib/admin-access'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'

export default async function DashboardPage() {
  const session = await auth()
  const managementMode = session?.user ? getManagementMode(session.user) : 'personal'

  const [userCount, orgCount, skillCount, modelProviderCount, mcpCount] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.organization.count(),
    db.skill.count({ where: { isActive: true } }),
    db.modelProvider.count({ where: { isActive: true } }),
    db.mcp.count({ where: { isActive: true } })
  ])
  const quickActions = managementMode === 'super_admin'
    ? [
        { label: '添加用户', href: '/dashboard/users', icon: Users, description: '统一维护账号、组织与角色' },
        { label: '组织架构', href: '/dashboard/organizations', icon: Building2, description: '整理公司、部门与小组层级' },
        { label: '管理 Skill', href: '/dashboard/skills', icon: Box, description: '查看与维护全局技能资产' },
        { label: '管理模型', href: '/dashboard/models', icon: Bot, description: '维护客户端使用的模型提供商' },
        { label: '管理 MCP', href: '/dashboard/mcps', icon: Cpu, description: '管理所有 MCP 配置与来源' },
      ]
    : managementMode === 'department_admin'
    ? [
        { label: '审核管理', href: '/dashboard/approvals', icon: ShieldCheck, description: '集中处理本部门申请记录' },
        { label: '部门 Skill', href: '/dashboard/skills', icon: Box, description: '维护部门可见 Skill 资产' },
        { label: '部门模型', href: '/dashboard/models', icon: Bot, description: '维护部门可见模型配置' },
        { label: '部门 MCP', href: '/dashboard/mcps', icon: Cpu, description: '维护部门可见 MCP 资源' },
      ]
    : [
        { label: '我的 Skill', href: '/dashboard/skills', icon: Box, description: '快速查看你当前可用的技能' },
        { label: '我的模型', href: '/dashboard/models', icon: Bot, description: '维护你自己的模型提供商配置' },
        { label: '我的 MCP', href: '/dashboard/mcps', icon: Cpu, description: '浏览你可访问的 MCP 配置' },
      ]

  const stats = [
    { title: '活跃用户', value: userCount, icon: Users, tone: 'default' as const, hint: '已启用账号' },
    { title: '组织节点', value: orgCount, icon: Building2, tone: 'sky' as const, hint: '公司与部门结构' },
    { title: 'Skill 资产', value: skillCount, icon: Box, tone: 'emerald' as const, hint: '可用技能总数' },
    { title: '模型配置', value: modelProviderCount, icon: Bot, tone: 'sky' as const, hint: '可用提供商总数' },
    { title: 'MCP 资产', value: mcpCount, icon: Cpu, tone: 'amber' as const, hint: '可用服务连接' },
  ]

  const roleDescription = managementMode === 'super_admin'
    ? '总览整个平台的用户、组织、技能与 MCP 资源，适合快速发现整体变化。'
    : managementMode === 'department_admin'
    ? '聚焦本部门的技能、MCP 与授权流转，方便快速处理日常管理动作。'
    : '这里会集中展示你当前可管理或可访问的 Skill 与 MCP 资源。'

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="总览"
        title="欢迎回到管理工作台"
        description={roleDescription}
        meta={
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            系统运行正常
          </span>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <AdminStatCard
            key={stat.title}
            label={stat.title}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
            hint={stat.hint}
          />
        ))}
      </div>

      <Card className="admin-surface overflow-hidden">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-7">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">快速操作</div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">常用管理入口</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                保留清晰的信息密度，不做过度装饰，但让常见操作更容易扫到、更容易进入。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="group admin-surface-muted flex items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
                  >
                    <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-[0_18px_30px_-20px_rgba(15,23,42,0.82)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{action.label}</h3>
                        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="admin-surface-muted flex flex-col justify-between p-5">
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">管理建议</div>
              <h3 className="text-xl font-semibold tracking-tight text-slate-900">把高频管理动作收敛到同一视觉层级</h3>
              <p className="text-sm leading-6 text-slate-600">
                这次改造重点放在侧栏、头部、页面标题、表格与统计卡片的一致性，让后台页面更整洁、更稳定，也更容易继续扩展。
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-500">
              当前管理模式：
              <span className="ml-2 font-semibold text-slate-800">
                {managementMode === 'super_admin'
                  ? '超级管理员'
                  : managementMode === 'department_admin'
                  ? '部门管理员'
                  : '个人用户'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
