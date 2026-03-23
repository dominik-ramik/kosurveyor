import { createApp } from 'vue'
import { createPinia } from 'pinia'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import App from './App.vue'
import HintIcon from './components/ui/HintIcon.vue'
import router from './router'

import { customMdi } from './icons'

const app = createApp(App)
app.component('HintIcon', HintIcon) 

const vuetify = createVuetify({
	components,
	directives,
	  icons: {
    defaultSet: 'customMdi',
    sets: { customMdi },
  },
})

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
