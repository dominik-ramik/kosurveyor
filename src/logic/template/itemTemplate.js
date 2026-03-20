import * as XLSX from 'xlsx'
import { getGroup } from '../../plugins/groups/index.js'
import { getField } from '../../plugins/fields/index.js'

/**
 * Normalise a user-supplied label to a valid code string.
 */
export function labelToCode(label) {
  if (typeof label !== 'string') throw new Error('invalid label: empty after normalisation')
  const result = label
    .replace(/[^a-zA-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  if (!result) throw new Error('invalid label: empty after normalisation')
  return result
}

function isPrefilled(field) {
  return field.prefilled === 'readonly' || field.prefilled === 'editable'
}

function groupHasPrefillFields(group) {
  return group.fields && group.fields.some(isPrefilled)
}

const templateHelpers = { getField, labelToCode }

/**
 * Generate a blank template xlsx workbook for the given profile.
 * Returns a Uint8Array.
 */
export function generateBlankTemplate(profile) {
  const wb = XLSX.utils.book_new()
  let sheetsCreated = 0

  for (const group of profile.groups) {
    if (!groupHasPrefillFields(group)) continue
    const plugin = getGroup(group.type)
    plugin.generateTemplateSheet(group, wb, templateHelpers)
    sheetsCreated++
  }

  // Ensure at least one sheet
  if (sheetsCreated === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['(no prefilled fields)']])
    XLSX.utils.book_append_sheet(wb, ws, 'Info')
  }

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Uint8Array(buf)
}

/**
 * Validate an uploaded template workbook against the profile.
 * Returns a ValidationResult.
 */
export function validateUploadedTemplate(workbook, profile) {
  const errors = []
  const warnings = []
  const pageValues = {}
  const repeatRows = {}
  const surveyTypes = {}

  for (const group of profile.groups) {
    if (!groupHasPrefillFields(group)) continue

    const sheetName = group.name.slice(0, 31)
    const ws = workbook.Sheets[sheetName]

    if (!ws) {
      errors.push(`Missing sheet "${sheetName}" for group "${group.name}".`)
      continue
    }

    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    const plugin = getGroup(group.type)
    const result = plugin.validateTemplateSheet(group, ws, data, templateHelpers)

    errors.push(...result.errors)
    warnings.push(...result.warnings)

    if (result.parsedResult) {
      if (result.parsedResult.pageValues) {
        pageValues[group.name] = result.parsedResult.pageValues
      }
      if (result.parsedResult.repeatRows) {
        repeatRows[group.name] = result.parsedResult.repeatRows
      }
      if (result.parsedResult.surveyTypes) {
        surveyTypes[group.name] = result.parsedResult.surveyTypes
      }
    }
  }

  const valid = errors.length === 0
  return {
    valid,
    errors,
    warnings,
    parsedData: valid ? { pageValues, repeatRows, surveyTypes } : null,
  }
}
