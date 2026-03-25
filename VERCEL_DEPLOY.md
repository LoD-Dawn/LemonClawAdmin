# Vercel 部署指南

## 数据库配置

**问题**: Vercel Serverless 环境无持久化文件系统，本地 SQLite 无法使用。

**解决方案**: 使用 [Turso](https://turso.tech) (libSQL) - 云端 SQLite，兼容 Prisma SQLite provider。

## 快速部署步骤

### 1. 创建 Turso 数据库

```bash
# 安装 Turso CLI
# macOS
brew install tursodatabase/tap/turso
# Windows (使用 scoop)
scoop install turso

# 登录 Turso (需要 GitHub 账号)
turso auth login

# 创建数据库
turso db create lemonclaw-admin

# 获取数据库 URL
turso db show lemonclaw-admin --url
# 输出: libsql://lemonclaw-admin-xxx.turso.io

# 获取认证 Token
turso db tokens create lemonclaw-admin
```

### 2. 在 Vercel 配置环境变量

在 Vercel Dashboard → Settings → Environment Variables 添加:

| Key | Value | 说明 |
|-----|-------|------|
| `DATABASE_URL` | `libsql://lemonclaw-admin-xxx.turso.io?authToken=xxx` | Turso 数据库连接 |
| `AUTH_SECRET` | `openssl rand -base64 32` | NextAuth 加密密钥 |
| `AUTH_TRUST_HOST` | `true` | 信任主机 |
| `AUTH_URL` | `https://your-project.vercel.app` | 生产环境 URL |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` | NextAuth URL |
| `ADMIN_EMAIL` | `admin@example.com` | 管理员邮箱 |
| `ADMIN_PASSWORD` | `your-secure-password` | 管理员密码 |
| `JWT_SECRET` | `openssl rand -base64 32` | JWT 密钥 |
| `MODEL_API_KEY_ENCRYPTION_SECRET` | `32位随机字符串` | API Key 加密密钥 |

### 3. 生成 Turso 环境变量

本地测试时，需要设置本地 DATABASE_URL:

```bash
# .env.local
DATABASE_URL="libsql://lemonclaw-admin-xxx.turso.io?authToken=xxx"
```

### 4. 本地验证连接

```bash
# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 推送数据库 schema
npx prisma db push

# 启动开发服务器
npm run dev
```

### 5. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

## Prisma Schema (无需修改)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

libSQL 协议与 SQLite 兼容，Prisma SQLite provider 可直接连接 Turso。

## 可选: 腾讯云 COS 配置

如果需要上传 Skill 包到腾讯云 COS:

| Key | Value |
|-----|-------|
| `TENCENT_COS_SECRET_ID` | 你的 Secret ID |
| `TENCENT_COS_SECRET_KEY` | 你的 Secret Key |
| `TENCENT_COS_BUCKET` | COS Bucket 名称 |
| `TENCENT_COS_REGION` | 区域，如 `ap-guangzhou` |

## 故障排除

### 连接超时
- 检查 `DATABASE_URL` 是否正确
- 确认 Turso 认证 Token 未过期
- 在 Turso Dashboard 查看数据库状态

### 构建失败
- 确保 `prisma generate && next build` 构建命令正确
- 检查 `node_modules` 是否完整

### 权限错误
- 确认 `AUTH_TRUST_HOST=true`
- 生产环境务必设置正确的 `AUTH_URL`
