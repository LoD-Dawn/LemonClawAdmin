import { db } from '@/lib/db'
import { createAccessToken, createRefreshToken, verifyRefreshToken } from '@/lib/oauth'

export async function refreshAccessTokenByRefreshToken(refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken)
  if (!payload?.userId || !payload.clientId) {
    return {
      ok: false as const,
      status: 401,
      body: { error: 'Invalid refresh_token', code: 'AUTH_INVALID_TOKEN' },
    }
  }

  const existingToken = await db.oAuthToken.findFirst({
    where: { refreshToken },
    include: {
      client: true,
    },
  })

  if (
    !existingToken ||
    existingToken.userId !== payload.userId ||
    existingToken.clientId !== payload.clientId ||
    !existingToken.client.isActive
  ) {
    return {
      ok: false as const,
      status: 401,
      body: { error: 'Invalid refresh_token', code: 'AUTH_INVALID_TOKEN' },
    }
  }

  const user = await db.user.findUnique({
    where: { id: existingToken.userId },
    select: { isActive: true },
  })

  if (!user?.isActive) {
    return {
      ok: false as const,
      status: 401,
      body: { error: 'User not found or inactive', code: 'AUTH_USER_INACTIVE' },
    }
  }

  const accessToken = await createAccessToken(existingToken.userId, existingToken.clientId, existingToken.scope)
  const newRefreshToken = await createRefreshToken(existingToken.userId, existingToken.clientId)
  const expiresAt = new Date(Date.now() + 3600 * 1000)

  await db.oAuthToken.update({
    where: { id: existingToken.id },
    data: { accessToken, refreshToken: newRefreshToken, expiresAt },
  })

  return {
    ok: true as const,
    body: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
    },
  }
}
