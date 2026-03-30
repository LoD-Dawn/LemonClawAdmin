import 'server-only'

import nodemailer from 'nodemailer'

type SendMailInput = {
  to: string
  subject: string
  text: string
  html: string
}

function getMailConfig() {
  const host = process.env.QQ_SMTP_HOST?.trim() || 'smtp.qq.com'
  const port = Number.parseInt(process.env.QQ_SMTP_PORT?.trim() || '465', 10)
  const secure = (process.env.QQ_SMTP_SECURE?.trim() || 'true').toLowerCase() !== 'false'
  const user = process.env.QQ_SMTP_USER?.trim() || ''
  const pass = process.env.QQ_SMTP_PASS?.trim() || ''
  const from = process.env.QQ_SMTP_FROM?.trim() || user

  return {
    host,
    port: Number.isFinite(port) ? port : 465,
    secure,
    user,
    pass,
    from,
  }
}

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) {
    return transporter
  }

  const config = getMailConfig()
  if (!config.user || !config.pass || !config.from) {
    throw new Error('MAILER_CONFIG_MISSING')
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  return transporter
}

export function isMailerConfigured() {
  const config = getMailConfig()
  return Boolean(config.user && config.pass && config.from)
}

export async function sendMail(input: SendMailInput) {
  const config = getMailConfig()
  const client = getTransporter()

  await client.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  })
}
