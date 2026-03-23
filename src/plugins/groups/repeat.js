import * as XLSX from 'xlsx'
import { defineGroup } from './defineGroup.js'

export default defineGroup({
  type: 'repeat',
  label: 'Repeat Group',
  icon: 'mdi-repeat',
  description: 'Repeating set of questions.',
  configComponent: null,

  defaultProps: { max_repeat: null, sub_surveys: false, free_option: false },

hints: {
free_entries_limit:
    'Caps the number of free entries the enumerator can add in a single submission. ' +
    'Leave empty for unlimited. Has no effect on prefilled repeats, whose entry ' +
    'count is fixed by the number of rows in the prefill spreadsheet.',
    sub_surveys:
      'Allows you to divide the prefill data into named sets (e.g. "birds", "fish"). ' +
      'The enumerator picks which sub-survey to run before stepping through its prefilled rows. ' +
      'A "_survey_type" column in the prefill spreadsheet assigns rows to each set.',
    free_option:
      'Adds an open-ended repeat (no prefill) alongside any structured sub-surveys, ' +
      'for capturing unexpected entries with the same question set. ' +
      'Automatically enabled when no fields in this group have prefill set.',
  },

   getSummaryBadges(group) {
    const badges = []
    if (group.sub_surveys) {
      badges.push({ label: 'sub-surveys', color: 'green' })
    }
    const isFreeOptionForced = !group.fields?.some(f => f.prefilled === 'readonly' || f.prefilled === 'editable')
    const isFreeOptionOn = group.free_option === true || isFreeOptionForced
    if (isFreeOptionOn) {
      badges.push({
        label: group.max_repeat ? `free option, max: ${group.max_repeat}` : 'free option',
        color: 'teal',
        icon: isFreeOptionForced ? 'mdi-lock' : undefined,
      })
    }
    else if (group.max_repeat) {
      badges.push({ label: `max: ${group.max_repeat}`, color: undefined, outlined: true })
    }
    return badges
  },

  generateSurveyRows(group, ctx, helpers) {
    function combineRelevant(structural, userRelevant) {
      if (!userRelevant) return structural || undefined
      if (!structural)   return userRelevant
      return `(${userRelevant}) and (${structural})`
    }

    const hasPrefill = group.fields.some(f => f.prefilled === 'readonly' || f.prefilled === 'editable')
    const subSurveys = group.sub_surveys === true
    const freeOption = hasPrefill ? group.free_option === true : true

    const surveyTypeEntries = helpers.getSurveyTypeEntries(group, ctx.parsedData, subSurveys)
    const typeCount = surveyTypeEntries.length

    const selectorCalcName = `_${group.name}_sub_survey_selector_COLLECTOR_NODATA_`
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const prefRepeatName = `${group.name}`
    const freeRepeatName = `${group.name}_FREE_SURVEY_`

    helpers.emitSurveyTypeChoices(surveyTypeEntries, freeOption && hasPrefill, ctx, group.name)

    if (!hasPrefill) {
      // Case A
      const beginRow = helpers.row({
        type: 'begin_repeat',
        name: group.name,
        label: group.label,
        appearance: 'field-list',
        ...(group.relevant && { relevant: group.relevant }),
      })
      ctx.surveyRows.push(beginRow)
      ctx.surveyRows.push(helpers.row({ type: 'calculate', name: '_survey_type', calculation: "'__free_survey__'" }))
      for (const field of group.fields) {
        helpers.pushFieldRows(field, group, 'free_repeat')
      }
      ctx.surveyRows.push(helpers.row({ type: 'end_repeat' }))
    } else if (!freeOption && typeCount === 1) {
      // Case B
      const soleTypeKey = surveyTypeEntries[0].code
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: selectorCalcName,
        calculation: `'${soleTypeKey}'`,
      }))
      const repeatCountExpr = `instance('survey_type_${group.name}')/root/item[name=\${${selectorCalcName}}]/repeat_count`
      const combinedRelevantB = combineRelevant(undefined, group.relevant)
      ctx.surveyRows.push(helpers.row({
        type: 'begin_repeat',
        name: prefRepeatName,
        label: group.label,
        appearance: 'field-list',
        repeat_count: repeatCountExpr,
        ...(combinedRelevantB && { relevant: combinedRelevantB }),
      }))
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: rowIdxName,
        calculation: `concat(\${${selectorCalcName}}, '_', string(position(..)))`,
      }))
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: '_survey_type',
        calculation: `\${${selectorCalcName}}`,
      }))
      for (const field of group.fields) {
        helpers.pushFieldRows(field, group, 'prefilled_repeat')
      }
      ctx.surveyRows.push(helpers.row({ type: 'end_repeat' }))
    } else if (!freeOption && typeCount > 1) {
      // Case C
      helpers.emitSelectorGroup(group, selectorCalcName, ctx)
      const repeatCountExpr = `instance('survey_type_${group.name}')/root/item[name=\${${selectorCalcName}}]/repeat_count`
      const combinedRelevantC = combineRelevant(
        `\${${selectorCalcName}} != ''`,
        group.relevant
      )
      ctx.surveyRows.push(helpers.row({
        type: 'begin_repeat',
        name: prefRepeatName,
        label: group.label,
        appearance: 'field-list',
        ...(combinedRelevantC && { relevant: combinedRelevantC }),
        repeat_count: repeatCountExpr,
      }))
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: rowIdxName,
        calculation: `concat(\${${selectorCalcName}}, '_', string(position(..)))`,
      }))
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: '_survey_type',
        calculation: `\${${selectorCalcName}}`,
      }))
      for (const field of group.fields) {
        helpers.pushFieldRows(field, group, 'prefilled_repeat')
      }
      ctx.surveyRows.push(helpers.row({ type: 'end_repeat' }))
    } else {
      // Case D
      helpers.emitSelectorGroup(group, selectorCalcName, ctx)
      const repeatCountExpr = `instance('survey_type_${group.name}')/root/item[name=\${${selectorCalcName}}]/repeat_count`
      // Prefilled repeat
      const combinedPref = combineRelevant(
        `\${${selectorCalcName}} != '__free_survey__'`,
        group.relevant
      )
      ctx.surveyRows.push(helpers.row({
        type: 'begin_repeat',
        name: prefRepeatName,
        label: group.label,
        appearance: 'field-list',
        ...(combinedPref && { relevant: combinedPref }),
        repeat_count: repeatCountExpr,
      }))
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: rowIdxName,
        calculation: `concat(\${${selectorCalcName}}, '_', string(position(..)))`,
      }))
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: '_survey_type',
        calculation: `\${${selectorCalcName}}`,
      }))
      for (const field of group.fields) {
        helpers.pushFieldRows(field, group, 'prefilled_repeat')
      }
      ctx.surveyRows.push(helpers.row({ type: 'end_repeat' }))
      // Free repeat
      const combinedFree = combineRelevant(
        `\${${selectorCalcName}} = '__free_survey__'`,
        group.relevant
      )
      ctx.surveyRows.push(helpers.row({
        type: 'begin_repeat',
        name: freeRepeatName,
        label: `${group.label} (freeform)`,
        appearance: 'field-list',
        ...(combinedFree && { relevant: combinedFree }),
      }))
      ctx.surveyRows.push(helpers.row({
        type: 'calculate',
        name: '_survey_type',
        calculation: "'__free_survey__'",
      }))
      for (const field of group.fields) {
        helpers.pushFieldRows(field, group, 'free_repeat')
      }
      ctx.surveyRows.push(helpers.row({ type: 'end_repeat' }))
    }
  },

  generateTemplateSheet(group, wb, helpers) {
    const prefilledFields = group.fields.filter(f => f.prefilled === 'readonly' || f.prefilled === 'editable')
    if (prefilledFields.length === 0) return

    const sheetName = group.name.slice(0, 31)
      const headers = []
    if (group.sub_surveys === true) {
      headers.push('_survey_type')
    }
    for (const field of prefilledFields) {
      const plugin = helpers.getField(field.widget)
      const cols = plugin.getTemplateColumns(field)
      for (const col of cols) headers.push(col)
    }
    const rows = [headers]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  },

  validateTemplateSheet(group, ws, rawData, helpers) {
    const errors = []
    const warnings = []
    const prefilledFields = group.fields.filter(f => f.prefilled === 'readonly' || f.prefilled === 'editable')
    const sheetName = group.name.slice(0, 31)

    if (rawData.length === 0) {
      errors.push(`Sheet "${sheetName}": is empty (no header row).`)
      return { errors, warnings, parsedResult: null }
    }

    const headers = rawData[0].map(String)

    // Build expected headers
      const expectedHeaders = []
    if (group.sub_surveys === true) {
      expectedHeaders.push('_survey_type')
    }
    for (const field of prefilledFields) {
      const plugin = helpers.getField(field.widget)
      const cols = plugin.getTemplateColumns(field)
      for (const col of cols) expectedHeaders.push(col)
    }

    for (const eh of expectedHeaders) {
      if (!headers.includes(eh)) {
          errors.push(`Sheet "${sheetName}": missing required column "${eh}".`)
      }
    }
    for (const h of headers) {
      if (!expectedHeaders.includes(h)) {
        warnings.push(`Sheet "${sheetName}": unexpected column "${h}".`)
      }
    }

    // Parse data rows
    const rows = []
    for (let r = 1; r < rawData.length; r++) {
      const row = {}
      for (let c = 0; c < headers.length; c++) {
        row[headers[c]] = rawData[r][c] !== undefined ? String(rawData[r][c]) : ''
      }
      rows.push(row)
    }

    if (rows.length === 0) {
      errors.push(`Sheet "${sheetName}": no data rows (repeat groups require at least one row).`)
      return { errors, warnings, parsedResult: null }
    }

    // Check all data columns have at least one non-empty value
    for (const eh of expectedHeaders) {
      const hasData = rows.some(r => r[eh] && r[eh].trim() !== '')
      if (!hasData) {
        errors.push(`Sheet "${sheetName}": column "${eh}" has no data.`)
      }
    }

    // Validate _survey_type labels
    let surveyTypes = null
    if (group.sub_surveys === true && headers.includes('_survey_type')) {
      const labelMap = new Map()
      const typeOrder = []
      const typeCounts = new Map()
      let emptyCount = 0

      for (const row of rows) {
        const label = row._survey_type
        if (!label || label.trim() === '') {
          emptyCount++
          continue
        }

        let code
        try {
          code = helpers.labelToCode(label)
        } catch {
          errors.push(`Sheet "${sheetName}": invalid _survey_type label "${label}".`)
          continue
        }

        if (labelMap.has(code) && labelMap.get(code) !== label) {
          errors.push(
            `Sheet "${sheetName}": _survey_type labels "${labelMap.get(code)}" and "${label}" both normalise to "${code}".`
          )
        }
        if (!labelMap.has(code)) {
          labelMap.set(code, label)
          typeOrder.push(code)
        }
        typeCounts.set(code, (typeCounts.get(code) || 0) + 1)
      }

      // Handle completely empty or partially empty _survey_type columns
      if (emptyCount > 0) {
        if (emptyCount === rows.length) {
          // If all are empty, leaving surveyTypes as null allows generator.js 
          // to default to the single 'Structured survey' definition.
          surveyTypes = null
        } else {
          // If there is a mix, warn the user and tally the empty rows 
          // under the default 'structured_survey' code.
          warnings.push(`Sheet "${sheetName}": ${emptyCount} row(s) have an empty _survey_type. They will default to "Structured survey".`)
          
          const defaultCode = 'structured_survey'
          const defaultLabel = 'Structured survey'
          
          if (!labelMap.has(defaultCode)) {
            labelMap.set(defaultCode, defaultLabel)
            typeOrder.push(defaultCode)
          }
          typeCounts.set(defaultCode, (typeCounts.get(defaultCode) || 0) + emptyCount)
          
          surveyTypes = typeOrder.map(code => ({
            label: labelMap.get(code),
            code,
            repeatCount: typeCounts.get(code),
          }))
        }
      } else if (typeOrder.length > 0) {
        // Standard mapping when all rows are filled
        surveyTypes = typeOrder.map(code => ({
          label: labelMap.get(code),
          code,
          repeatCount: typeCounts.get(code),
        }))
      }
    }

    // Validate choice keys for select fields using field plugins
    for (const field of prefilledFields) {
      const plugin = helpers.getField(field.widget)
      const colIdx = headers.indexOf(field.name)
      if (colIdx === -1) continue

      for (let r = 0; r < rows.length; r++) {
        const val = rows[r][field.name]
        const fieldErrors = plugin.validateTemplateValue(field, field.name, val, r, sheetName)
        for (const e of fieldErrors) errors.push(e)
      }
    }

    return {
      errors,
      warnings,
      parsedResult: { repeatRows: rows, surveyTypes },
    }
  },
})