const SHARED_FIELD_HINTS = {
  label:
    'The question text shown to the enumerator during data collection.',
  name:
    'Internal field identifier used as the column name in exported submissions. ' +
    'Must be snake_case and unique within the group.',
  hint:
    'Optional guidance text displayed below the question in the form. ' +
    'Maps to the "hint" column in the XLSForm.',
  prefill:
    'Controls whether this field is pre-populated from the prefill data. When generating the KoboToolbox form, you will be provided with a spreadsheet template to provide the prefill data.\n' +
    '• None — standard empty field for normal data entry.\n' +
    '• Editable — starts pre-populated from the CSV but the enumerator can modify the value.\n' +
    '• Read-only — displays a fixed value from the CSV; the enumerator cannot change it.',
    required:
    'When enabled, the enumerator must answer this question before proceeding. ' +
    'Maps to the "required" column in the XLSForm. ' +
    'Not applicable to read-only prefill fields.',
  relevant:
    'Controls when this field is shown to the enumerator. When the condition ' +
    'evaluates to false the field is hidden and its answer is cleared. ' +
    'References other fields with ${field_name} syntax. ' +
    'Maps to the "relevant" column in the XLSForm. ' +
    'Leave empty to always show this field.',
}

export function defineField(overrides) {
  return {
    type: null,
    label: null,
    icon: null,
    description: null,

    defaultProps: {
      required: false, 
    },

    supportsEditablePrefill: true,
    supportsRequired: true,
    hasChoices: false,
    hasNumericConstraints: false,
    isMediaType: false,
    isCascadable: false,

    configComponent: null,

    hints: SHARED_FIELD_HINTS,

    getTemplateColumns(field) {
      return [field.name]
    },

    validateTemplateValue(field, colName, value, rowIndex, sheetName) {
      return []
    },

    expandSurveyRows(field, group, context, helpers) {
      throw new Error(`expandSurveyRows not implemented for field type: ${this.type}`)
    },

    ...overrides,

    // Always merge — plugin-specific hints extend (and can override) shared ones.
    hints: { ...SHARED_FIELD_HINTS, ...(overrides.hints ?? {}) },
  }
}