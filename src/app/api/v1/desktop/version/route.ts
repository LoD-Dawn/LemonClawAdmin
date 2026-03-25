import { NextResponse } from 'next/server'
import {
  getDesktopVersionReleaseConfig,
  isDesktopVersionConfigured,
  toDesktopVersionApiResponse,
} from '@/lib/desktop-version'

export async function GET() {
  const config = await getDesktopVersionReleaseConfig()
  const payload = {
    version: config.version,
    date: config.date,
    changeLog: config.changeLog,
    macIntel: config.macIntel,
    macArm: config.macArm,
    windowsX64: config.windowsX64,
  }

  if (!isDesktopVersionConfigured(payload)) {
    return NextResponse.json(
      { error: 'Desktop version is not configured', code: 'DESKTOP_VERSION_NOT_CONFIGURED' },
      { status: 404 }
    )
  }

  return NextResponse.json(toDesktopVersionApiResponse(payload))
}
