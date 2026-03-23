import { defineField } from './defineField.js'
import ImageFieldConfig from '../../components/profile/fieldConfig/ImageFieldConfig.vue'

export default defineField({
  type: 'image',
  label: 'Image',
  icon: 'mdi-image',
  description: 'Photo upload or capture.',
  supportsEditablePrefill: false,
  isMediaType: true,
  configComponent: ImageFieldConfig,

  defaultProps: { max_pixels: null },

  hints: {
  max_pixels:
    'Maximum pixel dimension (width or height) for captured photos. ' +
    'KoboToolbox resizes images that exceed this value before storing them. ' +
    'Leave empty to use the device default.',
},
 

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const wt = helpers.widgetType(field)
    const params = field.max_pixels ? `max-pixels=${field.max_pixels}` : ''

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
        noteRow['media::image'] = `'${baked}'`
        noteRow['big-image'] = `'${baked}'`
        rows.push(noteRow)
      } else if (context === 'prefilled_repeat') {
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({ type: 'calculate', name: `${field.name}_COLLECTOR_NODATA_calc`, calculation: pd }))
        const noteRow = helpers.row({ type: 'note', name: `${field.name}_COLLECTOR_NODATA_note`, label: field.label })
        noteRow['media::image'] = `\${${field.name}_COLLECTOR_NODATA_calc}`
        noteRow['big-image'] = `\${${field.name}_COLLECTOR_NODATA_calc}`
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