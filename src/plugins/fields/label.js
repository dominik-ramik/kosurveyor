import { defineField } from './defineField.js'

export default defineField({
  type: 'label',
  label: 'Note / Label',
  icon: 'mdi-information-outline',
  description: 'Read-only text to display.',
  supportsEditablePrefill: false,

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`

    if (!field.prefilled) {
      rows.push(helpers.row({ type: 'note', name: field.name, label: field.label }))
      return rows
    }

    if (field.prefilled === 'readonly') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `'${baked}'` }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_display`, label: `\${${field.name}}` }))
      } else if (context === 'prefilled_repeat') {
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: pd }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_COLLECTOR_NODATA_note`, label: `\${${field.name}}` }))
      } else {
        rows.push(helpers.row({ type: 'note', name: field.name, label: field.label }))
      }
    }

    return rows
  },
})
