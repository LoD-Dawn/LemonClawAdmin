# AGENTS.md

本文件为 Codex (Codex.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个基于 Next.js 15、Prisma、SQLite 和 NextAuth v5 构建的统一 Skill/MCP 资源管理平台。系统管理 Skill 和 MCP 资源，支持组织级、部门级和个人级的可见性与授权控制。

**核心目标**：集中式资源目录，支持申请/审批工作流、为外部系统发放 OAuth 令牌，以及运行时授权验证。

## 技术栈

- **框架**: Next.js 15 (App Router)、React 19、TypeScript
- **数据库**: Prisma + SQLite（开发环境）/ libSQL（生产环境）
- **认证**: NextAuth v5 beta（JWT 策略）
- **UI**: Tailwind CSS、Radix UI 组件（shadcn 风格）
- **账号类型**: 
  - `consumer`（个人用户）：通过手机短信自助注册，可用手机验证码或邮箱+密码登录
  - `enterprise`（企业用户）：由管理员创建，使用邮箱+密码登录

## 开发命令

```bash
# 开发
npm run dev                    # 启动开发服务器（自动运行 db:ensure-schema + prisma generate）
npm run build                  # 构建生产版本
npm run start                  # 启动生产服务器
npm run lint                   # 运行 ESLint

# 数据库
npm run db:generate            # 生成 Prisma Client
npm run db:push                # 推送 schema 到数据库（快速原型开发）
npm run db:migrate             # 创建并应用迁移（推荐）
npm run db:ensure-schema       # 对已部署数据库执行幂等 schema 修复
npm run db:seed                # 初始化默认组织和超级管理员

# 测试
npx vitest                     # 运行测试（已配置 vitest）
```

## 数据库架构

### 核心模型

- **User**：支持两种账号类型（`consumer`、`enterprise`）。个人用户可通过手机短信自助注册并用验证码登录。企业用户由管理员创建，使用邮箱+密码登录。
- **Organization**：层级结构（公司 → 部门 → 团队），使用 `path` 和 `level` 字段支持树形查询
- **Skill/Mcp**：资源，具有三种可见性级别（`company`、`department`、`personal`）
- **ResourceApplication**：用户对部门级资源的申请记录
- **ResourceGrant**：授权记录，关联用户与资源
- **ModelProvider/AiModel**：模型提供商配置，API 密钥已加密
- **UserClawQuota**：个人用户的积分配额系统
- **ClawSessionReservation**：桌面客户端使用的会话跟踪
- **OAuthClient/OAuthToken**：外部集成的 OAuth 2.0 授权码流程
- **PhoneVerificationCode**：个人用户注册/登录的短信验证码
- **OperationLog**：所有系统操作的审计日志

### 重要 Schema 细节

- **唯一约束**：Skill 和 MCP 使用复合唯一键：`(identifier, organizationId, ownerId)`
- **默认组织**：个人用户自动加入 ID 为 `DEFAULT_CONSUMER_ORGANIZATION_ID` 常量的组织
- **手机号格式**：所有手机号以 E.164 格式存储（如 `+8613800000000`）
- **加密字段**：模型提供商 API 密钥使用 `MODEL_API_KEY_ENCRYPTION_SECRET` 加密

## 认证与授权

### 登录流程

1. **企业登录**（`/login/enterprise`）：企业用户使用邮箱+密码
2. **个人用户登录**（`/login/consumer`）：
   - 手机号+短信验证码（自动注册新用户）
   - 邮箱+密码（未绑定手机号的历史用户的备用方式）
3. **OAuth 流程**：外部系统使用 `/api/v1/auth/authorize` → `/api/v1/auth/token`

### 认证实现

- **NextAuth 配置**：`src/lib/auth.ts`
- **API 认证中间件**：`src/middleware/api-auth.ts`（同时支持 Bearer token 和 NextAuth session）
- **权限检查**：`src/lib/admin-access.ts` 用于后台访问控制
- **资源授权**：`src/lib/resource-grants.ts` 用于运行时授权

### 关键认证函数

- `requireApiAuth(request, { requiredScopes })`：验证 Bearer token 或 session，检查 OAuth scope
- `canUserAccessLoginEntryMode(user, mode)`：验证用户是否可访问个人/企业登录入口
- `resolveLoginClientBinding(tx, clientId)`：将登录客户端映射到组织绑定

## 项目结构

```
src/
├── app/
│   ├── (auth)/              # 登录页面（个人/企业）
│   ├── (client)/            # 客户端页面（/client、/profile）
│   ├── (dashboard)/         # 管理后台页面
│   └── api/
│       ├── admin/           # 仅管理员 API（历史遗留）
│       ├── client/          # 客户端 API（基于 session）
│       ├── external/v1/     # 外部 OAuth API（Bearer token）
│       ├── runtime/         # 资源调用端点
│       └── v1/              # 版本化 API（混合认证）
├── components/              # React 组件（按领域组织）
├── lib/                     # 核心业务逻辑
│   ├── auth.ts              # NextAuth 配置
│   ├── db.ts                # Prisma 客户端单例
│   ├── oauth.ts             # OAuth token 生成/验证
│   ├── resource-grants.ts   # 授权逻辑
│   ├── phone-verification.ts # 短信验证
│   └── model-provider-secrets.ts # API 密钥加密
├── middleware/              # API 中间件（认证、权限）
└── types/                   # TypeScript 类型定义
```

## 关键架构模式

### 路径别名

所有导入使用 `@/*`：`import { db } from '@/lib/db'`

### API 响应格式

外部 API（`/api/external/v1/*`）使用历史格式：
```typescript
{ code: string, message: string, data: any }
```

内部 API 使用标准格式：
```typescript
{ error?: string, code?: string, ...data }
```

### 资源可见性逻辑

- `company`：组织树中所有用户可见
- `department`：部门成员可见，需要授权才能访问
- `personal`：仅所有者可见/可访问

### 事务模式

多步操作使用 Prisma 事务：
```typescript
await db.$transaction(async (tx) => {
  // 多个操作
})
```

## 环境变量

必需变量（参见 `.env.local.example`）：

- `DATABASE_URL`：Prisma 数据库连接
- `NEXTAUTH_SECRET` / `AUTH_SECRET`：NextAuth session 加密
- `JWT_SECRET`：OAuth token 签名
- `MODEL_API_KEY_ENCRYPTION_SECRET`：加密模型提供商 API 密钥
- `PHONE_VERIFICATION_SECRET`：哈希短信验证码
- `SMS_DELIVERY_MODE`：`mock`（开发）或 `aliyun`（生产）
- `ADMIN_EMAIL`、`ADMIN_PHONE`、`ADMIN_PASSWORD`：默认超级管理员凭据

## 常见开发任务

### 添加新资源类型

1. 在 `prisma/schema.prisma` 中添加模型
2. 创建迁移：`npm run db:migrate`
3. 在 `src/app/api/v1/[resource]/` 中添加 API 路由
4. 在 `src/app/(dashboard)/dashboard/[resource]/` 中添加后台页面
5. 在 `src/components/[resource]/` 中添加客户端组件

### 测试 OAuth 流程

1. 在 `/dashboard/oauth-clients` 中创建 OAuth 客户端
2. 使用授权 URL：`/api/v1/auth/authorize?client_id=...&redirect_uri=...&scope=...`
3. 用授权码换取 token：`POST /api/v1/auth/token`
4. 访问受保护资源：`GET /api/external/v1/me/models`，携带 `Authorization: Bearer <token>`

### 运行单个测试

```bash
npx vitest run src/lib/local-storage.test.ts
```

## 重要约束

- **手机号**：数据库操作前始终使用 `normalizePhone()` 规范化
- **API 密钥加密**：使用 `model-provider-secrets.ts` 中的 `encryptModelApiKey()` / `decryptModelApiKey()`
- **OAuth scope**：运行时 API 需要特定 scope（`skills:invoke`、`mcps:invoke`、`models:read`）
- **默认组织**：永远不要删除 ID 为 `DEFAULT_CONSUMER_ORGANIZATION_ID` 的组织
- **Session 策略**：NextAuth 使用 JWT（非数据库 session）

## 已知限制

- 运行时 `invoke` 端点（`/api/runtime/skills/:id/invoke`、`/api/runtime/mcps/:id/invoke`）目前仅验证授权并返回资源元数据，不执行实际的 Skill/MCP 逻辑。
- `docs/` 中的部分设计文档反映了早期架构决策。以 `prisma/schema.prisma` 和 `src/app/api/` 为准。

## 测试注意事项

- 开发环境使用 `SMS_DELIVERY_MODE=mock` 可在服务器日志中查看验证码
- 默认超级管理员凭据通过环境变量设置
- 个人用户首次手机登录时自动注册
- 桌面客户端集成使用基于积分的会话预留系统
