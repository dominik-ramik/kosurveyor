import { defineField } from './defineField.js'

export default defineField({
  type: 'integer',
  label: 'Integer',
  icon: 'mdi-numeric',
  description: 'Whole number input.',

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const wt = helpers.widgetType(field)

    if (!field.prefilled) {
      rows.push(helpers.row({ type: wt, name: field.name, label: field.label, hint: field.hint || '' }))
      return rows
    }

    if (field.prefilled === 'readonly') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `'${baked}'` }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_display`, label: `${field.label}: ${baked}` }))
      } else if (context === 'prefilled_repeat') {
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({ type: 'calculate', name: `${field.name}_COLLECTOR_NODATA_calc`, calculation: pd }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_COLLECTOR_NODATA_note`, label: `${field.label}: \${${field.name}_COLLECTOR_NODATA_calc}` }))
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `\${${field.name}_COLLECTOR_NODATA_calc}` }))
      } else {
        rows.push(helpers.row({ type: wt, name: field.name, label: field.label, hint: field.hint || '' }))
      }
      return rows
    }

    if (field.prefilled === 'editable') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        rows.push(helpers.row({ type: wt, name: field.name, label: field.label, hint: field.hint || '', calculation: `'${baked}'` }))
      } else {
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({ type: wt, name: field.name, label: field.label, hint: field.hint || '', calculation: `once(${pd})` }))
      }
    }

    return rows
  },
})
