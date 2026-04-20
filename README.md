# LemonClaw Admin - 统一 Skill / MCP 资源管理平台

一个基于 `Next.js 15 + Prisma + SQLite + NextAuth v5` 构建的企业级资源管理与授权中台。LemonClaw 旨在为 AI 时代的 Skill 与 MCP 资源提供中心化的目录管理、精细化的权限审批流水线以及标准化的 OAuth 2.0 授权能力。

![LemonClaw Dashboard Preview](https://via.placeholder.com/1200x630/1a1c22/ffffff?text=LemonClaw+Enterprise+Resource+Nexus)

## 🎯 核心目标

系统不仅是资源的配置表，更是企业内部 AI 能力的“流通枢纽”：

- **资源中心化**：统筹维护 Skill / MCP 资源条目，屏蔽底层差异。
- **权限闭环**：支持申请、审批、授权、撤销的完整工作流。
- **OAuth 2.0 提供商**：为外部系统（如 IDE 插件、Web 助手）发放安全的访问令牌。
- **多维度视图**：适配超级管理员（全局管控）与普通用户（资源消费）的不同需求。
- **极致简约设计**：基于 Zinc (Slate) 调色盘的高对比度、数据密集型界面，侧重于专业性与生产力。

## ✨ 核心特性

- 🛡️ **双重认证体系**：支持个人用户（手机短信+验证码）与企业用户（邮箱+密码）并行登录。
- 📊 **配额系统 (Credits)**：内置积分余额管理，精准追踪模型权限与资源调用的消耗进度。
- 📂 **组织架构管理**：支持无限层级的公司-部门-团队树形结构，适配复杂的可见性策略。
- 🔗 **OAuth 2.0 授权**：完整实现授权码模式，支持标准 Scope 验证（`skills:invoke`, `mcps:invoke` 等）。
- 🎨 **工业级美学**：采用现代 Zinc 风格设计，极致压缩视觉噪音，强调信息密度与操作效率。

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router), React 19
- **语言**: TypeScript
- **数据库**: Prisma + SQLite (开发) / libSQL (生产)
- **认证**: NextAuth v5 Beta (JWT Strategy)
- **样式**: Tailwind CSS, Radix UI (shadcn/ui 风格设计系统)
- **安全**: 敏感 API Key 强加密存储, 全量手机号 E.164 规范化

## 🚀 快速开始

### 1. 环境准备

```bash
git clone https://github.com/your-repo/lemon-claw-admin.git
cd lemon-claw-admin
npm install
```

### 2. 环境变量配置

在项目根目录创建 `.env` 文件（参考 `.env.local.example`）：

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="REPLACE_ME" # 生成随机字符串
JWT_SECRET="REPLACE_ME"      # OAuth Token 签名密钥
ADMIN_EMAIL="admin@local.com"
ADMIN_PHONE="+8613800000000"
ADMIN_PASSWORD="admin123"
MODEL_API_KEY_ENCRYPTION_SECRET="REPLACE_ME"
PHONE_VERIFICATION_SECRET="REPLACE_ME"
SMS_DELIVERY_MODE="mock"     # 本地测试选 'mock'，验证码将打印在控制台日志中
```

### 3. 初始化数据库

```bash
npm run db:ensure-schema # 确保 Schema 幂等对齐
npm run db:generate      # 生成 Prisma Client
npm run db:migrate       # 执行本地迁移
npm run db:seed          # 写入种子数据（组织架构与初始管理员）
```

### 4. 启动开发模式

```bash
npm run dev
```

访问地址：
- 🔍 **资源中心 (Client)**: [http://localhost:3000/client](http://localhost:3000/client)
- ⚙️ **管理后台 (Dashboard)**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- 👤 **个人中心 (Profile)**: [http://localhost:3000/profile](http://localhost:3000/profile)

## 🔐 常用账号信息

执行 `db:seed` 后的默认数据：

| 角色 | 账号 | 初始密码 | 说明 |
| :--- | :--- | :--- | :--- |
| **超级管理员** | `admin@local.com` | `admin123` | 全局审计权限，管理所有资源、用户与审批流 |
| **个人用户示例** | `+86...` | (验证码登录) | 首次使用手机号登录将自动注册并分配初始配额 |

## 📁 目录结构说明

```text
src/
├── app/
│   ├── (auth)/        # 认证逻辑与多态登录页
│   ├── (client)/      # 用户侧工作台 (Profile, Subscription)
│   ├── (dashboard)/   # 管理侧工作台 (Users, Approvals, Skills)
│   └── api/           # OpenAPI (OAuth, Runtime API, External API)
├── components/        # 共享组件库与业务领域组件
├── lib/               # 核心服务 (OAuth Provider, Resource Grants, SMS)
└── middleware/        # 权限校验与拦截中间件
```

## 📜 维护命令手册

| 命令 | 用途 |
| :--- | :--- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产环境包 |
| `npm run db:ensure-schema` | 执行 Schema 修补（适用于已部署环境） |
| `npm run db:seed` | 初始化系统关键节点与账户 |
| `npm run import:resources` | 批量从本地 JSON 文件录入资源目录 |

---

© 2026 LemonClaw Admin Service. Powered by Advanced Agentic Coding.
