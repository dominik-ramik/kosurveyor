import { describe, it, expect } from 'vitest'
import { getGroup, getAllGroups } from '../src/plugins/groups/index.js'
import { getField } from '../src/plugins/fields/index.js'

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
    emitSurveyTypeChoices: () => {},
    getSurveyTypeEntries: (group, parsedData, subSurveys) => {
      if (subSurveys && parsedData.surveyTypes && parsedData.surveyTypes[group.name]) {
        return parsedData.surveyTypes[group.name]
      }
      const rowCount = parsedData.repeatRows && parsedData.repeatRows[group.name]
        ? parsedData.repeatRows[group.name].length
        : 0
      return [{ label: 'Structured survey', code: 'structured_survey', repeatCount: rowCount }]
    },
    emitSelectorGroup: (group, selectorCalcName, ctx) => {
      ctx.surveyRows.push({
        type: 'begin_group',
        name: `_${group.name}_survey_type_selector`,
        label: 'This survey supports multiple types',
      })
      ctx.surveyRows.push({
        type: 'select_one survey_type',
        name: selectorCalcName,
        label: 'Select survey type',
        appearance: 'quick',
        required: 'yes',
      })
      ctx.surveyRows.push({ type: 'end_group' })
    },
    pushFieldRows: (field, group, context) => {
      // Mock implementation of pushFieldRows
      return [{ type: field.widget, name: field.name, label: field.label }]
    },
    ...overrides,
  }
}

function makeCtx(overrides = {}) {
  return {
    surveyRows: [],
    choiceRows: [],
    choiceListsEmitted: new Set(),
    formIdStem: 'test_form',
    parsedData: { pageValues: {}, repeatRows: {}, surveyTypes: {} },
    ...overrides,
  }
}

// ─── Registry tests ──────────────────────────────────────────
describe('Group plugin registry', () => {
  it('getGroup("page") returns plugin with correct type, label, icon', () => {
    const p = getGroup('page')
    expect(p).not.toBeNull()
    expect(p.type).toBe('page')
    expect(p.label).toBe('Page')
    expect(p.icon).toBe('mdi-file-document-outline')
  })

  it('getGroup("repeat") returns plugin with correct type, label, icon', () => {
    const p = getGroup('repeat')
    expect(p).not.toBeNull()
    expect(p.type).toBe('repeat')
    expect(p.label).toBe('Repeat Group')
    expect(p.icon).toBe('mdi-repeat')
  })

  it('getGroup("unknown") returns null', () => {
    expect(getGroup('unknown')).toBeNull()
  })

  it('getAllGroups() returns exactly 2 plugins', () => {
    expect(getAllGroups()).toHaveLength(2)
  })

  it('every plugin has generateSurveyRows, generateTemplateSheet, validateTemplateSheet functions', () => {
    for (const p of getAllGroups()) {
      expect(typeof p.generateSurveyRows).toBe('function')
      expect(typeof p.generateTemplateSheet).toBe('function')
      expect(typeof p.validateTemplateSheet).toBe('function')
    }
  })
})

// ─── getSummaryBadges ────────────────────────────────────────
describe('getSummaryBadges', () => {
  it('page.getSummaryBadges returns []', () => {
    expect(getGroup('page').getSummaryBadges({})).toEqual([])
  })

  it('repeat: group with sub_surveys=true includes sub-surveys badge', () => {
    const badges = getGroup('repeat').getSummaryBadges({
      sub_surveys: true,
      fields: [{ prefilled: 'readonly' }],
    })
    expect(badges.some(b => b.label === 'sub-surveys')).toBe(true)
  })

  it('repeat: group with no prefill fields → free option badge is forced (has lock icon)', () => {
    const badges = getGroup('repeat').getSummaryBadges({
      fields: [{ name: 'f1', widget: 'text' }],
    })
    const freeBadge = badges.find(b => b.label === 'free option')
    expect(freeBadge).toBeDefined()
    expect(freeBadge.icon).toBe('mdi-lock')
  })

  it('repeat: group with max_repeat set → free option badge shows max', () => {
    const badges = getGroup('repeat').getSummaryBadges({
      max_repeat: 5,
      fields: [],
    })
    expect(badges.some(b => b.label === 'free option, max: 5')).toBe(true)
  })

  it('repeat: group with free_option=false and has prefill → no free option badge', () => {
    const badges = getGroup('repeat').getSummaryBadges({
      free_option: false,
      fields: [{ prefilled: 'readonly' }],
    })
    expect(badges.find(b => b.label === 'free option')).toBeUndefined()
  })
})

// ─── generateSurveyRows ─────────────────────────────────────
describe('page.generateSurveyRows', () => {
  it('produces begin_group with appearance field-list, field rows, end_group', () => {
    const group = {
      name: 'meta',
      label: 'Metadata',
      type: 'page',
      fields: [{ name: 'f1', label: 'F1', widget: 'text' }],
    }
    const ctx = makeCtx()
    getGroup('page').generateSurveyRows(group, ctx, makeHelpers())

    expect(ctx.surveyRows[0].type).toBe('begin_group')
    expect(ctx.surveyRows[0].appearance).toBe('field-list')
    expect(ctx.surveyRows[1].type).toBe('text')
    expect(ctx.surveyRows[1].name).toBe('f1')
    expect(ctx.surveyRows[ctx.surveyRows.length - 1].type).toBe('end_group')
  })
})

describe('repeat.generateSurveyRows', () => {
  it('Case A (no prefill): produces begin_repeat, _survey_type calc, fields, end_repeat', () => {
    const group = {
      name: 'obs',
      label: 'Observations',
      type: 'repeat',
      fields: [{ name: 'note_field', label: 'Note', widget: 'text' }],
    }
    const ctx = makeCtx()
    getGroup('repeat').generateSurveyRows(group, ctx, makeHelpers())

    expect(ctx.surveyRows[0].type).toBe('begin_repeat')
    expect(ctx.surveyRows[0].name).toBe('obs')
    expect(ctx.surveyRows[1].type).toBe('calculate')
    expect(ctx.surveyRows[1].name).toBe('_survey_type')
    expect(ctx.surveyRows[1].calculation).toBe("'__free_survey__'")
    expect(ctx.surveyRows[2].type).toBe('text')
    expect(ctx.surveyRows[3].type).toBe('end_repeat')
  })

  it('Case B (prefill, no free option, 1 type): produces selector calc, begin_repeat with repeat_count', () => {
    const group = {
      name: 'transect',
      label: 'Transect',
      type: 'repeat',
      sub_surveys: false,
      free_option: false,
      fields: [{ name: 'species', label: 'Species', widget: 'text', prefilled: 'readonly' }],
    }
    const ctx = makeCtx({
      parsedData: {
        pageValues: {},
        repeatRows: { transect: [{ species: 'sparrow' }] },
        surveyTypes: {},
      },
    })
    getGroup('repeat').generateSurveyRows(group, ctx, makeHelpers())

    const selectorCalc = ctx.surveyRows.find(r => r.name === '_transect_sub_survey_selector_COLLECTOR_NODATA_')
    expect(selectorCalc).toBeDefined()
    expect(selectorCalc.type).toBe('calculate')
    const beginRepeat = ctx.surveyRows.find(r => r.type === 'begin_repeat')
    expect(beginRepeat.repeat_count).toContain("instance('survey_type_transect')")
  })

  it('Case C (prefill, no free option, >1 types): produces selector group, begin_repeat with relevant', () => {
    const group = {
      name: 'obs',
      label: 'Observations',
      type: 'repeat',
      sub_surveys: true,
      free_option: false,
      fields: [{ name: 'species', label: 'Species', widget: 'text', prefilled: 'readonly' }],
    }
    const ctx = makeCtx({
      parsedData: {
        pageValues: {},
        repeatRows: { obs: [{ _survey_type: 'Birds', species: 'sparrow' }, { _survey_type: 'Mammals', species: 'fox' }] },
        surveyTypes: {
          obs: [
            { label: 'Birds', code: 'birds', repeatCount: 1 },
            { label: 'Mammals', code: 'mammals', repeatCount: 1 },
          ],
        },
      },
    })
    getGroup('repeat').generateSurveyRows(group, ctx, makeHelpers())

    const selectorGroup = ctx.surveyRows.find(r => r.name === '_obs_survey_type_selector')
    expect(selectorGroup).toBeDefined()
    const selectorWidget = ctx.surveyRows.find(r => r.type === 'select_one survey_type')
    expect(selectorWidget).toBeDefined()
    const beginRepeat = ctx.surveyRows.find(r => r.type === 'begin_repeat')
    expect(beginRepeat.relevant).toContain('!=')
  })

  it('Case D (prefill + free option): produces selector group, prefilled repeat, free repeat', () => {
    const group = {
      name: 'obs',
      label: 'Observations',
      type: 'repeat',
      sub_surveys: false,
      free_option: true,
      fields: [
        { name: 'species', label: 'Species', widget: 'text', prefilled: 'readonly' },
        { name: 'comment', label: 'Comment', widget: 'text' },
      ],
    }
    const ctx = makeCtx({
      parsedData: {
        pageValues: {},
        repeatRows: { obs: [{ species: 'sparrow' }] },
        surveyTypes: {},
      },
    })
    getGroup('repeat').generateSurveyRows(group, ctx, makeHelpers())

    const beginRepeats = ctx.surveyRows.filter(r => r.type === 'begin_repeat')
    expect(beginRepeats).toHaveLength(2)
    expect(beginRepeats[0].relevant).toContain("!= '__free_survey__'")
    expect(beginRepeats[1].relevant).toContain("= '__free_survey__'")
  })
})
