# 客户端入口与角色权限系统设计

## 1. 项目概述

在现有管理后台基础上，新增客户端入口和角色权限体系：
- **客户端** (`/client`) - 普通用户查看可用技能、申请部门技能
- **控制台** (`/admin`) - 不同角色看到不同管理功能
- **角色** - 超级管理员 / 部门管理员 / 个人用户

## 2. 系统架构

### 2.1 入口结构

```
/client  → 客户端入口（需登录）
           - 技能列表（按可见性分组）
           - 右上角"控制台"按钮 → /admin

/admin   → 控制台入口（需登录，根据角色显示菜单）
           - 超级管理员：组织架构、用户管理、技能/MCP、审批
           - 部门管理员：本部门审批、技能/MCP
           - 个人用户：自己的技能/MCP
```

### 2.2 角色定义

| 角色 | 现有字段 | 新增字段 | 说明 |
|------|---------|---------|------|
| 超级管理员 | `is_super_admin=true` | - | 全系统最高权限 |
| 部门管理员 | `is_super_admin=false` | `is_department_admin=true` + `department_id` | 管理指定部门 |
| 个人用户 | `is_super_admin=false` | `is_department_admin=false` | 默认角色 |

## 3. 数据库变更

### 3.1 新增 ResourceApplication 表

MCP 和 Skill 共用同一个申请审批机制。

```prisma
model ResourceApplication {
  id             String   @id @default(uuid())
  resourceType   String   @map("resource_type")  // "skill" | "mcp"
  resourceId     String   @map("resource_id")
  userId         String   @map("user_id")
  status         String   @default("pending")  // pending / approved / rejected
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user           User     @relation(fields: [userId], references: [id])

  @@unique([resourceType, resourceId, userId])  // 同一用户对同一资源只能申请一次
  @@map("resource_applications")
}
```

### 3.2 用户表新增字段

```prisma
model User {
  // ... existing fields
  isDepartmentAdmin Boolean @default(false) @map("is_department_admin")
  departmentId       String? @map("department_id")
}
```

### 3.3 Skill/MCP 与申请关联

ResourceApplication 通过 `resourceType` + `resourceId` 关联到 Skill 或 MCP，不再需要直接外键。查询时通过 `resourceType` 区分。

## 4. 页面设计

### 4.1 客户端技能/MCP列表 (`/client`)

**布局**：顶部 Tab 切换 Skills / MCPs，每个 Tab 内按可见性分为三个区块

| 区块 | 标题 | 内容 | 操作 |
|------|------|------|------|
| 公共技能 | 🌐 公共 | 所有用户可见的资源 | 无（直接可用） |
| 部门资源 | 🏢 部门 | 所在部门的资源 | "已授权"（绿色）或"申请"（黄色）|
| 个人资源 | 👤 个人 | 自己创建的资源 | 无（创建者可用）|

**技能/MCP卡片信息**：
- 名称、描述、来源类型（URL/本地路径）
- 部门技能显示申请状态标签

**申请按钮交互**：
- 点击"申请"按钮，弹出确认对话框
- 确认后提交申请，状态变为"申请中"

### 4.2 控制台导航

**超级管理员菜单**：
- 📊 控制台首页
- 🏢 组织架构
- 👥 用户管理
- 📋 技能列表
- 🔧 MCP列表
- ✅ 技能审批（MCP审批）

**部门管理员菜单**：
- 📊 控制台首页
- ✅ 技能审批（只显示本部门）
- 📋 技能管理（只显示本部门）
- 🔧 MCP管理（只显示本部门）

**个人用户菜单**：
- 📊 控制台首页
- 📋 我的技能
- 🔧 我的MCP

### 4.3 审批页面 (`/admin/approvals`)

**申请列表**：
- 技能名称
- 申请人 + 所属部门
- 申请时间
- 操作：批准 / 拒绝

**状态流转**：
- pending → approved（用户获得技能使用权）
- pending → rejected（申请被拒绝）

## 5. API 设计

### 5.1 客户端 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/client/skills` | 获取当前用户可用的技能列表 |
| GET | `/api/client/mcps` | 获取当前用户可用的MCP列表 |
| POST | `/api/client/skills/{id}/apply` | 申请部门级技能 |
| POST | `/api/client/mcps/{id}/apply` | 申请部门级MCP |

### 5.2 审批 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/applications` | 获取待审批列表（可按 resourceType 过滤，部门管理员只看本部门） |
| POST | `/api/admin/applications/{id}/approve` | 批准申请 |
| POST | `/api/admin/applications/{id}/reject` | 拒绝申请 |

## 6. 权限控制

### 6.1 技能可见性判断

```typescript
// 获取用户可用的技能（含已批准的部门申请）
async function getVisibleSkills(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }});

  return db.skill.findMany({
    where: {
      isActive: true,
      OR: [
        { visibility: 'company' },
        { visibility: 'department', organizationId: user.organizationId },
        { visibility: 'personal', ownerId: userId },
      ]
    }
  });
}

// 判断用户是否已获得某部门技能的授权（通过申请审批）
async function hasSkillAccess(userId: string, skillId: string) {
  const approved = await db.resourceApplication.findFirst({
    where: {
      userId,
      resourceType: 'skill',
      resourceId: skillId,
      status: 'approved'
    }
  });
  return !!approved;
}
```

### 6.2 部门管理员权限

> **说明**：当前设计假设单组织多部门结构。部门管理员的 `departmentId` 指向其管理的部门（Organization 表中 type='department' 的记录）。

- `isDepartmentAdmin=true` 的用户只能审批 `organizationId === user.departmentId` 的申请
- 只能管理 `organizationId === user.departmentId` 的技能/MCP
- 超管可管理所有组织和资源

## 7. 实现步骤

1. **Schema + Migration** - 修改 Prisma Schema，新增字段和 ResourceApplication 表，运行迁移
2. 创建客户端页面 (`/client`) - 技能/MCP列表页，支持申请
3. 实现客户端 API - `/api/client/skills`, `/api/client/mcps`, apply 接口
4. 实现审批 API - `/api/admin/applications`, approve/reject
5. 修改控制台导航 - 根据角色显示不同菜单
6. 创建审批页面 (`/admin/approvals`)
7. 测试各角色权限

## 8. 项目结构

```
src/
├── app/
│   ├── (client)/              # 新增：客户端入口
│   │   ├── client/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # 技能/MCP列表
│   │   │   └── login/         # 客户端登录（复用现有）
│   ├── (dashboard)/           # 现有：控制台
│   │   ├── dashboard/
│   │   │   ├── approvals/     # 新增：审批页面
│   │   │   └── ...
├── app/api/
│   ├── client/                # 新增：客户端API
│   │   ├── skills/
│   │   │   └── [id]/apply/
│   │   └── mcps/
│   │       └── [id]/apply/
│   └── admin/applications/    # 新增：审批API
```
