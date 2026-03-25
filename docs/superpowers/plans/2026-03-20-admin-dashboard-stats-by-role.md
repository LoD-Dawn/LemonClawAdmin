# Admin Dashboard Stats by Role Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove quick actions from admin dashboard and show role-based statistics: Super admins see all stats (users, orgs, skills, mcps), department admins see users + skills + mcps (no orgs), regular users see only skills + mcps.

**Architecture:** Modify the dashboard page server component to fetch session, determine user role, and conditionally render stat cards based on role. Remove the quick actions section entirely. Skills/MCPs counts are filtered by visibility for non-admin users.

**Tech Stack:** Next.js 15 App Router, Prisma, next-auth v5, TypeScript, shadcn/ui

---

## File Structure

- Modify: `src/app/(dashboard)/dashboard/page.tsx` — Remove quick actions, add role-based stat filtering

---

## Chunk 1: Remove Quick Actions and Add Role-Based Stats

### Task 1: Modify Dashboard Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Read current dashboard page**

```bash
cat src/app/(dashboard)/dashboard/page.tsx
```

- [ ] **Step 2: Write updated dashboard page**

```typescript
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Users, Building2, Box, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const session = await auth()
  const user = session?.user

  // Determine user role
  const isSuperAdmin = user?.isSuperAdmin === true
  const isDepartmentAdmin = user?.isDepartmentAdmin === true
  const isRegularUser = !isSuperAdmin && !isDepartmentAdmin

  // Build stats based on role
  const stats: Array<{
    title: string
    value: number
    icon: typeof Users
    color: string
  }> = []

  if (isSuperAdmin) {
    // Super admin: see all stats (users, orgs, skills, mcps)
    const [userCount, orgCount, skillCount, mcpCount] = await Promise.all([
      db.user.count({ where: { isActive: true } }),
      db.organization.count(),
      db.skill.count({ where: { isActive: true } }),
      db.mcp.count({ where: { isActive: true } })
    ])

    stats.push(
      { title: '用户数', value: userCount, icon: Users, color: 'text-blue-600' },
      { title: '组织数', value: orgCount, icon: Building2, color: 'text-purple-600' },
      { title: 'Skills', value: skillCount, icon: Box, color: 'text-emerald-600' },
      { title: 'MCPs', value: mcpCount, icon: Cpu, color: 'text-orange-600' }
    )
  } else if (isDepartmentAdmin) {
    // Department admin: see users, skills, mcps (no org count)
    const [userCount, skillCount, mcpCount] = await Promise.all([
      db.user.count({
        where: {
          isActive: true,
          OR: [
            { organizationId: user?.organizationId },
            { departmentId: user?.departmentId }
          ]
        }
      }),
      db.skill.count({
        where: {
          isActive: true,
          OR: [
            { visibility: 'department', organizationId: user?.organizationId },
            { visibility: 'personal', ownerId: user?.id }
          ]
        }
      }),
      db.mcp.count({
        where: {
          isActive: true,
          OR: [
            { visibility: 'department', organizationId: user?.organizationId },
            { visibility: 'personal', ownerId: user?.id }
          ]
        }
      })
    ])

    stats.push(
      { title: '用户数', value: userCount, icon: Users, color: 'text-blue-600' },
      { title: 'Skills', value: skillCount, icon: Box, color: 'text-emerald-600' },
      { title: 'MCPs', value: mcpCount, icon: Cpu, color: 'text-orange-600' }
    )
  } else {
    // Regular user: see only skills and mcps (company + department + personal)
    const [skillCount, mcpCount] = await Promise.all([
      db.skill.count({
        where: {
          isActive: true,
          OR: [
            { visibility: 'company', organizationId: user?.organizationId },
            { visibility: 'department', organizationId: user?.organizationId },
            { visibility: 'personal', ownerId: user?.id }
          ]
        }
      }),
      db.mcp.count({
        where: {
          isActive: true,
          OR: [
            { visibility: 'company', organizationId: user?.organizationId },
            { visibility: 'department', organizationId: user?.organizationId },
            { visibility: 'personal', ownerId: user?.id }
          ]
        }
      })
    ])

    stats.push(
      { title: 'Skills', value: skillCount, icon: Box, color: 'text-emerald-600' },
      { title: 'MCPs', value: mcpCount, icon: Cpu, color: 'text-orange-600' }
    )
  }

  return (
    <div className="space-y-8 relative">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100/50 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gray-400 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">欢迎回来</h1>
            <p className="text-muted-foreground mt-0.5 text-gray-500">系统运行正常，所有指标正常</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 relative z-10">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colors = [
            'from-gray-50 to-gray-100 border-gray-200',
            'from-gray-50 to-gray-100 border-gray-200',
            'from-gray-50 to-gray-100 border-gray-200',
            'from-gray-50 to-gray-100 border-gray-200',
          ]
          const iconColors = ['text-gray-600', 'text-gray-600', 'text-gray-600', 'text-gray-600']
          const iconBgColors = ['bg-gray-100', 'bg-gray-100', 'bg-gray-100', 'bg-gray-100']

          return (
            <Card
              key={stat.title}
              className={cn(
                'relative overflow-hidden bg-gradient-to-br border transition-all duration-200 hover:scale-[1.02] card-soft cursor-pointer',
                colors[index % colors.length]
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <div className={cn('p-2 rounded-lg', iconBgColors[index % iconBgColors.length])}>
                    <Icon className={cn('h-5 w-5', iconColors[index % iconColors.length])} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn('text-3xl font-bold text-gray-800', iconColors[index % iconColors.length])}>{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick actions section removed */}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit src/app/(dashboard)/dashboard/page.tsx`
Expected: No errors

- [ ] **Step 4: Test the page renders correctly**

Run: `npm run dev` and navigate to `/dashboard`
Expected: Page loads without errors, shows correct stats based on role

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(dashboard): remove quick actions and add role-based stats

- Super admin sees all stats: users, orgs, skills, mcps
- Department admin sees: users, skills, mcps (no orgs)
- Regular user sees: skills, mcps only (company+department+personal visibility)"
```
