import * as XLSX from 'xlsx'
import { getGroup } from '../../plugins/groups/index.js'
import { getField } from '../../plugins/fields/index.js'

/**
 * Main entry point: generates XLSForm xlsx + data CSV from profile + parsed template data.
 * @param {object} profile - The profile object
 * @param {object|null} parsedData - The parsedData from validateUploadedTemplate, or null
 * @returns {{ xlsformBytes: Uint8Array, csvString: string }}
 */
export function generateDeploymentFiles(profile, parsedData) {
  const ctx = {
    profile,
    parsedData: parsedData || { pageValues: {}, repeatRows: {}, surveyTypes: {} },
    formIdStem: profile.form_id_stem,
    surveyRows: [],
    choiceRows: [],
    choiceListsEmitted: new Set(),
  }

  const helpers = buildHelpers(ctx)

  // Process each group
  for (const group of profile.groups) {
    const plugin = getGroup(group.type)
    if (!plugin) throw new Error(`Unknown group type: ${group.type}`)
    plugin.generateSurveyRows(group, ctx, helpers)
  }

  // Build workbook
  const wb = XLSX.utils.book_new()

  // survey sheet
  const surveyHeaders = [
    'type', 'name', 'label', 'hint', 'required', 'appearance',
    'relevant', 'calculation', 'constraint', 'constraint_message',
    'choice_filter', 'parameters', 'repeat_count',
    'media::image', 'big-image', 'media::audio',
  ]
  const surveyAoa = [surveyHeaders, ...ctx.surveyRows.map((r) => surveyHeaders.map((h) => r[h] || ''))]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(surveyAoa), 'survey')

  // choices sheet — headers are dynamic: standard cols + any parent-filter cols + repeat_count
  const _choiceStatic = ['list_name', 'name', 'label']
  const _choiceTrailing = ['repeat_count']
  const _choiceExtra = []
  for (const row of ctx.choiceRows) {
    for (const key of Object.keys(row)) {
      if (!_choiceStatic.includes(key) && !_choiceTrailing.includes(key) && !_choiceExtra.includes(key)) {
        _choiceExtra.push(key)
      }
    }
  }
  const choiceHeaders = [..._choiceStatic, ..._choiceExtra, ..._choiceTrailing]
  const choicesAoa = [choiceHeaders, ...ctx.choiceRows.map((r) => choiceHeaders.map((h) => r[h] ?? ''))]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(choicesAoa), 'choices')

  // settings sheet
  const version = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const settingsAoa = [
    ['form_title', 'form_id', 'version', 'form_style', 'style'],
    [profile.profile_name, profile.form_id_stem, version, 'pages', 'pages'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(settingsAoa), 'settings')

  const xlsformBytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
  const csvString = buildDataCsv(profile, ctx.parsedData)

  return { xlsformBytes, csvString }
}

// ─── Helpers factory ─────────────────────────────────────────
function buildHelpers(ctx) {
  function _row(overrides) {
    return { ...overrides }
  }

  function _widgetType(field) {
    const map = {
      text: 'text', integer: 'integer', decimal: 'decimal',
      date: 'date', datetime: 'datetime', time: 'time',
      gps: 'geopoint', label: 'note', image: 'image', audio: 'audio',
    }
    return map[field.widget] || field.widget
  }

  function _pulldata(column, rowIdxName) {
    return `pulldata('${ctx.formIdStem}_data', '${column}', 'row_key', \${${rowIdxName}})`
  }

  function _getBakedValue(field, group) {
    const pv = ctx.parsedData.pageValues
    if (pv && pv[group.name] && pv[group.name][field.name] !== undefined) {
      return pv[group.name][field.name]
    }
    return ''
  }

  function _getChoiceLabelForKey(field, key) {
    if (!field.choices) return key
    const choice = field.choices.find((c) => c.value === key)
    return choice ? choice.label : key
  }

  function _emitChoices(field, listName) {
    if (ctx.choiceListsEmitted.has(listName)) return
    ctx.choiceListsEmitted.add(listName)
    if (!field.choices) return
    const filterColumn = field.filtered_by || null
    for (const choice of field.choices) {
      if (!choice.value) continue
      const row = {
        list_name: listName,
        name: choice.value,
        label: choice.label,
        repeat_count: '',
      }
      if (filterColumn) {
        row[filterColumn] = choice.filter_value || ''
      }
      ctx.choiceRows.push(row)
    }
  }

  function _buildChoiceFilter(field, context, group) {
    const parentName = field.filtered_by
    if (context === 'free_repeat') {
      const freeGroupName = `${group.name}_FREE_SURVEY_`
      const scopedParentName = `${parentName}_${freeGroupName}_COLLECTOR_NODATA_`
      return `${parentName} = \${${scopedParentName}}`
    }
    return `${parentName} = \${${parentName}}`
  }

  function _getSurveyTypeEntries(group, parsedData, subSurveys) {
    if (subSurveys && parsedData.surveyTypes && parsedData.surveyTypes[group.name]) {
      return parsedData.surveyTypes[group.name]
    }
    const rowCount = parsedData.repeatRows && parsedData.repeatRows[group.name]
      ? parsedData.repeatRows[group.name].length
      : 0
    return [{
      label: 'Structured survey',
      code: 'structured_survey',
      repeatCount: rowCount,
    }]
  }

  function _emitSurveyTypeChoices(entries, includeFreeOption, _ctx, groupName) {
    const listName = `survey_type_${groupName}`
    for (const entry of entries) {
      const dedupKey = `${listName}_${entry.code}`
      if (!_ctx.choiceListsEmitted.has(dedupKey)) {
        _ctx.choiceRows.push({
          list_name: listName,
          name: entry.code,
          label: entry.label,
          repeat_count: String(entry.repeatCount),
        })
        _ctx.choiceListsEmitted.add(dedupKey)
      }
    }
    if (includeFreeOption) {
      const freeDedupKey = `${listName}___free_survey__`
      if (!_ctx.choiceListsEmitted.has(freeDedupKey)) {
        _ctx.choiceRows.push({
          list_name: listName,
          name: '__free_survey__',
          label: '(freeform survey)',
          repeat_count: '',
        })
        _ctx.choiceListsEmitted.add(freeDedupKey)
      }
    }
  }

  function _emitSelectorGroup(group, selectorCalcName, _ctx) {
    _ctx.surveyRows.push(_row({
      type: 'begin_group',
      name: `_${group.name}_survey_type_selector`,
      label: 'This survey supports multiple types',
    }))
    _ctx.surveyRows.push(_row({
      type: `select_one survey_type_${group.name}`,
      name: selectorCalcName,
      label: 'Select survey type',
      appearance: 'quick',
      required: 'yes',
    }))
    _ctx.surveyRows.push(_row({ type: 'end_group' }))
  }

  // Row types that are never interactive inputs — required must never be set on them.
  // Note: the label widget always emits 'note' or 'calculate', so it is covered here too.
  const NON_INPUT_TYPES = new Set([
    'calculate', 'note',
    'begin_repeat', 'end_repeat',
    'begin_group', 'end_group',
  ])

  // relevant is applied to interactive inputs AND notes (notes are visible elements),
  // but not to calculate or structural group/repeat markers.
  const RELEVANT_SKIP_TYPES = new Set([
    'calculate',
    'begin_repeat', 'end_repeat',
    'begin_group', 'end_group',
  ])

  function _pushFieldRows(field, group, context) {
    const plugin = getField(field.widget)
    const rows = plugin.expandSurveyRows(field, group, context, helpers)
    for (const r of rows) {
      if (field.required && !NON_INPUT_TYPES.has(r.type)) {
        r.required = 'yes'
      }
      if (field.relevant && !RELEVANT_SKIP_TYPES.has(r.type)) {
        r.relevant = field.relevant
      }
      ctx.surveyRows.push(r)
    }
  }

  const helpers = {
    row:                   _row,
    widgetType:            _widgetType,
    pulldata:              _pulldata,
    getBakedValue:         _getBakedValue,
    getChoiceLabelForKey:  _getChoiceLabelForKey,
    emitChoices:           _emitChoices,
    buildChoiceFilter:     _buildChoiceFilter,
    getField,
    getSurveyTypeEntries:  _getSurveyTypeEntries,
    emitSurveyTypeChoices: _emitSurveyTypeChoices,
    emitSelectorGroup:     _emitSelectorGroup,
    pushFieldRows:         _pushFieldRows,
  }

  return helpers
}

// ─── Data template spreadsheet construction ───────────────────────────────────
function buildDataCsv(profile, parsedData) {
  const columns = ['row_key']
  const groupFieldMap = []

  for (const group of profile.groups) {
    if (group.type !== 'repeat') continue
    const hasPrefill = group.fields.some((f) => f.prefilled === 'readonly' || f.prefilled === 'editable')
    if (!hasPrefill) continue

    for (const field of group.fields) {
      if (field.prefilled !== 'readonly' && field.prefilled !== 'editable') continue
      const plugin = getField(field.widget)
      const cols = plugin.getTemplateColumns(field)
      for (const col of cols) {
        columns.push(col)
        groupFieldMap.push({ groupName: group.name, fieldName: col, isDisplay: col !== field.name })
      }
    }
  }

  if (columns.length <= 1) return columns.join(',')

  const dataRows = []
  const typeCounters = new Map()

  for (const group of profile.groups) {
    if (group.type !== 'repeat') continue
    const rows = parsedData.repeatRows && parsedData.repeatRows[group.name]
    if (!rows || rows.length === 0) continue

    const subSurveys = group.sub_surveys === true
    const typeEntries = parsedData.surveyTypes && parsedData.surveyTypes[group.name]

    for (const dataRow of rows) {
      let typeCode
      if (subSurveys && typeEntries) {
        const label = dataRow._survey_type || ''
        const entry = typeEntries.find((e) => e.label === label)
        typeCode = entry ? entry.code : 'structured_survey'
      } else {
        typeCode = 'structured_survey'
      }

      const count = (typeCounters.get(typeCode) || 0) + 1
      typeCounters.set(typeCode, count)
      const rowKey = `${typeCode}_${count}`

      const csvRow = new Array(columns.length).fill('')
      csvRow[0] = rowKey

      for (let c = 0; c < groupFieldMap.length; c++) {
        const gfm = groupFieldMap[c]
        if (gfm.groupName === group.name) {
          csvRow[c + 1] = dataRow[gfm.fieldName] || ''
        }
      }

      dataRows.push(csvRow)
    }
  }

  const lines = [columns.join(',')]
  for (const csvRow of dataRows) {
    lines.push(csvRow.map(escapeCsvField).join(','))
  }
  return lines.join('\n')
}

function escapeCsvField(val) {
  if (typeof val !== 'string') val = String(val)
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}
