import { inject, type InjectionKey } from 'vue'
import type { AnyoAvatarViewerHandle, AnyoAvatarVueDefaults } from './types.js'

export const ANYO_AVATAR_DEFAULTS: InjectionKey<Readonly<AnyoAvatarVueDefaults>> = Symbol('anyo-avatar-vue-defaults') as InjectionKey<Readonly<AnyoAvatarVueDefaults>>
export const ANYO_AVATAR_CONTEXT: InjectionKey<AnyoAvatarViewerHandle> = Symbol('anyo-avatar-vue-context') as InjectionKey<AnyoAvatarViewerHandle>

export function useAnyoAvatar(): AnyoAvatarViewerHandle {
  const context = inject(ANYO_AVATAR_CONTEXT)
  if (!context) throw new Error('useAnyoAvatar() must be used inside <AnyoAvatarViewer>.')
  return context
}
