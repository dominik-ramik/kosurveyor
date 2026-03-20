import { describe, it, expect } from 'vitest'
import { getField, getAllFields } from '../src/plugins/fields/index.js'

function makeHelpers(overrides = {}) {
  return {
    row: (o) => ({ ...o }),
    pulldata: (col, idx) => `pulldata('test_form_data','${col}','row_key',\${${idx}})`,
    getBakedValue: () => 'baked_val',
    getChoiceLabelForKey: (field, key) => key,
    emitChoices: () => {},
    buildChoiceFilter: () => '',
    widgetType: (field) => {
      const map = {
        text: 'text', integer: 'integer', decimal: 'decimal',
        date: 'date', datetime: 'datetime', time: 'time',
        gps: 'geopoint', label: 'note', image: 'image', audio: 'audio',
      }
      return map[field.widget] || field.widget
    },
    getField: (type) => getField(type),
    ...overrides,
  }
}

// ─── Registry tests ──────────────────────────────────────────
describe('Field plugin registry', () => {
  it('getField("text") returns a plugin with correct type, label, icon', () => {
    const p = getField('text')
    expect(p).not.toBeNull()
    expect(p.type).toBe('text')
    expect(p.label).toBe('Text')
    expect(p.icon).toBe('mdi-format-text')
  })

  it('getField("unknown_type") returns null', () => {
    expect(getField('unknown_type')).toBeNull()
  })

  it('getAllFields() returns all 12 plugins', () => {
    const all = getAllFields()
    expect(all).toHaveLength(12)
  })

  it('every plugin has type, label, icon, description, expandSurveyRows function', () => {
    for (const p of getAllFields()) {
      expect(p.type).toBeTruthy()
      expect(p.label).toBeTruthy()
      expect(p.icon).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(typeof p.expandSurveyRows).toBe('function')
    }
  })

  it('supportsEditablePrefill is false for: image, audio, date, datetime, time, gps, label', () => {
    const noEditable = ['image', 'audio', 'date', 'datetime', 'time', 'gps', 'label']
    for (const t of noEditable) {
      expect(getField(t).supportsEditablePrefill).toBe(false)
    }
    const editable = ['text', 'integer', 'decimal', 'select_one', 'select_multiple']
    for (const t of editable) {
      expect(getField(t).supportsEditablePrefill).toBe(true)
    }
  })

  it('isMediaType is true for image and audio only', () => {
    expect(getField('image').isMediaType).toBe(true)
    expect(getField('audio').isMediaType).toBe(true)
    const nonMedia = ['text', 'integer', 'decimal', 'date', 'datetime', 'time', 'gps', 'select_one', 'select_multiple', 'label']
    for (const t of nonMedia) {
      expect(getField(t).isMediaType).toBe(false)
    }
  })

  it('isCascadable is true for select_one and select_multiple only', () => {
    expect(getField('select_one').isCascadable).toBe(true)
    expect(getField('select_multiple').isCascadable).toBe(true)
    const nonCascadable = ['text', 'integer', 'decimal', 'date', 'datetime', 'time', 'gps', 'image', 'audio', 'label']
    for (const t of nonCascadable) {
      expect(getField(t).isCascadable).toBe(false)
    }
  })
})

// ─── getTemplateColumns ──────────────────────────────────────
describe('select_one.getTemplateColumns', () => {
  const plugin = getField('select_one')

  it('prefilled readonly returns [name, name_display]', () => {
    expect(plugin.getTemplateColumns({ name: 'habitat', prefilled: 'readonly' }))
      .toEqual(['habitat', 'habitat_display'])
  })

  it('prefilled editable returns [name]', () => {
    expect(plugin.getTemplateColumns({ name: 'habitat', prefilled: 'editable' }))
      .toEqual(['habitat'])
  })

  it('not prefilled returns [name]', () => {
    expect(plugin.getTemplateColumns({ name: 'habitat' }))
      .toEqual(['habitat'])
  })
})

// ─── validateTemplateValue ───────────────────────────────────
describe('select_one.validateTemplateValue', () => {
  const plugin = getField('select_one')
  const field = { name: 'habitat', choices: [{ value: 'forest', label: 'Forest' }, { value: 'grassland', label: 'Grassland' }] }

  it('valid choice key passes', () => {
    expect(plugin.validateTemplateValue(field, 'habitat', 'forest', 0, 'sheet1')).toEqual([])
  })

  it('key not in choices returns error', () => {
    const errs = plugin.validateTemplateValue(field, 'habitat', 'ocean', 0, 'sheet1')
    expect(errs.length).toBe(1)
    expect(errs[0]).toContain('does not match')
  })

  it('key with spaces returns error', () => {
    const errs = plugin.validateTemplateValue(field, 'habitat', 'bad key', 0, 'sheet1')
    expect(errs.some(e => e.includes('contains spaces'))).toBe(true)
  })

  it('empty choices list skips choice validation', () => {
    const fieldNoChoices = { name: 'habitat', choices: [] }
    expect(plugin.validateTemplateValue(fieldNoChoices, 'habitat', 'anything', 0, 'sheet1')).toEqual([])
  })
})

describe('select_multiple.validateTemplateValue', () => {
  const plugin = getField('select_multiple')
  const field = { name: 'tags', choices: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }

  it('valid choice key passes', () => {
    expect(plugin.validateTemplateValue(field, 'tags', 'a', 0, 'sheet1')).toEqual([])
  })

  it('key not in choices returns error', () => {
    const errs = plugin.validateTemplateValue(field, 'tags', 'z', 0, 'sheet1')
    expect(errs.some(e => e.includes('does not match'))).toBe(true)
  })

  it('key with spaces returns error', () => {
    const errs = plugin.validateTemplateValue(field, 'tags', 'bad key', 0, 'sheet1')
    expect(errs.some(e => e.includes('contains spaces'))).toBe(true)
  })

  it('empty choices list skips choice validation', () => {
    const fieldNoChoices = { name: 'tags', choices: [] }
    expect(plugin.validateTemplateValue(fieldNoChoices, 'tags', 'anything', 0, 'sheet1')).toEqual([])
  })
})

// ─── defaultProps ────────────────────────────────────────────
describe('defaultProps', () => {
  it('image.defaultProps includes max_pixels: null', () => {
    expect(getField('image').defaultProps).toEqual({ max_pixels: null })
  })

  it('select_one.defaultProps includes choices: [] and filtered_by: null', () => {
    expect(getField('select_one').defaultProps).toEqual({ choices: [], filtered_by: null })
  })
})

// ─── expandSurveyRows ───────────────────────────────────────
describe('expandSurveyRows — text field', () => {
  const plugin = getField('text')
  const group = { name: 'g1', label: 'Group 1' }

  it('no prefill, page context → single row', () => {
    const field = { name: 'f1', label: 'Field 1', widget: 'text' }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('text')
    expect(rows[0].name).toBe('f1')
    expect(rows[0].label).toBe('Field 1')
  })

  it('prefilled readonly, page context → calculate + note', () => {
    const field = { name: 'f1', label: 'Field 1', widget: 'text', prefilled: 'readonly' }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe('calculate')
    expect(rows[1].type).toBe('note')
  })

  it('prefilled readonly, prefilled_repeat context → 3 rows', () => {
    const field = { name: 'f1', label: 'Field 1', widget: 'text', prefilled: 'readonly' }
    const rows = plugin.expandSurveyRows(field, group, 'prefilled_repeat', makeHelpers())
    expect(rows).toHaveLength(3)
    expect(rows[0].type).toBe('calculate')
    expect(rows[1].type).toBe('note')
    expect(rows[2].type).toBe('calculate')
  })

  it('prefilled readonly, free_repeat context → plain input row', () => {
    const field = { name: 'f1', label: 'Field 1', widget: 'text', prefilled: 'readonly' }
    const rows = plugin.expandSurveyRows(field, group, 'free_repeat', makeHelpers())
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('text')
  })

  it('prefilled editable, page context → row with calculation', () => {
    const field = { name: 'f1', label: 'Field 1', widget: 'text', prefilled: 'editable' }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('text')
    expect(rows[0].calculation).toContain('baked_val')
  })

  it('prefilled editable, prefilled_repeat context → row with once(pulldata(...))', () => {
    const field = { name: 'f1', label: 'Field 1', widget: 'text', prefilled: 'editable' }
    const rows = plugin.expandSurveyRows(field, group, 'prefilled_repeat', makeHelpers())
    expect(rows).toHaveLength(1)
    expect(rows[0].calculation).toContain('once(pulldata(')
  })
})

describe('expandSurveyRows — select_one field', () => {
  const plugin = getField('select_one')
  const group = { name: 'g1', label: 'Group 1' }

  it('no prefill, page context → select_one row with choice_filter', () => {
    const field = { name: 'habitat', label: 'Habitat', widget: 'select_one', choices: [{ value: 'f', label: 'F' }] }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('select_one habitat_list')
    expect(rows[0].choice_filter).toBe('')
  })

  it('with filtered_by, page context → choice_filter is populated', () => {
    const field = { name: 'sub', label: 'Sub', widget: 'select_one', choices: [], filtered_by: 'parent' }
    const helpers = makeHelpers({ buildChoiceFilter: () => 'parent = ${parent}' })
    const rows = plugin.expandSurveyRows(field, group, 'page', helpers)
    expect(rows[0].choice_filter).toBe('parent = ${parent}')
  })

  it('prefilled readonly, page → calculate + note rows', () => {
    const field = {
      name: 'habitat', label: 'Habitat', widget: 'select_one',
      prefilled: 'readonly',
      choices: [{ value: 'forest', label: 'Forest' }],
    }
    const helpers = makeHelpers({
      getBakedValue: () => 'forest',
      getChoiceLabelForKey: (f, k) => 'Forest',
    })
    const rows = plugin.expandSurveyRows(field, group, 'page', helpers)
    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe('calculate')
    expect(rows[1].type).toBe('note')
    expect(rows[1].label).toContain('Forest')
  })

  it('prefilled readonly, prefilled_repeat → 4 rows including display calc', () => {
    const field = {
      name: 'habitat', label: 'Habitat', widget: 'select_one',
      prefilled: 'readonly',
      choices: [{ value: 'forest', label: 'Forest' }],
    }
    const rows = plugin.expandSurveyRows(field, group, 'prefilled_repeat', makeHelpers())
    expect(rows).toHaveLength(4)
    expect(rows[0].name).toBe('habitat_COLLECTOR_NODATA_calc')
    expect(rows[1].name).toBe('habitat_display_COLLECTOR_NODATA_calc')
    expect(rows[2].type).toBe('note')
    expect(rows[3].name).toBe('habitat')
  })
})

describe('expandSurveyRows — image field', () => {
  const plugin = getField('image')
  const group = { name: 'g1', label: 'Group 1' }

  it('no prefill → row with parameters field', () => {
    const field = { name: 'photo', label: 'Photo', widget: 'image' }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('image')
  })

  it('with max_pixels → parameters contains max-pixels=N', () => {
    const field = { name: 'photo', label: 'Photo', widget: 'image', max_pixels: 800 }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows[0].parameters).toBe('max-pixels=800')
  })

  it('prefilled readonly, page → calculate + note with media::image', () => {
    const field = { name: 'photo', label: 'Photo', widget: 'image', prefilled: 'readonly' }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe('calculate')
    expect(rows[1]['media::image']).toBeDefined()
  })
})

describe('expandSurveyRows — label field', () => {
  const plugin = getField('label')
  const group = { name: 'g1', label: 'Group 1' }

  it('no prefill → note row', () => {
    const field = { name: 'info', label: 'Info text', widget: 'label' }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(1)
    expect(rows[0].type).toBe('note')
  })

  it('prefilled readonly, page → calculate + note', () => {
    const field = { name: 'info', label: 'Info text', widget: 'label', prefilled: 'readonly' }
    const rows = plugin.expandSurveyRows(field, group, 'page', makeHelpers())
    expect(rows).toHaveLength(2)
    expect(rows[0].type).toBe('calculate')
    expect(rows[1].type).toBe('note')
    expect(rows[1].label).toBe('${info}')
  })
})
