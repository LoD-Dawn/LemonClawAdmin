'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import styles from './swagger-ui-shell.module.css'

declare global {
  interface Window {
    SwaggerUIBundle?: ((options: Record<string, unknown>) => { destroy?: () => void }) & {
      presets?: {
        apis?: unknown
      }
    }
    SwaggerUIStandalonePreset?: unknown
  }
}

export function SwaggerUiShell() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [bundleReady, setBundleReady] = useState(false)
  const [presetReady, setPresetReady] = useState(false)

  useEffect(() => {
    if (!bundleReady || !presetReady || !containerRef.current) {
      return
    }

    if (!window.SwaggerUIBundle || !window.SwaggerUIStandalonePreset) {
      return
    }

    const ui = window.SwaggerUIBundle({
      url: '/openapi.json',
      domNode: containerRef.current,
      presets: [
        window.SwaggerUIBundle.presets?.apis,
        window.SwaggerUIStandalonePreset,
      ].filter(Boolean),
      layout: 'StandaloneLayout',
      deepLinking: true,
      displayRequestDuration: true,
      defaultModelsExpandDepth: 2,
      docExpansion: 'list',
      filter: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
    })

    return () => {
      ui?.destroy?.()
    }
  }, [bundleReady, presetReady])

  return (
    <div className={styles.page}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => setBundleReady(true)}
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
        onLoad={() => setPresetReady(true)}
      />

      <section className={styles.hero}>
        <div className={styles.eyebrow}>API Docs</div>
        <div className={styles.heroGrid}>
          <div className={styles.heroCard}>
            <h1 className={styles.title}>认证与对外 API 文档</h1>
            <p className={styles.subtitle}>
              提供浏览器会话登录、短信验证码登录、refresh token 刷新，以及当前用户的模型配置、配额、Claw 会话、Skills、MCPs、
              用户信息与有效性校验接口。外部资源接口支持 Bearer Token 鉴权，也兼容已登录后台的浏览器会话直接调试。
            </p>
            <div className={styles.metaRow}>
              <div className={styles.metaPill}>OpenAPI 3.1</div>
              <div className={styles.metaPill}>Docs: <span className={styles.code}>/docs</span></div>
              <div className={styles.metaPill}>Spec: <span className={styles.code}>/openapi.json</span></div>
              <div className={styles.metaPill}>Auth: <span className={styles.code}>Authorization: Bearer &lt;token&gt;</span></div>
            </div>
          </div>
          <div className={styles.heroCard}>
            <h2 className="text-xl font-semibold text-slate-900">推荐调用顺序</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              access token 过期后先调用 <span className={styles.code}>/api/v1/auth/refresh</span> 刷新 token，
              再调用 <span className={styles.code}>/api/external/v1/me/validate</span> 校验 token，
              再调用 <span className={styles.code}>/api/external/v1/me</span>、<span className={styles.code}>/models</span>、
              <span className={styles.code}>/me/quota</span>、<span className={styles.code}>/claw/sessions/prepare</span>、
              <span className={styles.code}>/skills</span>、<span className={styles.code}>/mcps</span> 获取当前用户资源并驱动 Claw 会话流程。
            </p>
          </div>
        </div>
      </section>

      <section className={styles.docWrap}>
        <div className={styles.docCard}>
          {!bundleReady || !presetReady ? (
            <div className={styles.loading}>Swagger UI 资源加载中...</div>
          ) : null}
          <div ref={containerRef} className={styles.swaggerRoot} />
        </div>
      </section>
    </div>
  )
}
