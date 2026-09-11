import type { AnyoAvatarControls, AnyoAvatarViewer } from '@blcklab/anyo-avatar-vue'

declare module 'vue' {
  export interface GlobalComponents {
    AnyoAvatarViewer: typeof AnyoAvatarViewer
    AnyoAvatarControls: typeof AnyoAvatarControls
  }
}
export {}
