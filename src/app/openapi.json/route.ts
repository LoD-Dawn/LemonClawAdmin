import { NextResponse } from 'next/server'
import { getAppOrigin } from '@/lib/app-url'
import { buildOpenApiDocument } from '@/lib/openapi'

export async function GET(request: Request) {
  const origin = getAppOrigin(request)

  return NextResponse.json(buildOpenApiDocument(origin ?? undefined))
}
