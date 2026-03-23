import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { generateDeploymentFiles } from '../src/logic/xlsform/generator.js'
import {
  generateBlankTemplate,
  validateUploadedTemplate,
} from '../src/logic/template/itemTemplate.js'
import { getField, getAllFields } from '../src/plugins/fields/index.js'
import { getGroup, getAllGroups } from '../src/plugins/groups/index.js'

// ─── Helpers ─────────────────────────────────────────────────
function parseXls(bytes) {
  return XLSX.read(bytes, { type: 'array' })
}

function getSurveyRows(wb) {
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets.survey, { header: 1, defval: '' })
  const headers = aoa[0]
  return aoa.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = r[i] })
    return obj
  })
}

function getChoiceRows(wb) {
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets.choices, { header: 1, defval: '' })
  const headers = aoa[0]
  return aoa.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = r[i] })
    return obj
  })
}

function makeProfile(groups, overrides = {}) {
  return {
    profile_name: 'Integration Test',
    profile_description: '',
    profile_author: '',
    form_id_stem: 'int_test',
    groups,
    ...overrides,
  }
}

function field(overrides) {
  return { name: 'f1', label: 'Field 1', widget: 'text', ...overrides }
}

// ─── Plugin registry sanity ──────────────────────────────────
describe('Plugin registries are consistent', () => {
  it('every field plugin type is unique', () => {
    const types = getAllFields().map((p) => p.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('every group plugin type is unique', () => {
    const types = getAllGroups().map((p) => p.type)
    expect(new Set(types).size).toBe(types.length)
  })

  it('field plugins referenced in group plugins are all resolvable', () => {
    const fieldTypes = new Set(getAllFields().map((p) => p.type))
    // Verify common widget types used in profiles resolve
    for (const t of ['text', 'integer', 'select_one', 'image', 'label']) {
      expect(fieldTypes.has(t)).toBe(true)
    }
  })
})

// ─── Round-trip: template generation → validation → deployment ──
describe('Full round-trip: page group', () => {
  const profile = makeProfile([
    {
      name: 'site_meta',
      label: 'Site Metadata',
      type: 'page',
      fields: [
        field({ name: 'site_name', label: 'Site Name', prefilled: 'readonly' }),
        field({ name: 'site_code', label: 'Site Code', prefilled: 'editable' }),
        field({ name: 'notes', label: 'Notes' }), // not prefilled
      ],
    },
  ])

  it('generates blank template, validates it with data, then produces deployment files', () => {
    // Step 1 — generate blank template
    const templateBytes = generateBlankTemplate(profile)
    const templateWb = parseXls(templateBytes)
    expect(templateWb.SheetNames).toContain('site_meta')

    // Step 2 — fill in template data
    const filledWb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(filledWb, XLSX.utils.aoa_to_sheet([
      ['field_name', 'value'],
      ['site_name', 'Forest Alpha'],
      ['site_code', 'FA001'],
    ]), 'site_meta')

    // Step 3 — validate
    const validation = validateUploadedTemplate(filledWb, profile)
    expect(validation.valid).toBe(true)
    expect(validation.parsedData.pageValues.site_meta.site_name).toBe('Forest Alpha')

    // Step 4 — generate deployment files
    const { xlsformBytes, csvString } = generateDeploymentFiles(profile, validation.parsedData)
    const wb = parseXls(xlsformBytes)
    const survey = getSurveyRows(wb)

    // Page group should have begin_group/end_group with field-list
    expect(survey[0].type).toBe('begin_group')
    expect(survey[0].appearance).toBe('field-list')

    // readonly site_name: calculate + note
    const calcRow = survey.find((r) => r.name === 'site_name' && r.type === 'calculate')
    expect(calcRow).toBeDefined()
    expect(calcRow.calculation).toBe("'Forest Alpha'")

    // editable site_code: text widget with baked default
    const editRow = survey.find((r) => r.name === 'site_code' && r.type === 'text')
    expect(editRow).toBeDefined()
    expect(editRow.calculation).toBe("'FA001'")

    // No CSV data for page-only profiles
    expect(csvString).toBe('row_key')
  })
})

describe('Full round-trip: repeat group (Case B — single type, no free)', () => {
  const profile = makeProfile([
    {
      name: 'obs',
      label: 'Observations',
      type: 'repeat',
      sub_surveys: false,
      free_option: false,
      fields: [
        field({ name: 'species', label: 'Species', prefilled: 'readonly' }),
        field({ name: 'count', label: 'Count', widget: 'integer', prefilled: 'editable' }),
      ],
    },
  ])

  it('generates template with correct headers, validates, and produces deployment files', () => {
    // Step 1 — template
    const templateBytes = generateBlankTemplate(profile)
    const templateWb = parseXls(templateBytes)
    const headers = XLSX.utils.sheet_to_json(templateWb.Sheets.obs, { header: 1 })[0]
    expect(headers).toEqual(['species', 'count'])

    // Step 2 — fill
    const filledWb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(filledWb, XLSX.utils.aoa_to_sheet([
      ['species', 'count'],
      ['sparrow', '5'],
      ['robin', '3'],
    ]), 'obs')

    // Step 3 — validate
    const validation = validateUploadedTemplate(filledWb, profile)
    expect(validation.valid).toBe(true)
    expect(validation.parsedData.repeatRows.obs).toHaveLength(2)

    // Step 4 — deploy
    const { xlsformBytes, csvString } = generateDeploymentFiles(profile, validation.parsedData)
    const wb = parseXls(xlsformBytes)
    const survey = getSurveyRows(wb)

    // Should have baked selector calc for sole type
    const selectorCalc = survey.find((r) => r.name?.includes('sub_survey_selector'))
    expect(selectorCalc).toBeDefined()
    expect(selectorCalc.calculation).toBe("'structured_survey'")

    // CSV should contain data rows
    const csvLines = csvString.split('\n')
    expect(csvLines[0]).toBe('row_key,species,count')
    expect(csvLines[1]).toBe('structured_survey_1,sparrow,5')
    expect(csvLines[2]).toBe('structured_survey_2,robin,3')
  })
})

describe('Full round-trip: repeat group with select_one readonly', () => {
  const profile = makeProfile([
    {
      name: 'taxa',
      label: 'Taxa',
      type: 'repeat',
      sub_surveys: false,
      free_option: false,
      fields: [
        field({
          name: 'habitat',
          label: 'Habitat',
          widget: 'select_one',
          prefilled: 'readonly',
          choices: [
            { value: 'forest', label: 'Forest' },
            { value: 'marsh', label: 'Marsh' },
          ],
        }),
      ],
    },
  ])

  it('template includes _display column, validation checks choices, deployment emits choices', () => {
    // Template
    const templateBytes = generateBlankTemplate(profile)
    const templateWb = parseXls(templateBytes)
    const headers = XLSX.utils.sheet_to_json(templateWb.Sheets.taxa, { header: 1 })[0]
    expect(headers).toContain('habitat')
    expect(headers).toContain('habitat_display')

    // Fill + validate
    const filledWb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(filledWb, XLSX.utils.aoa_to_sheet([
      ['habitat', 'habitat_display'],
      ['forest', 'Forest'],
    ]), 'taxa')
    const validation = validateUploadedTemplate(filledWb, profile)
    expect(validation.valid).toBe(true)

    // Deploy
    const { xlsformBytes, csvString } = generateDeploymentFiles(profile, validation.parsedData)
    const wb = parseXls(xlsformBytes)
    const choices = getChoiceRows(wb)

    // Choices should contain habitat_list entries
    const habitatChoices = choices.filter((c) => c.list_name === 'habitat_list')
    expect(habitatChoices.length).toBe(2)
    expect(habitatChoices.map((c) => c.name).sort()).toEqual(['forest', 'marsh'])

    // CSV should have _display column
    const csvLines = csvString.split('\n')
    expect(csvLines[0]).toContain('habitat_display')
  })
})

describe('Full round-trip: repeat group with sub-surveys (Case C)', () => {
  const profile = makeProfile([
    {
      name: 'survey_group',
      label: 'Multi-type Survey',
      type: 'repeat',
      sub_surveys: true,
      free_option: false,
      fields: [
        field({ name: 'species', label: 'Species', prefilled: 'readonly' }),
      ],
    },
  ])

  it('validates sub-survey types and produces selector group', () => {
    const filledWb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(filledWb, XLSX.utils.aoa_to_sheet([
      ['_survey_type', 'species'],
      ['Birds', 'sparrow'],
      ['Birds', 'robin'],
      ['Mammals', 'fox'],
    ]), 'survey_group')

    const validation = validateUploadedTemplate(filledWb, profile)
    expect(validation.valid).toBe(true)
    expect(validation.parsedData.surveyTypes.survey_group).toHaveLength(2)

    const { xlsformBytes } = generateDeploymentFiles(profile, validation.parsedData)
    const wb = parseXls(xlsformBytes)
    const survey = getSurveyRows(wb)

    // Should have a selector group with select_one survey_type
    const selectorRow = survey.find((r) => r.type === 'select_one survey_type_survey_group')
    expect(selectorRow).toBeDefined()

    // Should have survey_type choices
    const choices = getChoiceRows(wb)
    const stChoices = choices.filter((c) => c.list_name === 'survey_type_survey_group')
    expect(stChoices.length).toBe(2)
    expect(stChoices.map((c) => c.name).sort()).toEqual(['birds', 'mammals'])
  })
})

describe('Full round-trip: Case D (free + prefilled)', () => {
  const profile = makeProfile([
    {
      name: 'mixed',
      label: 'Mixed Group',
      type: 'repeat',
      sub_surveys: false,
      free_option: true,
      fields: [
        field({ name: 'item', label: 'Item', prefilled: 'readonly' }),
      ],
    },
  ])

  it('emits both prefilled and free repeat blocks', () => {
    const filledWb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(filledWb, XLSX.utils.aoa_to_sheet([
      ['item'],
      ['alpha'],
      ['beta'],
    ]), 'mixed')

    const validation = validateUploadedTemplate(filledWb, profile)
    expect(validation.valid).toBe(true)

    const { xlsformBytes } = generateDeploymentFiles(profile, validation.parsedData)
    const wb = parseXls(xlsformBytes)
    const survey = getSurveyRows(wb)

    // Should have both repeat blocks
    const beginRepeats = survey.filter((r) => r.type === 'begin_repeat')
    expect(beginRepeats.length).toBe(2)
    expect(beginRepeats.map((r) => r.name)).toContain('mixed')
    expect(beginRepeats.map((r) => r.name)).toContain('mixed_FREE_SURVEY_')

    // Free repeat should have __free_survey__ relevant
    const freeRepeat = beginRepeats.find((r) => r.name === 'mixed_FREE_SURVEY_')
    expect(freeRepeat.relevant).toContain('__free_survey__')
  })
})

describe('Case A — no prefill, no template needed', () => {
  const profile = makeProfile([
    {
      name: 'notes',
      label: 'Notes',
      type: 'repeat',
      fields: [
        field({ name: 'comment', label: 'Comment' }),
      ],
    },
  ])

  it('deployment works without any parsed data', () => {
    const { xlsformBytes, csvString } = generateDeploymentFiles(profile, null)
    const wb = parseXls(xlsformBytes)
    const survey = getSurveyRows(wb)

    expect(survey[0].type).toBe('begin_repeat')
    expect(survey[1].type).toBe('calculate')
    expect(survey[1].name).toBe('_survey_type')
    expect(csvString).toBe('row_key')
  })

  it('template has no sheet for this group', () => {
    const templateBytes = generateBlankTemplate(profile)
    const templateWb = parseXls(templateBytes)
    expect(templateWb.SheetNames).not.toContain('notes')
  })
})

describe('Mixed profile: page + repeat groups together', () => {
  const profile = makeProfile([
    {
      name: 'site_info',
      label: 'Site Info',
      type: 'page',
      fields: [
        field({ name: 'location', label: 'Location', prefilled: 'readonly' }),
      ],
    },
    {
      name: 'measurements',
      label: 'Measurements',
      type: 'repeat',
      sub_surveys: false,
      free_option: false,
      fields: [
        field({ name: 'value', label: 'Value', widget: 'decimal', prefilled: 'editable' }),
      ],
    },
  ])

  it('generates template with both sheets and processes both groups', () => {
    const templateBytes = generateBlankTemplate(profile)
    const templateWb = parseXls(templateBytes)
    expect(templateWb.SheetNames).toContain('site_info')
    expect(templateWb.SheetNames).toContain('measurements')

    // Fill both sheets
    const filledWb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(filledWb, XLSX.utils.aoa_to_sheet([
      ['field_name', 'value'],
      ['location', 'Alpine Meadow'],
    ]), 'site_info')
    XLSX.utils.book_append_sheet(filledWb, XLSX.utils.aoa_to_sheet([
      ['value'],
      ['3.14'],
      ['2.71'],
    ]), 'measurements')

    const validation = validateUploadedTemplate(filledWb, profile)
    expect(validation.valid).toBe(true)

    const { xlsformBytes, csvString } = generateDeploymentFiles(profile, validation.parsedData)
    const wb = parseXls(xlsformBytes)
    const survey = getSurveyRows(wb)

    // Page group rows
    const pageBegin = survey.find((r) => r.type === 'begin_group' && r.name === 'site_info')
    expect(pageBegin).toBeDefined()

    // Repeat group rows
    const repeatBegin = survey.find((r) => r.type === 'begin_repeat' && r.name === 'measurements')
    expect(repeatBegin).toBeDefined()

    // CSV includes data
    const csvLines = csvString.split('\n')
    expect(csvLines[0]).toBe('row_key,value')
    expect(csvLines).toHaveLength(3) // header + 2 data rows
  })
})
