import { defineField } from './defineField.js'

export default defineField({
  type: 'text',
  label: 'Text',
  icon: 'mdi-format-text',
  description: 'Short free-form text input.',

  hints: {
    appearance:
      'Controls the text input widget. ' +
      'Single-line shows a compact one-line input. ' +
      'Multiline expands to a larger text area — better for longer answers.',
  },

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const wt = helpers.widgetType(field)

    const wantsMultiline = field.appearance === 'multiline'

    if (!field.prefilled) {
      const r = { type: wt, name: field.name, label: field.label, hint: field.hint || '' }
      if (wantsMultiline) r.appearance = 'multiline'
      rows.push(helpers.row(r))
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
        const r = { type: wt, name: field.name, label: field.label, hint: field.hint || '' }
        if (wantsMultiline) r.appearance = 'multiline'
        rows.push(helpers.row(r))
      }
      return rows
    }

    if (field.prefilled === 'editable') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        const r = { type: wt, name: field.name, label: field.label, hint: field.hint || '', calculation: `'${baked}'` }
        if (wantsMultiline) r.appearance = 'multiline'
        rows.push(helpers.row(r))
      } else if (context === 'free_repeat') {
        const r = { type: wt, name: field.name, label: field.label, hint: field.hint || '' }
        if (wantsMultiline) r.appearance = 'multiline'
        rows.push(helpers.row(r))
      } else {
        const pd = helpers.pulldata(field.name, rowIdxName)
        const r = { type: wt, name: field.name, label: field.label, hint: field.hint || '', calculation: `once(${pd})` }
        if (wantsMultiline) r.appearance = 'multiline'
        rows.push(helpers.row(r))
      }
    }

    return rows
  },
})
