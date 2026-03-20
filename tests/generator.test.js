import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { generateDeploymentFiles } from '../src/logic/xlsform/generator.js'

function parseXls(bytes) {
  return XLSX.read(bytes, { type: 'array' })
}

function getSheet(wb, name) {
  return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
}

function getSurveyRows(wb) {
  const aoa = getSheet(wb, 'survey')
  const headers = aoa[0]
  return aoa.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = r[i] })
    return obj
  })
}

function getChoiceRows(wb) {
  const aoa = getSheet(wb, 'choices')
  const headers = aoa[0]
  return aoa.slice(1).map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = r[i] })
    return obj
  })
}

function makeProfile(groups, overrides = {}) {
  return {
    profile_name: 'Test Survey',
    profile_description: '',
    profile_author: '',
    form_id_stem: 'test_form',
    groups,
    ...overrides,
  }
}

function field(overrides) {
  return { name: 'f1', label: 'Field 1', widget: 'text', ...overrides }
}

// ─── Test 1: Case A (no prefill fields) ─────────────────────
describe('Case A — no prefill fields', () => {
  it('emits single repeat with _survey_type = __free_survey__, no row_idx, no selector', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        fields: [field({ name: 'note_field', widget: 'text' })],
      },
    ])
    const { xlsformBytes } = generateDeploymentFiles(profile, null)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    expect(rows[0].type).toBe('begin_repeat')
    expect(rows[0].name).toBe('obs')
    // _survey_type is First row after begin_repeat
    expect(rows[1].type).toBe('calculate')
    expect(rows[1].name).toBe('_survey_type')
    expect(rows[1].calculation).toBe("'__free_survey__'")
    // No row_idx calculate
    const rowIdxRow = rows.find((r) => r.name && r.name.includes('COLLECTOR_NODATA_row_idx'))
    expect(rowIdxRow).toBeUndefined()
    // No selector widget
    const selectorRow = rows.find((r) => r.type && r.type.startsWith('select_one survey_type'))
    expect(selectorRow).toBeUndefined()
    // Plain user input field
    expect(rows[2].type).toBe('text')
    expect(rows[2].name).toBe('note_field')
    expect(rows[3].type).toBe('end_repeat')
  })
})

// ─── Test 2: Case B (one type, no free option) ──────────────
describe('Case B — one type, no free option', () => {
  it('emits baked-constant selector calc, row_idx, single prefilled repeat', () => {
    const profile = makeProfile([
      {
        name: 'transect',
        label: 'Transect',
        type: 'repeat',
        sub_surveys: false,
        free_option: false,
        fields: [field({ name: 'species', prefilled: 'readonly' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { transect: [{ row_key: '', species: 'sparrow' }] },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    // Baked constant selector calculate
    const selectorCalc = rows.find((r) => r.name === '_transect_sub_survey_selector_COLLECTOR_NODATA_')
    expect(selectorCalc).toBeDefined()
    expect(selectorCalc.type).toBe('calculate')
    expect(selectorCalc.calculation).toBe("'structured_survey'")

    // begin_repeat with repeat_count
    const beginRepeat = rows.find((r) => r.type === 'begin_repeat')
    expect(beginRepeat.repeat_count).toContain("instance('survey_type')")

    // row_idx calc
    const rowIdx = rows.find((r) => r.name === 'transect_COLLECTOR_NODATA_row_idx')
    expect(rowIdx).toBeDefined()
    expect(rowIdx.type).toBe('calculate')

    // _survey_type
    const surveyType = rows.find((r) => r.name === '_survey_type')
    expect(surveyType).toBeDefined()

    // No selector widget
    const selectorWidget = rows.find((r) => r.type && r.type.startsWith('select_one survey_type'))
    expect(selectorWidget).toBeUndefined()

    // No free repeat
    const endRepeats = rows.filter((r) => r.type === 'end_repeat')
    expect(endRepeats).toHaveLength(1)
  })
})

// ─── Test 3: Case C (multi-type, no free option) ────────────
describe('Case C — multi-type, no free option', () => {
  it('emits selector group + widget, prefilled repeat with relevant, no free repeat', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: true,
        free_option: false,
        fields: [field({ name: 'species', prefilled: 'readonly' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: {
        obs: [
          { row_key: '', _survey_type: 'Birds', species: 'sparrow' },
          { row_key: '', _survey_type: 'Mammals', species: 'fox' },
        ],
      },
      surveyTypes: {
        obs: [
          { label: 'Birds', code: 'birds', repeatCount: 1 },
          { label: 'Mammals', code: 'mammals', repeatCount: 1 },
        ],
      },
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    // Selector group
    const selectorGroup = rows.find((r) => r.name === '_obs_survey_type_selector')
    expect(selectorGroup).toBeDefined()
    expect(selectorGroup.type).toBe('begin_group')

    // Selector widget
    const selectorWidget = rows.find((r) => r.type === 'select_one survey_type')
    expect(selectorWidget).toBeDefined()
    expect(selectorWidget.appearance).toBe('quick')
    expect(selectorWidget.required).toBe('yes')

    // Prefilled repeat with relevant
    const beginRepeat = rows.find((r) => r.type === 'begin_repeat')
    expect(beginRepeat.relevant).toContain('!=')

    // No free repeat
    const endRepeats = rows.filter((r) => r.type === 'end_repeat')
    expect(endRepeats).toHaveLength(1)
  })
})

// ─── Test 4: Case D (free option + prefill) ─────────────────
describe('Case D — free option + prefill', () => {
  it('emits selector, prefilled repeat with relevant != __free_survey__, free repeat with relevant = __free_survey__', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: false,
        free_option: true,
        fields: [
          field({ name: 'species', prefilled: 'readonly' }),
          field({ name: 'comment', widget: 'text' }),
        ],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { obs: [{ row_key: '', species: 'sparrow', comment: '' }] },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    // Find repeats
    const beginRepeats = rows.filter((r) => r.type === 'begin_repeat')
    expect(beginRepeats).toHaveLength(2)

    // Prefilled repeat: relevant != '__free_survey__'
    expect(beginRepeats[0].relevant).toContain("!= '__free_survey__'")

    // Free repeat: relevant = '__free_survey__'
    expect(beginRepeats[1].relevant).toContain("= '__free_survey__'")

    // Both have _survey_type
    const surveyTypes = rows.filter((r) => r.name === '_survey_type')
    expect(surveyTypes).toHaveLength(2)
  })
})

// ─── Test 5: image prefilled readonly in repeat ──────────────
describe('image prefilled readonly in repeat', () => {
  it('emits 3-row pattern with media::image and big-image', () => {
    const profile = makeProfile([
      {
        name: 'photos',
        label: 'Photos',
        type: 'repeat',
        sub_surveys: false,
        free_option: false,
        fields: [field({ name: 'photo', widget: 'image', prefilled: 'readonly' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { photos: [{ row_key: '', photo: 'img001.jpg' }] },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    // Find the 3 rows for this field
    const calcRow = rows.find((r) => r.name === 'photo_COLLECTOR_NODATA_calc')
    expect(calcRow).toBeDefined()
    expect(calcRow.type).toBe('calculate')
    expect(calcRow.calculation).toContain('pulldata')

    const noteRow = rows.find((r) => r.name === 'photo_COLLECTOR_NODATA_note')
    expect(noteRow).toBeDefined()
    expect(noteRow['media::image']).toContain('photo_COLLECTOR_NODATA_calc')
    expect(noteRow['big-image']).toContain('photo_COLLECTOR_NODATA_calc')

    const canonicalCalc = rows.find((r) => r.name === 'photo' && r.type === 'calculate')
    expect(canonicalCalc).toBeDefined()
    expect(canonicalCalc.calculation).toContain('photo_COLLECTOR_NODATA_calc')
  })
})

// ─── Test 6: select_one prefilled readonly in repeat ─────────
describe('select_one prefilled readonly in repeat', () => {
  it('emits 4-row pattern including display-label calc', () => {
    const profile = makeProfile([
      {
        name: 'selections',
        label: 'Selections',
        type: 'repeat',
        sub_surveys: false,
        free_option: false,
        fields: [
          field({
            name: 'habitat',
            widget: 'select_one',
            prefilled: 'readonly',
            choices: [
              { value: 'forest', label: 'Forest' },
              { value: 'grassland', label: 'Grassland' },
            ],
          }),
        ],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { selections: [{ row_key: '', habitat: 'forest', habitat_display: 'Forest' }] },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    const calcRow = rows.find((r) => r.name === 'habitat_COLLECTOR_NODATA_calc')
    expect(calcRow).toBeDefined()

    const displayCalc = rows.find((r) => r.name === 'habitat_display_COLLECTOR_NODATA_calc')
    expect(displayCalc).toBeDefined()
    expect(displayCalc.calculation).toContain('habitat_display')

    const noteRow = rows.find((r) => r.name === 'habitat_COLLECTOR_NODATA_note')
    expect(noteRow).toBeDefined()
    expect(noteRow.label).toContain('habitat_display_COLLECTOR_NODATA_calc')

    const canonical = rows.find((r) => r.name === 'habitat' && r.type === 'calculate')
    expect(canonical).toBeDefined()
  })
})

// ─── Test 7: select_one prefilled readonly in free repeat ────
describe('select_one prefilled readonly in free repeat', () => {
  it('uses scoped name {field}_{free_group}_COLLECTOR_NODATA_ and canonical calculate', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: false,
        free_option: true,
        fields: [
          field({
            name: 'habitat',
            widget: 'select_one',
            prefilled: 'readonly',
            choices: [{ value: 'forest', label: 'Forest' }],
          }),
        ],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { obs: [{ row_key: '', habitat: 'forest', habitat_display: 'Forest' }] },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    // Find free repeat rows (after the second begin_repeat)
    const beginRepeats = rows.filter((r) => r.type === 'begin_repeat')
    expect(beginRepeats.length).toBeGreaterThanOrEqual(2)

    const freeGroupName = 'obs_FREE_SURVEY_obs'
    const scopedName = `habitat_${freeGroupName}_COLLECTOR_NODATA_`
    const scopedRow = rows.find((r) => r.name === scopedName)
    expect(scopedRow).toBeDefined()
    expect(scopedRow.type).toContain('select_one')

    // Canonical calculate
    const calcRow = rows.filter((r) => r.name === 'habitat' && r.type === 'calculate')
    expect(calcRow.length).toBeGreaterThanOrEqual(1)
    const freeCalc = calcRow.find((r) => r.calculation.includes(scopedName))
    expect(freeCalc).toBeDefined()
  })
})

// ─── Test 8: Choice sheet with survey type entries ───────────
describe('Choice sheet — survey type entries', () => {
  it('emits survey_type choices with correct repeat_count', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: true,
        free_option: false,
        fields: [field({ name: 'species', prefilled: 'readonly' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: {
        obs: [
          { row_key: '', _survey_type: 'Birds', species: 'sparrow' },
          { row_key: '', _survey_type: 'Birds', species: 'robin' },
          { row_key: '', _survey_type: 'Mammals', species: 'fox' },
        ],
      },
      surveyTypes: {
        obs: [
          { label: 'Birds', code: 'birds', repeatCount: 2 },
          { label: 'Mammals', code: 'mammals', repeatCount: 1 },
        ],
      },
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const choices = getChoiceRows(wb)

    const stChoices = choices.filter((c) => c.list_name === 'survey_type')
    expect(stChoices).toHaveLength(2)
    const birds = stChoices.find((c) => c.name === 'birds')
    expect(Number(birds.repeat_count)).toBe(2)
    const mammals = stChoices.find((c) => c.name === 'mammals')
    expect(Number(mammals.repeat_count)).toBe(1)
  })
})

// ─── Test 9: Data CSV — row_key derivation ───────────────────
describe('Data CSV', () => {
  it('derives correct row_key for sub_surveys: false', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: false,
        fields: [field({ name: 'species', prefilled: 'readonly' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { obs: [{ species: 'sparrow' }, { species: 'robin' }] },
      surveyTypes: {},
    }
    const { csvString } = generateDeploymentFiles(profile, parsedData)
    const lines = csvString.split('\n')
    expect(lines[0]).toBe('row_key,species')
    expect(lines[1]).toContain('structured_survey_1')
    expect(lines[2]).toContain('structured_survey_2')
  })

  it('derives correct row_key for sub_surveys: true', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: true,
        fields: [field({ name: 'species', prefilled: 'readonly' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: {
        obs: [
          { _survey_type: 'Birds', species: 'sparrow' },
          { _survey_type: 'Birds', species: 'robin' },
          { _survey_type: 'Mammals', species: 'fox' },
        ],
      },
      surveyTypes: {
        obs: [
          { label: 'Birds', code: 'birds', repeatCount: 2 },
          { label: 'Mammals', code: 'mammals', repeatCount: 1 },
        ],
      },
    }
    const { csvString } = generateDeploymentFiles(profile, parsedData)
    const lines = csvString.split('\n')
    expect(lines[1]).toContain('birds_1')
    expect(lines[2]).toContain('birds_2')
    expect(lines[3]).toContain('mammals_1')
  })
})

// ─── Test 10: label prefilled readonly in repeat ─────────────
describe('label prefilled readonly in repeat', () => {
  it('emits 2 rows: calculate + note displaying ${name}', () => {
    const profile = makeProfile([
      {
        name: 'info',
        label: 'Info',
        type: 'repeat',
        sub_surveys: false,
        free_option: false,
        fields: [field({ name: 'desc', widget: 'label', prefilled: 'readonly' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { info: [{ row_key: '', desc: 'Description text' }] },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    const calcRow = rows.find((r) => r.name === 'desc' && r.type === 'calculate')
    expect(calcRow).toBeDefined()
    expect(calcRow.calculation).toContain('pulldata')

    const noteRow = rows.find((r) => r.name === 'desc_COLLECTOR_NODATA_note')
    expect(noteRow).toBeDefined()
    expect(noteRow.label).toBe('${desc}')
  })
})

// ─── Test 11: prefilled editable in repeat ───────────────────
describe('prefilled editable in repeat', () => {
  it('uses once(pulldata(...)) with no COLLECTOR_NODATA scaffolding', () => {
    const profile = makeProfile([
      {
        name: 'meas',
        label: 'Measurements',
        type: 'repeat',
        sub_surveys: false,
        free_option: false,
        fields: [field({ name: 'length', widget: 'decimal', prefilled: 'editable' })],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: { meas: [{ row_key: '', length: '10.5' }] },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    const fieldRow = rows.find((r) => r.name === 'length')
    expect(fieldRow).toBeDefined()
    expect(fieldRow.type).toBe('decimal')
    expect(fieldRow.calculation).toContain('once(pulldata(')

    // No COLLECTOR_NODATA_calc or _note rows for this field
    const collectorRows = rows.filter(
      (r) => r.name && r.name.includes('length_COLLECTOR_NODATA_')
    )
    expect(collectorRows).toHaveLength(0)
  })
})

// ─── Test 12: Settings sheet ─────────────────────────────────
describe('Settings sheet', () => {
  it('has form_title, form_id, and version', () => {
    const profile = makeProfile([
      {
        name: 'g',
        label: 'G',
        type: 'repeat',
        fields: [field({ name: 'f1' })],
      },
    ])
    const { xlsformBytes } = generateDeploymentFiles(profile, null)
    const wb = parseXls(xlsformBytes)
    const data = getSheet(wb, 'settings')
    expect(data[0]).toContain('form_title')
    expect(data[0]).toContain('form_id')
    expect(data[0]).toContain('version')
    expect(data[1][0]).toBe('Test Survey')
    expect(data[1][1]).toBe('test_form')
    expect(data[1][2]).toMatch(/^\d{8}$/) // YYYYMMDD
  })
})

// ─── Test 13: filtered_by in free repeat ─────────────────────
describe('filtered_by in free repeat', () => {
  it('choice_filter references parent scoped _COLLECTOR_NODATA_ name', () => {
    const profile = makeProfile([
      {
        name: 'obs',
        label: 'Observations',
        type: 'repeat',
        sub_surveys: false,
        free_option: true,
        fields: [
          field({
            name: 'category',
            widget: 'select_one',
            prefilled: 'readonly',
            choices: [{ value: 'a', label: 'A' }],
          }),
          field({
            name: 'subcategory',
            widget: 'select_one',
            prefilled: 'readonly',
            filtered_by: 'category',
            choices: [{ value: 'a1', label: 'A1' }],
          }),
        ],
      },
    ])
    const parsedData = {
      pageValues: {},
      repeatRows: {
        obs: [
          { row_key: '', category: 'a', category_display: 'A', subcategory: 'a1', subcategory_display: 'A1' },
        ],
      },
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    const freeGroupName = 'obs_FREE_SURVEY_obs'
    const scopedSubcat = `subcategory_${freeGroupName}_COLLECTOR_NODATA_`
    const scopedRow = rows.find((r) => r.name === scopedSubcat)
    expect(scopedRow).toBeDefined()
    expect(scopedRow.choice_filter).toContain(`category_${freeGroupName}_COLLECTOR_NODATA_`)
  })
})

// ─── Test 14: Page group with prefilled readonly select ──────
describe('Page group with prefilled readonly select', () => {
  it('emits 2-row pattern with baked constant key and display label', () => {
    const profile = makeProfile([
      {
        name: 'meta',
        label: 'Metadata',
        type: 'page',
        fields: [
          field({
            name: 'region',
            widget: 'select_one',
            prefilled: 'readonly',
            choices: [
              { value: 'north', label: 'Northern Region' },
              { value: 'south', label: 'Southern Region' },
            ],
          }),
        ],
      },
    ])
    const parsedData = {
      pageValues: { meta: { region: 'north' } },
      repeatRows: {},
      surveyTypes: {},
    }
    const { xlsformBytes } = generateDeploymentFiles(profile, parsedData)
    const wb = parseXls(xlsformBytes)
    const rows = getSurveyRows(wb)

    const calcRow = rows.find((r) => r.name === 'region' && r.type === 'calculate')
    expect(calcRow).toBeDefined()
    expect(calcRow.calculation).toBe("'north'")

    const noteRow = rows.find((r) => r.name === 'region_display')
    expect(noteRow).toBeDefined()
    expect(noteRow.label).toContain('Northern Region')
  })
})

// ─── Test 15: Cascade select — choices sheet filter column ───
describe('Cascade select — choices sheet filter column', () => {
  it('emits parent column in choices sheet with correct filter_value per child choice', () => {
    const profile = makeProfile([
      {
        name: 'survey',
        label: 'Survey',
        type: 'page',
        fields: [
          field({
            name: 'category',
            widget: 'select_one',
            choices: [
              { value: 'animal', label: 'Animal' },
              { value: 'plant', label: 'Plant' },
            ],
          }),
          field({
            name: 'subcategory',
            widget: 'select_one',
            filtered_by: 'category',
            choices: [
              { value: 'mammal', label: 'Mammal', filter_value: 'animal' },
              { value: 'bird', label: 'Bird', filter_value: 'animal' },
              { value: 'tree', label: 'Tree', filter_value: 'plant' },
            ],
          }),
        ],
      },
    ])
    const { xlsformBytes } = generateDeploymentFiles(profile, null)
    const wb = parseXls(xlsformBytes)

    // choices sheet header must include the parent column 'category'
    const choicesAoa = getSheet(wb, 'choices')
    const headers = choicesAoa[0]
    expect(headers).toContain('category')

    const choices = getChoiceRows(wb)
    const subChoices = choices.filter((c) => c.list_name === 'subcategory_list')
    expect(subChoices).toHaveLength(3)

    const mammal = subChoices.find((c) => c.name === 'mammal')
    expect(mammal.category).toBe('animal')

    const tree = subChoices.find((c) => c.name === 'tree')
    expect(tree.category).toBe('plant')
  })

  it('parent choices have no extra filter column', () => {
    const profile = makeProfile([
      {
        name: 'survey',
        label: 'Survey',
        type: 'page',
        fields: [
          field({
            name: 'category',
            widget: 'select_one',
            choices: [
              { value: 'animal', label: 'Animal' },
            ],
          }),
          field({
            name: 'subcategory',
            widget: 'select_one',
            filtered_by: 'category',
            choices: [{ value: 'mammal', label: 'Mammal', filter_value: 'animal' }],
          }),
        ],
      },
    ])
    const { xlsformBytes } = generateDeploymentFiles(profile, null)
    const wb = parseXls(xlsformBytes)
    const choices = getChoiceRows(wb)

    const parentChoices = choices.filter((c) => c.list_name === 'category_list')
    expect(parentChoices).toHaveLength(1)
    // Parent choice rows should not have a 'category' column value
    expect(parentChoices[0].category).toBeFalsy()
  })
})
