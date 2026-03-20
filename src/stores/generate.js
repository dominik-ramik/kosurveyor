import { defineStore } from 'pinia'
import * as XLSX from 'xlsx'
import { generateBlankTemplate, validateUploadedTemplate } from '../logic/template/itemTemplate.js'
import { generateDeploymentFiles } from '../logic/xlsform/generator.js'
import { getField } from '../plugins/fields/index.js'

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return String(hash)
}

export const useGenerateStore = defineStore('generate', {
  state: () => ({
    step: 1,
    uploadedWorkbook: null,
    validationResult: null,
    mediaFolder: null,
    mediaFileList: [],
    resolvedMediaFiles: [],
    missingMediaFiles: [],
    profileSnapshotHash: null,
    obsoleteTemplate: false,
    generating: false,
    generationError: null,
  }),

  getters: {
    canProceedToStep2: (state) => state.step >= 1,
    canProceedToStep3: (state) => state.validationResult && state.validationResult.valid === true,
    mediaRequired: (state) => {
      if (!state.validationResult || !state.validationResult.parsedData) return false
      // Check if any repeat rows contain media file references
      // This is determined by the profile, not the store — use a simple check
      return state._mediaRequired || false
    },
    allMediaResolved: (state) => state.missingMediaFiles.length === 0 && state.resolvedMediaFiles.length > 0,
    canGenerate: (state) => {
      if (state.step < 4) return false
      return true
    },
  },

  actions: {
    initForProfile(profile) {
      this.step = 1
      this.uploadedWorkbook = null
      this.validationResult = null
      this.mediaFolder = null
      this.mediaFileList = []
      this.resolvedMediaFiles = []
      this.missingMediaFiles = []
      this.generating = false
      this.generationError = null
      this.obsoleteTemplate = false

      // Compute profile snapshot hash
      this.profileSnapshotHash = simpleHash(JSON.stringify(profile))

      // Check if profile has any prefill fields
      const hasPrefill = profile.groups && profile.groups.some((g) =>
        g.fields && g.fields.some((f) => f.prefilled === 'readonly' || f.prefilled === 'editable')
      )
      if (!hasPrefill) {
        this.step = 4
      }

      // Check for media fields
      this._mediaRequired = profile.groups && profile.groups.some((g) =>
        g.fields && g.fields.some((f) =>
          getField(f.widget)?.isMediaType && f.prefilled === 'readonly'
        )
      )
    },

    checkProfileChanged(currentProfile) {
      const newHash = simpleHash(JSON.stringify(currentProfile))
      if (this.profileSnapshotHash && newHash !== this.profileSnapshotHash) {
        if (this.uploadedWorkbook !== null) {
          this.obsoleteTemplate = true
          this.uploadedWorkbook = null
          this.validationResult = null
          this.step = 1
        }
        this.profileSnapshotHash = newHash
      }
    },

    downloadBlankTemplate(profile) {
      try {
        const bytes = generateBlankTemplate(profile)
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        triggerDownload(blob, `${profile.form_id_stem}_template.xlsx`)
      } catch (e) {
        this.generationError = e.message
      }
    },

    async processUploadedFile(file, profile) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        this.uploadedWorkbook = workbook
        this.validationResult = validateUploadedTemplate(workbook, profile)

        if (this.validationResult.valid) {
          // Advance to step 3 if media required, else step 4
          if (this._mediaRequired) {
            this.step = 3
          } else {
            this.step = 4
          }
        }
      } catch (e) {
        this.validationResult = {
          valid: false,
          errors: [`Failed to parse uploaded file: ${e.message}`],
          warnings: [],
          parsedData: null,
        }
      }
    },

    async selectMediaFolder() {
      try {
        const dirHandle = await window.showDirectoryPicker()
        this.mediaFolder = dirHandle
        const fileNames = []
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            fileNames.push(entry.name)
          }
        }
        this.mediaFileList = fileNames

        // Determine required media files from parsedData
        this._computeMediaResolution()
      } catch (e) {
        this.generationError = e.message
      }
    },

    _computeMediaResolution() {
      // Gather all prefilled readonly image/audio field values from parsedData
      const required = new Set()
      if (this.validationResult && this.validationResult.parsedData) {
        const pd = this.validationResult.parsedData
        for (const groupName in pd.repeatRows) {
          for (const row of pd.repeatRows[groupName]) {
            for (const key in row) {
              // We'd ideally cross-reference with the profile to know which fields are media
              // For simplicity, any value that looks like a filename is checked
            }
          }
        }
        for (const groupName in pd.pageValues) {
          // Same
        }
      }
      // For now, compare all filenames found in data with folder contents
      // The actual media file list is derived by the profile's media fields  
      this.resolvedMediaFiles = this.mediaFileList.filter((f) => true) // placeholder
      this.missingMediaFiles = [] // placeholder
    },

    setMediaRequiredFiles(requiredFiles) {
      // Called by component that knows the profile structure
      const fileSet = new Set(this.mediaFileList)
      this.resolvedMediaFiles = requiredFiles.filter((f) => fileSet.has(f))
      this.missingMediaFiles = requiredFiles.filter((f) => !fileSet.has(f))
    },

    async generateFiles(profile) {
      this.generating = true
      this.generationError = null
      try {
        const parsedData = this.validationResult ? this.validationResult.parsedData : null
        const { xlsformBytes, csvString } = generateDeploymentFiles(profile, parsedData)

        // Download XLSForm
        const xlsBlob = new Blob([xlsformBytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
        triggerDownload(xlsBlob, `${profile.form_id_stem}.xlsx`)

        // Download CSV
        if (csvString) {
          const csvBlob = new Blob([csvString], { type: 'text/csv' })
          triggerDownload(csvBlob, `${profile.form_id_stem}_data.csv`)
        }
      } catch (e) {
        this.generationError = e.message
      } finally {
        this.generating = false
      }
    },
  },
})
