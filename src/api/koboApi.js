export const SUBMISSION_FETCH_CONCURRENCY = 5

export function buildAuthHeader(username, password) {
  return 'Basic ' + btoa(username + ':' + password)
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

export async function fetchAssets(koboUrl, username, password) {
  const auth = buildAuthHeader(username, password)
  let url = `${koboUrl}/api/v2/assets/?format=json&asset_type=survey`
  const results = []
  while (url) {
    const data = await fetchJson(url, { Authorization: auth })
    results.push(...data.results)
    url = data.next || null
  }
  return results
}

export async function fetchSubmissionListing(koboUrl, username, password, assetUid, extraFields = []) {
  const auth = buildAuthHeader(username, password)
  const baseFields = ['_id', '_uuid', '_submission_time', '_submitted_by', '_attachments']
  const allFields = [...baseFields, ...extraFields]
  const fieldsParam = encodeURIComponent(JSON.stringify(allFields))
  let url = `${koboUrl}/api/v2/assets/${encodeURIComponent(assetUid)}/data/?format=json&fields=${fieldsParam}`
  const results = []
  while (url) {
    const data = await fetchJson(url, { Authorization: auth })
    results.push(...data.results)
    url = data.next || null
  }
  return results
}

export async function fetchSubmission(koboUrl, username, password, assetUid, submissionId) {
  const auth = buildAuthHeader(username, password)
  const url = `${koboUrl}/api/v2/assets/${encodeURIComponent(assetUid)}/data/${encodeURIComponent(submissionId)}/?format=json`
  return fetchJson(url, { Authorization: auth })
}

export async function fetchSubmissions(koboUrl, username, password, assetUid, submissionIds, onProgress) {
  const results = []
  const errors = []
  const ordered = new Array(submissionIds.length).fill(null)

  const queue = [...submissionIds.entries()]

  async function worker() {
    while (queue.length > 0) {
      const [idx, id] = queue.shift()
      try {
        const data = await fetchSubmission(koboUrl, username, password, assetUid, id)
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