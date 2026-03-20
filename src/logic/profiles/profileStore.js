import LZString from 'lz-string'

const STORAGE_PREFIX = 'kosurveyor_profile_'
const URL_PARAM = 'profile'

export function saveProfile(profile) {
  if (!profile || !profile.profile_name) {
    throw new Error('profile_name is required')
  }
  localStorage.setItem(STORAGE_PREFIX + profile.profile_name, JSON.stringify(profile))
}

export function loadProfile(name) {
  const raw = localStorage.getItem(STORAGE_PREFIX + name)
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function deleteProfile(name) {
  localStorage.removeItem(STORAGE_PREFIX + name)
}

export function listProfiles() {
  const names = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith(STORAGE_PREFIX)) {
      names.push(key.slice(STORAGE_PREFIX.length))
    }
  }
  return names
}

export function encodeShareLink(profile) {
  const json = JSON.stringify(profile)
  const compressed = LZString.compressToEncodedURIComponent(json)
  return `${window.location.origin}${window.location.pathname}?${URL_PARAM}=${compressed}`
}

export function decodeShareLink(url) {
  try {
    const urlObj = new URL(url)
    const encoded = urlObj.searchParams.get(URL_PARAM)
    if (!encoded) return null
    const json = LZString.decompressFromEncodedURIComponent(encoded)
    if (!json) return null
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function extractSharePayloadFromCurrentUrl() {
  try {
    const fullUrl = window.location.origin + window.location.pathname + window.location.search
    return decodeShareLink(fullUrl)
  } catch {
    return null
  }
}
