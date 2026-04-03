# Skill 本地上传实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Skill 包上传从腾讯 COS 改为本地文件系统存储

**Architecture:** 修改现有上传接口为本地存储，新增带认证的文件访问接口

**Tech Stack:** Next.js App Router, Node.js fs, JWT auth

---

## 文件结构

```
src/app/api/v1/skills/
├── upload-package/
│   └── route.ts              # 修改：替换 COS 为本地存储
├── files/
│   └── [..filepath]/
│       └── route.ts          # 新增：带认证的文件访问
src/lib/
├── tencent-cos.ts            # 保留，移除上传函数调用
└── local-storage.ts         # 新增：本地文件操作封装
```

---

## Task 1: 创建本地文件操作封装

**Files:**
- Create: `src/lib/local-storage.ts`
- Test: `src/lib/local-storage.test.ts`

- [ ] **Step 1: 创建 `src/lib/local-storage.ts`**

```typescript
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { existsSync } from 'node:fs'

type SkillPackageScope = {
  visibility: 'company' | 'department' | 'personal'
  organizationId: string | null
  ownerId: string
}

type UploadSkillPackageInput = SkillPackageScope & {
  identifier: string
  version: string | null
  fileName: string
  body: Buffer
  contentLength: number
  contentType: string
}

function sanitizePathSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized.length > 0 ? normalized : 'item'
}

function buildScopePath(scope: SkillPackageScope) {
  if (scope.visibility === 'personal') {
    return `personal/${sanitizePathSegment(scope.ownerId)}`
  }
  if (scope.visibility === 'department') {
    return `department/${sanitizePathSegment(scope.organizationId ?? 'unassigned')}`
  }
  return `company/${sanitizePathSegment(scope.organizationId ?? 'shared')}`
}

export function buildSkillPackageObjectKey(input: {
  identifier: string
  version: string | null
  fileName: string
} & SkillPackageScope) {
  const identifier = sanitizePathSegment(input.identifier)
  const version = sanitizePathSegment(input.version ?? 'unversioned')
  const extension = input.fileName.toLowerCase().endsWith('.zip') ? '.zip' : ''
  const suffix = `${Date.now()}-${randomBytes(4).toString('hex')}${extension || '.zip'}`
  return `skills/${buildScopePath(input)}/${identifier}/${version}/${suffix}`
}

function getUploadDir() {
  const dir = process.env.SKILL_UPLOAD_DIR ?? './uploads/skills'
  return resolve(dir)
}

export function buildSkillPackageUrl(objectKey: string) {
  return `/api/v1/skills/files/${objectKey}`
}

export async function uploadSkillPackageToLocal(input: UploadSkillPackageInput) {
  const uploadDir = getUploadDir()
  const objectKey = buildSkillPackageObjectKey(input)
  const filePath = resolve(uploadDir, objectKey)

  // 确保目录存在
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  await writeFile(filePath, input.body)

  return {
    objectKey,
    url: buildSkillPackageUrl(objectKey),
    fileName: input.fileName,
    size: input.body.length,
  }
}

export function getLocalFilePath(relativePath: string) {
  const uploadDir = getUploadDir()
  const resolvedPath = resolve(uploadDir, relativePath)
  // 防止路径遍历攻击
  if (!resolvedPath.startsWith(uploadDir)) {
    throw new Error('Invalid file path')
  }
  return resolvedPath
}
```

- [ ] **Step 2: 创建测试文件 `src/lib/local-storage.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { buildSkillPackageObjectKey, buildSkillPackageUrl, getLocalFilePath } from './local-storage'

describe('local-storage', () => {
  describe('buildSkillPackageObjectKey', () => {
    it('should build object key for company scope', () => {
      const key = buildSkillPackageObjectKey({
        identifier: 'my-skill',
        version: '1.0.0',
        fileName: 'my-skill.zip',
        visibility: 'company',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        ownerId: 'user-123',
      })
      expect(key).toMatch(/^skills\/company\/[^/]+\/my-skill\/1-0-0\/.*\.zip$/)
    })

    it('should sanitize identifier', () => {
      const key = buildSkillPackageObjectKey({
        identifier: 'My Skill!@#$',
        version: null,
        fileName: 'test.zip',
        visibility: 'personal',
        organizationId: null,
        ownerId: 'user-123',
      })
      expect(key).toContain('my-skill')
      expect(key).not.toContain('!')
    })
  })

  describe('buildSkillPackageUrl', () => {
    it('should build relative URL', () => {
      const url = buildSkillPackageUrl('skills/company/org/skill/1.0.0/file.zip')
      expect(url).toBe('/api/v1/skills/files/skills/company/org/skill/1.0.0/file.zip')
    })
  })
})
```

- [ ] **Step 3: 运行测试验证**

Run: `cd "D:/project/OpenSourceProject/lemon-claw-admin" && npx vitest run src/lib/local-storage.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/lib/local-storage.ts src/lib/local-storage.test.ts
git commit -m "feat: 添加本地文件存储封装"
```

---

## Task 2: 修改上传接口使用本地存储

**Files:**
- Modify: `src/app/api/v1/skills/upload-package/route.ts`
- Test: `src/app/api/v1/skills/upload-package.test.ts` (可选)

- [ ] **Step 1: 修改 `route.ts` 导入和上传逻辑**

将：
```typescript
import {
  getSkillPackageMaxBytes,
  TencentCosConfigError,
  uploadSkillPackageToTencentCos,
} from '@/lib/tencent-cos'
```

改为：
```typescript
import { getSkillPackageMaxBytes, uploadSkillPackageToLocal } from '@/lib/local-storage'
```

将上传调用：
```typescript
const upload = await uploadSkillPackageToTencentCos({...})
```

改为：
```typescript
const upload = await uploadSkillPackageToLocal({
  identifier: parsed.data.identifier,
  version: parsed.data.version ?? null,
  visibility,
  organizationId: visibility === 'personal' ? null : organizationId ?? null,
  ownerId: authResult.user.id,
  fileName: fileEntry.name,
  body: buffer,
  contentLength: fileEntry.size,
  contentType,
})
```

将错误处理中的 `TencentCosConfigError` 移除，保留通用错误处理。

- [ ] **Step 2: 运行构建验证**

Run: `cd "D:/project/OpenSourceProject/lemon-claw-admin" && npx next build`
Expected: 构建成功，无错误

- [ ] **Step 3: 提交**

```bash
git add src/app/api/v1/skills/upload-package/route.ts
git commit -m "refactor: 将 Skill 包上传从 COS 改为本地存储"
```

---

## Task 3: 创建文件访问接口

**Files:**
- Create: `src/app/api/v1/skills/files/[...filepath]/route.ts`

- [ ] **Step 1: 创建 `src/app/api/v1/skills/files/[...filepath]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireManagementAuth } from '@/middleware/admin-only'
import { getLocalFilePath } from '@/lib/local-storage'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { filepath: string[] } }
) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const filepath = params.filepath?.join('/')
  if (!filepath) {
    return NextResponse.json({ error: 'Missing filepath' }, { status: 400 })
  }

  try {
    const filePath = getLocalFilePath(filepath)

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    const fileName = path.basename(filePath)
    const contentType = 'application/zip'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid file path') {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }
    console.error('Failed to serve skill file', error)
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 })
  }
}
```

- [ ] **Step 2: 运行构建验证**

Run: `cd "D:/project/OpenSourceProject/lemon-claw-admin" && npx next build`
Expected: 构建成功，无错误

- [ ] **Step 3: 提交**

```bash
git add src/app/api/v1/skills/files/\[...filepath\]/route.ts
git commit -m "feat: 添加 Skill 包文件访问接口（需认证）"
```

---

## Task 4: 清理（可选）

**Files:**
- Modify: `src/lib/tencent-cos.ts`

如果不再需要 COS 相关代码，可以选择移除 `uploadSkillPackageToTencentCos` 函数，或保留文件以备将来切换。

---

## 总结

完成上述任务后：
- Skill 包上传到本地目录 `{SKILL_UPLOAD_DIR}/skills/...`
- 返回相对路径 URL
- 前端访问时带 JWT 认证通过 `/api/v1/skills/files/...` 获取文件
