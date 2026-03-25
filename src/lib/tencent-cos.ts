import { randomBytes } from 'node:crypto'
import COS from 'cos-nodejs-sdk-v5'

const DEFAULT_MAX_PACKAGE_MB = 100

export class TencentCosConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TencentCosConfigError'
  }
}

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

function encodeObjectKey(objectKey: string) {
  return objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function normalizeOptionalEnv(value: string | undefined) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : null
}

function getTencentCosConfig() {
  const secretId = normalizeOptionalEnv(process.env.TENCENT_COS_SECRET_ID)
  const secretKey = normalizeOptionalEnv(process.env.TENCENT_COS_SECRET_KEY)
  const bucket = normalizeOptionalEnv(process.env.TENCENT_COS_BUCKET)
  const region = normalizeOptionalEnv(process.env.TENCENT_COS_REGION)
  const publicBaseUrl = normalizeOptionalEnv(process.env.TENCENT_COS_PUBLIC_BASE_URL)

  if (!secretId || !secretKey || !bucket || !region) {
    throw new TencentCosConfigError(
      'Tencent COS config is incomplete. Please set TENCENT_COS_SECRET_ID, TENCENT_COS_SECRET_KEY, TENCENT_COS_BUCKET, and TENCENT_COS_REGION.'
    )
  }

  return {
    secretId,
    secretKey,
    bucket,
    region,
    publicBaseUrl,
  }
}

export function getSkillPackageMaxBytes() {
  const rawValue = normalizeOptionalEnv(process.env.TENCENT_COS_SKILL_PACKAGE_MAX_MB)
  const parsed = rawValue ? Number.parseInt(rawValue, 10) : DEFAULT_MAX_PACKAGE_MB

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_PACKAGE_MB * 1024 * 1024
  }

  return parsed * 1024 * 1024
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

function createCosClient() {
  const config = getTencentCosConfig()

  return new COS({
    SecretId: config.secretId,
    SecretKey: config.secretKey,
  })
}

export function buildTencentCosObjectUrl(objectKey: string) {
  const config = getTencentCosConfig()
  const encodedKey = encodeObjectKey(objectKey)

  if (config.publicBaseUrl) {
    return `${stripTrailingSlash(config.publicBaseUrl)}/${encodedKey}`
  }

  return `https://${config.bucket}.cos.${config.region}.myqcloud.com/${encodedKey}`
}

export async function uploadSkillPackageToTencentCos(input: UploadSkillPackageInput) {
  const config = getTencentCosConfig()
  const cos = createCosClient()
  const objectKey = buildSkillPackageObjectKey(input)

  const response = await cos.putObject({
    Bucket: config.bucket,
    Region: config.region,
    Key: objectKey,
    Body: input.body,
    ContentLength: input.contentLength,
    ContentType: input.contentType,
    ContentDisposition: `attachment; filename="${input.fileName.replace(/"/g, '')}"`,
  })

  return {
    objectKey,
    url: buildTencentCosObjectUrl(objectKey),
    etag: response.ETag ?? null,
    location: response.Location ?? null,
  }
}
