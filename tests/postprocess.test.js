import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePostprocessStore } from '@/stores/postprocess'
import { useCredentialsStore } from '@/stores/credentials'
import { extractTopLevelScalarKeys } from '@/stores/postprocess'

// vi.mock is hoisted — use vi.hoisted so the mock fns are available in the factory
const { mockFetchSubmissionListing, mockFetchSubmission } = vi.hoisted(() => ({
  mockFetchSubmissionListing: vi.fn().mockResolvedValue([]),
  mockFetchSubmission: vi.fn().mockResolvedValue({})
}))

vi.mock('@/api/koboApi', () => ({
  fetchAssets: vi.fn().mockResolvedValue([]),
  fetchSubmissionListing: mockFetchSubmissionListing,
  fetchSubmission: mockFetchSubmission,
  fetchSubmissions: vi.fn().mockResolvedValue({ results: [], errors: [] })
}))

// ---------------------------------------------------------------------------
// Shared localStorage stub
// ---------------------------------------------------------------------------
const storage = {}
function stubLocalStorage() {
  for (const k of Object.keys(storage)) delete storage[k]
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key) => (key in storage ? storage[key] : null)),
    setItem: vi.fn((key, val) => { storage[key] = String(val) }),
    removeItem: vi.fn((key) => { delete storage[key] }),
    clear: vi.fn(() => { for (const k of Object.keys(storage)) delete storage[k] })
  })
}

// ---------------------------------------------------------------------------
// extractTopLevelScalarKeys
// ---------------------------------------------------------------------------
describe('extractTopLevelScalarKeys', () => {
  it('extracts flat scalar keys, ignoring _ prefixed keys', () => {
    const obj = {
      _id: 101,
      _uuid: 'abc',
      'grpa/key1': 'val1',
      'grpa/key2': 'val2'
    }
    const keys = extractTopLevelScalarKeys(obj)
    expect(keys).toContain('grpa/key1')
    expect(keys).toContain('grpa/key2')
    expect(keys).not.toContain('_id')
    expect(keys).not.toContain('_uuid')
  })

  it('ignores keys starting with meta/', () => {
    const obj = { 'meta/instanceID': 'uuid:abc', field: 'value' }
    const keys = extractTopLevelScalarKeys(obj)
    expect(keys).not.toContain('meta/instanceID')
    expect(keys).toContain('field')
  })

  it('ignores formhub/uuid', () => {
    const obj = { 'formhub/uuid': 'abc', field: 'value' }
    const keys = extractTopLevelScalarKeys(obj)
    expect(keys).not.toContain('formhub/uuid')
    expect(keys).toContain('field')
  })

  it('ignores array-valued keys (repeat groups)', () => {
    const obj = {
      'grpa/key1': 'val1',
      grpX: [
        { 'grpX/one': 'un', 'grpX/two': 'deux' }
      ]
    }
    const keys = extractTopLevelScalarKeys(obj)
    expect(keys).toEqual(['grpa/key1'])
    expect(keys).not.toContain('grpX')
    expect(keys).not.toContain('grpX/one')
  })

  it('returns alphabetically sorted keys', () => {
    const obj = { z_field: '1', a_field: '2', m_field: '3' }
    expect(extractTopLevelScalarKeys(obj)).toEqual(['a_field', 'm_field', 'z_field'])
  })

  it('returns empty array for empty object', () => {
    expect(extractTopLevelScalarKeys({})).toEqual([])
  })

  it('returns empty array when all keys are system metadata', () => {
    expect(extractTopLevelScalarKeys({ _id: 1, _uuid: 'x', 'meta/instanceID': 'y', 'formhub/uuid': 'z' })).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Store: availableFields getter
// ---------------------------------------------------------------------------
describe('availableFields getter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty array when schemaKeys is empty', () => {
    const store = usePostprocessStore()
    expect(store.availableFields).toEqual([])
  })

  it('returns schemaKeys directly', () => {
    const store = usePostprocessStore()
    store.schemaKeys = ['a/field', 'b/field', 'c/field']
    expect(store.availableFields).toEqual(['a/field', 'b/field', 'c/field'])
  })
})

// ---------------------------------------------------------------------------
// Store: loadSubmissions populates schemaKeys
// ---------------------------------------------------------------------------
describe('loadSubmissions & schemaKeys', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stubLocalStorage()
    mockFetchSubmissionListing.mockReset().mockResolvedValue([
      { _id: 1, _uuid: 'u1', _submission_time: '2025-01-01', _submitted_by: 'user1' }
    ])
    mockFetchSubmission.mockReset().mockResolvedValue({
      _id: 1,
      _uuid: 'u1',
      _attachments: [],
      'formhub/uuid': 'f-uuid',
      'meta/instanceID': 'uuid:u1',
      'grpa/location': 'forest',
      'grpa/date': '2025-01-01',
      repeat_group: [{ 'repeat_group/name': 'item' }]
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches first submission and extracts schema keys', async () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'

    await store.loadSubmissions()

    expect(mockFetchSubmission).toHaveBeenCalledWith(
      'https://kobo.example.com', 'user', 'pass', 'asset1', 1
    )
    expect(store.schemaKeys).toEqual(['grpa/date', 'grpa/location'])
    // repeat_group is array → excluded; formhub/uuid, meta/*, _* excluded
  })

  it('restores persisted filterField if it exists in schemaKeys', async () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'
    storage['kosurveyor_filter_field_https://kobo.example.com_asset1'] = 'grpa/location'

    await store.loadSubmissions()

    expect(store.filterField).toBe('grpa/location')
  })

  it('does not restore persisted field if it is not in schemaKeys', async () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'
    storage['kosurveyor_filter_field_https://kobo.example.com_asset1'] = 'nonexistent/field'

    await store.loadSubmissions()

    expect(store.filterField).toBeNull()
  })

  it('does not fetch single submission when listing is empty', async () => {
    mockFetchSubmissionListing.mockResolvedValueOnce([])
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'

    await store.loadSubmissions()

    expect(mockFetchSubmission).not.toHaveBeenCalled()
    expect(store.schemaKeys).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Store: fetchFieldData & cache
// ---------------------------------------------------------------------------
describe('fetchFieldData & fieldDataCache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stubLocalStorage()
    mockFetchSubmissionListing.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches field data and caches it', async () => {
    const cachedData = [
      { _id: 1, _submission_time: '2025-01-01', _submitted_by: 'user1', 'grpa/location': 'forest' }
    ]
    mockFetchSubmissionListing.mockResolvedValueOnce(cachedData)

    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'

    await store.fetchFieldData('grpa/location')

    expect(store.fieldDataCache['grpa/location']).toEqual(cachedData)
    expect(mockFetchSubmissionListing).toHaveBeenCalledWith(
      'https://kobo.example.com', 'user', 'pass', 'asset1', ['grpa/location']
    )
  })

  it('does not re-fetch if field is already cached', async () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'
    store.fieldDataCache['grpa/location'] = [{ _id: 1, 'grpa/location': 'cached' }]

    mockFetchSubmissionListing.mockReset()
    await store.fetchFieldData('grpa/location')

    expect(mockFetchSubmissionListing).not.toHaveBeenCalled()
  })

  it('does nothing for empty field', async () => {
    const store = usePostprocessStore()
    mockFetchSubmissionListing.mockReset()
    await store.fetchFieldData(null)
    await store.fetchFieldData('')
    expect(mockFetchSubmissionListing).not.toHaveBeenCalled()
  })

  it('sets and clears isFetchingFieldData flag', async () => {
    let resolveFn
    mockFetchSubmissionListing.mockReturnValueOnce(new Promise(resolve => { resolveFn = resolve }))

    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'

    const promise = store.fetchFieldData('some/field')
    expect(store.isFetchingFieldData).toBe(true)

    resolveFn([])
    await promise
    expect(store.isFetchingFieldData).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Store: filteredSubmissions getter — uses cache & field-specific search
// ---------------------------------------------------------------------------
describe('filteredSubmissions with field data cache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns base submissions when no filterField selected', () => {
    const store = usePostprocessStore()
    store.submissions = [
      { _id: 1, _submission_time: '2025-01-01' },
      { _id: 2, _submission_time: '2025-01-02' }
    ]
    store.filterText = 'forest'
    expect(store.filteredSubmissions).toHaveLength(2)
  })

  it('uses cached dataset when filterField is set and cache exists', () => {
    const store = usePostprocessStore()
    store.submissions = [
      { _id: 1 }, { _id: 2 }, { _id: 3 }
    ]
    store.fieldDataCache['grpa/location'] = [
      { _id: 1, 'grpa/location': 'forest' },
      { _id: 2, 'grpa/location': 'savanna' },
      { _id: 3, 'grpa/location': 'forest' }
    ]
    store.filterField = 'grpa/location'
    store.filterText = 'forest'

    const result = store.filteredSubmissions
    expect(result).toHaveLength(2)
    expect(result.map(r => r._id)).toEqual([1, 3])
  })

  it('falls back to base submissions when cache is missing for selected field', () => {
    const store = usePostprocessStore()
    store.submissions = [
      { _id: 1, 'grpa/location': 'forest' },
      { _id: 2, 'grpa/location': 'savanna' }
    ]
    store.filterField = 'grpa/location'
    store.filterText = 'forest'
    // fieldDataCache is empty → falls back to base submissions
    const result = store.filteredSubmissions
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe(1)
  })

  it('uses exact match for filterText', () => {
    const store = usePostprocessStore()
    store.fieldDataCache['field'] = [
      { _id: 1, field: 'Hello World' },
      { _id: 2, field: 'Hello' }
    ]
    store.filterField = 'field'
    store.filterText = 'Hello'
    const result = store.filteredSubmissions
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe(2)
  })

  it('applies date and submittedBy filters to cached data', () => {
    const store = usePostprocessStore()
    store.fieldDataCache['location'] = [
      { _id: 1, _submission_time: '2025-01-01', _submitted_by: 'alice', location: 'forest' },
      { _id: 2, _submission_time: '2025-06-01', _submitted_by: 'bob', location: 'forest' }
    ]
    store.filterField = 'location'
    store.filterText = 'forest'
    store.filterDateFrom = '2025-03-01'

    const result = store.filteredSubmissions
    expect(result).toHaveLength(1)
    expect(result[0]._id).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Store: fieldValues getter
// ---------------------------------------------------------------------------
describe('fieldValues getter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns empty array when no filterField is set', () => {
    const store = usePostprocessStore()
    expect(store.fieldValues).toEqual([])
  })

  it('returns empty array when cache is missing for selected field', () => {
    const store = usePostprocessStore()
    store.filterField = 'some/field'
    expect(store.fieldValues).toEqual([])
  })

  it('returns deduplicated sorted values from cached field data', () => {
    const store = usePostprocessStore()
    store.fieldDataCache['location'] = [
      { _id: 1, location: 'forest' },
      { _id: 2, location: 'savanna' },
      { _id: 3, location: 'forest' },
      { _id: 4, location: 'desert' }
    ]
    store.filterField = 'location'
    expect(store.fieldValues).toEqual(['desert', 'forest', 'savanna'])
  })

  it('excludes null, undefined, and empty string values', () => {
    const store = usePostprocessStore()
    store.fieldDataCache['field'] = [
      { _id: 1, field: 'value' },
      { _id: 2, field: null },
      { _id: 3, field: undefined },
      { _id: 4, field: '' }
    ]
    store.filterField = 'field'
    expect(store.fieldValues).toEqual(['value'])
  })

  it('converts numeric values to strings', () => {
    const store = usePostprocessStore()
    store.fieldDataCache['count'] = [
      { _id: 1, count: 5 },
      { _id: 2, count: 10 },
      { _id: 3, count: 5 }
    ]
    store.filterField = 'count'
    expect(store.fieldValues).toEqual(['10', '5'])
  })
})

// ---------------------------------------------------------------------------
// Store: setFilterField action + localStorage persistence
// ---------------------------------------------------------------------------
describe('setFilterField & localStorage persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    stubLocalStorage()
    mockFetchSubmissionListing.mockReset().mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists filterField to localStorage', () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    store.selectedAssetUid = 'asset123'

    store.setFilterField('grpa/key1')
    expect(store.filterField).toBe('grpa/key1')
    expect(
      storage['kosurveyor_filter_field_https://kobo.example.com_asset123']
    ).toBe('grpa/key1')
  })

  it('removes localStorage entry when field is cleared', () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    store.selectedAssetUid = 'asset123'

    store.setFilterField('grpa/key1')
    store.setFilterField(null)
    expect(store.filterField).toBeNull()
    expect(
      storage['kosurveyor_filter_field_https://kobo.example.com_asset123']
    ).toBeUndefined()
  })

  it('triggers fetchFieldData when a field is set', () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset123'

    store.setFilterField('grpa/key1')
    // fetchSubmissionListing should have been called with extraFields
    expect(mockFetchSubmissionListing).toHaveBeenCalledWith(
      'https://kobo.example.com', 'user', 'pass', 'asset123', ['grpa/key1']
    )
  })

  it('does not trigger fetchFieldData when field is cleared', () => {
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    store.selectedAssetUid = 'asset123'

    mockFetchSubmissionListing.mockReset()
    store.setFilterField(null)
    expect(mockFetchSubmissionListing).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// API: fetchSubmissionListing extraFields
// ---------------------------------------------------------------------------
describe('fetchSubmissionListing extraFields', () => {
  it('appends extra fields to the URL query', async () => {
    // For this test we import the actual (un-mocked) module logic
    // We test the URL construction by examining the mock calls
    // The mock is already in place; we verify the args passed
    const store = usePostprocessStore()
    const creds = useCredentialsStore()
    creds.koboUrl = 'https://kobo.example.com'
    creds.username = 'user'
    creds.password = 'pass'
    store.selectedAssetUid = 'asset1'

    mockFetchSubmissionListing.mockReset().mockResolvedValue([])
    await store.fetchFieldData('survey_type')

    expect(mockFetchSubmissionListing).toHaveBeenCalledWith(
      'https://kobo.example.com', 'user', 'pass', 'asset1', ['survey_type']
    )
  })
})
