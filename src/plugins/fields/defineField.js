export function defineField(overrides) {
  return {
    type: null,
    label: null,
    icon: null,
    description: null,

    defaultProps: {},

    supportsEditablePrefill: true,
    isMediaType: false,
    isCascadable: false,

    configComponent: null,

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
  }
}
