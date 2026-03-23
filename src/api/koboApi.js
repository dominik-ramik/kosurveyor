export const SUBMISSION_FETCH_CONCURRENCY = 5

/**
 * Build an Authorization header value for KoboToolbox API key auth.
 * Use this for the preferred authentication method.
 * @param {string} apiKey
 */
export function buildTokenHeader(apiKey) {
  return 'Token ' + apiKey
}

/**
 * Build an Authorization header value for HTTP Basic auth.
 * @param {string} username
 * @param {string} password
 */
export function buildBasicHeader(username, password) {
  return 'Basic ' + btoa(username + ':' + password)
}

/**
 * @deprecated Use buildBasicHeader or buildTokenHeader instead.
 * Kept for backward compatibility with any callers outside this module.
 */
export function buildAuthHeader(username, password) {
  return buildBasicHeader(username, password)
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

/**
 * @param {string} koboUrl
 * @param {string} authHeader  — pre-built Authorization header value
 */
export async function fetchAssets(koboUrl, authHeader) {
  let url = `${koboUrl}/api/v2/assets/?format=json&asset_type=survey`
  const results = []
  while (url) {
    const data = await fetchJson(url, { Authorization: authHeader })
    results.push(...data.results)
    url = data.next || null
  }
  return results
}

/**
 * @param {string} koboUrl
 * @param {string} authHeader
 * @param {string} assetUid
 * @param {string[]} extraFields
 */
export async function fetchSubmissionListing(koboUrl, authHeader, assetUid, extraFields = []) {
  const baseFields = ['_id', '_uuid', '_submission_time', '_submitted_by', '_attachments']
  const allFields = [...baseFields, ...extraFields]
  const fieldsParam = encodeURIComponent(JSON.stringify(allFields))
  let url = `${koboUrl}/api/v2/assets/${encodeURIComponent(assetUid)}/data/?format=json&fields=${fieldsParam}`
  const results = []
  while (url) {
    const data = await fetchJson(url, { Authorization: authHeader })
    results.push(...data.results)
    url = data.next || null
  }
  return results
}

/**
 * @param {string} koboUrl
 * @param {string} authHeader
 * @param {string} assetUid
 * @param {string|number} submissionId
 */
export async function fetchSubmission(koboUrl, authHeader, assetUid, submissionId) {
  const url = `${koboUrl}/api/v2/assets/${encodeURIComponent(assetUid)}/data/${encodeURIComponent(submissionId)}/?format=json`
  return fetchJson(url, { Authorization: authHeader })
}

/**
 * @param {string} koboUrl
 * @param {string} authHeader
 * @param {string} assetUid
 * @param {Array} submissionIds
 * @param {Function} [onProgress]
 */
export async function fetchSubmissions(koboUrl, authHeader, assetUid, submissionIds, onProgress) {
  const results = []
  const errors = []
  const ordered = new Array(submissionIds.length).fill(null)

  const queue = [...submissionIds.entries()]

  async function worker() {
    while (queue.length > 0) {
      const [idx, id] = queue.shift()
      try {
        const data = await fetchSubmission(koboUrl, authHeader, assetUid, id)
        ordered[idx] = data
      } catch (error) {
        errors.push({ id, error })
      }
      if (onProgress) onProgress()
    }
  }

  const workers = Array.from(
    { length: Math.min(SUBMISSION_FETCH_CONCURRENCY, submissionIds.length) },
    () => worker()
  )
  await Promise.all(workers)

  for (const item of ordered) {
    if (item !== null) results.push(item)
  }

  return { results, errors }
}