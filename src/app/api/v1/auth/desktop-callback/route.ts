import { NextRequest, NextResponse } from 'next/server'
import { buildAppUrl } from '@/lib/app-url'
import { getDesktopOAuthClientConfig, matchesAllowedRedirectUri } from '@/lib/oauth-clients'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const redirectUri = searchParams.get('redirect_uri')
  const expiresIn = searchParams.get('expires_in') || '3600'
  const state = searchParams.get('state')

  if (!accessToken || !refreshToken || !redirectUri) {
    return NextResponse.json(
      { error: 'Invalid request', code: 'VALIDATION_MISSING_PARAMS' },
      { status: 400 }
    )
  }

  const client = await getDesktopOAuthClientConfig()
  const allowedRedirectUris = client.allowedRedirectUris
  if (
    !client.isActive ||
    allowedRedirectUris.length === 0 ||
    !matchesAllowedRedirectUri(allowedRedirectUris, redirectUri)
  ) {
    return NextResponse.json(
      { error: 'Invalid redirect_uri', code: 'AUTH_INVALID_REDIRECT' },
      { status: 400 }
    )
  }

  const desktopCallbackUrl = new URL(redirectUri)
  desktopCallbackUrl.searchParams.set('access_token', accessToken)
  desktopCallbackUrl.searchParams.set('refresh_token', refreshToken)
  desktopCallbackUrl.searchParams.set('expires_in', expiresIn)
  if (state) {
    desktopCallbackUrl.searchParams.set('state', state)
  }

  const profileUrl = buildAppUrl('/profile', request)
  const desktopUrlJson = JSON.stringify(desktopCallbackUrl.toString())
  const profileUrlJson = JSON.stringify(profileUrl.toString())

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>桌面端登录中</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(180deg, #fffdf8 0%, #fff8ef 100%);
        color: #0f172a;
        font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      main {
        max-width: 32rem;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
      }
      p {
        margin: 0;
        line-height: 1.75;
        color: #475569;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>正在唤起桌面端登录</h1>
      <p>浏览器会继续返回个人概览页；如果桌面端没有自动打开，请确认本机已注册桌面协议。</p>
    </main>
    <script>
      const desktopUrl = ${desktopUrlJson};
      const profileUrl = ${profileUrlJson};

      function launchDesktopApp() {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = desktopUrl;
        document.body.appendChild(iframe);

        window.setTimeout(() => {
          window.location.replace(profileUrl);
        }, 800);
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', launchDesktopApp, { once: true });
      } else {
        launchDesktopApp();
      }
    </script>
  </body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
