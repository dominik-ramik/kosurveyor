import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveProfile,
  loadProfile,
  deleteProfile,
  listProfiles,
  encodeShareLink,
  decodeShareLink,
  extractSharePayloadFromCurrentUrl,
} from '../src/logic/profiles/profileStore.js'

function createLocalStorageStub() {
  const store = new Map()
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index],
    get length() { return store.size },
  }
}

describe('profileStore', () => {
  let stub

  beforeEach(() => {
    stub = createLocalStorageStub()
    vi.stubGlobal('localStorage', stub)
    vi.stubGlobal('window', {
      location: {
        origin: 'https://example.com',
        pathname: '/app',
        search: '',
      },
      localStorage: stub,
    })
    // Also ensure localStorage is the stub
    globalThis.localStorage = stub
  })

  const sampleProfile = {
    profile_name: 'Test Profile',
    profile_description: 'desc',
    profile_author: 'author',
    form_id_stem: 'test_form',
    groups: [],
  }

  describe('saveProfile + loadProfile round-trip', () => {
    it('saves and loads a profile correctly', () => {
      saveProfile(sampleProfile)
      const loaded = loadProfile('Test Profile')
      expect(loaded).toEqual(sampleProfile)
    })

    it('throws when profile_name is missing', () => {
      expect(() => saveProfile({})).toThrow('profile_name is required')
      expect(() => saveProfile(null)).toThrow('profile_name is required')
    })
  })

  describe('listProfiles', () => {
    it('lists only kosurveyor keys', () => {
      stub.setItem('kosurveyor_profile_Alpha', '{}')
      stub.setItem('kosurveyor_profile_Beta', '{}')
      stub.setItem('other_key', '{}')
      const names = listProfiles()
      expect(names).toContain('Alpha')
      expect(names).toContain('Beta')
      expect(names).not.toContain('other_key')
      expect(names).toHaveLength(2)
    })
  })

  describe('deleteProfile', () => {
    it('removes only the target key', () => {
      stub.setItem('kosurveyor_profile_A', '{}')
      stub.setItem('kosurveyor_profile_B', '{}')
      deleteProfile('A')
      expect(stub.getItem('kosurveyor_profile_A')).toBeNull()
      expect(stub.getItem('kosurveyor_profile_B')).toBe('{}')
    })
  })

  describe('encodeShareLink', () => {
    it('produces a URL containing the profile param', () => {
      const url = encodeShareLink(sampleProfile)
      expect(url).toContain('?profile=')
      expect(url).toContain('https://example.com/app')
    })
  })

  describe('decodeShareLink + encodeShareLink round-trip', () => {
    it('round-trips without loss', () => {
      const url = encodeShareLink(sampleProfile)
      const decoded = decodeShareLink(url)
      expect(decoded).toEqual(sampleProfile)
    })
  })

  describe('decodeShareLink', () => {
    it('returns null for garbage input', () => {
      expect(decodeShareLink('not a url at all!!')).toBeNull()
      expect(decodeShareLink('https://example.com?profile=garbage')).toBeNull()
    })

    it('returns null when param absent', () => {
      expect(decodeShareLink('https://example.com/app')).toBeNull()
    })
  })

  describe('extractSharePayloadFromCurrentUrl', () => {
    it('returns null when param absent', () => {
      const result = extractSharePayloadFromCurrentUrl()
      expect(result).toBeNull()
    })

    it('returns profile when param present', () => {
      const url = encodeShareLink(sampleProfile)
      const urlObj = new URL(url)
      window.location.search = urlObj.search
      window.location.origin = urlObj.origin
      window.location.pathname = urlObj.pathname
      const result = extractSharePayloadFromCurrentUrl()
      expect(result).toEqual(sampleProfile)
    })
  })
})
