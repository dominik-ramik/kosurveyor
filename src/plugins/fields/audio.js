import { defineField } from './defineField.js'

export default defineField({
  type: 'audio',
  label: 'Audio',
  icon: 'mdi-microphone',
  description: 'Audio recording.',
  supportsEditablePrefill: false,
  isMediaType: true,

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const wt = helpers.widgetType(field)
    const params = 'quality=normal'

    if (!field.prefilled) {
      rows.push(helpers.row({
        type: wt,
        name: field.name,
        label: field.label,
        parameters: params,
      }))
      return rows
    }

    if (field.prefilled === 'readonly') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `'${baked}'` }))
        const noteRow = helpers.row({ type: 'note', name: `${field.name}_COLLECTOR_NODATA_note`, label: field.label })
        noteRow['media::audio'] = `'${baked}'`
        rows.push(noteRow)
      } else if (context === 'prefilled_repeat') {
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({ type: 'calculate', name: `${field.name}_COLLECTOR_NODATA_calc`, calculation: pd }))
        const noteRow = helpers.row({ type: 'note', name: `${field.name}_COLLECTOR_NODATA_note`, label: field.label })
        noteRow['media::audio'] = `\${${field.name}_COLLECTOR_NODATA_calc}`
        rows.push(noteRow)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `\${${field.name}_COLLECTOR_NODATA_calc}` }))
      } else {
        rows.push(helpers.row({
          type: wt,
          name: field.name,
          label: field.label,
          parameters: params,
        }))
      }
    }

    return rows
  },
})
