import type { App, Plugin } from 'vue'
import { AnyoAvatarControls } from './AnyoAvatarControls.js'
import { AnyoAvatarViewer } from './AnyoAvatarViewer.js'
import { ANYO_AVATAR_DEFAULTS } from './injection.js'
import type { AnyoAvatarVuePluginOptions } from './types.js'

export function createAnyoAvatarVue(options: AnyoAvatarVuePluginOptions = {}): Plugin {
  const defaults = Object.freeze({ ...(options.defaults ?? {}) })
  return {
    install(app: App) {
      app.provide(ANYO_AVATAR_DEFAULTS, defaults)
      app.component(options.componentName ?? 'AnyoAvatarViewer', AnyoAvatarViewer)
      app.component(options.controlsComponentName ?? 'AnyoAvatarControls', AnyoAvatarControls)
    },
  }
}

export const AnyoAvatarVue = createAnyoAvatarVue()

export default AnyoAvatarVue
