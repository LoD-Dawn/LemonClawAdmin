import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Building2, Box, Bot, Cpu, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { getManagementMode } from '@/lib/admin-access'
import { AdminPageHeader } from '@/components/layout/admin-page-header'
import { AdminStatCard } from '@/components/layout/admin-stat-card'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'

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
    { title: '活跃用户', value: userCount, icon: Users, hint: '已启用账号' },
    { title: '组织节点', value: orgCount, icon: Building2, hint: '公司与部门结构' },
    { title: 'Skill 资产', value: skillCount, icon: Box, hint: '可用技能总数' },
    { title: '模型配置', value: modelProviderCount, icon: Bot, hint: '可用提供商总数' },
    { title: 'MCP 资产', value: mcpCount, icon: Cpu, hint: '可用服务连接' },
  ]

  const roleDescription = managementMode === 'super_admin'
    ? '查看平台资源分布与状态汇总。'
    : managementMode === 'department_admin'
    ? '聚焦本部门的技能、MCP 与授权流转。'
    : '你当前可管理或可访问的 Skill 与 MCP 资源汇总。'

  return (
    <Main className="space-y-4">
      <AdminPageHeader
        title="Dashboard"
        description={roleDescription}
        actions={<Button size="sm">Download Reports</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <AdminStatCard
            key={stat.title}
            label={stat.title}
            value={stat.value}
            icon={stat.icon}
            hint={stat.hint}
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4">
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
            <CardDescription>
              常用管理入口，助你快速进入对应的资源管理页面。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="mt-1">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{action.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
        
        <Card className="col-span-1 lg:col-span-3">
          <CardHeader>
            <CardTitle>系统建议</CardTitle>
            <CardDescription>
              当前会话管理模式与后续操作建议。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">当前管理模式</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                你正在以 <span className="font-semibold text-foreground">
                  {managementMode === 'super_admin' ? '超级管理员' : managementMode === 'department_admin' ? '部门管理员' : '个人用户'}
                </span> 模式进行操作。
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                建议定期检查待审核申请与资产更新日志，以确保组织内的资源流通符合治理规范。后台样式已全面对齐专业管理台风格。
              </p>
              <Button asChild variant="outline" className="w-full justify-start h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors group">
                <Link href="/dashboard/operation-logs">
                  查看操作审计
                  <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
