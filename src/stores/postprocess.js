import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import { useCredentialsStore } from './credentials'
import { fetchAssets, fetchSubmissionListing, fetchSubmission, fetchSubmissions } from '../api/koboApi'
import { parseSubmissions } from '../logic/postprocess/submissionParser'
import { buildSpreadsheet } from '../logic/spreadsheet/builder'
import { exportMedia as exportMediaFiles } from '../logic/export/mediaExporter'

let _conflictResolve = null
let _mediaMixResolve = null

const MEDIA_FOLDERS = ['photos', 'audio', 'other']

/**
 * Extract top-level scalar keys from a full Kobo submission object.
 * Ignores keys starting with '_', 'meta/', or exactly 'formhub/uuid'.
 * Ignores any keys whose value is an Array.
 * Returns an alphabetically sorted array.
 */
export function extractTopLevelScalarKeys(obj) {
  const keys = []
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('_')) continue
    if (key.startsWith('meta/')) continue
    if (key === 'formhub/uuid') continue
    if (Array.isArray(value)) continue
    keys.push(key)
  }
  return keys.sort()
}

export const usePostprocessStore = defineStore('postprocess', {
  state: () => ({
    // Asset/form selection
    assets: [],
    assetsLoading: false,
    assetsError: null,
    selectedAssetUid: null,

    // Submission listing
    submissions: [],
    submissionsLoading: false,
    submissionsError: null,

    // Filters (all applied client-side)
    filterDateFrom: null,
    filterDateTo: null,
    filterSubmittedBy: '',
    filterText: '',
    filterField: null,

    // Schema & field data
    schemaKeys: [],
    fieldDataCache: {},
    isFetchingFieldData: false,

    // Selection
    selectedIds: [],

    // Export
    exportState: null,
    exportProgress: null,
    exportError: null,
    parsedResult: null,
    xlsxBuffer: null,
    exportedFileName: null,

    // Media export
    mediaExportState: null,
    mediaProgress: null,
    mediaExportError: null,
    unifiedProgress: null,
    dirHandle: null,
    autoDownloadMedia: localStorage.getItem('kosurveyor_auto_dl_media') !== 'false',
    fileConflict: null,
    fileWriteBlocked: null,
    mediaMixConflict: null
  }),

  getters: {
    filteredSubmissions(state) {
      // Use cached field dataset when a field is selected and cached
      let result = (state.filterField && state.fieldDataCache[state.filterField])
        ? state.fieldDataCache[state.filterField]
        : state.submissions

      if (state.filterSubmittedBy) {
        const term = state.filterSubmittedBy.toLowerCase()
        result = result.filter(
          (s) => s._submitted_by && s._submitted_by.toLowerCase().includes(term)
        )
      }

      if (state.filterDateFrom) {
        result = result.filter(
          (s) => s._submission_time && s._submission_time >= state.filterDateFrom
        )
      }

      if (state.filterDateTo) {
        const toEnd = state.filterDateTo + 'T23:59:59'
        result = result.filter(
          (s) => s._submission_time && s._submission_time <= toEnd
        )
      }

      if (state.filterField && state.filterText) {
        result = result.filter((s) => {
          const v = s[state.filterField]
          return v !== null && v !== undefined && String(v) === state.filterText
        })
      }

      return result
    },

    availableFields(state) {
      return state.schemaKeys
    },

    fieldValues(state) {
      if (!state.filterField || !state.fieldDataCache[state.filterField]) return []
      const seen = new Set()
      for (const s of state.fieldDataCache[state.filterField]) {
        const v = s[state.filterField]
        if (v !== null && v !== undefined && v !== '') seen.add(String(v))
      }
      return [...seen].sort()
    },

    selectedCount(state) {
      return state.selectedIds.length
    },

    hasAttachments(state) {
      return state.parsedResult?._media_?.rows?.length > 0
    },

    mediaFileCount(state) {
      if (state.selectedIds.length === 0) return 0
      const selectedSet = new Set(state.selectedIds)
      let count = 0
      for (const s of state.submissions) {
        if (selectedSet.has(s._id)) {
          count += (s._attachments || []).length
        }
      }
      return count
    }
  },

  actions: {
    setAutoDownloadMedia(val) {
      this.autoDownloadMedia = val
      localStorage.setItem('kosurveyor_auto_dl_media', String(val))
    },

    async loadAssets() {
      const creds = useCredentialsStore()
      this.assetsLoading = true
      this.assetsError = null
      try {
        this.assets = await fetchAssets(creds.koboUrl, creds.authHeader)
        // Clear submission state on success
        this.selectedAssetUid = null
        this.submissions = []
        this.submissionsLoading = false
        this.submissionsError = null
        this.selectedIds = []
        this.clearExport()
      } catch (error) {
        this.assetsError = error.message
      } finally {
        this.assetsLoading = false
      }
    },

    async selectAsset(uid) {
      this.selectedAssetUid = uid
      this.submissions = []
      this.submissionsError = null
      this.selectedIds = []
      this.filterText = ''
      this.filterField = null
      this.schemaKeys = []
      this.fieldDataCache = {}
      this.clearExport()
      await this.loadSubmissions()
    },

    setFilterField(field) {
      this.filterField = field
      const creds = useCredentialsStore()
      const key = `kosurveyor_filter_field_${creds.koboUrl}_${this.selectedAssetUid}`
      if (field) {
        localStorage.setItem(key, field)
        this.fetchFieldData(field)
      } else {
        localStorage.removeItem(key)
      }
    },

    async fetchFieldData(field) {
      if (!field || this.fieldDataCache[field]) return
      const creds = useCredentialsStore()
      this.isFetchingFieldData = true
      try {
        const data = await fetchSubmissionListing(
          creds.koboUrl,
          creds.authHeader,
          this.selectedAssetUid,
          [field]
        )
        this.fieldDataCache[field] = data
      } finally {
        this.isFetchingFieldData = false
      }
    },

    async loadSubmissions() {
      const creds = useCredentialsStore()
      this.submissionsLoading = true
      this.submissionsError = null
      try {
        this.submissions = await fetchSubmissionListing(
          creds.koboUrl,
          creds.authHeader,
          this.selectedAssetUid
        )

        // Fetch one full submission to extract schema keys
        if (this.submissions.length > 0) {
          const full = await fetchSubmission(
            creds.koboUrl,
            creds.authHeader,
            this.selectedAssetUid,
            this.submissions[0]._id
          )
          this.schemaKeys = extractTopLevelScalarKeys(full)

          // Restore persisted filterField if it still exists in schema
          const saved = localStorage.getItem(
            `kosurveyor_filter_field_${creds.koboUrl}_${this.selectedAssetUid}`
          )
          if (saved && this.schemaKeys.includes(saved)) {
            this.setFilterField(saved)
          }
        }
      } catch (error) {
        this.submissionsError = error.message
      } finally {
        this.submissionsLoading = false
      }
    },

    setSelection(ids) {
      this.selectedIds = ids
    },

    toggleSelection(id) {
      const idx = this.selectedIds.indexOf(id)
      if (idx === -1) {
        this.selectedIds.push(id)
      } else {
        this.selectedIds.splice(idx, 1)
      }
    },

    selectAllFiltered() {
      this.selectedIds = this.filteredSubmissions.map((s) => s._id)
    },

    clearSelection() {
      this.selectedIds = []
    },

    async exportSelected() {
      const creds = useCredentialsStore()
      try {
        // Step 0: Pick destination folder
        // markRaw prevents Vue from wrapping the native FileSystemDirectoryHandle
        // in a reactive Proxy, which would break the File System Access API calls.
        this.dirHandle = markRaw(await window.showDirectoryPicker({ mode: 'readwrite' }))

        // Reset media state for fresh export
        this.mediaExportState = null
        this.mediaProgress = null
        this.mediaExportError = null

        // Step 1: Fetch full submissions
        this.exportState = 'fetching'
        this.exportProgress = { fetched: 0, total: this.selectedIds.length, errors: [] }

        const { results, errors } = await fetchSubmissions(
          creds.koboUrl,
          creds.authHeader,
          this.selectedAssetUid,
          this.selectedIds,
          () => {
            this.exportProgress = {
              ...this.exportProgress,
              fetched: this.exportProgress.fetched + 1
            }
          }
        )

        // Step 2: Parse
        this.exportState = 'parsing'
        this.parsedResult = parseSubmissions(results)

        // Step 3: Build spreadsheet
        this.exportState = 'building'
        this.xlsxBuffer = buildSpreadsheet(this.parsedResult)

        // Step 4: Save to chosen folder — check for conflicts first
        const fileName = 'data.xlsx'
        let fileHandle
        try {
          await this.dirHandle.getFileHandle(fileName)
          // File already exists — ask the user what to do
          const suggestedName = await this._findFreeName('data', 'xlsx')
          const choice = await this._resolveConflict(fileName, suggestedName)
          if (choice === 'cancel') {
            this.exportState = null
            return
          }
          fileHandle = await this.dirHandle.getFileHandle(
            choice === 'overwrite' ? fileName : suggestedName,
            { create: choice !== 'overwrite' }
          )
        } catch (e) {
          if (e.name !== 'NotFoundError') throw e
          fileHandle = await this.dirHandle.getFileHandle(fileName, { create: true })
        }

        try {
          const writable = await fileHandle.createWritable()
          await writable.write(new Blob([this.xlsxBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }))
          await writable.close()
        } catch (writeError) {
          this.fileWriteBlocked = { fileName: fileHandle.name, reason: writeError.message }
          this.exportState = null
          return
        }
        this.exportedFileName = fileHandle.name

        const willExportMedia = this.autoDownloadMedia && this.hasAttachments
        const mediaTotal = willExportMedia ? this.parsedResult._media_.rows.length : 0

        this.unifiedProgress = {
          total: 1 + mediaTotal,
          completed: 1,
          currentFile: null,
          skipped: 0,
          errors: []
        }

        this.exportState = 'done'

        if (willExportMedia) {
          this.mediaExportState = 'preparing'
          const proceed = await this._checkMediaMix()
          if (proceed) {
            await this.exportMedia()
          } else {
            this.mediaExportState = null
            this.unifiedProgress = { ...this.unifiedProgress, total: 1 }
          }
        }
      } catch (error) {
        if (error.name === 'AbortError') return
        this.exportState = 'error'
        this.exportError = error.message
      }
    },

    async _findFreeName(baseName, extension) {
      let counter = 1
      while (true) {
        const name = `${baseName}_${counter}.${extension}`
        try {
          await this.dirHandle.getFileHandle(name)
          counter++
        } catch (e) {
          if (e.name === 'NotFoundError') return name
          throw e
        }
      }
    },

    async _resolveConflict(existingName, suggestedName) {
      this.fileConflict = { existingName, suggestedName }
      return new Promise(resolve => { _conflictResolve = resolve })
    },

    resolveFileConflict(choice) {
      this.fileConflict = null
      if (_conflictResolve) {
        _conflictResolve(choice)
        _conflictResolve = null
      }
    },

    dismissFileWriteBlocked() {
      this.fileWriteBlocked = null
    },

    async _checkMediaMix() {
      const ownSessions = new Set(
        this.parsedResult._media_.rows.map((r) => r.disk_path.split('/')[1])
      )
      const foreignSessions = []
      for (const folder of MEDIA_FOLDERS) {
        let dirH
        try {
          dirH = await this.dirHandle.getDirectoryHandle(folder)
        } catch {
          continue
        }
        for await (const entry of dirH.values()) {
          if (entry.kind === 'directory' && !ownSessions.has(entry.name)) {
            foreignSessions.push(`${folder}/${entry.name}`)
          }
        }
      }
      if (foreignSessions.length === 0) return true
      this.mediaMixConflict = { foreignSessions }
      return new Promise((resolve) => { _mediaMixResolve = resolve })
    },

    resolveMediaMixConflict(proceed) {
      this.mediaMixConflict = null
      if (_mediaMixResolve) {
        _mediaMixResolve(proceed)
        _mediaMixResolve = null
      }
    },

    async exportMedia() {
      this.mediaExportState = 'running'
      this.mediaExportError = null
      try {
        await exportMediaFiles(
          this.parsedResult._media_.rows,
          this.dirHandle,
          (progress) => {
            this.mediaProgress = progress
            this.unifiedProgress = {
              ...this.unifiedProgress,
              completed: 1 + progress.completed,
              currentFile: progress.currentFile,
              skipped: progress.skipped,
              errors: progress.errors
            }
          }
        )
        this.mediaExportState = 'done'
      } catch (error) {
        this.mediaExportState = 'error'
        this.mediaExportError = error.message
      }
    },

    clearExport() {
      this.exportState = null
      this.exportProgress = null
      this.exportError = null
      this.parsedResult = null
      this.xlsxBuffer = null
      this.exportedFileName = null
      this.mediaExportState = null
      this.mediaProgress = null
      this.mediaExportError = null
      this.unifiedProgress = null
      this.dirHandle = null
      this.fileConflict = null
      this.fileWriteBlocked = null
      this.mediaMixConflict = null
    }
  }
})