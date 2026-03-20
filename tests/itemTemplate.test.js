import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  generateBlankTemplate,
  validateUploadedTemplate,
  labelToCode,
} from '../src/logic/template/itemTemplate.js'

function parseBytes(bytes) {
  return XLSX.read(bytes, { type: 'array' })
}

function sheetToAoa(wb, sheetName) {
  return XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
}

// Helper profile builders
function makeProfile(groups) {
  return {
    profile_name: 'Test',
    profile_description: '',
    profile_author: '',
    form_id_stem: 'test_form',
    groups,
  }
}

function makeField(overrides) {
  return { name: 'f1', label: 'Field 1', widget: 'text', ...overrides }
}

describe('labelToCode', () => {
  it('converts a normal label (digits stripped)', () => {
    expect(labelToCode('European mammals 2024')).toBe('european_mammals')
  })

  it('strips leading and trailing underscores', () => {
    expect(labelToCode('  _test_')).toBe('test')
  })

  it('handles all-special-char string → throws', () => {
    expect(() => labelToCode('!!!')).toThrow('invalid label: empty after normalisation')
  })

  it('handles leading underscore only', () => {
    expect(labelToCode('_hello')).toBe('hello')
  })

  it('converts mixed case', () => {
    expect(labelToCode('Hello World')).toBe('hello_world')
  })

  it('throws for digit-leading label that normalises to digit-leading code', () => {
    expect(() => labelToCode('123')).toThrow('invalid label: empty after normalisation')
  })

  it('strips digits from label', () => {
    expect(labelToCode('1st transect')).toBe('st_transect')
  })
})

describe('generateBlankTemplate', () => {
  it('page group — correct sheet name, headers, row count', () => {
    const profile = makeProfile([
      {
        name: 'site_info',
        label: 'Site Info',
        type: 'page',
        fields: [
          makeField({ name: 'site_name', prefilled: 'readonly' }),
          makeField({ name: 'site_code', prefilled: 'editable' }),
          makeField({ name: 'notes' }), // not prefilled
        ],
      },
    ])
    const bytes = generateBlankTemplate(profile)
    const wb = parseBytes(bytes)
    expect(wb.SheetNames).toContain('site_info')
    const data = sheetToAoa(wb, 'site_info')
    expect(data[0]).toEqual(['field_name', 'value'])
    // 2 prefilled fields = 2 data rows + 1 header
    expect(data).toHaveLength(3)
    expect(data[1][0]).toBe('site_name')
    expect(data[2][0]).toBe('site_code')
  })

  it('repeat group with sub_surveys: true includes _survey_type column', () => {
    const profile = makeProfile([
      {
        name: 'observations',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: true,
        fields: [makeField({ name: 'species', prefilled: 'readonly' })],
      },
    ])
    const bytes = generateBlankTemplate(profile)
    const wb = parseBytes(bytes)
    const data = sheetToAoa(wb, 'observations')
    expect(data[0]).toContain('_survey_type')
    expect(data[0].indexOf('row_key')).toBe(0) // first column
    expect(data[0].indexOf('_survey_type')).toBe(1) // second column
  })

  it('repeat group with sub_surveys: false has no _survey_type column', () => {
    const profile = makeProfile([
      {
        name: 'measurements',
        label: 'Measurements',
        type: 'repeat',
        sub_surveys: false,
        fields: [makeField({ name: 'length', prefilled: 'editable' })],
      },
    ])
    const bytes = generateBlankTemplate(profile)
    const wb = parseBytes(bytes)
    const data = sheetToAoa(wb, 'measurements')
    expect(data[0]).not.toContain('_survey_type')
  })

  it('prefilled select_one readonly emits two columns (name + name_display)', () => {
    const profile = makeProfile([
      {
        name: 'taxa',
        label: 'Taxa',
        type: 'repeat',
        fields: [
          makeField({
            name: 'class',
            widget: 'select_one',
            prefilled: 'readonly',
            choices: [{ value: 'mammal', label: 'Mammal' }],
          }),
        ],
      },
    ])
    const bytes = generateBlankTemplate(profile)
    const wb = parseBytes(bytes)
    const data = sheetToAoa(wb, 'taxa')
    expect(data[0]).toContain('class')
    expect(data[0]).toContain('class_display')
  })

  it('group with no prefilled fields produces no sheet', () => {
    const profile = makeProfile([
      {
        name: 'free_group',
        label: 'Free',
        type: 'repeat',
        fields: [makeField({ name: 'comment' })], // no prefilled
      },
    ])
    const bytes = generateBlankTemplate(profile)
    const wb = parseBytes(bytes)
    expect(wb.SheetNames).not.toContain('free_group')
  })
})

describe('validateUploadedTemplate', () => {
  function buildWorkbook(sheets) {
    const wb = XLSX.utils.book_new()
    for (const [name, aoa] of Object.entries(sheets)) {
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      XLSX.utils.book_append_sheet(wb, ws, name)
    }
    return wb
  }

  const profileWithRepeat = makeProfile([
    {
      name: 'obs',
      label: 'Observations',
      type: 'repeat',
      sub_surveys: true,
      fields: [
        makeField({ name: 'species', prefilled: 'readonly', widget: 'text' }),
      ],
    },
  ])

  it('happy path — valid: true with correct parsedData', () => {
    const wb = buildWorkbook({
      obs: [
        ['row_key', '_survey_type', 'species'],
        ['', 'Birds', 'sparrow'],
        ['', 'Birds', 'robin'],
      ],
    })
    const result = validateUploadedTemplate(wb, profileWithRepeat)
    expect(result.valid).toBe(true)
    expect(result.parsedData.repeatRows.obs).toHaveLength(2)
    expect(result.parsedData.surveyTypes.obs).toHaveLength(1)
    expect(result.parsedData.surveyTypes.obs[0].code).toBe('birds')
    expect(result.parsedData.surveyTypes.obs[0].repeatCount).toBe(2)
  })

  it('missing sheet — error', () => {
    const wb = buildWorkbook({})
    const result = validateUploadedTemplate(wb, profileWithRepeat)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Missing sheet'))).toBe(true)
  })

  it('survey_type collision — error', () => {
    const wb = buildWorkbook({
      obs: [
        ['_survey_type', 'species'],
        ['European Mammals', 'wolf'],
        ['European_Mammals', 'fox'],
      ],
    })
    const result = validateUploadedTemplate(wb, profileWithRepeat)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('normalise to'))).toBe(true)
  })

  it('invalid choice key with spaces — error', () => {
    const profileWithSelect = makeProfile([
      {
        name: 'items',
        label: 'Items',
        type: 'repeat',
        fields: [
          makeField({
            name: 'category',
            widget: 'select_one',
            prefilled: 'readonly',
            choices: [
              { value: 'cat_a', label: 'A' },
              { value: 'cat_b', label: 'B' },
            ],
          }),
        ],
      },
    ])
    const wb = buildWorkbook({
      items: [
        ['category', 'category_display'],
        ['bad key', 'Bad'],
      ],
    })
    const result = validateUploadedTemplate(wb, profileWithSelect)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('contains spaces'))).toBe(true)
  })

  it('select value not in profile choices — error', () => {
    const profileWithSelect = makeProfile([
      {
        name: 'items',
        label: 'Items',
        type: 'repeat',
        fields: [
          makeField({
            name: 'category',
            widget: 'select_one',
            prefilled: 'readonly',
            choices: [
              { value: 'cat_a', label: 'A' },
            ],
          }),
        ],
      },
    ])
    const wb = buildWorkbook({
      items: [
        ['category', 'category_display'],
        ['cat_b', 'B'],
      ],
    })
    const result = validateUploadedTemplate(wb, profileWithSelect)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('does not match'))).toBe(true)
  })

  it('page group — validates values present', () => {
    const pageProfile = makeProfile([
      {
        name: 'meta',
        label: 'Meta',
        type: 'page',
        fields: [
          makeField({ name: 'title', prefilled: 'readonly' }),
        ],
      },
    ])
    const wb = buildWorkbook({
      meta: [
        ['field_name', 'value'],
        ['title', 'My Survey'],
      ],
    })
    const result = validateUploadedTemplate(wb, pageProfile)
    expect(result.valid).toBe(true)
    expect(result.parsedData.pageValues.meta.title).toBe('My Survey')
  })
})
