# Skill/MCP 管理系统设计

## 1. 项目概述

### 背景
构建一个集中管理 Skill/MCP 配置的系统，供 openClaw/CoPaw 等产品通过 API 调用。实现三级权限管控：公司级、部门级、个人级。

### 核心功能
- 组织架构管理（多层级树形结构：总部→部门→小组）
- Skill/MCP 资源配置（URL 或本地路径引用）
- 三级权限管控（公司/部门/个人可见性）
- 用户管理 + 默认超级管理员
- OAuth 2.0 API 认证（外部产品接入）

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────┐
│                 Next.js 全栈应用                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Admin UI    │    │      API 端点            │   │
│  │  /admin/*    │    │  /api/v1/*              │   │
│  └──────────────┘    └──────────────────────────┘   │
│         │                      │                    │
│         └──────────┬───────────┘                   │
│                      ▼                              │
│              PostgreSQL 数据库                      │
└─────────────────────────────────────────────────────┘
                      ▲
                      │ OAuth 2.0
                      │
┌─────────────────────────────────────────────────────┐
│   openClaw / CoPaw 等产品（外部 consumer）          │
└─────────────────────────────────────────────────────┘
```

---

## 3. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端/后端 | Next.js 15 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| 数据库 | PostgreSQL |
| ORM | Prisma |
| 管理后台认证 | NextAuth.js |
| API 认证 | OAuth 2.0 (Authorization Code) |
| 默认管理员 | admin@local.com / admin123（环境变量覆盖） |

### OAuth 2.0 实现细节

- **授权模式**: Authorization Code (RFC 6749)
- **Token 生命周期**: Access Token 1小时，Refresh Token 7天
- **Token 格式**: JWT（内部签发）

**授权范围 (scope)**:

| scope | 说明 |
|-------|------|
| `skills:read` | 读取用户可用的 Skills |
| `mcps:read` | 读取用户可用的 MCPs |
| `skills:write` | 创建/更新/删除 Skills（管理后台） |
| `mcps:write` | 创建/更新/删除 MCPs（管理后台） |
| `users:read` | 读取用户信息 |
| `users:write` | 管理用户（管理后台） |
| `organizations:read` | 读取组织架构 |
| `organizations:write` | 管理组织架构（管理后台） |

**授权码格式**: 32 字符随机字符串，有效期 10 分钟

---

## 4. 数据库表结构

### 4.1 组织架构表 (organizations)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(255) | 组织名称 |
| type | VARCHAR(20) | 'company' / 'department' / 'team' |
| parent_id | UUID | 父组织ID（顶级为 NULL） |
| path | VARCHAR(1000) | 物化路径，如 '/root-company/sales-dept' |
| level | INTEGER | 层级深度，0=顶级 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

**路径格式**: 仅允许小写字母、数字、连字符（`[a-z0-9-]`），不以 `-` 开头或结尾

**索引**: organizations.path 上创建 B-tree 索引

**级联删除**: 删除组织前需先删除所有子组织

### 4.2 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR(255) | 唯一邮箱 |
| password_hash | VARCHAR(255) | 密码哈希（bcrypt cost=12） |
| name | VARCHAR(255) | 用户名 |
| organization_id | UUID | 所属组织 |
| is_super_admin | BOOLEAN | 超级管理员标识 |
| is_active | BOOLEAN | 启用状态 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 4.3 Skill 表 (skills)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(255) | 展示名称 |
| identifier | VARCHAR(255) | 唯一标识 |
| description | TEXT | 描述 |
| visibility | VARCHAR(20) | 'company' / 'department' / 'personal' |
| owner_id | UUID | 创建人（personal 时 NOT NULL） |
| organization_id | UUID | 所属组织（company/department 时 NOT NULL） |
| source_type | VARCHAR(20) | 'url' / 'local_path' |
| source_value | VARCHAR(1000) | URL 地址 或 本地服务器路径 |
| is_active | BOOLEAN | 启用状态 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

**唯一约束**: (identifier, organization_id, owner_id) 同一范围内 identifier 唯一

**DB 约束**:
- personal visibility 时 owner_id NOT NULL
- company/department 时 organization_id NOT NULL

**identifier 格式**: 小写字母、数字、连字符组成，长度 3-64 字符（如 `github-skill`）

**identifier 校验正则**: `^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$`

**用户删除行为**: 软删除（设置 `is_active=false`），同时：
- 撤销该用户的所有 OAuth token
- 删除该用户创建的 personal Skill/MCP（级联）

### 4.4 MCP 表 (mcps)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(255) | 展示名称 |
| identifier | VARCHAR(255) | 唯一标识 |
| description | TEXT | 描述 |
| visibility | VARCHAR(20) | 'company' / 'department' / 'personal' |
| owner_id | UUID | 创建人（personal 时 NOT NULL） |
| organization_id | UUID | 所属组织（company/department 时 NOT NULL） |
| source_type | VARCHAR(20) | 'url' / 'local_path' |
| source_value | VARCHAR(1000) | URL 地址 或 本地服务器路径 |
| is_active | BOOLEAN | 启用状态 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

**约束同 Skill 表**。

### 4.5 OAuth 客户端表 (oauth_clients)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| client_id | VARCHAR(255) | 客户端ID（唯一） |
| client_secret_hash | VARCHAR(255) | 客户端密钥哈希 |
| api_key_hash | VARCHAR(255) | API Key 哈希（用于 Admin API） |
| name | VARCHAR(255) | 产品名称（如 openClaw、CoPaw） |
| allowed_redirect_uris | TEXT[] | 允许的重定向 URI 列表 |
| is_active | BOOLEAN | 启用状态 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### 4.6 OAuth 授权码表 (oauth_authorization_codes)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| code | VARCHAR(64) | 32 字符随机授权码 |
| client_id | UUID | 关联 oauth_clients.id |
| user_id | UUID | 关联 users |
| redirect_uri | VARCHAR(500) | 回调 URI |
| scope | VARCHAR(255) | 授权范围 |
| expires_at | TIMESTAMPTZ | 过期时间（10分钟后） |
| created_at | TIMESTAMPTZ | 创建时间 |

### 4.7 OAuth 令牌表 (oauth_tokens)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| client_id | UUID | 关联 oauth_clients.id |
| user_id | UUID | 关联 users |
| access_token | TEXT | 访问令牌 |
| refresh_token | TEXT | 刷新令牌 |
| expires_at | TIMESTAMPTZ | 过期时间 |
| created_at | TIMESTAMPTZ | 创建时间 |

> 注：token 请求中传入的 `client_id` 为字符串（如 `openclaw`），通过 `oauth_clients.client_id` 字段查询找到对应记录后，使用其 `id` (UUID) 存入此表。

---

## 5. 权限查询逻辑

用户可见的 Skill/MCP = 公司级 ∪ 部门级（含子部门）∪ 个人级

```sql
-- 获取用户可用的 Skills（使用物化路径前缀匹配）
SELECT s.* FROM skills s
WHERE s.is_active = TRUE
AND (
    -- 公司级：任何人都可用
    s.visibility = 'company'
    -- 部门级：该用户所在组织及其所有子组织
    OR (s.visibility = 'department'
        AND s.organization_id IN (
            SELECT o.id FROM organizations o
            WHERE o.path LIKE ($user_org_path || '/%')
        ))
    -- 个人级：仅自己
    OR (s.visibility = 'personal' AND s.owner_id = $user_id)
);
```

> 注：物化路径仅包含 `[a-z0-9-]` 字符，无需转义处理。

---

## 6. API 端点

### 6.1 通用约定

**分页**: 所有列表端点支持 `page` / `pageSize` 参数，默认 page=1, pageSize=20

**响应格式**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

**错误格式**:
```json
{
  "error": "错误描述",
  "code": "ERROR_CODE",
  "details": {}
}
```

**错误码与 HTTP 状态映射**:

| HTTP Status | 错误码前缀 | 说明 |
|-------------|-----------|------|
| 400 | `VALIDATION_` | 请求参数校验失败 |
| 401 | `AUTH_` | 认证失败 |
| 403 | `FORBIDDEN_` | 权限不足 |
| 404 | `NOT_FOUND_` | 资源不存在 |
| 409 | `CONFLICT_` | 资源冲突（如 identifier 重复） |
| 500 | `INTERNAL_` | 服务器内部错误 |

### 6.2 认证端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/auth/authorize` | OAuth 授权页面（用户登录+授权） |
| POST | `/api/v1/auth/token` | OAuth 获取 token |
| POST | `/api/v1/auth/refresh` | 刷新 token |
| POST | `/api/v1/auth/revoke` | 撤销 token |

**GET /api/v1/auth/authorize**
```
query: client_id, redirect_uri, response_type=code, scope, state
```
用户登录并授权后，重定向到 `redirect_uri?code=xxx&state=xxx`

**POST /api/v1/auth/token**
```json
// Request
{
  "grant_type": "authorization_code",
  "code": "xxx",
  "client_id": "openclaw",
  "client_secret": "xxx",
  "redirect_uri": "xxx"
}
// Response
{
  "access_token": "xxx",
  "refresh_token": "xxx",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 6.3 Skill 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/skills` | 列表（支持分页、visibility 过滤） |
| POST | `/api/v1/skills` | 创建 Skill |
| GET | `/api/v1/skills/{id}` | 详情 |
| PUT | `/api/v1/skills/{id}` | 更新 |
| DELETE | `/api/v1/skills/{id}` | 删除（软删除 is_active=false） |

**POST /api/v1/skills**
```json
{
  "name": "GitHub Skill",
  "identifier": "github-skill",
  "description": "Connect to GitHub",
  "visibility": "company",
  "organization_id": "uuid",
  "source_type": "url",
  "source_value": "https://example.com/skills/github.zip"
}
```

### 6.4 MCP 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/mcps` | 列表 |
| POST | `/api/v1/mcps` | 创建 |
| GET | `/api/v1/mcps/{id}` | 详情 |
| PUT | `/api/v1/mcps/{id}` | 更新 |
| DELETE | `/api/v1/mcps/{id}` | 删除 |

（MCP 请求/响应结构同 Skill）

### 6.5 用户 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/users/{id}/skills` | 获取用户可用的 Skills（含权限过滤） |
| GET | `/api/v1/users/{id}/mcps` | 获取用户可用的 MCPs（含权限过滤） |

**GET /api/v1/users/{id}/skills** (Response)
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "GitHub Skill",
      "identifier": "github-skill",
      "visibility": "company",
      "source_type": "url",
      "source_value": "https://..."
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 1 }
}
```

### 6.6 组织架构端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/organizations` | 树形列表 |
| POST | `/api/v1/organizations` | 创建节点 |
| PUT | `/api/v1/organizations/{id}` | 更新节点 |
| DELETE | `/api/v1/organizations/{id}` | 删除节点（需无子组织） |

**POST /api/v1/organizations**
```json
{
  "name": "销售部",
  "type": "department",
  "parent_id": "uuid-of-parent"
}
```

### 6.7 用户管理端点（Admin）

**授权**: 仅 `is_super_admin=true` 的用户可访问，或通过 API Key（服务端到服务端）调用。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/admin/users` | 用户列表 |
| POST | `/api/v1/admin/users` | 创建用户 |
| GET | `/api/v1/admin/users/{id}` | 用户详情 |
| PUT | `/api/v1/admin/users/{id}` | 更新用户 |
| DELETE | `/api/v1/admin/users/{id}` | 删除用户 |

**API Key 认证**: Header `X-API-Key: <client_api_key>` 用于服务端间调用。

---

## 7. 项目结构

```
skills-mcp-manage/
├── prisma/
│   └── schema.prisma          # Prisma 数据模型
├── src/
│   ├── app/
│   │   ├── (auth)/            # 认证页面
│   │   │   └── login/
│   │   ├── (dashboard)/       # 管理后台
│   │   │   ├── layout.tsx
│   │   │   ├── skills/
│   │   │   ├── mcps/
│   │   │   ├── organizations/
│   │   │   └── users/
│   │   └── api/
│   │       └── v1/            # API 端点
│   │           ├── auth/
│   │           ├── skills/
│   │           ├── mcps/
│   │           ├── organizations/
│   │           ├── users/
│   │           └── admin/
│   ├── components/
│   │   ├── ui/                # shadcn/ui 组件
│   │   └── ...                # 业务组件
│   ├── lib/
│   │   ├── auth.ts           # NextAuth 配置
│   │   ├── db.ts             # Prisma 客户端
│   │   ├── oauth.ts          # OAuth 2.0 实现
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── docs/
│   └── specs/                # 设计文档
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## 8. 种子数据

启动时创建默认数据：

- **组织**: 根组织 "总公司" (type=company, path='/root-company')
- **用户**: admin@local.com (is_super_admin=true, password=admin123)

> 生产环境：管理员凭据通过环境变量 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 覆盖
