import { defineStore } from 'pinia'
import * as profileStore from '../logic/profiles/profileStore.js'
import { getGroup } from '../plugins/groups/index.js'
import { getField } from '../plugins/fields/index.js'

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const useProfilesStore = defineStore('profiles', {
  state: () => ({
    activeProfile: null,
    profileNames: [],
  }),

  getters: {
    hasPrefillFields: (state) => {
      if (!state.activeProfile || !state.activeProfile.groups) return false
      return state.activeProfile.groups.some((g) =>
        g.fields && g.fields.some((f) => f.prefilled === 'readonly' || f.prefilled === 'editable')
      )
    },
    isProfileValid: (state) => {
      if (!state.activeProfile) return false
      const p = state.activeProfile
      if (!p.profile_name || !p.form_id_stem) return false
      if (!p.groups || !Array.isArray(p.groups)) return false
      return p.groups.every((g) => g.name && g.label && g.type)
    },
  },

  actions: {
    loadProfileNames() {
      this.profileNames = profileStore.listProfiles()
    },

    loadProfile(name) {
      const profile = profileStore.loadProfile(name)
      if (profile) {
        this.activeProfile = profile
      }
    },

    saveActiveProfile() {
      if (this.activeProfile) {
        try {
          profileStore.saveProfile(this.activeProfile)
          this.loadProfileNames()
        } catch (e) {
          console.error('Failed to save profile:', e)
        }
      }
    },

    deleteProfile(name) {
      profileStore.deleteProfile(name)
      if (this.activeProfile && this.activeProfile.profile_name === name) {
        this.activeProfile = null
      }
      this.loadProfileNames()
    },

    setActiveProfile(profile) {
      this.activeProfile = profile
    },

    exportProfileAsJson() {
      if (!this.activeProfile) return
      const json = JSON.stringify(this.activeProfile, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      triggerDownload(blob, `${this.activeProfile.form_id_stem || 'profile'}.json`)
    },

    async importProfileFromJson(file) {
      try {
        const text = await file.text()
        const profile = JSON.parse(text)
        this.setActiveProfile(profile)
        this.saveActiveProfile()
      } catch (e) {
        console.error('Failed to import profile:', e)
      }
    },

    generateShareLink() {
      if (!this.activeProfile) return ''
      return profileStore.encodeShareLink(this.activeProfile)
    },

    checkAndImportShareLink() {
      const profile = profileStore.extractSharePayloadFromCurrentUrl()
      if (profile) {
        this.setActiveProfile(profile)
        this.saveActiveProfile()
        return true
      }
      return false
    },

    // Profile editing actions
    updateProfileMetadata(meta) {
      if (!this.activeProfile) return
      Object.assign(this.activeProfile, meta)
    },

    addGroup(groupDef) {
      if (!this.activeProfile) return
      if (!this.activeProfile.groups) this.activeProfile.groups = []
      const plugin = getGroup(groupDef.type)
      const defaults = plugin ? { ...plugin.defaultProps } : {}
      this.activeProfile.groups.push({
        fields: [],
        ...defaults,
        ...groupDef,
      })
    },

    updateGroup(groupName, updates) {
      if (!this.activeProfile) return
      const group = this.activeProfile.groups.find((g) => g.name === groupName)
      if (group) Object.assign(group, updates)
    },

    removeGroup(groupName) {
      if (!this.activeProfile) return
      const idx = this.activeProfile.groups.findIndex((g) => g.name === groupName)
      if (idx !== -1) this.activeProfile.groups.splice(idx, 1)
    },

    moveGroup(groupName, direction) {
      if (!this.activeProfile) return
      const groups = this.activeProfile.groups
      const idx = groups.findIndex((g) => g.name === groupName)
      if (idx === -1) return
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= groups.length) return
      const tmp = groups[idx]
      groups[idx] = groups[newIdx]
      groups[newIdx] = tmp
    },

    addField(groupName, fieldDef) {
      if (!this.activeProfile) return
      const group = this.activeProfile.groups.find((g) => g.name === groupName)
      if (!group) return
      if (!group.fields) group.fields = []
      const plugin = getField(fieldDef.widget)
      const defaults = plugin ? { ...plugin.defaultProps } : {}
      group.fields.push({ ...defaults, ...fieldDef })
    },

    updateField(groupName, fieldName, updates) {
      if (!this.activeProfile) return
      const group = this.activeProfile.groups.find((g) => g.name === groupName)
      if (!group) return
      const field = group.fields.find((f) => f.name === fieldName)
      if (field) Object.assign(field, updates)
    },

    removeField(groupName, fieldName) {
      if (!this.activeProfile) return
      const group = this.activeProfile.groups.find((g) => g.name === groupName)
      if (!group) return
      const idx = group.fields.findIndex((f) => f.name === fieldName)
      if (idx !== -1) group.fields.splice(idx, 1)
    },

    moveField(groupName, fieldName, direction) {
      if (!this.activeProfile) return
      const group = this.activeProfile.groups.find((g) => g.name === groupName)
      if (!group) return
      const fields = group.fields
      const idx = fields.findIndex((f) => f.name === fieldName)
      if (idx === -1) return
      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= fields.length) return
      const tmp = fields[idx]
      fields[idx] = fields[newIdx]
      fields[newIdx] = tmp
    },

    _initAutoSave() {
      this.$subscribe(() => {
        if (this.activeProfile) {
          try {
            profileStore.saveProfile(this.activeProfile)
          } catch {
            // ignore save failures in auto-save
          }
        }
      })
    },
  },
})
