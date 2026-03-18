import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'

// Capture workbooks passed to XLSX.write before serialization,
// since SheetJS CE does not preserve styles/cols on read-back.
const capturedWorkbooks = []

vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    write: (...args) => {
      capturedWorkbooks.push(args[0])
      return actual.write(...args)
    }
  }
})

// Must import after vi.mock (hoisted, but dependency order matters)
const { buildSpreadsheet } = await import('@/logic/spreadsheet/builder')

function readWorkbook(buffer) {
  return XLSX.read(buffer, { type: 'array' })
}

describe('buildSpreadsheet', () => {
  beforeEach(() => {
    capturedWorkbooks.length = 0
  })
  it('creates a workbook with session, repeat, and media sheets in order', () => {
    const parsed = {
      _session_: {
        columns: ['session_id', '_uuid', 'location'],
        rows: [{ session_id: 101, _uuid: 'abc', location: 'forest' }]
      },
      repeatSheets: [
        {
          name: 'repeat_organism',
          columns: ['session_id', 'location', 'repeat_organism_idx', 'name'],
          rows: [{ session_id: 101, location: 'forest', repeat_organism_idx: '1', name: 'Oak' }]
        }
      ],
      _media_: {
        columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
        rows: []
      }
    }

    const buffer = buildSpreadsheet(parsed)
    expect(buffer).toBeTruthy()

    const wb = readWorkbook(buffer)
    expect(wb.SheetNames).toEqual(['_session_', 'repeat_organism', '_media_'])

    const sessionData = XLSX.utils.sheet_to_json(wb.Sheets['_session_'])
    expect(sessionData).toHaveLength(1)
    expect(sessionData[0].session_id).toBe(101)
    expect(sessionData[0].location).toBe('forest')

    const repeatData = XLSX.utils.sheet_to_json(wb.Sheets['repeat_organism'])
    expect(repeatData).toHaveLength(1)
    expect(repeatData[0].name).toBe('Oak')

    const mediaData = XLSX.utils.sheet_to_json(wb.Sheets['_media_'])
    expect(mediaData).toHaveLength(0)
  })

  it('auto-sizes columns with min 8 and max 60', () => {
    const longCol = 'a_very_long_column_name_that_is_quite_long_indeed'
    const parsed = {
      _session_: {
        columns: ['session_id', 'x', longCol],
        rows: [{ session_id: 1, x: 'short', [longCol]: 'val' }]
      },
      repeatSheets: [],
      _media_: {
        columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
        rows: []
      }
    }

    // Build and verify it produces a valid xlsx
    const buffer = buildSpreadsheet(parsed)
    const wb = readWorkbook(buffer)
    const ws = wb.Sheets['_session_']

    // Verify header row is present
    expect(ws['A1'].v).toBe('session_id')
    expect(ws['B1'].v).toBe('x')
    expect(ws['C1'].v).toBe(longCol)
    // Data row
    expect(ws['A2'].v).toBe(1)
    expect(ws['B2'].v).toBe('short')
    expect(ws['C2'].v).toBe('val')
  })

  it('creates media sheet header even with no data rows', () => {
    const parsed = {
      _session_: { columns: ['session_id'], rows: [{ session_id: 1 }] },
      repeatSheets: [],
      _media_: {
        columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
        rows: []
      }
    }

    const buffer = buildSpreadsheet(parsed)
    const wb = readWorkbook(buffer)
    expect(wb.SheetNames).toContain('_media_')

    // Header row should exist
    const ws = wb.Sheets['_media_']
    expect(ws['A1'].v).toBe('session_id')
    expect(ws['B1'].v).toBe('sheet')
  })

  it('handles multiple repeat sheets', () => {
    const parsed = {
      _session_: {
        columns: ['session_id'],
        rows: [{ session_id: 1 }]
      },
      repeatSheets: [
        { name: 'group_a', columns: ['session_id', 'group_a_idx', 'val'], rows: [{ session_id: 1, group_a_idx: '1', val: 'x' }] },
        { name: 'group_b', columns: ['session_id', 'group_b_idx', 'val'], rows: [{ session_id: 1, group_b_idx: '1', val: 'y' }] }
      ],
      _media_: {
        columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
        rows: []
      }
    }

    const buffer = buildSpreadsheet(parsed)
    const wb = readWorkbook(buffer)
    expect(wb.SheetNames).toEqual(['_session_', 'group_a', 'group_b', '_media_'])
  })

  it('fills empty string for missing row values', () => {
    const parsed = {
      _session_: {
        columns: ['session_id', 'field_a', 'field_b'],
        rows: [{ session_id: 1, field_a: 'val' }] // field_b missing
      },
      repeatSheets: [],
      _media_: {
        columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
        rows: []
      }
    }

    const buffer = buildSpreadsheet(parsed)
    const wb = readWorkbook(buffer)
    const ws = wb.Sheets['_session_']
    // C2 should be empty string for missing field_b
    expect(ws['C2'].v).toBe('')
  })

  it('enforces column widths between 8 and 60', () => {
    const shortCol = 'x'
    const longCol = 'a'.repeat(80)
    const parsed = {
      _session_: {
        columns: ['session_id', shortCol, longCol],
        rows: [{ session_id: 1, [shortCol]: 'v', [longCol]: 'v' }]
      },
      repeatSheets: [],
      _media_: {
        columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
        rows: []
      }
    }

    buildSpreadsheet(parsed)

    const wb = capturedWorkbooks[capturedWorkbooks.length - 1]
    const ws = wb.Sheets['_session_']
    const cols = ws['!cols']

    expect(cols).toBeDefined()
    for (const col of cols) {
      expect(col.wch).toBeGreaterThanOrEqual(8)
      expect(col.wch).toBeLessThanOrEqual(60)
    }
  })

  it('applies bold font to header cells', () => {
    const parsed = {
      _session_: {
        columns: ['session_id', 'field_a'],
        rows: [{ session_id: 1, field_a: 'val' }]
      },
      repeatSheets: [],
      _media_: {
        columns: ['session_id', 'sheet', 'field_key', 'original_filename', 'mimetype', 'download_url', 'disk_path'],
        rows: []
      }
    }

    buildSpreadsheet(parsed)

    const wb = capturedWorkbooks[capturedWorkbooks.length - 1]
    const ws = wb.Sheets['_session_']

    expect(ws['A1'].s).toBeDefined()
    expect(ws['A1'].s.font.bold).toBe(true)
    expect(ws['B1'].s).toBeDefined()
    expect(ws['B1'].s.font.bold).toBe(true)
  })
})
