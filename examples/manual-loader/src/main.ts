import { createApp } from 'vue'
import App from './App.vue'
import { createAnyoAvatarVue } from '@blcklab/anyo-avatar-vue'
import '@blcklab/anyo-avatar-vue/style.css'
import './style.css'

createApp(App)
  .use(createAnyoAvatarVue({
    defaults: {
      quality: 'sekai-viewer',
      environment: 'studio',
      recovery: true,
      vrma: { unmappedNodes: 'exact-match', unsupportedFeatures: 'skip' },
    },
  }))
  .mount('#app')
