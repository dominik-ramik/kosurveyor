import { describe, it, expect, vi, beforeEach } from 'vitest'

// We need to mock global fetch since the API module uses it directly
let capturedUrls = []

beforeEach(() => {
  capturedUrls = []
  global.fetch = vi.fn().mockImplementation((url) => {
    capturedUrls.push(url)
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ results: [], next: null }),
      text: () => Promise.resolve('')
    })
  })
})

// Import after fetch mock is set up
const { fetchSubmissionListing, fetchSubmission, buildAuthHeader } = await import('@/api/koboApi')

describe('fetchSubmissionListing', () => {
  it('requests base fields when no extraFields given', async () => {
    await fetchSubmissionListing('https://kobo.example.com', 'user', 'pass', 'asset1')
    expect(capturedUrls).toHaveLength(1)
    const url = capturedUrls[0]
    // Decode the fields param to check contents
    const fieldsMatch = url.match(/fields=([^&]+)/)
    expect(fieldsMatch).toBeTruthy()
    const fields = JSON.parse(decodeURIComponent(fieldsMatch[1]))
    expect(fields).toEqual(['_id', '_uuid', '_submission_time', '_submitted_by', '_attachments'])
  })

  it('appends extra fields to the URL query when provided', async () => {
    await fetchSubmissionListing('https://kobo.example.com', 'user', 'pass', 'asset1', ['grpa/location', 'survey_type'])
    expect(capturedUrls).toHaveLength(1)
    const url = capturedUrls[0]
    const fieldsMatch = url.match(/fields=([^&]+)/)
    const fields = JSON.parse(decodeURIComponent(fieldsMatch[1]))
    expect(fields).toEqual(['_id', '_uuid', '_submission_time', '_submitted_by', '_attachments', 'grpa/location', 'survey_type'])
  })

  it('uses correct auth header', async () => {
    await fetchSubmissionListing('https://kobo.example.com', 'user', 'pass', 'asset1')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: buildAuthHeader('user', 'pass') }
      })
    )
  })
})

describe('fetchSubmission', () => {
  it('fetches a single submission by ID', async () => {
    const submissionData = { _id: 42, field: 'value' }
    global.fetch.mockImplementationOnce((url) => {
      capturedUrls.push(url)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(submissionData)
      })
    })

    const result = await fetchSubmission('https://kobo.example.com', 'user', 'pass', 'asset1', 42)
    expect(result).toEqual(submissionData)

    const url = capturedUrls[0]
    expect(url).toContain('/api/v2/assets/asset1/data/42/')
    expect(url).toContain('format=json')
  })

  it('throws on HTTP error', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not found')
    })

    await expect(
      fetchSubmission('https://kobo.example.com', 'user', 'pass', 'asset1', 999)
    ).rejects.toThrow('HTTP 404: Not found')
  })
})
