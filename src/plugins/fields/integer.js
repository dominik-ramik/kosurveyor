import { defineField } from './defineField.js'
import { buildConstraint, buildConstraintMessage } from '../../components/profile/fieldConfig/NumericFieldConfig.vue'

export default defineField({
  type: 'integer',
  label: 'Integer',
  icon: 'mdi-numeric',
  description: 'Whole number input.',

  expandSurveyRows(field, group, context, helpers) {
    const rows = []
    const rowIdxName = `${group.name}_COLLECTOR_NODATA_row_idx`
    const wt         = helpers.widgetType(field)

    // Pre-compute constraint expressions once — applied only to wt (user-input) rows
    const constraint        = buildConstraint(field)
    const constraint_message = buildConstraintMessage(field)

    /** Returns a wt row with constraint columns merged in when defined. */
    function inputRow(extra = {}) {
      return helpers.row({
        type:  wt,
        name:  field.name,
        label: field.label,
        hint:  field.hint || '',
        ...(constraint         && { constraint }),
        ...(constraint_message && { constraint_message }),
        ...extra,
      })
    }

    if (!field.prefilled) {
      rows.push(inputRow())
      return rows
    }

    if (field.prefilled === 'readonly') {
      if (context === 'page') {
        // Baked value → calculate + note; no user input, no constraint needed
        const baked = helpers.getBakedValue(field, group)
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `'${baked}'` }))
        rows.push(helpers.row({ type: 'note', name: `${field.name}_display`, label: `${field.label}: ${baked}` }))
      } else if (context === 'prefilled_repeat') {
        // Pulled from CSV → calculate + note + calculate; no user input, no constraint
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(helpers.row({ type: 'calculate', name: `${field.name}_COLLECTOR_NODATA_calc`, calculation: pd }))
        rows.push(helpers.row({ type: 'note',      name: `${field.name}_COLLECTOR_NODATA_note`, label: `${field.label}: \${${field.name}_COLLECTOR_NODATA_calc}` }))
        rows.push(helpers.row({ type: 'calculate', name: field.name, calculation: `\${${field.name}_COLLECTOR_NODATA_calc}` }))
      } else {
        // Free-repeat readonly → still a user-visible input; apply constraint
        rows.push(inputRow())
      }
      return rows
    }

    if (field.prefilled === 'editable') {
      if (context === 'page') {
        const baked = helpers.getBakedValue(field, group)
        rows.push(inputRow({ calculation: `'${baked}'` }))
      } else if (context === 'free_repeat') {
        rows.push(inputRow())
      } else {
        // prefilled_repeat editable → pulldata default, user can override; constraint applies
        const pd = helpers.pulldata(field.name, rowIdxName)
        rows.push(inputRow({ calculation: `once(${pd})` }))
      }
    }

    return rows
  },
})