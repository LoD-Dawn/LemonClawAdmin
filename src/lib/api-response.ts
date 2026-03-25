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
