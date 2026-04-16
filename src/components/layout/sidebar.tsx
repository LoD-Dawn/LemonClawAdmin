'use client'

import { useMemo } from 'react'
import {
  LayoutDashboard,
  Users,
  Building2,
  Box,
  Bot,
  Cpu,
  CheckSquare,
  ShieldCheck,
  Tags,
  History,
  AppWindow,
  Download,
  PlugZap,
} from 'lucide-react'

import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    accountType?: 'consumer' | 'enterprise'
    isSuperAdmin: boolean
    isDepartmentAdmin: boolean
  }
}

export function Sidebar({ user }: SidebarProps) {
  const isSuperAdmin = user.isSuperAdmin
  const isDeptAdmin = user.isDepartmentAdmin

  const navGroups = useMemo(() => {
    const overviewItem = { href: '/dashboard', label: '概览', icon: LayoutDashboard }

    if (isSuperAdmin) {
      return [
        {
          title: '平台管理',
          items: [
            overviewItem,
            {
              label: '组织与成员',
              icon: Users,
              items: [
                { href: '/dashboard/users', label: '用户管理' },
                { href: '/dashboard/organizations', label: '组织架构' },
                { href: '/dashboard/skill-tags', label: '标签管理' },
              ],
            },
            {
              label: '资源配置',
              icon: Box,
              items: [
                { href: '/dashboard/skills', label: 'Skills' },
                { href: '/dashboard/models', label: '模型管理' },
                { href: '/dashboard/mcps', label: 'MCPs' },
              ],
            },
            {
              label: '接入与客户端',
              icon: PlugZap,
              items: [
                { href: '/dashboard/oauth-clients', label: '第三方接入' },
                { href: '/dashboard/desktop-auth', label: '桌面端登录' },
                { href: '/dashboard/desktop-version', label: '桌面端版本' },
              ],
            },
            {
              label: '治理与审计',
              icon: ShieldCheck,
              items: [
                { href: '/dashboard/approvals', label: '审核管理' },
                { href: '/dashboard/grants', label: '授权管理' },
                { href: '/dashboard/operation-logs', label: '操作日志' },
              ],
            },
          ],
        },
      ]
    }

    if (isDeptAdmin) {
      return [
        {
          title: '部门管理',
          items: [
            overviewItem,
            {
              label: '审批与授权',
              icon: ShieldCheck,
              items: [
                { href: '/dashboard/approvals', label: '审核管理' },
                { href: '/dashboard/grants', label: '授权管理' },
              ],
            },
            {
              label: '资源目录',
              icon: Box,
              items: [
                { href: '/dashboard/skills', label: '技能管理' },
                { href: '/dashboard/models', label: '模型管理' },
                { href: '/dashboard/mcps', label: 'MCP管理' },
              ],
            },
          ],
        },
      ]
    }

    return [
      {
        title: '个人空间',
        items: [
          overviewItem,
          {
            label: '我的资源',
            icon: Box,
            items: [
              { href: '/dashboard/skills', label: '我的技能' },
              { href: '/dashboard/models', label: '我的模型' },
              { href: '/dashboard/mcps', label: '我的MCP' },
            ],
          },
        ],
      },
    ]
  }, [isSuperAdmin, isDeptAdmin])

  const roleLabel = isSuperAdmin
    ? '超级管理员'
    : isDeptAdmin
      ? '部门管理员'
      : user.accountType === 'consumer'
        ? '普通用户空间'
        : '企业成员空间'

  return (
    <SidebarUI collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <TeamSwitcher roleLabel={roleLabel} />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.title} title={group.title} items={group.items} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </SidebarUI>
  )
}
