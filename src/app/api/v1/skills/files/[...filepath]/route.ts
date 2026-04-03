import { NextRequest, NextResponse } from 'next/server'
import { requireManagementAuth } from '@/middleware/admin-only'
import { getLocalFilePath } from '@/lib/local-storage'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filepath: string[] }> }
) {
  const authResult = await requireManagementAuth(request)
  if (authResult instanceof NextResponse) return authResult

  const { filepath: filepathArray } = await params
  const filepath = filepathArray?.join('/')
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
