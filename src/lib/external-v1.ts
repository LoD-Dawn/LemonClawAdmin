import { NextResponse } from 'next/server'

export type ExternalV1Envelope<T> = {
  code: string
  message: string
  data: T
}

export class ExternalApiError extends Error {
  code: string
  status: number
  data: Record<string, unknown>

  constructor(code: string, message: string, status = 400, data: Record<string, unknown> = {}) {
    super(message)
    this.code = code
    this.status = status
    this.data = data
  }
}

export function externalOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ExternalV1Envelope<T>>(
    {
      code: 'OK',
      message: '',
      data,
    },
    init
  )
}

export function externalError(code: string, message: string, status: number, data: Record<string, unknown> = {}) {
  return NextResponse.json<ExternalV1Envelope<Record<string, unknown>>>(
    {
      code,
      message,
      data,
    },
    { status }
  )
}

export function externalErrorFromUnknown(error: unknown) {
  if (error instanceof ExternalApiError) {
    return externalError(error.code, error.message, error.status, error.data)
  }

  throw error
}
