import { describe, it, expect } from 'vitest'
import { buildSkillPackageObjectKey, buildSkillPackageUrl, getLocalFilePath } from './local-storage'

describe('local-storage', () => {
  describe('buildSkillPackageObjectKey', () => {
    it('should build object key for company scope', () => {
      const key = buildSkillPackageObjectKey({
        identifier: 'my-skill',
        version: '1.0.0',
        fileName: 'my-skill.zip',
        visibility: 'company',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        ownerId: 'user-123',
      })
      expect(key).toMatch(/^skills\/company\/[^/]+\/my-skill\/1\.0\.0\/.*\.zip$/)
    })

    it('should sanitize identifier', () => {
      const key = buildSkillPackageObjectKey({
        identifier: 'My Skill!@#$',
        version: null,
        fileName: 'test.zip',
        visibility: 'personal',
        organizationId: null,
        ownerId: 'user-123',
      })
      expect(key).toContain('my-skill')
      expect(key).not.toContain('!')
    })
  })

  describe('buildSkillPackageUrl', () => {
    it('should build relative URL', () => {
      const url = buildSkillPackageUrl('skills/company/org/skill/1.0.0/file.zip')
      expect(url).toBe('/api/v1/skills/files/skills/company/org/skill/1.0.0/file.zip')
    })
  })

  describe('getLocalFilePath', () => {
    it('should prevent path traversal', () => {
      expect(() => getLocalFilePath('../../../etc/passwd')).toThrow('Invalid file path')
    })
  })
})
