# Skill/MCP 管理系统实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建完整的 Skill/MCP 管理系统，实现三级权限管控（公司/部门/个人），支持 OAuth 2.0 API 认证

**Architecture:** Next.js 15 全栈应用，Prisma ORM 连接 PostgreSQL，管理后台用 NextAuth.js，外部 API 用 OAuth 2.0 Authorization Code 模式

**Tech Stack:** Next.js 15, TypeScript, Prisma, PostgreSQL, NextAuth.js, shadcn/ui, Tailwind CSS, bcrypt, jose (JWT)

---

## Chunk 1: 项目脚手架

### 1.1 初始化 Next.js 项目

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.env.local.example`
- Create: `.env`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "skills-mcp-manage",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.0.0",
    "next-auth": "^5.0.0-beta.25",
    "@auth/prisma-adapter": "^2.0.0",
    "bcryptjs": "^2.4.3",
    "jose": "^5.9.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0",
    "class-variance-authority": "^0.11.0",
    "lucide-react": "^0.460.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/bcryptjs": "^2.4.6",
    "prisma": "^6.0.0",
    "tsx": "^4.19.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] }
  }
}
module.exports = nextConfig
```

- [ ] **Step 4: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' }
      },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' }
    }
  },
  plugins: []
}
export default config
```

- [ ] **Step 5: Create postcss.config.js**

```javascript
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
```

- [ ] **Step 6: Create .env.local.example**

```
DATABASE_URL="postgresql://user:password@localhost:5432/skills_mcp_manage?schema=public"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@local.com"
ADMIN_PASSWORD="admin123"
JWT_SECRET="your-jwt-secret-here"
```

- [ ] **Step 7: Create .env (development)**

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/skills_mcp_manage?schema=public"
NEXTAUTH_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAIL="admin@local.com"
ADMIN_PASSWORD="admin123"
JWT_SECRET="dev-jwt-secret"
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`

Expected: packages installed successfully

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json next.config.js tailwind.config.ts postcss.config.js .env.local.example .env
git commit -m "chore: scaffold Next.js 15 project with TypeScript and Tailwind"
```

---

### 1.2 初始化 Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum OrganizationType {
  company
  department
  team
}

enum Visibility {
  company
  department
  personal
}

enum SourceType {
  url
  local_path
}

model Organization {
  id        String   @id @default(dbgenerated("gen_random_uuid()"), type: "uuid")
  name      String   @db.VarChar(255)
  type      OrganizationType
  parentId  String?  @map("parent_id") @db.Uuid
  path      String   @db.VarChar(1000)
  level     Int
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  parent     Organization?  @relation("OrganizationHierarchy", fields: [parentId], references: [id])
  children   Organization[]  @relation("OrganizationHierarchy")
  users      User[]

  @@index([path])
  @@map("organizations")
}

model User {
  id             String   @id @default(dbgenerated("gen_random_uuid()"), type: "uuid")
  email          String   @unique @db.VarChar(255)
  passwordHash   String   @map("password_hash") @db.VarChar(255)
  name           String   @db.VarChar(255)
  organizationId String?  @map("organization_id") @db.Uuid
  isSuperAdmin   Boolean  @default(false) @map("is_super_admin")
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  organization   Organization?  @relation(fields: [organizationId], references: [id])
  skills         Skill[]
  mcps           Mcp[]
  oauthTokens    OAuthToken[]

  @@map("users")
}

model Skill {
  id             String    @id @default(dbgenerated("gen_random_uuid()"), type: "uuid")
  name           String    @db.VarChar(255)
  identifier     String    @db.VarChar(255)
  description    String?   @db.Text
  visibility     Visibility
  ownerId        String?   @map("owner_id") @db.Uuid
  organizationId String?   @map("organization_id") @db.Uuid
  sourceType     SourceType @map("source_type")
  sourceValue    String    @map("source_value") @db.VarChar(1000)
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  owner         User?          @relation(fields: [ownerId], references: [id])
  organization  Organization?   @relation(fields: [organizationId], references: [id])

  @@unique([identifier, organizationId, ownerId])
  @@index([visibility])
  @@index([organizationId])
  @@map("skills")
}

model Mcp {
  id             String    @id @default(dbgenerated("gen_random_uuid()"), type: "uuid")
  name           String    @db.VarChar(255)
  identifier     String    @db.VarChar(255)
  description    String?   @db.Text
  visibility     Visibility
  ownerId        String?   @map("owner_id") @db.Uuid
  organizationId String?   @map("organization_id") @db.Uuid
  sourceType     SourceType @map("source_type")
  sourceValue    String    @map("source_value") @db.VarChar(1000)
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)

  owner         User?          @relation(fields: [ownerId], references: [id])
  organization  Organization?   @relation(fields: [organizationId], references: [id])

  @@unique([identifier, organizationId, ownerId])
  @@index([visibility])
  @@index([organizationId])
  @@map("mcps")
}

model OAuthClient {
  id                   String   @id @default(dbgenerated("gen_random_uuid()"), type: "uuid")
  clientId             String   @unique @map("client_id") @db.VarChar(255)
  clientSecretHash     String   @map("client_secret_hash") @db.VarChar(255)
  apiKeyHash           String?  @map("api_key_hash") @db.VarChar(255)
  name                 String   @db.VarChar(255)
  allowedRedirectUris  String[] @map("allowed_redirect_uris")
  isActive             Boolean  @default(true) @map("is_active")
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  authorizationCodes OAuthAuthorizationCode[]
  tokens              OAuthToken[]

  @@map("oauth_clients")
}

model OAuthAuthorizationCode {
  id          String   @id @default(dbgenerated("gen_random_uuid()"), type: "uuid")
  code        String   @unique @db.VarChar(64)
  clientId    String   @map("client_id") @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  redirectUri String   @map("redirect_uri") @db.VarChar(500)
  scope       String   @db.VarChar(255)
  expiresAt   DateTime @map("expires_at") @db.Timestamptz(6)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  client OAuthClient @relation(fields: [clientId], references: [id])
  user   User        @relation(fields: [userId], references: [id])

  @@index([expiresAt])
  @@map("oauth_authorization_codes")
}

model OAuthToken {
  id           String   @id @default(dbgenerated("gen_random_uuid()"), type: "uuid")
  clientId     String   @map("client_id") @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  scope        String   @db.VarChar(255)
  accessToken  String   @map("access_token") @db.Text
  refreshToken String?  @map("refresh_token") @db.Text
  expiresAt    DateTime @map("expires_at") @db.Timestamptz(6)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  client OAuthClient @relation(fields: [clientId], references: [id])
  user   User        @relation(fields: [userId], references: [id])

  @@index([accessToken])
  @@index([refreshToken])
  @@index([expiresAt])
  @@map("oauth_tokens")
}
```

- [ ] **Step 2: Create src/lib/db.ts**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 3: Create prisma/seed.ts**

```typescript
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create root organization
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: '总公司',
      type: 'company',
      path: '/root-company',
      level: 0,
    },
  })

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@local.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Administrator',
      organizationId: org.id,
      isSuperAdmin: true,
      isActive: true,
    },
  })

  console.log('Seed data created')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 4: Create .env for prisma**

Run: `cp .env .env.prisma`

- [ ] **Step 5: Generate Prisma Client**

Run: `npx prisma generate`

Expected: Prisma Client generated successfully

- [ ] **Step 6: Push schema to database**

Run: `npx prisma db push`

Expected: Schema pushed to database

- [ ] **Step 7: Run seed**

Run: `npm run db:seed`

Expected: Seed data created

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts src/lib/db.ts
git commit -m "feat: add Prisma schema for all entities"
```

---

### 1.3 初始化 shadcn/ui 和基础组件

**Files:**
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/lib/utils.ts`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/toaster.tsx`
- Create: `src/hooks/use-toast.ts`
- Create: `src/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Initialize shadcn/ui**

Run: `npx shadcn@latest init -d`

Expected: shadcn/ui initialized with defaults

- [ ] **Step 2: Add shadcn/ui components**

Run: `npx shadcn@latest add button input label card badge dialog select table tabs toast dropdown-menu -y`

Expected: Components added to src/components/ui

- [ ] **Step 3: Create src/lib/utils.ts** (shadcn creates this, verify exists)

- [ ] **Step 4: Create src/app/globals.css** with CSS variables

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/ui/ src/hooks/use-toast.ts
git commit -m "chore: initialize shadcn/ui components"
```

---

## Chunk 2: 认证系统

### 2.1 NextAuth.js 配置

**Files:**
- Create: `src/lib/auth.ts`
- Modify: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/components/auth/login-form.tsx`

- [ ] **Step 1: Create src/lib/auth.ts**

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.isActive) {
          return null
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!passwordMatch) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
          organizationId: user.organizationId,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isSuperAdmin = user.isSuperAdmin
        token.organizationId = user.organizationId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.isSuperAdmin = token.isSuperAdmin as boolean
        session.user.organizationId = token.organizationId as string | null
      }
      return session
    }
  },
  pages: {
    signIn: '/login'
  },
  session: {
    strategy: 'jwt'
  }
})
```

- [ ] **Step 2: Create API route src/app/api/auth/[...nextauth]/route.ts**

```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 3: Create login page**

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/components/auth/login-form.tsx`

```typescript
// src/app/(auth)/login/page.tsx
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  )
}
```

```typescript
// src/components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false
    })

    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Skill/MCP 管理后台</CardTitle>
        <CardDescription>登录以继续</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" name="email" type="email" required defaultValue="admin@local.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" name="password" type="password" required defaultValue="admin123" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">登录</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Create root layout**

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Skill/MCP 管理后台',
  description: '集中管理 Skill 和 MCP 配置',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
        <input type="hidden" id="__next_auth_error" />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/[...nextauth]/route.ts src/app/(auth)/login/
git commit -m "feat: add NextAuth.js configuration with credentials provider"
```

---

### 2.2 OAuth 2.0 实现

**Files:**
- Create: `src/lib/oauth.ts`
- Create: `src/app/api/v1/auth/authorize/route.ts`
- Create: `src/app/api/v1/auth/token/route.ts`
- Create: `src/app/api/v1/auth/refresh/route.ts`
- Create: `src/app/api/v1/auth/revoke/route.ts`
- Create: `src/lib/oauth/authorize-page.tsx` (rendered during OAuth flow)

- [ ] **Step 1: Create src/lib/oauth.ts**

```typescript
import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'secret')
const ACCESS_TOKEN_EXPIRY = 3600 // 1 hour
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 3600 // 7 days
const AUTH_CODE_EXPIRY = 10 * 60 // 10 minutes

export interface TokenPayload {
  sub: string
  userId: string
  clientId: string
  scope: string
  type: 'access' | 'refresh'
}

export async function createAccessToken(userId: string, clientId: string, scope: string): Promise<string> {
  return new SignJWT({ userId, clientId, scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setSubject(userId)
    .sign(JWT_SECRET)
}

export async function createRefreshToken(userId: string, clientId: string): Promise<string> {
  return new SignJWT({ userId, clientId, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setSubject(userId)
    .sign(JWT_SECRET)
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    if (payload.type !== 'refresh') return null
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export function generateAuthCode(): string {
  return randomBytes(16).toString('hex')
}

export function generateApiKey(): string {
  return `sk_${randomBytes(24).toString('hex')}`
}

export { AUTH_CODE_EXPIRY, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY }
```

- [ ] **Step 2: Create GET /api/v1/auth/authorize**

```typescript
// src/app/api/v1/auth/authorize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const state = searchParams.get('state')
  const scope = searchParams.get('scope') || 'skills:read mcps:read'

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
      { status: 400 }
    )
  }

  const client = await db.oAuthClient.findUnique({
    where: { clientId }
  })

  if (!client || !client.isActive) {
    return NextResponse.json(
      { error: 'Invalid client', code: 'AUTH_INVALID_CLIENT' },
      { status: 401 }
    )
  }

  if (!client.allowedRedirectUris.includes(redirectUri)) {
    return NextResponse.json(
      { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  // Redirect to login page with OAuth params
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('client_id', clientId)
  loginUrl.searchParams.set('redirect_uri', redirectUri)
  loginUrl.searchParams.set('state', state || '')
  loginUrl.searchParams.set('scope', scope)
  loginUrl.searchParams.set('prompt', 'consent')

  return NextResponse.redirect(loginUrl.toString())
}
```

- [ ] **Step 3: Create POST /api/v1/auth/token**

```typescript
// src/app/api/v1/auth/token/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createAccessToken, createRefreshToken, generateAuthCode, AUTH_CODE_EXPIRY } from '@/lib/oauth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { grant_type, code, client_id, client_secret, redirect_uri } = body

  if (grant_type === 'authorization_code') {
    if (!code || !client_id || !client_secret || !redirect_uri) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
        { status: 400 }
      )
    }

    const authCode = await db.oAuthAuthorizationCode.findUnique({
      where: { code },
      include: { client: true }
    })

    if (!authCode || authCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired code', code: 'AUTH_INVALID_CODE' },
        { status: 401 }
      )
    }

    if (authCode.redirectUri !== redirect_uri) {
      return NextResponse.json(
        { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
        { status: 400 }
      )
    }

    const client = authCode.client
    const isValidSecret = await bcrypt.compare(client_secret, client.clientSecretHash)
    if (!isValidSecret) {
      return NextResponse.json(
        { error: 'Invalid client_secret', code: 'AUTH_INVALID_CLIENT' },
        { status: 401 }
      )
    }

    // Delete used auth code
    await db.oAuthAuthorizationCode.delete({ where: { id: authCode.id } })

    // Create tokens
    const accessToken = await createAccessToken(authCode.userId, client.id, authCode.scope)
    const refreshToken = await createRefreshToken(authCode.userId, client.id)

    await db.oAuthToken.create({
      data: {
        clientId: client.id,
        userId: authCode.userId,
        scope: authCode.scope,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      }
    })

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    })
  }

  if (grant_type === 'refresh_token') {
    const { refresh_token, client_id, client_secret } = body

    if (!refresh_token || !client_id || !client_secret) {
      return NextResponse.json(
        { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
        { status: 400 }
      )
    }

    const client = await db.oAuthClient.findUnique({
      where: { clientId: client_id }
    })

    if (!client || !client.isActive) {
      return NextResponse.json(
        { error: 'Invalid client', code: 'AUTH_INVALID_CLIENT' },
        { status: 401 }
      )
    }

    const isValidSecret = await bcrypt.compare(client_secret, client.clientSecretHash)
    if (!isValidSecret) {
      return NextResponse.json(
        { error: 'Invalid client_secret', code: 'AUTH_INVALID_CLIENT' },
        { status: 401 }
      )
    }

    // Find existing token
    const existingToken = await db.oAuthToken.findFirst({
      where: { refreshToken: refresh_token, clientId: client.id }
    })

    if (!existingToken) {
      return NextResponse.json(
        { error: 'Invalid refresh_token', code: 'AUTH_INVALID_TOKEN' },
        { status: 401 }
      )
    }

    // Create new tokens with original scopes preserved
    const accessToken = await createAccessToken(existingToken.userId, client.id, existingToken.scope)
    const newRefreshToken = await createRefreshToken(existingToken.userId, client.id)

    // Update token
    await db.oAuthToken.update({
      where: { id: existingToken.id },
      data: { accessToken, refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 3600 * 1000) }
    })

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    })
  }

  return NextResponse.json(
    { error: 'Unsupported grant_type', code: 'VALIDATION_UNSUPPORTED_GRANT' },
    { status: 400 }
  )
}
```

- [ ] **Step 4: Create POST /api/v1/auth/revoke**

```typescript
// src/app/api/v1/auth/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { token } = body

  if (!token) {
    return NextResponse.json(
      { error: 'Token required', code: 'VALIDATION_MISSING_PARAMS' },
      { status: 400 }
    )
  }

  await db.oAuthToken.deleteMany({
    where: {
      OR: [
        { accessToken: token },
        { refreshToken: token }
      ]
    }
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Update login form to handle OAuth consent**

```typescript
// src/components/auth/login-form.tsx (updated)
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface LoginFormProps {
  oauthParams?: {
    client_id: string
    redirect_uri: string
    state: string
    scope: string
  }
}

export function LoginForm({ oauthParams }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const oauth = oauthParams || {
    client_id: searchParams.get('client_id') || '',
    redirect_uri: searchParams.get('redirect_uri') || '',
    state: searchParams.get('state') || '',
    scope: searchParams.get('scope') || 'skills:read mcps:read'
  }

  const isOAuthFlow = !!oauth.client_id

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false
    })

    if (result?.error) {
      setError('Invalid email or password')
      setIsLoading(false)
      return
    }

    if (isOAuthFlow) {
      // Generate auth code and redirect
      try {
        const response = await fetch('/api/v1/auth/authorize/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: oauth.client_id,
            redirect_uri: oauth.redirect_uri,
            state: oauth.state,
            scope: oauth.scope
          })
        })

        if (response.ok) {
          const { code } = await response.json()
          const redirectUrl = new URL(oauth.redirect_uri)
          redirectUrl.searchParams.set('code', code)
          if (oauth.state) redirectUrl.searchParams.set('state', oauth.state)
          router.push(redirectUrl.toString())
        } else {
          setError('Authorization failed')
          setIsLoading(false)
        }
      } catch {
        setError('Authorization failed')
        setIsLoading(false)
      }
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{isOAuthFlow ? '授权请求' : 'Skill/MCP 管理后台'}</CardTitle>
        <CardDescription>
          {isOAuthFlow ? '请登录以授权应用访问您的技能' : '登录以继续'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" name="email" type="email" required defaultValue="admin@local.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input id="password" name="password" type="password" required defaultValue="admin123" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? '处理中...' : isOAuthFlow ? '授权' : '登录'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Create consent endpoint**

```typescript
// src/app/api/v1/auth/authorize/consent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { generateAuthCode, AUTH_CODE_EXPIRY } from '@/lib/oauth'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { client_id, redirect_uri, state, scope } = body

  const client = await db.oAuthClient.findUnique({
    where: { clientId: client_id }
  })

  if (!client || !client.isActive) {
    return NextResponse.json({ error: 'Invalid client' }, { status: 400 })
  }

  if (!client.allowedRedirectUris.includes(redirect_uri)) {
    return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 })
  }

  const code = generateAuthCode()

  await db.oAuthAuthorizationCode.create({
    data: {
      code,
      clientId: client.id,
      userId: session.user.id,
      redirectUri: redirect_uri,
      scope,
      expiresAt: new Date(Date.now() + AUTH_CODE_EXPIRY * 1000)
    }
  })

  return NextResponse.json({ code })
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/oauth.ts src/app/api/v1/auth/
git commit -m "feat: implement OAuth 2.0 authorization code flow

- Add authorize, token, refresh, revoke endpoints
- Add JWT-based access/refresh tokens
- Add authorization code with 10-min expiry
- Integrate OAuth flow with NextAuth login"
```

---

## Chunk 3: 核心 API 端点

### 3.1 通用中间件和类型

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/api-response.ts`
- Create: `src/middleware/api-auth.ts`
- Create: `src/middleware/admin-only.ts`

- [ ] **Step 1: Create src/types/index.ts**

```typescript
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isSuperAdmin: boolean
      organizationId: string | null
    } & DefaultSession['user']
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

export interface ApiError {
  error: string
  code: string
  details?: Record<string, unknown>
}

export const VISIBILITY_LABELS = {
  company: '公司级',
  department: '部门级',
  personal: '个人级'
} as const

export const SOURCE_TYPE_LABELS = {
  url: 'URL',
  local_path: '本地路径'
} as const
```

- [ ] **Step 2: Create src/lib/api-response.ts**

```typescript
import { NextResponse } from 'next/server'

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
) {
  return NextResponse.json({
    data,
    pagination: { page, pageSize, total }
  })
}

export function apiError(message: string, code: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, details }, { status })
}

export function apiSuccess<T>(data: T) {
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Create API auth middleware**

```typescript
// src/middleware/api-auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/oauth'
import { db } from '@/lib/db'

export async function requireApiAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'AUTH_MISSING_TOKEN' },
      { status: 401 }
    )
  }

  const token = authHeader.substring(7)
  const payload = await verifyAccessToken(token)

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid token', code: 'AUTH_INVALID_TOKEN' },
      { status: 401 }
    )
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { organization: true }
  })

  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: 'User not found or inactive', code: 'AUTH_USER_INACTIVE' },
      { status: 401 }
    )
  }

  return { user, payload }
}
```

- [ ] **Step 4: Create admin-only middleware**

```typescript
// src/middleware/admin-only.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from './api-auth'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function requireAdmin(request: NextRequest) {
  // Check API Key first
  const apiKey = request.headers.get('X-API-Key')
  if (apiKey) {
    // API keys are stored hashed, need to find client and verify
    const clients = await db.oAuthClient.findMany({
      where: { isActive: true, apiKeyHash: { not: null } }
    })
    for (const client of clients) {
      if (client.apiKeyHash && await bcrypt.compare(apiKey, client.apiKeyHash)) {
        return { isApiKey: true, client }
      }
    }
  }

  // Fall back to Bearer token
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  if (!authResult.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  return { ...authResult, isApiKey: false }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/lib/api-response.ts src/middleware/
git commit -m "feat: add API types and middleware helpers"
```

---

### 3.2 组织架构 API

**Files:**
- Create: `src/app/api/v1/organizations/route.ts`
- Create: `src/app/api/v1/organizations/[id]/route.ts`
- Create: `src/lib/organizations.ts`

- [ ] **Step 1: Create src/lib/organizations.ts**

```typescript
import { db } from '@/lib/db'

export async function buildOrganizationPath(parentId: string | null): Promise<{ path: string; level: number }> {
  if (!parentId) {
    return { path: '/root-company', level: 0 }
  }

  const parent = await db.organization.findUnique({ where: { id: parentId } })
  if (!parent) {
    throw new Error('Parent organization not found')
  }

  const slug = generateSlug(parent.name)
  const path = parent.path === '/'
    ? `/${slug}`
    : `${parent.path}/${slug}`

  return { path, level: parent.level + 1 }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

export async function getOrganizationDescendants(path: string): Promise<string[]> {
  const orgs = await db.organization.findMany({
    where: { path: { startsWith: path } },
    select: { id: true }
  })
  return orgs.map(o => o.id)
}
```

- [ ] **Step 2: Create GET/POST /api/v1/organizations**

```typescript
// src/app/api/v1/organizations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { buildOrganizationPath } from '@/lib/organizations'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['company', 'department', 'team']),
  parentId: z.string().uuid().nullable()
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { user } = authResult

  const organizations = await db.organization.findMany({
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { users: true } }
    }
  })

  // Transform to tree structure
  const rootOrgs = organizations.filter(o => !o.parentId)
  const buildTree = (orgs: typeof organizations, parentId: string | null): unknown[] => {
    return organizations
      .filter(o => o.parentId === parentId)
      .map(org => ({
        ...org,
        children: buildTree(organizations, org.id)
      }))
  }

  return NextResponse.json({ data: buildTree(organizations, null) })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (!authResult.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, type, parentId } = parsed.data

  if (parentId) {
    const parent = await db.organization.findUnique({ where: { id: parentId } })
    if (!parent) {
      return NextResponse.json(
        { error: 'Parent organization not found', code: 'NOT_FOUND_PARENT' },
        { status: 404 }
      )
    }
  }

  const { path, level } = await buildOrganizationPath(parentId)

  const organization = await db.organization.create({
    data: {
      name,
      type,
      parentId,
      path,
      level
    }
  })

  return NextResponse.json({ data: organization }, { status: 201 })
}
```

- [ ] **Step 3: Create GET/PUT/DELETE /api/v1/organizations/[id]**

```typescript
// src/app/api/v1/organizations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional()
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  const organization = await db.organization.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      _count: { select: { users: true } }
    }
  })

  if (!organization) {
    return NextResponse.json(
      { error: 'Organization not found', code: 'NOT_FOUND_ORG' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: organization })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (!authResult.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const organization = await db.organization.update({
    where: { id },
    data: parsed.data
  })

  return NextResponse.json({ data: organization })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  if (!authResult.user.isSuperAdmin) {
    return NextResponse.json(
      { error: 'Forbidden', code: 'FORBIDDEN_ADMIN_REQUIRED' },
      { status: 403 }
    )
  }

  const { id } = await params

  // Check for children
  const children = await db.organization.count({ where: { parentId: id } })
  if (children > 0) {
    return NextResponse.json(
      { error: 'Cannot delete organization with children', code: 'CONFLICT_HAS_CHILDREN' },
      { status: 409 }
    )
  }

  await db.organization.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/organizations/ src/lib/organizations.ts
git commit -m "feat: add organizations API endpoints (CRUD + tree structure)"
```

---

### 3.3 Skill API

**Files:**
- Create: `src/app/api/v1/skills/route.ts`
- Create: `src/app/api/v1/skills/[id]/route.ts`
- Create: `src/app/api/v1/users/[id]/skills/route.ts`

- [ ] **Step 1: Create src/app/api/v1/skills/route.ts**

```typescript
// src/app/api/v1/skills/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  identifier: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$/, 'Invalid identifier format'),
  description: z.string().optional(),
  visibility: z.enum(['company', 'department', 'personal']),
  ownerId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  sourceType: z.enum(['url', 'local_path']),
  sourceValue: z.string().max(1000)
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const visibility = searchParams.get('visibility')

  const where: Record<string, unknown> = { isActive: true }
  if (visibility) where.visibility = visibility

  const [skills, total] = await Promise.all([
    db.skill.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } }
      }
    }),
    db.skill.count({ where })
  ])

  return NextResponse.json({ data: skills, pagination: { page, pageSize, total } })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { visibility, ownerId, organizationId } = parsed.data

  // Validate visibility constraints
  if (visibility === 'personal' && !ownerId) {
    return NextResponse.json(
      { error: 'ownerId required for personal visibility', code: 'VALIDATION_MISSING_OWNER' },
      { status: 400 }
    )
  }

  if (visibility !== 'personal' && !organizationId) {
    return NextResponse.json(
      { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
      { status: 400 }
    )
  }

  try {
    const skill = await db.skill.create({ data: parsed.data })
    return NextResponse.json({ data: skill }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Identifier already exists in this scope', code: 'CONFLICT_IDENTIFIER_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
```

- [ ] **Step 2: Create src/app/api/v1/skills/[id]/route.ts**

```typescript
// src/app/api/v1/skills/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sourceType: z.enum(['url', 'local_path']).optional(),
  sourceValue: z.string().max(1000).optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const skill = await db.skill.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true } }
    }
  })

  if (!skill) {
    return NextResponse.json(
      { error: 'Skill not found', code: 'NOT_FOUND_SKILL' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: skill })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const skill = await db.skill.update({
    where: { id },
    data: parsed.data
  })

  return NextResponse.json({ data: skill })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  // Soft delete
  await db.skill.update({
    where: { id },
    data: { isActive: false }
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create GET /api/v1/users/[id]/skills (permission-filtered)**

```typescript
// src/app/api/v1/users/[id]/skills/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id: targetUserId } = await params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  // Get target user
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    include: { organization: true }
  })

  if (!targetUser) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  // Build visibility filter
  const visibilityConditions: unknown[] = [
    { visibility: 'company', isActive: true }
  ]

  // Add department visibility if user has organization (include all descendant orgs)
  if (targetUser.organization) {
    // Get all descendant organization IDs via path prefix matching
    const descendantOrgs = await db.organization.findMany({
      where: {
        path: { startsWith: targetUser.organization.path + '/' }
      },
      select: { id: true }
    })
    const orgIds = [targetUser.organization.id, ...descendantOrgs.map(o => o.id)]

    visibilityConditions.push({
      visibility: 'department',
      isActive: true,
      organizationId: { in: orgIds }
    })
  }

  // Add personal visibility (only own skills)
  if (authResult.user.id === targetUserId) {
    visibilityConditions.push({
      visibility: 'personal',
      isActive: true,
      ownerId: targetUserId
    })
  }

  const [skills, total] = await Promise.all([
    db.skill.findMany({
      where: {
        OR: visibilityConditions
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    db.skill.count({
      where: { OR: visibilityConditions }
    })
  ])

  return NextResponse.json({ data: skills, pagination: { page, pageSize, total } })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/v1/skills/ src/app/api/v1/users/
git commit -m "feat: add skills API with CRUD and permission-filtered access"
```

---

### 3.4 MCP API 和 Admin Users API

**Files:**
- Create: `src/app/api/v1/mcps/route.ts`
- Create: `src/app/api/v1/mcps/[id]/route.ts`
- Create: `src/app/api/v1/users/[id]/mcps/route.ts`
- Create: `src/app/api/v1/admin/users/route.ts`
- Create: `src/app/api/v1/admin/users/[id]/route.ts`

- [ ] **Step 1: Create GET/POST /api/v1/mcps**

```typescript
// src/app/api/v1/mcps/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(255),
  identifier: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$/, 'Invalid identifier format'),
  description: z.string().optional(),
  visibility: z.enum(['company', 'department', 'personal']),
  ownerId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  sourceType: z.enum(['url', 'local_path']),
  sourceValue: z.string().max(1000)
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const visibility = searchParams.get('visibility')

  const where: Record<string, unknown> = { isActive: true }
  if (visibility) where.visibility = visibility

  const [mcps, total] = await Promise.all([
    db.mcp.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } }
      }
    }),
    db.mcp.count({ where })
  ])

  return NextResponse.json({ data: mcps, pagination: { page, pageSize, total } })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { visibility, ownerId, organizationId } = parsed.data

  if (visibility === 'personal' && !ownerId) {
    return NextResponse.json(
      { error: 'ownerId required for personal visibility', code: 'VALIDATION_MISSING_OWNER' },
      { status: 400 }
    )
  }

  if (visibility !== 'personal' && !organizationId) {
    return NextResponse.json(
      { error: 'organizationId required for company/department visibility', code: 'VALIDATION_MISSING_ORG' },
      { status: 400 }
    )
  }

  try {
    const mcp = await db.mcp.create({ data: parsed.data })
    return NextResponse.json({ data: mcp }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Identifier already exists in this scope', code: 'CONFLICT_IDENTIFIER_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
```

- [ ] **Step 2: Create GET/PUT/DELETE /api/v1/mcps/[id]**

```typescript
// src/app/api/v1/mcps/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  sourceType: z.enum(['url', 'local_path']).optional(),
  sourceValue: z.string().max(1000).optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const mcp = await db.mcp.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      organization: { select: { id: true, name: true } }
    }
  })

  if (!mcp) {
    return NextResponse.json(
      { error: 'MCP not found', code: 'NOT_FOUND_MCP' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: mcp })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const mcp = await db.mcp.update({
    where: { id },
    data: parsed.data
  })

  return NextResponse.json({ data: mcp })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  await db.mcp.update({
    where: { id },
    data: { isActive: false }
  })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create GET /api/v1/users/[id]/mcps**

```typescript
// src/app/api/v1/users/[id]/mcps/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/middleware/api-auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireApiAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { id: targetUserId } = await params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    include: { organization: true }
  })

  if (!targetUser) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  const visibilityConditions: unknown[] = [
    { visibility: 'company', isActive: true }
  ]

  // Add department visibility if user has organization (include all descendant orgs)
  if (targetUser.organization) {
    // Get all descendant organization IDs via path prefix matching
    const descendantOrgs = await db.organization.findMany({
      where: {
        path: { startsWith: targetUser.organization.path + '/' }
      },
      select: { id: true }
    })
    const orgIds = [targetUser.organization.id, ...descendantOrgs.map(o => o.id)]

    visibilityConditions.push({
      visibility: 'department',
      isActive: true,
      organizationId: { in: orgIds }
    })
  }

  if (authResult.user.id === targetUserId) {
    visibilityConditions.push({
      visibility: 'personal',
      isActive: true,
      ownerId: targetUserId
    })
  }

  const [mcps, total] = await Promise.all([
    db.mcp.findMany({
      where: { OR: visibilityConditions },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    db.mcp.count({
      where: { OR: visibilityConditions }
    })
  ])

  return NextResponse.json({ data: mcps, pagination: { page, pageSize, total } })
}
```

- [ ] **Step 4: Create Admin Users routes**

```typescript
// src/app/api/v1/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  organizationId: z.string().uuid().nullable().optional(),
  isSuperAdmin: z.boolean().optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

  const [users, total] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true,
        organizationId: true, isSuperAdmin: true, isActive: true,
        organization: { select: { id: true, name: true } },
        createdAt: true
      }
    }),
    db.user.count({ where: { isActive: true } })
  ])

  return NextResponse.json({ data: users, pagination: { page, pageSize, total } })
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { password, ...userData } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    const user = await db.user.create({
      data: { ...userData, passwordHash },
      select: {
        id: true, email: true, name: true, organizationId: true,
        isSuperAdmin: true, isActive: true, createdAt: true
      }
    })
    return NextResponse.json({ data: user }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists', code: 'CONFLICT_EMAIL_EXISTS' },
        { status: 409 }
      )
    }
    throw error
  }
}
```

```typescript
// src/app/api/v1/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/middleware/admin-only'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(255).optional(),
  organizationId: z.string().uuid().nullable().optional(),
  isSuperAdmin: z.boolean().optional(),
  isActive: z.boolean().optional()
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, organizationId: true,
      isSuperAdmin: true, isActive: true, createdAt: true, updatedAt: true,
      organization: { select: { id: true, name: true } }
    }
  })

  if (!user) {
    return NextResponse.json(
      { error: 'User not found', code: 'NOT_FOUND_USER' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: user })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_ERROR' },
      { status: 400 }
    )
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (updateData.password) {
    const bcrypt = await import('bcryptjs')
    updateData.passwordHash = await bcrypt.hash(updateData.password as string, 12)
    delete updateData.password
  }

  const user = await db.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, email: true, name: true, organizationId: true,
      isSuperAdmin: true, isActive: true, createdAt: true, updatedAt: true
    }
  })

  return NextResponse.json({ data: user })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { id } = await params

  // Soft delete and cleanup
  await db.$transaction([
    db.user.update({ where: { id }, data: { isActive: false } }),
    db.oAuthToken.deleteMany({ where: { userId: id } }),
    db.skill.deleteMany({ where: { ownerId: id, visibility: 'personal' } }),
    db.mcp.deleteMany({ where: { ownerId: id, visibility: 'personal' } })
  ])

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/mcps/ src/app/api/v1/users/ src/app/api/v1/admin/
git commit -m "feat: add MCP and Admin Users API endpoints"
```

---

## Chunk 4: 管理后台 UI

### 4.1 Dashboard Layout 和导航

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/dashboard/page.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/header.tsx`

- [ ] **Step 1: Create dashboard layout with sidebar navigation**

```typescript
// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

```typescript
// src/components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Building2, Box, Cpu, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/dashboard/users', label: '用户管理', icon: Users },
  { href: '/dashboard/organizations', label: '组织架构', icon: Building2 },
  { href: '/dashboard/skills', label: 'Skills', icon: Box },
  { href: '/dashboard/mcps', label: 'MCPs', icon: Cpu },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-white dark:bg-gray-900">
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">Skill/MCP 管理</h1>
      </div>
      <nav className="p-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

```typescript
// src/components/layout/header.tsx
'use client'

import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

export function Header({ user }: { user: { name?: string | null; email?: string | null; isSuperAdmin: boolean } }) {
  return (
    <header className="h-14 border-b bg-white dark:bg-gray-900 px-6 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {user.name} ({user.email})
        {user.isSuperAdmin && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">管理员</span>}
      </div>
      <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
        <LogOut className="h-4 w-4 mr-2" />
        退出
      </Button>
    </header>
  )
}
```

- [ ] **Step 2: Create dashboard home page**

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const session = await auth()

  const [userCount, orgCount, skillCount, mcpCount] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.organization.count(),
    db.skill.count({ where: { isActive: true } }),
    db.mcp.count({ where: { isActive: true } })
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">概览</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">用户数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">组织数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MCPs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mcpCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/ src/components/layout/
git commit -m "feat: add dashboard layout with sidebar navigation"
```

---

### 4.2 Skills 管理页面

**Files:**
- Create: `src/app/(dashboard)/dashboard/skills/page.tsx`
- Create: `src/components/skills/skills-table.tsx`
- Create: `src/components/skills/skill-form-dialog.tsx`

- [ ] **Step 1: Create Skills list page**

```typescript
// src/app/(dashboard)/dashboard/skills/page.tsx
import { db } from '@/lib/db'
import { SkillsTable } from '@/components/skills/skills-table'

export default async function SkillsPage() {
  const skills = await db.skill.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { id: true, name: true } },
      organization: { select: { id: true, name: true } }
    }
  })

  const organizations = await db.organization.findMany({
    orderBy: { path: 'asc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Skills</h1>
      </div>
      <SkillsTable skills={skills} organizations={organizations} />
    </div>
  )
}
```

```typescript
// src/components/skills/skills-table.tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SkillFormDialog } from './skill-form-dialog'
import { VISIBILITY_LABELS, SOURCE_TYPE_LABELS } from '@/types'
import { Plus, ExternalLink, FileCode } from 'lucide-react'

export function SkillsTable({ skills, organizations }: { skills: any[]; organizations: any[] }) {
  const [open, setOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState<any>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingSkill(null); setOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          新建 Skill
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>标识符</TableHead>
              <TableHead>可见性</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>所属</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              skills.map(skill => (
                <TableRow key={skill.id}>
                  <TableCell className="font-medium">{skill.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{skill.identifier}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{VISIBILITY_LABELS[skill.visibility]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {skill.sourceType === 'url' ? (
                        <ExternalLink className="h-3 w-3" />
                      ) : (
                        <FileCode className="h-3 w-3" />
                      )}
                      {SOURCE_TYPE_LABELS[skill.sourceType]}
                    </div>
                  </TableCell>
                  <TableCell>
                    {skill.organization?.name || skill.owner?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingSkill(skill); setOpen(true) }}>
                      编辑
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <SkillFormDialog open={open} onOpenChange={setOpen} skill={editingSkill} organizations={organizations} />
    </div>
  )
}
```

```typescript
// src/components/skills/skill-form-dialog.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'

const formSchema = z.object({
  name: z.string().min(1),
  identifier: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$/),
  description: z.string().optional(),
  visibility: z.enum(['company', 'department', 'personal']),
  organizationId: z.string().uuid().nullable(),
  sourceType: z.enum(['url', 'local_path']),
  sourceValue: z.string().url().or(z.string().startsWith('/'))
})

export function SkillFormDialog({ open, onOpenChange, skill, organizations }: { open: boolean; onOpenChange: (open: boolean) => void; skill: any; organizations: any[] }) {
  const router = useRouter()
  const isEditing = !!skill

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: skill || {
      name: '',
      identifier: '',
      description: '',
      visibility: 'company',
      organizationId: null,
      sourceType: 'url',
      sourceValue: ''
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing ? `/api/v1/skills/${skill.id}` : '/api/v1/skills'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })

    if (res.ok) {
      toast({ title: isEditing ? 'Skill 已更新' : 'Skill 已创建' })
      onOpenChange(false)
      router.refresh()
    } else {
      const error = await res.json()
      toast({ title: '错误', description: error.error, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑 Skill' : '新建 Skill'}</DialogTitle>
          <DialogDescription>填写 Skill 配置信息</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>名称</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="identifier" render={({ field }) => (
              <FormItem><FormLabel>标识符</FormLabel><FormControl><Input {...field} placeholder="github-skill" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>描述</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="visibility" render={({ field }) => (
              <FormItem><FormLabel>可见性</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="company">公司级</SelectItem>
                    <SelectItem value="department">部门级</SelectItem>
                    <SelectItem value="personal">个人级</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="organizationId" render={({ field }) => (
              <FormItem><FormLabel>所属组织</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="选择组织" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sourceType" render={({ field }) => (
              <FormItem><FormLabel>来源类型</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="local_path">本地路径</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sourceValue" render={({ field }) => (
              <FormItem><FormLabel>{form.watch('sourceType') === 'url' ? 'URL' : '路径'}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit">{isEditing ? '保存' : '创建'}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/skills/ src/components/skills/
git commit -m "feat: add Skills management UI page"
```

---

### 4.3 Organizations 和 Users 页面

**Files:**
- Create: `src/app/(dashboard)/dashboard/organizations/page.tsx`
- Create: `src/app/(dashboard)/dashboard/users/page.tsx`
- Create: `src/components/organizations/organization-tree.tsx`
- Create: `src/components/users/users-table.tsx`

- [ ] **Step 1: Create Organizations page with tree view**

```typescript
// src/app/(dashboard)/dashboard/organizations/page.tsx
import { db } from '@/lib/db'
import { OrganizationTree } from '@/components/organizations/organization-tree'

export default async function OrganizationsPage() {
  const organizations = await db.organization.findMany({
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { users: true } } }
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">组织架构</h1>
      <OrganizationTree organizations={organizations} />
    </div>
  )
}
```

```typescript
// src/components/organizations/organization-tree.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ChevronRight, ChevronDown, Building2, Users } from 'lucide-react'

interface Organization {
  id: string
  name: string
  type: string
  parentId: string | null
  level: number
  _count: { users: number }
}

export function OrganizationTree({ organizations }: { organizations: Organization[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [parentId, setParentId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<'company' | 'department' | 'team'>('department')

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const rootOrgs = organizations.filter(o => !o.parentId)
  const getChildren = (parentId: string) => organizations.filter(o => o.parentId === parentId)

  const renderOrg = (org: Organization, depth: number = 0) => {
    const children = getChildren(org.id)
    const hasChildren = children.length > 0
    const isExpanded = expanded.has(org.id)

    return (
      <div key={org.id}>
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-muted rounded-md" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
          {hasChildren ? (
            <button onClick={() => toggleExpanded(org.id)} className="p-0.5">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 font-medium">{org.name}</span>
          <span className="text-xs text-muted-foreground capitalize">{org.type}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            {org._count.users}
          </span>
          <Button variant="ghost" size="sm" onClick={() => { setParentId(org.id); setDialogOpen(true) }}>
            添加子组织
          </Button>
        </div>
        {hasChildren && isExpanded && children.map(child => renderOrg(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>添加组织</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加组织</DialogTitle>
            </DialogHeader>
            <form action="/api/v1/organizations" method="POST" className="space-y-4">
              <input type="hidden" name="parentId" value={parentId || ''} />
              <div>
                <Label>名称</Label>
                <Input name="name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label>类型</Label>
                <select name="type" value={type} onChange={e => setType(e.target.value as any)} className="w-full border rounded-md px-3 py-2">
                  <option value="company">公司</option>
                  <option value="department">部门</option>
                  <option value="team">小组</option>
                </select>
              </div>
              <Button type="submit">创建</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-md">
        {rootOrgs.map(org => renderOrg(org))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create Users page**

```typescript
// src/app/(dashboard)/dashboard/users/page.tsx
import { db } from '@/lib/db'
import { UsersTable } from '@/components/users/users-table'

export default async function UsersPage() {
  const users = await db.user.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: { organization: { select: { id: true, name: true } } }
  })

  const organizations = await db.organization.findMany({ orderBy: { path: 'asc' } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">用户管理</h1>
      <UsersTable users={users} organizations={organizations} />
    </div>
  )
}
```

```typescript
// src/components/users/users-table.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserFormDialog } from './user-form-dialog'
import { Plus } from 'lucide-react'

export function UsersTable({ users, organizations }: { users: any[]; organizations: any[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UserFormDialog organizations={organizations} />
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>组织</TableHead>
              <TableHead>角色</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.organization?.name || '-'}</TableCell>
                <TableCell>
                  {user.isSuperAdmin ? (
                    <Badge>管理员</Badge>
                  ) : (
                    <Badge variant="outline">用户</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
```

```typescript
// src/components/users/user-form-dialog.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, toast } from '@/components/ui/use-toast'

export function UserFormDialog({ organizations }: { organizations: any[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const res = await fetch('/api/v1/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        organizationId: formData.get('organizationId') || null,
        isSuperAdmin: formData.get('isSuperAdmin') === 'true'
      })
    })

    if (res.ok) {
      toast({ title: '用户已创建' })
      setOpen(false)
      router.refresh()
    } else {
      const error = await res.json()
      toast({ title: '错误', description: error.error, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" />新建用户</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建用户</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>姓名</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>邮箱</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>密码</Label>
            <Input name="password" type="password" required minLength={8} />
          </div>
          <div>
            <Label>组织</Label>
            <select name="organizationId" className="w-full border rounded-md px-3 py-2">
              <option value="">无</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>角色</Label>
            <select name="isSuperAdmin" className="w-full border rounded-md px-3 py-2">
              <option value="false">普通用户</option>
              <option value="true">管理员</option>
            </select>
          </div>
          <Button type="submit">创建</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/organizations/ src/app/(dashboard)/dashboard/users/ src/components/organizations/ src/components/users/
git commit -m "feat: add Organizations and Users management UI pages"
```

---

## Chunk 5: 收尾

### 5.1 MCP 页面和最终测试

**Files:**
- Create: `src/app/(dashboard)/dashboard/mcps/page.tsx` (mirrors Skills page)

- [ ] **Step 1: Create MCPs page**

```typescript
// src/app/(dashboard)/dashboard/mcps/page.tsx
import { db } from '@/lib/db'
import { McpsTable } from '@/components/mcps/mcps-table'

export default async function McpsPage() {
  const mcps = await db.mcp.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { id: true, name: true } },
      organization: { select: { id: true, name: true } }
    }
  })

  const organizations = await db.organization.findMany({
    orderBy: { path: 'asc' }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCPs</h1>
      </div>
      <McpsTable mcps={mcps} organizations={organizations} />
    </div>
  )
}
```

```typescript
// src/components/mcps/mcps-table.tsx
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { McpFormDialog } from './mcp-form-dialog'
import { VISIBILITY_LABELS, SOURCE_TYPE_LABELS } from '@/types'
import { Plus, ExternalLink, FileCode } from 'lucide-react'

export function McpsTable({ mcps, organizations }: { mcps: any[]; organizations: any[] }) {
  const [open, setOpen] = useState(false)
  const [editingMcp, setEditingMcp] = useState<any>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingMcp(null); setOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          新建 MCP
        </Button>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>标识符</TableHead>
              <TableHead>可见性</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>所属</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mcps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              mcps.map(mcp => (
                <TableRow key={mcp.id}>
                  <TableCell className="font-medium">{mcp.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-1.5 py-0.5 rounded">{mcp.identifier}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{VISIBILITY_LABELS[mcp.visibility]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {mcp.sourceType === 'url' ? (
                        <ExternalLink className="h-3 w-3" />
                      ) : (
                        <FileCode className="h-3 w-3" />
                      )}
                      {SOURCE_TYPE_LABELS[mcp.sourceType]}
                    </div>
                  </TableCell>
                  <TableCell>
                    {mcp.organization?.name || mcp.owner?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingMcp(mcp); setOpen(true) }}>
                      编辑
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <McpFormDialog open={open} onOpenChange={setOpen} mcp={editingMcp} organizations={organizations} />
    </div>
  )
}
```

```typescript
// src/components/mcps/mcp-form-dialog.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from '@/hooks/use-toast'

const formSchema = z.object({
  name: z.string().min(1),
  identifier: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$/),
  description: z.string().optional(),
  visibility: z.enum(['company', 'department', 'personal']),
  organizationId: z.string().uuid().nullable(),
  sourceType: z.enum(['url', 'local_path']),
  sourceValue: z.string().url().or(z.string().startsWith('/'))
})

export function McpFormDialog({ open, onOpenChange, mcp, organizations }: { open: boolean; onOpenChange: (open: boolean) => void; mcp: any; organizations: any[] }) {
  const router = useRouter()
  const isEditing = !!mcp

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: mcp || {
      name: '',
      identifier: '',
      description: '',
      visibility: 'company',
      organizationId: null,
      sourceType: 'url',
      sourceValue: ''
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const method = isEditing ? 'PUT' : 'POST'
    const url = isEditing ? `/api/v1/mcps/${mcp.id}` : '/api/v1/mcps'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    })

    if (res.ok) {
      toast({ title: isEditing ? 'MCP 已更新' : 'MCP 已创建' })
      onOpenChange(false)
      router.refresh()
    } else {
      const error = await res.json()
      toast({ title: '错误', description: error.error, variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑 MCP' : '新建 MCP'}</DialogTitle>
          <DialogDescription>填写 MCP 配置信息</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>名称</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="identifier" render={({ field }) => (
              <FormItem><FormLabel>标识符</FormLabel><FormControl><Input {...field} placeholder="github-mcp" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>描述</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="visibility" render={({ field }) => (
              <FormItem><FormLabel>可见性</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="company">公司级</SelectItem>
                    <SelectItem value="department">部门级</SelectItem>
                    <SelectItem value="personal">个人级</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="organizationId" render={({ field }) => (
              <FormItem><FormLabel>所属组织</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl><SelectTrigger><SelectValue placeholder="选择组织" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sourceType" render={({ field }) => (
              <FormItem><FormLabel>来源类型</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="local_path">本地路径</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="sourceValue" render={({ field }) => (
              <FormItem><FormLabel>{form.watch('sourceType') === 'url' ? 'URL' : '路径'}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit">{isEditing ? '保存' : '创建'}</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/mcps/
git commit -m "feat: add MCPs management UI page"
```

---

### 5.2 添加 React Hook Form 依赖和最终构建

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add missing dependencies**

Run: `npm install react-hook-form @hookform/resolvers`

- [ ] **Step 2: Run build to verify**

Run: `npm run build`

Expected: Build completes without errors

- [ ] **Step 3: Commit all changes**

```bash
git add .
git commit -m "feat: complete Skill/MCP management system

- Next.js 15 full-stack app with TypeScript
- Prisma schema for all entities (org, user, skill, mcp, oauth)
- NextAuth.js for admin authentication
- OAuth 2.0 Authorization Code flow for external API access
- shadcn/ui for admin dashboard
- CRUD APIs for skills, mcps, organizations, users
- Three-tier permission system (company/department/personal)
- Admin UI pages for all entities"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-03-20-skill-mcp-management-system-implementation-plan.md`**
