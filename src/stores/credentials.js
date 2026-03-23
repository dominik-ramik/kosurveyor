import { defineStore } from 'pinia'
import { buildTokenHeader, buildBasicHeader } from '../api/koboApi'

const LS_AUTH_MODE  = 'kosurveyor_auth_mode'
const LS_API_KEY_FB = 'kosurveyor_api_key'   // localStorage fallback key
const CRED_ID       = 'kobo-api-key'

/**
 * True when the browser implements the Credential Management API with
 * PasswordCredential support (Chromium-based browsers; not Firefox/Safari as
 * of 2025).  Using this stores the API key encrypted by the OS and managed
 * by the browser's own password manager — more secure than localStorage.
 */
const supportsCredentialManager =
  typeof window !== 'undefined' &&
  'credentials' in navigator &&
  typeof PasswordCredential !== 'undefined'

export const useCredentialsStore = defineStore('credentials', {
  state: () => ({
    koboUrl: '',

    // 'apikey' (preferred) | 'basic'
    authMode: localStorage.getItem(LS_AUTH_MODE) ?? 'apikey',

    // API key auth
    apiKey: '',
    rememberApiKey: false,

    // Basic auth (never persisted — browser password manager handles this)
    username: '',
    password: '',

    isAuthenticated: false,

    /**
     * Where the current API key was loaded from.
     * 'credential-manager' | 'localstorage' | null
     */
    credentialStorageType: null,
  }),

  getters: {
    /**
     * Ready-to-use Authorization header value for the active auth mode.
     * Returns '' when no credentials have been entered.
     */
    authHeader(state) {
      if (state.authMode === 'apikey' && state.apiKey.trim()) {
        return buildTokenHeader(state.apiKey.trim())
      }
      if (state.authMode === 'basic' && state.username) {
        return buildBasicHeader(state.username, state.password)
      }
      return ''
    },

    /** True when enough credentials are present to attempt a connection. */
    hasCredentials(state) {
      if (state.authMode === 'apikey') return !!state.apiKey.trim()
      return !!(state.username && state.password)
    },

    /** True when a persisted API key exists and can be forgotten. */
    hasSavedApiKey(state) {
      return state.credentialStorageType !== null
    },
  },

  actions: {
    updateKoboUrl(url) {
      this.koboUrl = url
    },

    /** Switch auth mode and persist the preference. */
    setAuthMode(mode) {
      this.authMode = mode
      localStorage.setItem(LS_AUTH_MODE, mode)
    },

    /**
     * Attempt to restore a previously saved API key on startup.
     *
     * Priority:
     *   1. Browser Credential Management API — silent, no UI, OS-encrypted
     *   2. localStorage — standard fallback for browsers without CM support
     *
     * Safe to call even when no key has ever been saved.
     */
    async loadSavedCredentials() {
      if (supportsCredentialManager) {
        try {
          const cred = await navigator.credentials.get({
            password: true,
            mediation: 'silent',   // return credential without prompting the user
          })
          if (cred?.password) {
            this.apiKey = cred.password
            this.rememberApiKey = true
            this.credentialStorageType = 'credential-manager'
            return
          }
        } catch {
          // CM unavailable or the user previously called preventSilentAccess()
          // → fall through to localStorage
        }
      }

      const saved = localStorage.getItem(LS_API_KEY_FB)
      if (saved) {
        this.apiKey = saved
        this.rememberApiKey = true
        this.credentialStorageType = 'localstorage'
      }
    },

    /**
     * Save the API key using the best available storage method.
     * When `remember` is false, any previously saved key is erased instead.
     *
     * Priority:
     *   1. Browser Credential Management API (Chromium) — OS-encrypted,
     *      surfaced in the browser's own password manager
     *   2. localStorage — automatic fallback
     */
    async saveCredentials(key, remember) {
      this.apiKey = key

      if (!remember || !key.trim()) {
        await this.forgetCredentials()
        return
      }

      this.rememberApiKey = true

      if (supportsCredentialManager) {
        try {
          const cred = new PasswordCredential({
            id: CRED_ID,
            password: key,
            name: 'KoboToolbox API Key',
          })
          await navigator.credentials.store(cred)
          // Clean up any stale localStorage copy that may have existed
          localStorage.removeItem(LS_API_KEY_FB)
          this.credentialStorageType = 'credential-manager'
          return
        } catch {
          // CM call failed (e.g. not in a secure context) → fall through
        }
      }

      localStorage.setItem(LS_API_KEY_FB, key)
      this.credentialStorageType = 'localstorage'
    },

    /**
     * Remove the saved API key from all storage layers and clear state.
     *
     * Note on Credential Management API: the spec provides no programmatic
     * delete.  `preventSilentAccess()` tells the browser not to return the
     * credential silently on the next `get()` call, which is the correct
     * "sign-out" signal.  The user can delete the entry completely from the
     * browser's built-in password manager (Settings → Passwords).
     */
    async forgetCredentials() {
      this.apiKey = ''
      this.rememberApiKey = false
      this.credentialStorageType = null
      localStorage.removeItem(LS_API_KEY_FB)
      if (supportsCredentialManager) {
        try {
          await navigator.credentials.preventSilentAccess()
        } catch {
          // Non-critical — ignore
        }
      }
    },
  },
})