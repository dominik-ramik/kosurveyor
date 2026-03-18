import { describe, it, expect } from 'vitest'
import { parseSubmissions } from '@/logic/postprocess/submissionParser'

describe('parseSubmissions', () => {
  it('parses a single flat submission into a session sheet', () => {
    const submissions = [
      {
        _id: 101,
        _uuid: 'abc-123',
        _submission_time: '2025-01-01',
        _submitted_by: 'user1',
        _attachments: [],
        'formhub/uuid': 'form-uuid',
        'meta/instanceID': 'uuid:abc-123',
        'preface_group/location': 'forest',
        'preface_group/date': '2025-01-01'
      }
    ]

    const result = parseSubmissions(submissions)

    // Grouped keys (preface_group/*) go to a separate standard group sheet
    expect(result._session_.columns).toEqual([
      'session_id',
      '_uuid',
      '_submission_time',
      '_submitted_by',
      'formhub/uuid',
      'meta/instanceID'
    ])
    expect(result._session_.rows).toHaveLength(1)
    expect(result._session_.rows[0].session_id).toBe(101)
    expect(result._session_.rows[0]['_uuid']).toBe('abc-123')

    // Standard group sheet for preface_group
    expect(result.repeatSheets).toHaveLength(1)
    const groupSheet = result.repeatSheets[0]
    expect(groupSheet.name).toBe('preface_group')
    expect(groupSheet.columns).toContain('session_id')
    expect(groupSheet.columns).toContain('location')
    expect(groupSheet.columns).toContain('date')
    expect(groupSheet.rows).toHaveLength(1)
    expect(groupSheet.rows[0].location).toBe('forest')
    expect(result._media_.rows).toHaveLength(0)
  })

  it('discards _COLLECTOR_NODATA_ keys at all levels', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        normal_field: 'value',
        some_COLLECTOR_NODATA_field: 'discard me',
        _COLLECTOR_NODATA_system: 'also discard'
      }
    ]

    const result = parseSubmissions(submissions)
    const allCols = result._session_.columns
    expect(allCols).not.toContain('some_COLLECTOR_NODATA_field')
    expect(allCols).not.toContain('_COLLECTOR_NODATA_system')
    expect(allCols).toContain('normal_field')
  })

  it('excludes _id and _attachments from session columns', () => {
    const submissions = [
      {
        _id: 101,
        _uuid: 'abc',
        _attachments: [{ filename: 'a/b.jpg', download_url: 'url', mimetype: 'image/jpeg' }]
      }
    ]

    const result = parseSubmissions(submissions)
    expect(result._session_.columns[0]).toBe('session_id')
    expect(result._session_.columns).toContain('_uuid')
    expect(result._session_.columns).not.toContain('_id')
    expect(result._session_.columns).not.toContain('_attachments')
  })

  it('handles a root-level repeat group with stripped keys', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        location: 'forest',
        repeat_group_organism: [
          { 'repeat_group_organism/scientific_name': 'Quercus', 'repeat_group_organism/count': 5 },
          { 'repeat_group_organism/scientific_name': 'Pinus', 'repeat_group_organism/count': 3 }
        ]
      }
    ]

    const result = parseSubmissions(submissions)
    expect(result._session_.rows).toHaveLength(1)
    expect(result._session_.rows[0].location).toBe('forest')

    const sheet = result.repeatSheets.find(s => s.name === 'repeat_group_organism')
    expect(sheet).toBeDefined()

    expect(sheet.columns).toContain('session_id')
    expect(sheet.columns).toContain('repeat_group_organism_idx')
    expect(sheet.columns).toContain('scientific_name')
    expect(sheet.columns).toContain('count')

    expect(sheet.rows).toHaveLength(2)
    expect(sheet.rows[0].session_id).toBe(101)
    expect(sheet.rows[0].repeat_group_organism_idx).toBe('1')
    expect(sheet.rows[0].scientific_name).toBe('Quercus')
    expect(sheet.rows[1].repeat_group_organism_idx).toBe('2')
    expect(sheet.rows[1].scientific_name).toBe('Pinus')
  })

  it('handles nested repeat groups with denormalized leaf rows', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        location: 'forest',
        repeat_group_plot: [
          {
            'repeat_group_plot/plot_id': 'P1',
            'repeat_group_plot/organism_repeat': [
              { 'repeat_group_plot/organism_repeat/scientific_name': 'Quercus' },
              { 'repeat_group_plot/organism_repeat/scientific_name': 'Pinus' }
            ]
          },
          {
            'repeat_group_plot/plot_id': 'P2',
            'repeat_group_plot/organism_repeat': [
              { 'repeat_group_plot/organism_repeat/scientific_name': 'Betula' }
            ]
          }
        ]
      }
    ]

    const result = parseSubmissions(submissions)
    const sheet = result.repeatSheets.find(s => s.name === 'repeat_group_plot')
    expect(sheet).toBeDefined()

    // 3 leaf rows: 2 from P1, 1 from P2
    expect(sheet.rows).toHaveLength(3)

    expect(sheet.rows[0].repeat_group_plot_idx).toBe('1')
    expect(sheet.rows[0].plot_id).toBe('P1')
    expect(sheet.rows[0].organism_repeat_idx).toBe('1')
    expect(sheet.rows[0].scientific_name).toBe('Quercus')

    expect(sheet.rows[1].repeat_group_plot_idx).toBe('1')
    expect(sheet.rows[1].plot_id).toBe('P1')
    expect(sheet.rows[1].organism_repeat_idx).toBe('2')
    expect(sheet.rows[1].scientific_name).toBe('Pinus')

    expect(sheet.rows[2].repeat_group_plot_idx).toBe('2')
    expect(sheet.rows[2].plot_id).toBe('P2')
    expect(sheet.rows[2].organism_repeat_idx).toBe('1')
    expect(sheet.rows[2].scientific_name).toBe('Betula')
  })

  it('zero-pads indices per session to the width of the max index', () => {
    const rows = []
    for (let i = 0; i < 12; i++) {
      rows.push({ 'repeat_group/name': `item_${i}` })
    }
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        repeat_group: rows
      }
    ]

    const result = parseSubmissions(submissions)
    const sheet = result.repeatSheets[0]
    expect(sheet.rows[0].repeat_group_idx).toBe('01')
    expect(sheet.rows[9].repeat_group_idx).toBe('10')
    expect(sheet.rows[11].repeat_group_idx).toBe('12')
  })

  it('uses different padding widths for different sessions', () => {
    const sub1Rows = Array.from({ length: 3 }, (_, i) => ({
      'rg/name': `a${i}`
    }))
    const sub2Rows = Array.from({ length: 12 }, (_, i) => ({
      'rg/name': `b${i}`
    }))

    const submissions = [
      { _id: 101, _attachments: [], rg: sub1Rows },
      { _id: 102, _attachments: [], rg: sub2Rows }
    ]

    const result = parseSubmissions(submissions)
    const sheet = result.repeatSheets[0]

    // Session 101 has 3 rows → width 1
    const s101Rows = sheet.rows.filter((r) => r.session_id === 101)
    expect(s101Rows[0].rg_idx).toBe('1')
    expect(s101Rows[2].rg_idx).toBe('3')

    // Session 102 has 12 rows → width 2
    const s102Rows = sheet.rows.filter((r) => r.session_id === 102)
    expect(s102Rows[0].rg_idx).toBe('01')
    expect(s102Rows[11].rg_idx).toBe('12')
  })

  it('matches attachments to media rows', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [
          {
            filename: 'user/attachments/photo1.jpg',
            download_url: 'https://kobo.example.com/photo1.jpg',
            mimetype: 'image/jpeg'
          },
          {
            filename: 'user/attachments/recording.mp3',
            download_url: 'https://kobo.example.com/recording.mp3',
            mimetype: 'audio/mpeg'
          }
        ],
        photo_field: 'photo1.jpg',
        audio_field: 'recording.mp3',
        text_field: 'not a file'
      }
    ]

    const result = parseSubmissions(submissions)
    expect(result._media_.rows).toHaveLength(2)

    const photoMedia = result._media_.rows.find((r) => r.original_filename === 'photo1.jpg')
    expect(photoMedia.sheet).toBe('_session_')
    expect(photoMedia.field_key).toBe('photo_field')
    expect(photoMedia.mimetype).toBe('image/jpeg')
    expect(photoMedia.disk_path).toBe('photos/101/photo1.jpg')

    const audioMedia = result._media_.rows.find((r) => r.original_filename === 'recording.mp3')
    expect(audioMedia.disk_path).toBe('audio/101/recording.mp3')
  })

  it('excludes deleted attachments from the media map', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [
          { filename: 'a/deleted.jpg', download_url: 'url', mimetype: 'image/jpeg', is_deleted: true },
          { filename: 'a/kept.jpg', download_url: 'url2', mimetype: 'image/jpeg' }
        ],
        photo: 'deleted.jpg',
        other_photo: 'kept.jpg'
      }
    ]

    const result = parseSubmissions(submissions)
    expect(result._media_.rows).toHaveLength(1)
    expect(result._media_.rows[0].original_filename).toBe('kept.jpg')
  })

  it('serialises non-scalar metadata values as JSON strings', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        _geolocation: [1.23, 4.56]
      }
    ]

    const result = parseSubmissions(submissions)
    expect(result._session_.rows[0]['_geolocation']).toBe('[1.23,4.56]')
  })

  it('handles multiple submissions with differing key sets', () => {
    const submissions = [
      { _id: 101, _attachments: [], field_a: 'v1' },
      { _id: 102, _attachments: [], field_a: 'v2', field_b: 'v3' }
    ]

    const result = parseSubmissions(submissions)
    expect(result._session_.columns).toContain('field_a')
    expect(result._session_.columns).toContain('field_b')
    expect(result._session_.rows[0].field_b).toBeUndefined()
    expect(result._session_.rows[1].field_b).toBe('v3')
  })

  it('always emits the media sheet even when empty', () => {
    const submissions = [{ _id: 101, _attachments: [] }]
    const result = parseSubmissions(submissions)
    expect(result._media_.columns).toEqual([
      'session_id',
      'sheet',
      'field_key',
      'original_filename',
      'mimetype',
      'download_url',
      'disk_path'
    ])
    expect(result._media_.rows).toHaveLength(0)
  })

  it('detects media references inside repeat groups', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [
          { filename: 'user/photo.jpg', download_url: 'https://kobo.example.com/photo.jpg', mimetype: 'image/jpeg' }
        ],
        repeat_group: [{ 'repeat_group/photo': 'photo.jpg', 'repeat_group/name': 'tree' }]
      }
    ]

    const result = parseSubmissions(submissions)
    const mediaRow = result._media_.rows.find((r) => r.original_filename === 'photo.jpg')
    expect(mediaRow).toBeDefined()
    expect(mediaRow.sheet).toBe('repeat_group')
    expect(mediaRow.field_key).toBe('repeat_group/photo')
  })

  it('preserves intermediate paths when stripping nested group keys', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        repeat_group_plot: [
          {
            'repeat_group_plot/plot_id': 'P1',
            'repeat_group_plot/organism_repeat': [
              {
                'repeat_group_plot/organism_repeat/organism_group/scientific_name': 'Quercus'
              }
            ]
          }
        ]
      }
    ]

    const result = parseSubmissions(submissions)
    const sheet = result.repeatSheets[0]

    // Strip up to 'repeat_group_plot/organism_repeat/' → 'organism_group/scientific_name'
    expect(sheet.columns).toContain('organism_group/scientific_name')
    expect(sheet.rows[0]['organism_group/scientific_name']).toBe('Quercus')
  })

  it('grouped session-level fields get their own standard group sheet', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        'preface/location': 'forest',
        repeat_group: [{ 'repeat_group/name': 'item1' }]
      }
    ]

    const result = parseSubmissions(submissions)
    const groupSheet = result.repeatSheets.find(s => s.name === 'preface')
    expect(groupSheet).toBeDefined()
    expect(groupSheet.columns).toContain('session_id')
    expect(groupSheet.columns).toContain('location')
    expect(groupSheet.rows[0].location).toBe('forest')
  })

  it('handles empty repeat arrays (key detected but no rows)', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        repeat_group: []
      }
    ]

    const result = parseSubmissions(submissions)
    expect(result.repeatSheets).toHaveLength(1)
    expect(result.repeatSheets[0].rows).toHaveLength(0)
  })

  it('handles multiple sibling repeat groups each producing their own sheet', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        location: 'forest',
        repeat_plants: [
          { 'repeat_plants/species': 'Oak' },
          { 'repeat_plants/species': 'Pine' }
        ],
        repeat_animals: [
          { 'repeat_animals/species': 'Deer' }
        ]
      }
    ]

    const result = parseSubmissions(submissions)

    // Session sheet is unaffected — no repeat data leaks in
    expect(result._session_.columns).toContain('location')
    expect(result._session_.columns).not.toContain('repeat_plants')
    expect(result._session_.columns).not.toContain('repeat_animals')
    expect(result._session_.rows).toHaveLength(1)

    // Two separate repeat sheets (session-level fields not copied in)
    const plantSheet = result.repeatSheets.find((s) => s.name === 'repeat_plants')
    const animalSheet = result.repeatSheets.find((s) => s.name === 'repeat_animals')

    expect(plantSheet).toBeDefined()
    expect(plantSheet.rows).toHaveLength(2)
    expect(plantSheet.rows[0].species).toBe('Oak')
    expect(plantSheet.rows[1].species).toBe('Pine')
    expect(plantSheet.columns).toContain('session_id')
    expect(plantSheet.columns).toContain('repeat_plants_idx')

    expect(animalSheet).toBeDefined()
    expect(animalSheet.rows).toHaveLength(1)
    expect(animalSheet.rows[0].species).toBe('Deer')
    expect(animalSheet.columns).toContain('repeat_animals_idx')
  })

  it('merges _FREE_SURVEY_ repeat group into its base group sheet across submissions', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        somegroup: [
          { 'somegroup/species': 'Oak', 'somegroup/count': 5 }
        ]
      },
      {
        _id: 102,
        _attachments: [],
        somegroup_FREE_SURVEY_: [
          { 'somegroup_FREE_SURVEY_/species_001': 'Pine', 'somegroup_FREE_SURVEY_/count_002': 3 }
        ]
      }
    ]

    const result = parseSubmissions(submissions)
    const sheet = result.repeatSheets.find(s => s.name === 'somegroup')
    expect(sheet).toBeDefined()
    expect(result.repeatSheets.find(s => s.name === 'somegroup_FREE_SURVEY_')).toBeUndefined()
    expect(sheet.columns).toContain('somegroup_idx')
    expect(sheet.columns).not.toContain('somegroup_FREE_SURVEY__idx')
    expect(sheet.columns).toContain('species')
    expect(sheet.columns).toContain('count')
    expect(sheet.columns).not.toContain('species_001')
    expect(sheet.columns).not.toContain('count_002')
    expect(sheet.rows).toHaveLength(2)
    expect(sheet.rows[0].session_id).toBe(101)
    expect(sheet.rows[0].species).toBe('Oak')
    expect(sheet.rows[1].session_id).toBe(102)
    expect(sheet.rows[1].species).toBe('Pine')
    expect(sheet.rows[1].count).toBe(3)
    expect(sheet.rows[1].somegroup_idx).toBe('1')
  })

  it('handles _FREE_SURVEY_ group when no base group exists', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        somegroup_FREE_SURVEY_: [
          { 'somegroup_FREE_SURVEY_/species_001': 'Birch' }
        ]
      }
    ]

    const result = parseSubmissions(submissions)
    const sheet = result.repeatSheets.find(s => s.name === 'somegroup')
    expect(sheet).toBeDefined()
    expect(result.repeatSheets.find(s => s.name === 'somegroup_FREE_SURVEY_')).toBeUndefined()
    expect(sheet.columns).toContain('somegroup_idx')
    expect(sheet.columns).not.toContain('somegroup_FREE_SURVEY__idx')
    expect(sheet.columns).toContain('species')
    expect(sheet.columns).not.toContain('species_001')
    expect(sheet.rows).toHaveLength(1)
    expect(sheet.rows[0].species).toBe('Birch')
    expect(sheet.rows[0].somegroup_idx).toBe('1')
  })

  it('merges _FREE_SURVEY_ with nested repeat groups across submissions', () => {
    const submissions = [
      {
        _id: 101,
        _attachments: [],
        plot: [
          {
            'plot/plot_id': 'P1',
            'plot/organisms': [
              { 'plot/organisms/name': 'Oak' }
            ]
          }
        ]
      },
      {
        _id: 102,
        _attachments: [],
        plot_FREE_SURVEY_: [
          {
            'plot_FREE_SURVEY_/plot_id_001': 'P2',
            'plot_FREE_SURVEY_/organisms': [
              { 'plot_FREE_SURVEY_/organisms/name_001': 'Pine' }
            ]
          }
        ]
      }
    ]

    const result = parseSubmissions(submissions)
    const sheet = result.repeatSheets.find(s => s.name === 'plot')
    expect(sheet).toBeDefined()
    expect(result.repeatSheets.find(s => s.name === 'plot_FREE_SURVEY_')).toBeUndefined()
    expect(sheet.columns).toContain('plot_idx')
    expect(sheet.columns).not.toContain('plot_FREE_SURVEY__idx')
    expect(sheet.columns).toContain('plot_id')
    expect(sheet.columns).not.toContain('plot_id_001')
    expect(sheet.rows).toHaveLength(2)
    expect(sheet.rows[0].session_id).toBe(101)
    expect(sheet.rows[0].plot_id).toBe('P1')
    expect(sheet.rows[1].session_id).toBe(102)
    expect(sheet.rows[1].plot_id).toBe('P2')
  })
})
