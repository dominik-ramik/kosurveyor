import { defineStore } from 'pinia'

export const useCredentialsStore = defineStore('credentials', {
  state: () => ({
    koboUrl: '',
    username: '',
    password: '',
    isAuthenticated: false
  }),

  actions: {
    updateKoboUrl(url) {
      this.koboUrl = url
    }
  }
})
