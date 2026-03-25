# 客户端入口与角色权限系统实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增客户端入口 (`/client`) 展示技能/MCP列表，以及基于角色的权限控制系统（超级管理员/部门管理员/个人用户）

**Architecture:**
- 客户端 (`/client`) - 新建 route group，复用现有 auth，与 dashboard layout 类似但侧边栏不同
- 技能申请使用 `ResourceApplication` 表统一管理 skill/mcp 申请审批
- 部门管理员通过 `isDepartmentAdmin=true` + `departmentId` 字段标识

**Tech Stack:** Next.js 15 App Router, NextAuth, Prisma, shadcn/ui

---

## File Structure

```
prisma/schema.prisma                    # 修改: 新增字段
src/lib/auth.ts                         # 修改: session 添加新字段
src/app/(client)/                       # 新增: 客户端路由组
  client/
    layout.tsx                          # 新增: 客户端 layout
    page.tsx                            # 新增: 技能/MCP列表页
src/app/api/client/                     # 新增: 客户端 API
  skills/
    route.ts                            # GET /api/client/skills
    [id]/
      apply/route.ts                    # POST /api/client/skills/{id}/apply
  mcps/
    route.ts                            # GET /api/client/mcps
    [id]/
      apply/route.ts                    # POST /api/client/mcps/{id}/apply
src/app/api/admin/applications/          # 新增: 审批 API
  route.ts                              # GET /api/admin/applications
  [id]/
    approve/route.ts                    # POST /api/admin/applications/{id}/approve
    reject/route.ts                     # POST /api/admin/applications/{id}/reject
src/components/layout/client-sidebar.tsx # 新增: 客户端侧边栏
src/components/layout/client-header.tsx  # 新增: 客户端 header
src/app/(dashboard)/dashboard/          # 修改: 侧边栏根据角色显示菜单
  approvals/
    page.tsx                            # 新增: 审批页面
```

---

## Task 1: Schema 变更

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 添加 User 新增字段**

在 User model 中添加:
```prisma
isDepartmentAdmin Boolean @default(false) @map("is_department_admin")
departmentId       String? @map("department_id")
```

- [ ] **Step 2: 添加 ResourceApplication model**

```prisma
model ResourceApplication {
  id             String   @id @default(uuid())
  resourceType   String   @map("resource_type")
  resourceId     String   @map("resource_id")
  userId         String   @map("user_id")
  status         String   @default("pending")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user           User     @relation(fields: [userId], references: [id])

  @@unique([resourceType, resourceId, userId])
  @@map("resource_applications")
}
```

- [ ] **Step 3: 运行 migration**

```bash
npx prisma db push
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add department admin fields and ResourceApplication model"
```

---

## Task 2: Auth Session 更新

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: 更新 jwt callback 添加新字段**

```typescript
async jwt({ token, user }) {
  if (user) {
    const u = user as { id: string; isSuperAdmin: boolean; organizationId: string | null; isDepartmentAdmin?: boolean; departmentId?: string | null }
    token.id = u.id
    token.isSuperAdmin = u.isSuperAdmin
    token.organizationId = u.organizationId
    token.isDepartmentAdmin = u.isDepartmentAdmin ?? false
    token.departmentId = u.departmentId ?? null
  }
  return token
}
```

- [ ] **Step 2: 更新 session callback**

```typescript
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id as string
    session.user.isSuperAdmin = token.isSuperAdmin as boolean
    session.user.organizationId = token.organizationId as string | null
    session.user.isDepartmentAdmin = token.isDepartmentAdmin as boolean
    session.user.departmentId = token.departmentId as string | null
  }
  return session
}
```

- [ ] **Step 3: 更新 authorize 返回值**

```typescript
return {
  id: user.id,
  email: user.email,
  name: user.name,
  isSuperAdmin: user.isSuperAdmin,
  organizationId: user.organizationId,
  isDepartmentAdmin: user.isDepartmentAdmin,
  departmentId: user.departmentId,
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add department admin fields to auth session"
```

---

## Task 3: 客户端 Layout 和基础组件

**Files:**
- Create: `src/components/layout/client-sidebar.tsx`
- Create: `src/components/layout/client-header.tsx`
- Create: `src/app/(client)/client/layout.tsx`

- [ ] **Step 1: 创建 client-sidebar.tsx**

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { signOut } from 'next-auth/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Box, Cpu, LogOut, Settings, LayoutDashboard } from 'lucide-react'

const navItems = [
  { href: '/client', label: '我的技能', icon: LayoutDashboard },
]

export function ClientSidebar({ user }: { user: { name?: string | null; email?: string | null; isSuperAdmin?: boolean } }) {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-gray-800">技能中心</h1>
        </div>
        <p className="text-xs text-gray-500 mt-1">客户端入口</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <div className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200/50'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <Separator className="mx-3 border-gray-200" />

      {/* User section */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-gray-200/50 cursor-pointer">
              <Avatar className="h-8 w-8 ring-2 ring-gray-300">
                <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                <AvatarFallback className="bg-blue-600 text-white text-xs">
                  {user.name?.slice(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="font-medium text-gray-800">{user.name}</span>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-gray-800">{user.name}</span>
                <span className="text-xs font-normal text-gray-500">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.location.href = '/client/settings'}>
              <Settings className="mr-2 h-4 w-4" />
              设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: 创建 client-layout.tsx**

```tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ClientSidebar } from '@/components/layout/client-sidebar'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <ClientSidebar user={session.user} />
      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/client-sidebar.tsx src/app/\(client\)/client/layout.tsx
git commit -m "feat: add client portal layout and sidebar"
```

---

## Task 4: 客户端技能/MCP列表页面

**Files:**
- Create: `src/app/(client)/client/page.tsx`

- [ ] **Step 1: 创建客户端列表页**

页面包含:
- 顶部 Tabs: Skills / MCPs
- 每个 Tab 内三个区块: 公共 / 部门 / 个人
- 部门资源显示"申请"或"已授权"按钮
- 右上角"控制台"按钮 → /admin

```tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Box, Cpu, Globe, Building2, User, CheckCircle, Clock } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ApplyButton } from './apply-button'

export default async function ClientPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true }
  })

  // 获取用户可用的技能和MCP
  const [skills, mcps, applications] = await Promise.all([
    db.skill.findMany({
      where: {
        isActive: true,
        OR: [
          { visibility: 'company' },
          { visibility: 'department', organizationId: user?.organizationId },
          { visibility: 'personal', ownerId: session.user.id },
        ]
      },
      include: { organization: { select: { name: true } } }
    }),
    db.mcp.findMany({
      where: {
        isActive: true,
        OR: [
          { visibility: 'company' },
          { visibility: 'department', organizationId: user?.organizationId },
          { visibility: 'personal', ownerId: session.user.id },
        ]
      },
      include: { organization: { select: { name: true } } }
    }),
    db.resourceApplication.findMany({
      where: {
        userId: session.user.id,
        status: { in: ['pending', 'approved'] }
      }
    })
  ])

  const approvedMap = new Set(applications.filter(a => a.status === 'approved').map(a => `${a.resourceType}-${a.resourceId}`))
  const pendingMap = new Set(applications.filter(a => a.status === 'pending').map(a => `${a.resourceType}-${a.resourceId}`))

  const categorize = (items: any[], type: 'skill' | 'mcp') => {
    const company = items.filter(i => i.visibility === 'company')
    const department = items.filter(i => i.visibility === 'department')
    const personal = items.filter(i => i.visibility === 'personal')
    return { company, department, personal }
  }

  const skillCategories = categorize(skills, 'skill')
  const mcpCategories = categorize(mcps, 'mcp')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">我的技能</h1>
          <p className="text-muted-foreground text-gray-500">查看和管理您的可用技能</p>
        </div>
        <Button onClick={() => window.location.href = '/admin'}>
          控制台
        </Button>
      </div>

      <Tabs defaultValue="skills" className="w-full">
        <TabsList>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="mcps" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            MCPs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="skills" className="space-y-6">
          <ResourceSection title="公共技能" icon={Globe} items={skillCategories.company} type="skill" userId={session.user.id} approvedMap={approvedMap} pendingMap={pendingMap} />
          <ResourceSection title="部门技能" icon={Building2} items={skillCategories.department} type="skill" userId={session.user.id} approvedMap={approvedMap} pendingMap={pendingMap} showApply />
          <ResourceSection title="个人技能" icon={User} items={skillCategories.personal} type="skill" userId={session.user.id} approvedMap={approvedMap} pendingMap={pendingMap} />
        </TabsContent>

        <TabsContent value="mcps" className="space-y-6">
          <ResourceSection title="公共MCP" icon={Globe} items={mcpCategories.company} type="mcp" userId={session.user.id} approvedMap={approvedMap} pendingMap={pendingMap} />
          <ResourceSection title="部门MCP" icon={Building2} items={mcpCategories.department} type="mcp" userId={session.user.id} approvedMap={approvedMap} pendingMap={pendingMap} showApply />
          <ResourceSection title="个人MCP" icon={User} items={mcpCategories.personal} type="mcp" userId={session.user.id} approvedMap={approvedMap} pendingMap={pendingMap} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ResourceSection({ title, icon: Icon, items, type, userId, approvedMap, pendingMap, showApply }: any) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm col-span-full">暂无{title}</p>
        ) : (
          items.map((item: any) => {
            const key = `${type}-${item.id}`
            const isApproved = approvedMap.has(key)
            const isPending = pendingMap.has(key)
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.identifier}</p>
                    </div>
                    <Badge variant="outline">{item.sourceType === 'url' ? 'URL' : '本地'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{item.description || '无描述'}</p>
                  {item.organization && (
                    <p className="text-xs text-gray-400 mb-2">组织: {item.organization.name}</p>
                  )}
                  {showApply && (
                    <div className="mt-2">
                      {isApproved ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" /> 已授权
                        </Badge>
                      ) : isPending ? (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          <Clock className="h-3 w-3 mr-1" /> 申请中
                        </Badge>
                      ) : (
                        <ApplyButton resourceType={type} resourceId={item.id} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 ApplyButton 客户端组件**

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'

export function ApplyButton({ resourceType, resourceId }: { resourceType: string; resourceId: string }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleApply = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/client/${resourceType}s/${resourceId}/apply`, {
        method: 'POST',
      })
      if (res.ok) {
        toast({ title: '申请成功', description: '您的申请已提交，请等待审批' })
        window.location.reload()
      } else {
        const data = await res.json()
        toast({ title: '申请失败', description: data.error || '未知错误', variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={handleApply} disabled={loading} variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-50">
      {loading ? '申请中...' : '申请'}
    </Button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(client\)/client/page.tsx src/components/ui/toast.tsx
git commit -m "feat: add client portal skills/mcps listing page"
```

---

## Task 5: 客户端 API

**Files:**
- Create: `src/app/api/client/skills/route.ts`
- Create: `src/app/api/client/skills/[id]/apply/route.ts`
- Create: `src/app/api/client/mcps/route.ts`
- Create: `src/app/api/client/mcps/[id]/apply/route.ts`

- [ ] **Step 1: 创建 GET /api/client/skills**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const userId = (authResult as any).userId

  const user = await db.user.findUnique({ where: { id: userId } })

  const skills = await db.skill.findMany({
    where: {
      isActive: true,
      OR: [
        { visibility: 'company' },
        { visibility: 'department', organizationId: user?.organizationId },
        { visibility: 'personal', ownerId: userId },
      ]
    },
    include: { organization: { select: { id: true, name: true } } }
  })

  // 获取用户的申请状态
  const applications = await db.resourceApplication.findMany({
    where: { userId, resourceType: 'skill' }
  })

  const approvedIds = new Set(applications.filter(a => a.status === 'approved').map(a => a.resourceId))
  const pendingIds = new Set(applications.filter(a => a.status === 'pending').map(a => a.resourceId))

  const data = skills.map(skill => ({
    ...skill,
    applicationStatus: approvedIds.has(skill.id) ? 'approved' : pendingIds.has(skill.id) ? 'pending' : null
  }))

  return NextResponse.json({ data })
}
```

- [ ] **Step 2: 创建 POST /api/client/skills/{id}/apply**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const userId = (authResult as any).userId
  const { id } = await params

  const skill = await db.skill.findUnique({ where: { id } })
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (skill.visibility !== 'department') {
    return NextResponse.json({ error: 'Only department resources can be applied' }, { status: 400 })
  }

  // 检查是否已有申请
  const existing = await db.resourceApplication.findUnique({
    where: { resourceType_resourceId_userId: { resourceType: 'skill', resourceId: id, userId } }
  })

  if (existing) {
    return NextResponse.json({ error: 'Application already exists' }, { status: 409 })
  }

  await db.resourceApplication.create({
    data: { resourceType: 'skill', resourceId: id, userId }
  })

  return NextResponse.json({ message: 'Application submitted' }, { status: 201 })
}
```

- [ ] **Step 3: 创建 GET /api/client/mcps 和 POST apply**

类似 skills 的实现，resourceType 改为 'mcp'

- [ ] **Step 4: Commit**

```bash
git add src/app/api/client/skills/route.ts src/app/api/client/skills/[id]/apply/route.ts src/app/api/client/mcps/route.ts src/app/api/client/mcps/[id]/apply/route.ts
git commit -m "feat: add client portal API endpoints"
```

---

## Task 6: 审批 API

**Files:**
- Create: `src/app/api/admin/applications/route.ts`
- Create: `src/app/api/admin/applications/[id]/approve/route.ts`
- Create: `src/app/api/admin/applications/[id]/reject/route.ts`

- [ ] **Step 1: 创建 GET /api/admin/applications**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult as any

  // 检查是否是部门管理员或超管
  if (!user.isSuperAdmin && !user.isDepartmentAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const resourceType = searchParams.get('resourceType')
  const status = searchParams.get('status') || 'pending'

  const where: any = { status }
  if (resourceType) where.resourceType = resourceType

  // 部门管理员只能看到本部门的申请
  if (user.isDepartmentAdmin && !user.isSuperAdmin) {
    const departmentSkills = await db.skill.findMany({
      where: { organizationId: user.departmentId },
      select: { id: true }
    })
    const departmentMcps = await db.mcp.findMany({
      where: { organizationId: user.departmentId },
      select: { id: true }
    })
    const resourceIds = [
      ...departmentSkills.map(s => s.id),
      ...departmentMcps.map(m => m.id)
    ]
    where.OR = [
      { resourceType: 'skill', resourceId: { in: resourceIds } },
      { resourceType: 'mcp', resourceId: { in: resourceIds } },
    ]
  }

  const applications = await db.resourceApplication.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, organization: { select: { name: true } } } }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 获取资源详情
  const applicationsWithResource = await Promise.all(
    applications.map(async (app) => {
      const resource = app.resourceType === 'skill'
        ? await db.skill.findUnique({ where: { id: app.resourceId }, select: { id: true, name: true, identifier: true, organization: { select: { name: true } } } })
        : await db.mcp.findUnique({ where: { id: app.resourceId }, select: { id: true, name: true, identifier: true, organization: { select: { name: true } } } })
      return { ...app, resource }
    })
  )

  return NextResponse.json({ data: applicationsWithResource })
}
```

- [ ] **Step 2: 创建 POST approve**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const user = authResult as any
  const { id } = await params

  if (!user.isSuperAdmin && !user.isDepartmentAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const application = await db.resourceApplication.findUnique({ where: { id } })
  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  if (application.status !== 'pending') {
    return NextResponse.json({ error: 'Application already processed' }, { status: 400 })
  }

  // 部门管理员权限校验
  if (user.isDepartmentAdmin && !user.isSuperAdmin) {
    const resource = application.resourceType === 'skill'
      ? await db.skill.findUnique({ where: { id: application.resourceId } })
      : await db.mcp.findUnique({ where: { id: application.resourceId } })
    if (resource?.organizationId !== user.departmentId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  await db.resourceApplication.update({
    where: { id },
    data: { status: 'approved' }
  })

  return NextResponse.json({ message: 'Application approved' })
}
```

- [ ] **Step 3: 创建 POST reject**

类似 approve，但 status 改为 'rejected'

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/applications/route.ts src/app/api/admin/applications/[id]/approve/route.ts src/app/api/admin/applications/[id]/reject/route.ts
git commit -m "feat: add admin applications API for approval workflow"
```

---

## Task 7: 审批页面

**Files:**
- Create: `src/app/(dashboard)/dashboard/approvals/page.tsx`

- [ ] **Step 1: 创建审批页面**

```tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock, Box, Cpu } from 'lucide-react'
import { ApproveButton } from './approve-button'
import { RejectButton } from './reject-button'

export default async function ApprovalsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const user = session.user as any
  if (!user.isSuperAdmin && !user.isDepartmentAdmin) {
    redirect('/dashboard')
  }

  const applications = await db.resourceApplication.findMany({
    where: { status: 'pending' },
    include: {
      user: {
        select: { id: true, name: true, email: true, organization: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // 过滤本部门
  const filteredApps = user.isDepartmentAdmin && !user.isSuperAdmin
    ? applications.filter(async (app) => {
        const resource = app.resourceType === 'skill'
          ? await db.skill.findUnique({ where: { id: app.resourceId } })
          : await db.mcp.findUnique({ where: { id: app.resourceId } })
        return resource?.organizationId === user.departmentId
      })
    : applications

  const applicationsWithResource = await Promise.all(
    filteredApps.map(async (app) => {
      const resource = app.resourceType === 'skill'
        ? await db.skill.findUnique({ where: { id: app.resourceId }, select: { id: true, name: true, identifier: true } })
        : await db.mcp.findUnique({ where: { id: app.resourceId }, select: { id: true, name: true, identifier: true } })
      return { ...app, resource }
    })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">技能审批</h1>
        <p className="text-muted-foreground text-gray-500">审批用户的技能/MCP申请</p>
      </div>

      <div className="space-y-4">
        {applicationsWithResource.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              暂无待审批的申请
            </CardContent>
          </Card>
        ) : (
          applicationsWithResource.map((app) => (
            <Card key={app.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      {app.resourceType === 'skill' ? (
                        <Box className="h-5 w-5 text-gray-600" />
                      ) : (
                        <Cpu className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{app.resource?.name}</h3>
                      <p className="text-sm text-gray-500">{app.resource?.identifier}</p>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {app.resourceType === 'skill' ? '技能' : 'MCP'}
                    </Badge>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                    <Clock className="h-3 w-3 mr-1" /> 待审批
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    <p>申请人: {app.user.name} ({app.user.email})</p>
                    {app.user.organization && (
                      <p>部门: {app.user.organization.name}</p>
                    )}
                    <p className="text-gray-400 mt-1">
                      申请时间: {new Date(app.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ApproveButton applicationId={app.id} />
                    <RejectButton applicationId={app.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 ApproveButton 和 RejectButton 客户端组件**

```tsx
'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useToast } from '@/components/ui/toast'
import { CheckCircle } from 'lucide-react'

export function ApproveButton({ applicationId }: { applicationId: string }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/approve`, { method: 'POST' })
      if (res.ok) {
        toast({ title: '已批准' })
        window.location.reload()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" onClick={handleApprove} disabled={loading} className="bg-green-600 hover:bg-green-700">
      <CheckCircle className="h-4 w-4 mr-1" /> 批准
    </Button>
  )
}
```

RejectButton 类似，使用 XCircle 图标

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/approvals/page.tsx src/app/\(dashboard\)/dashboard/approvals/approve-button.tsx src/app/\(dashboard\)/dashboard/approvals/reject-button.tsx
git commit -m "feat: add admin approvals page"
```

---

## Task 8: 侧边栏根据角色显示菜单

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: 更新 Sidebar 根据角色显示不同菜单**

在 sidebar.tsx 中，根据 `user.isSuperAdmin` 和 `user.isDepartmentAdmin` 显示不同菜单

超管菜单:
- 概览
- 用户管理
- 组织架构
- Skills
- MCPs
- 技能审批

部门管理员菜单:
- 概览
- 技能审批
- 技能管理
- MCP管理

个人用户菜单:
- 概览
- 我的技能
- 我的MCP

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add role-based menu to sidebar"
```

---

## Task 9: 更新 Header 添加角色标签

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: 更新 Header 显示角色标识**

根据 isSuperAdmin 显示"超级管理员"，根据 isDepartmentAdmin 显示"部门管理员"

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: show role badge in header"
```

---

## Task 10: 测试验证

- [ ] **Step 1: 测试各角色登录**
- [ ] **Step 2: 测试技能/MCP申请流程**
- [ ] **Step 3: 测试审批流程**
- [ ] **Step 4: 测试权限控制**
