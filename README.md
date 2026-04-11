# Skill / MCP 管理系统

一个基于 `Next.js 15 + Prisma + SQLite + NextAuth` 的统一资源管理平台，用来集中管理 Skill 与 MCP 资源，并支持按组织、部门、个人三种范围做权限控制。

这个项目的目标不是单纯“存一张配置表”，而是把下面几件事收拢到同一套系统里：

- 统一维护 Skill / MCP 资源目录
- 按角色展示客户端入口与后台管理入口
- 支持资源申请、审批、授权、撤销
- 支持 OAuth 方式给外部系统发放访问令牌
- 为后续真实运行时调用预留标准化接入点

## 项目介绍

系统里有两类核心资源：

- `Skill`：可以理解为某种能力、工具包或技能配置
- `MCP`：可以理解为某种服务连接、运行时服务或外部能力接入

系统当前提供两种使用视角：

- `客户端视角 /client`
  - 普通用户查看自己已开通的资源
  - 浏览可发现的资源目录
  - 对部门资源发起申请
- `管理后台 /dashboard`
  - 超级管理员管理用户、组织、Skill、MCP
  - 部门管理员处理本部门审批与授权

资源可见范围分为三类：

- `company`：公共资源，所有相关用户可见
- `department`：部门资源，需要经过授权
- `personal`：个人资源，仅创建者本人可见/可用

## 技术栈

- `Next.js 15`（App Router）
- `React 19`
- `TypeScript`
- `Prisma`
- `SQLite`
- `NextAuth v5 beta`
- `Tailwind CSS`
- `Radix UI / shadcn 风格组件`

## 适合谁看

这份 README 主要给三类同学使用：

- 第一次接手项目、需要先把项目跑起来的人
- 想快速理解项目功能边界的人
- 需要接 API / OAuth / 资源导入流程的人

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 准备环境变量

项目根目录已经提供了示例配置字段，至少需要下面这些变量：

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@local.com"
ADMIN_PHONE="13800000000"
ADMIN_PASSWORD="admin123"
JWT_SECRET="your-jwt-secret-here"
MODEL_API_KEY_ENCRYPTION_SECRET="your-model-api-key-secret"
PHONE_VERIFICATION_SECRET="change-this-phone-verification-secret"
SMS_DELIVERY_MODE="mock"
ALIYUN_SMS_ACCESS_KEY_ID=""
ALIYUN_SMS_ACCESS_KEY_SECRET=""
ALIYUN_SMS_SIGN_NAME="LemonClaw"
ALIYUN_SMS_REGISTER_TEMPLATE_CODE=""
ALIYUN_SMS_REGION="cn-hangzhou"
ALIYUN_SMS_ENDPOINT="dysmsapi.aliyuncs.com"
```

建议做法：

1. 在项目根目录创建或更新 `.env`
2. 参考现有的 `.env.local.example` 补齐变量
3. 本地开发先使用默认值即可

说明：

- `DATABASE_URL="file:./dev.db"` 对应的是 Prisma 的 SQLite 数据库
- `ADMIN_EMAIL`、`ADMIN_PHONE` 和 `ADMIN_PASSWORD` 会被种子脚本用来创建默认管理员
- `NEXTAUTH_SECRET` 和 `JWT_SECRET` 在真实环境中请务必替换为强随机值
- `MODEL_API_KEY_ENCRYPTION_SECRET` 用来加密模型提供商的 API Key，生产环境请使用独立强随机值
- `PHONE_VERIFICATION_SECRET` 用来哈希短信验证码，生产环境请使用独立强随机值
- `SMS_DELIVERY_MODE=mock` 适合本地开发，会在服务端日志里输出验证码；联调和生产建议切到 `aliyun`
- `ALIYUN_SMS_*` 用于阿里云短信 `SendSms` 调用，正式环境需要提前准备 AccessKey、签名和模板编码
- `Prisma CLI` 默认读取根目录 `.env`，所以数据库相关变量建议放在 `.env` 中

### 3. 初始化数据库

首次运行建议按下面顺序执行：

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

如果你只想把 Prisma 模型直接推到本地数据库，也可以使用：

```bash
npm run db:push
```

一般建议：

- 日常本地初始化优先使用 `db:migrate`
- 仅在快速试验 schema 时使用 `db:push`

### 4. 启动项目

```bash
npm run dev
```

启动后访问：

- 客户端首页：[http://localhost:3000/client](http://localhost:3000/client)
- 登录页：[http://localhost:3000/login](http://localhost:3000/login)
- 管理后台：[http://localhost:3000/dashboard](http://localhost:3000/dashboard)

补充说明：

- 根路径 `/` 会自动重定向到 `/client`
- 未登录时，`/client` 展示项目介绍和角色说明
- 登录后才会看到具体资源与后台入口

## 默认账号

执行 `npm run db:seed` 后，会创建默认组织结构和一个默认超级管理员：

- 根组织：`总公司`
- 普通用户默认组织：`普通用户组织`
- 普通用户自助注册后会自动归属到 `普通用户组织`，账号类型为 `consumer`
- 企业账号由管理员创建，账号类型为 `enterprise`，即使角色同样是普通员工，也与自注册普通用户不同
- `普通用户组织` 是初始化内置节点，不能删除，也不能继续创建下级组织

默认超级管理员：

- 邮箱：`admin@local.com`
- 手机号：`+8613800000000`
- 密码：`admin123`

如果你在 `.env` 中修改了 `ADMIN_EMAIL` / `ADMIN_PHONE` / `ADMIN_PASSWORD`，则会按你的配置创建。

## 新手上手指南

如果你是第一次打开这个项目，建议按下面路径理解：

### 路线 1：先把项目跑起来

1. 安装依赖
2. 配置 `.env`
3. 执行 `db:migrate`
4. 执行 `db:seed`
5. 启动 `npm run dev`
6. 用默认管理员登录

### 路线 2：先看页面结构

先从下面三个地址开始：

- `/client`：项目主入口，最适合先理解产品逻辑
- `/login`：统一登录入口
- `/dashboard`：后台工作台

### 路线 3：先理解业务流程

系统当前最核心的闭环是：

1. 管理员创建 Skill / MCP 资源
2. 用户在客户端浏览资源
3. 用户对部门资源发起申请
4. 管理员在审批页处理申请
5. 系统生成授权关系
6. 运行时接口校验用户是否具备访问权限

## 初始化后怎么使用

### 普通用户

登录后主要在 `/client` 操作：

- 查看“我的可用资源”
- 浏览 Skill / MCP 目录
- 对可申请资源发起申请
- 查看申请状态是否为待审批 / 已通过 / 已拒绝 / 已撤销

### 部门管理员

除了 `/client` 外，还可以进入 `/dashboard`：

- 查看本部门资源
- 审批本部门申请
- 处理授权与撤销

### 超级管理员

拥有完整后台能力：

- 用户管理
- 组织架构管理
- Skill 管理
- MCP 管理
- 审批管理

## 主要页面说明

### 客户端

- `/client`
  - 项目唯一主入口
  - 未登录展示平台介绍
  - 已登录展示资源工作台

### 认证

- `/login`
  - 统一登录页
  - 也会承接 OAuth 授权流程中的登录动作

### 管理后台

- `/dashboard`：后台首页
- `/dashboard/users`：用户管理
- `/dashboard/organizations`：组织架构
- `/dashboard/skills`：Skill 管理
- `/dashboard/mcps`：MCP 管理
- `/dashboard/approvals`：申请审批
- `/dashboard/grants`：授权管理

## 常用命令

```bash
npm run dev
npm run build
npm run start
npm run lint

npm run db:generate
npm run db:push
npm run db:migrate
npm run db:ensure-schema
npm run db:seed

npm run import:resources
```

各命令作用：

- `npm run dev`：启动本地开发环境
- `npm run build`：构建生产包
- `npm run start`：启动生产模式
- `npm run lint`：检查代码规范
- `npm run db:generate`：重新生成 Prisma Client
- `npm run db:push`：将 schema 推送到数据库
- `npm run db:migrate`：创建并执行开发迁移
- `npm run db:ensure-schema`：对已部署数据库执行幂等修复，补齐当前代码所需字段
- `npm run db:seed`：写入默认组织、普通用户默认组织和超级管理员
- `npm run import:resources`：批量导入 Skill / MCP 资源

## 资源导入

项目提供了一个通用导入脚本：[`scripts/import-resources.ts`](./scripts/import-resources.ts)

支持两种模式：

- `dry-run`：仅预演，不写入数据库
- `upsert`：按唯一范围更新或创建资源

示例：

```bash
npm run import:resources -- --type skill --file ./data/skills.json --mode dry-run
```

```bash
npm run import:resources -- --type mcp --file ./data/mcps.json --mode upsert --report ./tmp/mcp-import-report.json
```

导入清单支持的核心字段包括：

- `identifier`
- `name`
- `description`
- `visibility`
- `organizationId`
- `ownerId`
- `category`
- `transportType`
- `command`
- `defaultArgs`
- `requiredEnvKeys`
- `optionalEnvKeys`
- `isActive`

更详细的映射说明见：[`docs/import-mapping.md`](./docs/import-mapping.md)

## API 与鉴权说明

### 1. 后台登录鉴权

后台和客户端页面使用 `NextAuth` 的账号密码登录。

默认登录页：

- `/login`

当前登录规则：

- 普通用户：手机号 + 密码
- 企业用户：邮箱 + 密码
- 历史普通用户如果还没有绑定手机号，可临时用邮箱登录并在个人概览中完成补绑

### 2. OAuth 鉴权

项目已经实现了 OAuth 相关核心接口：

- `GET /api/v1/auth/authorize`
- `POST /api/v1/auth/authorize/consent`
- `POST /api/v1/auth/token`
- `POST /api/v1/auth/revoke`

典型流程：

1. 外部系统跳转到 `/api/v1/auth/authorize`
2. 用户登录并确认授权
3. 系统生成授权码
4. 外部系统调用 `/api/v1/auth/token` 换取 `access_token`

#### 第三方平台接入步骤

如果你要让 Web、H5、桌面端或其他 SaaS 平台“登录本系统后获取当前用户可用模型”，推荐使用标准 OAuth 授权码模式：

1. 超级管理员进入 `/dashboard/oauth-clients`
2. 创建一个第三方 OAuth 客户端
3. 配置平台名称、`client_id`、允许回调地址、启用状态
4. 保存系统返回的 `client_secret`
5. 第三方前端跳转到 `/api/v1/auth/authorize`
6. 第三方服务端用授权码调用 `/api/v1/auth/token`
7. 拿到 `access_token` 后调用 `/api/external/v1/me/models`

推荐授权地址示例：

```text
GET /api/v1/auth/authorize
  ?client_id=acme-chat-web
  &redirect_uri=https://app.example.com/oauth/callback
  &state=RANDOM_STATE
  &scope=models:read quota:read
```

换取 token 示例：

```http
POST /api/v1/auth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "client_id": "acme-chat-web",
  "client_secret": "YOUR_CLIENT_SECRET",
  "redirect_uri": "https://app.example.com/oauth/callback"
}
```

读取当前登录用户模型：

```http
GET /api/external/v1/me/models
Authorization: Bearer ACCESS_TOKEN
```

如果 token 过期，可继续调用：

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "REFRESH_TOKEN"
}
```

### 3. 运行时调用

项目提供了资源运行时调用入口：

- `POST /api/runtime/skills/:id/invoke`
- `POST /api/runtime/mcps/:id/invoke`

当前状态说明很重要：

- 这些接口已经会校验令牌、scope 和资源授权关系
- `Skill invoke` 需要 `skills:invoke`
- `MCP invoke` 需要 `mcps:invoke`
- 目前还没有真正把请求转发到实际 Skill/MCP 执行器
- 也就是说，当前更像“访问校验层”，不是完整执行层

如果你准备把项目接到真实执行环境，这两个接口是最适合继续扩展的地方。

## 项目目录结构

```text
skills-mcp-manage/
├─ prisma/                    # 数据模型、迁移、种子数据
├─ scripts/                   # 辅助脚本，例如资源导入
├─ src/
│  ├─ app/                    # 页面与 API 路由
│  │  ├─ (auth)/              # 登录相关页面
│  │  ├─ (client)/            # 客户端入口
│  │  ├─ (dashboard)/         # 后台工作台
│  │  └─ api/                 # API 路由
│  ├─ components/             # UI 组件和业务组件
│  ├─ lib/                    # 认证、数据库、权限、OAuth 等核心逻辑
│  ├─ middleware/             # API 鉴权与后台权限中间层
│  └─ types/                  # 类型定义
├─ docs/                      # 设计文档、计划文档、补充说明
├─ package.json
└─ README.md
```

## 关键文件建议先看这些

- [`package.json`](./package.json)：脚本入口和依赖
- [`prisma/schema.prisma`](./prisma/schema.prisma)：完整数据模型
- [`prisma/seed.ts`](./prisma/seed.ts)：默认组织和管理员初始化
- [`src/lib/auth.ts`](./src/lib/auth.ts)：登录认证逻辑
- [`src/app/(client)/client/page.tsx`](./src/app/(client)/client/page.tsx)：客户端主入口
- [`src/app/(dashboard)/dashboard/page.tsx`](./src/app/(dashboard)/dashboard/page.tsx)：后台首页
- [`src/middleware/api-auth.ts`](./src/middleware/api-auth.ts)：API 鉴权入口

## 当前实现特点

这个项目现在已经比较完整地覆盖了“资源目录 + 申请审批 + 授权访问”这一层，但也有两个需要新同学提前知道的点：

1. 运行时 `invoke` 接口目前重点是权限校验，还没有真正接入实际执行器
2. 仓库中的部分设计文档仍保留了早期方案描述，代码实现应以当前 `Prisma schema` 和 `src/app/api` 为准

## 常见问题

### 启动后为什么首页不是后台？

因为根路径 `/` 会重定向到 `/client`，这是当前产品定义的统一入口。

### 为什么看得到资源，但不能直接使用？

通常是因为该资源是 `department` 级别，需要先申请并通过授权。

### 为什么 `invoke` 接口返回了资源信息，但没有真正执行？

因为当前实现只完成了“访问校验”和“返回资源元数据”，真实转发逻辑还没有接上。

### 我应该先看 UI 还是先看 API？

如果你是第一次接手，建议先看 `/client` 和 `/dashboard`，再看 `src/lib` 和 `src/app/api`，理解会快很多。

## 后续建议

如果你准备继续开发这个项目，推荐优先做下面几件事：

- 给 README 再补一份真实的截图或 GIF
- 补充 `.env.example`
- 增加测试数据和普通用户/部门管理员种子账号
- 为运行时 `invoke` 接口接入真实执行器
- 补充 API 示例请求与响应样例
