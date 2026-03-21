import { defineField } from './defineField.js'

export default defineField({
  type: 'select_one',
  label: 'Select One',
  icon: 'mdi-radiobox-marked',
  description: 'Single choice from list.',
  isCascadable: true,

  defaultProps: { choices: [], filtered_by: null },

  hints: {
    appearance:
      'Controls how choices are presented to the enumerator. ' +
      '"Minimal" is a compact dropdown. "Autocomplete" adds live search filtering. ' +
      '"Columns" arranges choices side by side. "Likert" renders a horizontal scale.',
    choices:
      'The list of answer options. Each choice needs a unique key ' +
      '(stored in submissions) and a display label shown to the enumerator.',
    filtered_by:
      'Cascade select: limits the visible choices based on the answer given to ' +
      'the selected parent field. Only select fields that appear before this one ' +
      'in the group are available as parents.',
  },

  configComponent: null,

  getTemplateColumns(field) {
    if (field.prefilled === 'readonly') return [field.name, `${field.name}_display`]
    return [field.name]
  },

  validateTemplateValue(field, colName, value, rowIndex, sheetName) {
    const errors = []
    if (!value || value.trim() === '') return errors
    if (/\s/.test(value)) {
      errors.push(
        `Sheet "${sheetName}", field "${field.name}", row ${rowIndex + 2}: choice key "${value}" contains spaces.`
      )
    }
    const choices = field.choices || []
    const validValues = new Set(choices.map((c) => c.value))
    if (validValues.size > 0 && !validValues.has(value)) {
      errors.push(
        `Sheet "${sheetName}", field "${field.name}", row ${rowIndex + 2}: value "${value}" does not match any defined choice.`
      )
    }
    return errors
  },

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const selectType = 'select_one'
    const listName = `${field.name}_list`
    const freeGroupName = `${group.name}_FREE_SURVEY_`

    helpers.emitChoices(field, listName)

    const choiceFilter = field.filtered_by
      ? helpers.buildChoiceFilter(field, context, group)
      : ''

    if (!field.prefilled) {
      rows.push(helpers.row({
        type: `${selectType} ${listName}`,
        name: field.name,
        label: field.label,
        hint: field.hint || '',
        choice_filter: choiceFilter,
        appearance: field.appearance || 'minimal',
      }))
      return rows
    }

    if (field.prefilled === 'readonly') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        const displayLabel = helpers.getChoiceLabelForKey(field, baked)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `'${baked}'` }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_display`, label: `${field.label}: ${displayLabel}` }))
      } else if (context === 'prefilled_repeat') {
        const pd = helpers.pulldata(field.name, rowIdxName)
        const pdDisplay = helpers.pulldata(`${field.name}_display`, rowIdxName)
        rows.push(helpers.row({ type: 'calculate', name: `${field.name}_COLLECTOR_NODATA_calc`, calculation: pd }))
        rows.push(helpers.row({ type: 'calculate', name: `${field.name}_display_COLLECTOR_NODATA_calc`, calculation: pdDisplay }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_COLLECTOR_NODATA_note`, label: `${field.label}: \${${field.name}_display_COLLECTOR_NODATA_calc}` }))
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `\${${field.name}_COLLECTOR_NODATA_calc}` }))
      } else {
        const scopedName = `${field.name}_${freeGroupName}_COLLECTOR_NODATA_`
        rows.push(helpers.row({
          type: `${selectType} ${listName}`,
          name: scopedName,
          label: field.label,
          hint: field.hint || '',
          choice_filter: choiceFilter,
          appearance: field.appearance || 'minimal',
        }))
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `\${${scopedName}}` }))
      }
      return rows
    }

    if (field.prefilled === 'editable') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        rows.push(helpers.row({
          type: `${selectType} ${listName}`,
          name: field.name,
          label: field.label,
          hint: field.hint || '',
          calculation: `'${baked}'`,
          choice_filter: choiceFilter,
          appearance: field.appearance || 'minimal',
        }))
      } else if (context === 'free_repeat') {
        const scopedName = `${field.name}_${freeGroupName}_COLLECTOR_NODATA_`
        rows.push(helpers.row({
          type: `${selectType} ${listName}`,
          name: scopedName,
          label: field.label,
          hint: field.hint || '',
          choice_filter: choiceFilter,
          appearance: field.appearance || 'minimal',
        }))
        rows.push(helpers.row({
          type: 'calculate',
          name: field.name,
          calculation: `\${${scopedName}}`,
        }))
      } else {
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({
          type: `${selectType} ${listName}`,
          name: field.name,
          label: field.label,
          hint: field.hint || '',
          calculation: `once(${pd})`,
          choice_filter: choiceFilter,
          appearance: field.appearance || 'minimal',
        }))
      }
    }

    return rows
  },
})
