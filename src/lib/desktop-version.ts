import 'server-only'
import { db } from '@/lib/db'

const DESKTOP_VERSION_SINGLETON_KEY = 'desktop_release'

const DEFAULT_DESKTOP_VERSION_RELEASE = {
  singletonKey: DESKTOP_VERSION_SINGLETON_KEY,
  version: '',
  releaseDate: '',
  changeLogZhTitle: '更新内容',
  changeLogZhContentJson: '[]',
  changeLogEnTitle: "What's New",
  changeLogEnContentJson: '[]',
  macIntelUrl: '',
  macArmUrl: '',
  windowsX64Url: '',
}

type DesktopVersionReleaseRecord = {
  id: string
  singletonKey: string
  version: string
  releaseDate: string
  changeLogZhTitle: string
  changeLogZhContentJson: string
  changeLogEnTitle: string
  changeLogEnContentJson: string
  macIntelUrl: string
  macArmUrl: string
  windowsX64Url: string
  createdAt: Date
  updatedAt: Date
}

export interface DesktopVersionChangeLogSection {
  title: string
  content: string[]
}

export interface DesktopVersionPayload {
  version: string
  date: string
  changeLog: {
    ch: DesktopVersionChangeLogSection
    en: DesktopVersionChangeLogSection
  }
  macIntel: {
    url: string
  }
  macArm: {
    url: string
  }
  windowsX64: {
    url: string
  }
}

export interface DesktopVersionAdminConfig extends DesktopVersionPayload {
  id: string
  createdAt: Date
  updatedAt: Date
}

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
  } catch {
    return []
  }
}

function normalizeContent(content: string[]) {
  return Array.from(new Set(content.map((entry) => entry.trim()).filter(Boolean)))
}

export function serializeDesktopVersionContent(content: string[]) {
  return JSON.stringify(normalizeContent(content))
}

export function serializeDesktopVersionRelease(
  record: DesktopVersionReleaseRecord
): DesktopVersionAdminConfig {
  return {
    id: record.id,
    version: record.version,
    date: record.releaseDate,
    changeLog: {
      ch: {
        title: record.changeLogZhTitle,
        content: parseStringArray(record.changeLogZhContentJson),
      },
      en: {
        title: record.changeLogEnTitle,
        content: parseStringArray(record.changeLogEnContentJson),
      },
    },
    macIntel: { url: record.macIntelUrl },
    macArm: { url: record.macArmUrl },
    windowsX64: { url: record.windowsX64Url },
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export function toDesktopVersionReleaseDbInput(config: DesktopVersionPayload) {
  return {
    version: config.version.trim(),
    releaseDate: config.date.trim(),
    changeLogZhTitle: config.changeLog.ch.title.trim(),
    changeLogZhContentJson: serializeDesktopVersionContent(config.changeLog.ch.content),
    changeLogEnTitle: config.changeLog.en.title.trim(),
    changeLogEnContentJson: serializeDesktopVersionContent(config.changeLog.en.content),
    macIntelUrl: config.macIntel.url.trim(),
    macArmUrl: config.macArm.url.trim(),
    windowsX64Url: config.windowsX64.url.trim(),
  }
}

export function isDesktopVersionConfigured(config: DesktopVersionPayload) {
  return Boolean(
    config.version.trim()
    && config.date.trim()
    && config.changeLog.ch.title.trim()
    && config.changeLog.en.title.trim()
    && config.changeLog.ch.content.length > 0
    && config.changeLog.en.content.length > 0
    && config.macIntel.url.trim()
    && config.macArm.url.trim()
    && config.windowsX64.url.trim()
  )
}

export function toDesktopVersionApiResponse(config: DesktopVersionPayload) {
  return {
    code: 0,
    data: {
      value: config,
    },
  }
}

export async function getDesktopVersionReleaseConfig() {
  const record = await db.desktopVersionRelease.upsert({
    where: { singletonKey: DESKTOP_VERSION_SINGLETON_KEY },
    update: {},
    create: DEFAULT_DESKTOP_VERSION_RELEASE,
  })

  return serializeDesktopVersionRelease(record)
}
