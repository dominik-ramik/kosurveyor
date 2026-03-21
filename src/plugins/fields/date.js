import { defineField } from './defineField.js'

export default defineField({
  type: 'date',
  label: 'Date',
  icon: 'mdi-calendar',
  description: 'Date picker.',
  supportsEditablePrefill: false,

  hints: {
  appearance:
    'Controls the date picker format. ' +
    'Normal shows a full date picker (day, month, year). ' +
    '"Month & Year" restricts input to month and year only. ' +
    '"Year" restricts to year only.',
},

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const wt = helpers.widgetType(field)

    // Only 'month-year' and 'year' are persisted; absence means normal/default.
    const appearance = field.appearance || undefined

    /** Returns a wt row with appearance merged in when defined. */
    function inputRow(extra = {}) {
      return helpers.row({
        type:  wt,
        name:  field.name,
        label: field.label,
        hint:  field.hint || '',
        ...(appearance && { appearance }),
        ...extra,
      })
    }

    if (!field.prefilled) {
      rows.push(inputRow())
      return rows
    }

    if (field.prefilled === 'readonly') {
      if (context === 'page') {
        // Baked value → calculate + note; appearance irrelevant (no user input)
        const baked = helpers.getBakedValue(field, group)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `'${baked}'` }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_display`, label: `${field.label}: ${baked}` }))
      } else if (context === 'prefilled_repeat') {
        // Pulled from CSV → calculate chain; appearance irrelevant (no user input)
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({ type: 'calculate', name: `${field.name}_COLLECTOR_NODATA_calc`, calculation: pd }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_COLLECTOR_NODATA_note`, label: `${field.label}: \${${field.name}_COLLECTOR_NODATA_calc}` }))
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `\${${field.name}_COLLECTOR_NODATA_calc}` }))
      } else {
        // Free-repeat readonly → user-facing input; appearance applies
        rows.push(inputRow())
      }
    }

    return rows
  },
})