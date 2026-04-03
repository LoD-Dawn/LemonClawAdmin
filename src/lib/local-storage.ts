import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
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
