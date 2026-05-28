import * as XLSX from 'xlsx'
import { defineGroup } from './defineGroup.js'

export default defineGroup({
  type: 'page',
  label: 'Page',
  icon: 'mdi-file-document-outline',
  description: 'Standard page of grouped questions.',
  supportsRelevantAsParent: true,

  getSummaryBadges(group) {
    return []
  },

  generateSurveyRows(group, ctx, helpers) {
    const beginRow = helpers.row({
      type: 'begin_group',
      name: group.name,
      label: group.label,
      appearance: 'field-list',
    })
    if (group.relevant) beginRow.relevant = group.relevant
    ctx.surveyRows.push(beginRow)

    for (const field of group.fields) {
      helpers.pushFieldRows(field, group, 'page')
    }

    ctx.surveyRows.push(helpers.row({ type: 'end_group' }))
  },

  generateTemplateSheet(group, wb, helpers) {
    const prefilledFields = group.fields.filter(f => f.prefilled === 'readonly' || f.prefilled === 'editable')
    if (prefilledFields.length === 0) return

    const sheetName = group.name.slice(0, 31)
    const rows = [['field_name', 'value']]
    for (const field of prefilledFields) {
      rows.push([field.name, ''])
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  },

  validateTemplateSheet(group, ws, rawData, helpers) {
    const errors = []
    const warnings = []
    const prefilledFields = group.fields.filter(f => f.prefilled === 'readonly' || f.prefilled === 'editable')

    if (rawData.length === 0) {
      errors.push(`Sheet "${group.name.slice(0, 31)}": is empty (no header row).`)
      return { errors, warnings, parsedResult: null }
    }

    const sheetName = group.name.slice(0, 31)
    const headers = rawData[0].map(String)
    const expectedHeaders = ['field_name', 'value']

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

    const fnIdx = headers.indexOf('field_name')
    const valIdx = headers.indexOf('value')
    if (fnIdx === -1 || valIdx === -1) {
      return { errors, warnings, parsedResult: null }
    }

    const gv = {}
    for (let r = 1; r < rawData.length; r++) {
      const fieldName = String(rawData[r][fnIdx])
      const value = String(rawData[r][valIdx])

      if (!value && value !== '0') {
        const field = prefilledFields.find(f => f.name === fieldName)
        if (field && field.prefilled === 'readonly') {
          // Readonly page values are baked permanently into the XLSForm at generation
          // time. An empty value here means that field will be forever empty in the
          // deployed form with no way for the enumerator to correct it.
          errors.push(
            `Sheet "${sheetName}": value for "${fieldName}" is empty. ` +
            `Read-only page fields are baked permanently into the form — ` +
            `this cannot be corrected at collection time.`
          )
        } else {
          // Editable page values just set the initial pre-fill. An empty value is
          // valid — the enumerator will see a blank field they can fill in.
          warnings.push(
            `Sheet "${sheetName}": value for "${fieldName}" is empty. ` +
            `The enumerator will see a blank pre-filled field.`
          )
        }
      }

      gv[fieldName] = value
    }

    for (const f of prefilledFields) {
      if (!(f.name in gv)) {
        errors.push(`Sheet "${sheetName}": missing row for field "${f.name}".`)
      }
    }

    for (const f of prefilledFields) {
      const plugin = helpers.getField(f.widget)
      if (!plugin) continue
      const val = gv[f.name] !== undefined ? gv[f.name] : ''
      const fieldErrors = plugin.validateTemplateValue(f, f.name, val, 0, sheetName)
      for (const e of fieldErrors) errors.push(e)
    }

    return { errors, warnings, parsedResult: { pageValues: gv } }
  },
})