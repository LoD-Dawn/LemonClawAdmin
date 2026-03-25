import { Buffer } from 'node:buffer'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireManagementAuth } from '@/middleware/admin-only'
import { resolveAdminAccessScope } from '@/lib/admin-access'
import {
  getSkillPackageMaxBytes,
  TencentCosConfigError,
  uploadSkillPackageToTencentCos,
} from '@/lib/tencent-cos'
import { recordOperationLog } from '@/lib/operation-log'

export const runtime = 'nodejs'

const identifierPattern = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$|^[a-z0-9]$/

const uploadSchema = z.object({
  identifier: z.string().regex(identifierPattern, 'Invalid identifier'),
  version: z.string().max(255).optional().nullable(),
  visibility: z.enum(['company', 'department', 'personal']),
  organizationId: z.string().uuid().nullable().optional(),
})

function normalizeOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function isZipFile(file: File) {
  const lowerName = file.name.toLowerCase()
  return lowerName.endsWith('.zip')
}

export async function POST(request: NextRequest) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult
  const accessScope = await resolveAdminAccessScope(authResult.user)

  const formData = await request.formData()
  const fileEntry = formData.get('file')

  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { error: 'Missing zip file', code: 'VALIDATION_FILE_REQUIRED' },
      { status: 400 }
    )
  }

  if (!isZipFile(fileEntry)) {
    return NextResponse.json(
      { error: 'Only .zip files are supported', code: 'VALIDATION_FILE_TYPE' },
      { status: 400 }
    )
  }

  const maxBytes = getSkillPackageMaxBytes()
  if (fileEntry.size > maxBytes) {
    return NextResponse.json(
      {
        error: `Zip file exceeds the ${Math.floor(maxBytes / 1024 / 1024)}MB limit`,
        code: 'VALIDATION_FILE_TOO_LARGE',
      },
      { status: 400 }
    )
  }

  const parsed = uploadSchema.safeParse({
    identifier: normalizeOptionalString(formData.get('identifier')) ?? '',
    version: normalizeOptionalString(formData.get('version')),
    visibility: normalizeOptionalString(formData.get('visibility')) ?? '',
    organizationId: normalizeOptionalString(formData.get('organizationId')),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid upload metadata', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { visibility, organizationId } = parsed.data

  if (authResult.user.isDepartmentAdmin && !authResult.user.isSuperAdmin) {
    if (visibility !== 'department') {
      return NextResponse.json(
        { error: 'Department admin can only upload department resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (
      !organizationId
      || accessScope.scopedOrganizationIds.length === 0
      || !accessScope.scopedOrganizationIds.includes(organizationId)
    ) {
      return NextResponse.json(
        { error: 'Department admin can only upload within their managed department scope', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  } else if (!authResult.user.isSuperAdmin) {
    if (visibility !== 'personal') {
      return NextResponse.json(
        { error: 'Personal users can only upload personal resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }
  } else {
    if (visibility === 'personal') {
      return NextResponse.json(
        { error: 'Super admin uploads must target company or department resources', code: 'FORBIDDEN_SCOPE' },
        { status: 403 }
      )
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required for company/department upload', code: 'VALIDATION_MISSING_ORG' },
        { status: 400 }
      )
    }
  }

  try {
    const arrayBuffer = await fileEntry.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = fileEntry.type || 'application/zip'
    const upload = await uploadSkillPackageToTencentCos({
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

    await recordOperationLog({
      request,
      actor: authResult,
      module: 'skills',
      action: 'skill.package_upload',
      targetType: 'skill',
      targetId: parsed.data.identifier,
      targetName: parsed.data.identifier,
      summary: `上传 Skill 包 ${parsed.data.identifier}`,
      metadata: {
        identifier: parsed.data.identifier,
        version: parsed.data.version,
        visibility,
        organizationId: organizationId ?? null,
        fileName: fileEntry.name,
        fileSize: fileEntry.size,
        objectKey: upload.objectKey,
      },
    })

    return NextResponse.json({
      data: {
        objectKey: upload.objectKey,
        url: upload.url,
        etag: upload.etag,
        location: upload.location,
        fileName: fileEntry.name,
        size: fileEntry.size,
      },
    })
  } catch (error) {
    if (error instanceof TencentCosConfigError) {
      return NextResponse.json(
        { error: error.message, code: 'COS_CONFIG_ERROR' },
        { status: 500 }
      )
    }

    console.error('Failed to upload skill package to Tencent COS', error)

    return NextResponse.json(
      { error: 'Failed to upload package to Tencent COS', code: 'COS_UPLOAD_FAILED' },
      { status: 500 }
    )
  }
}
