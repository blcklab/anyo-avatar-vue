import type { AnyoAvatarPreset, AnyoAvatarResolvedOptions, AnyoAvatarVueDefaults } from './types.js'

const BASE: AnyoAvatarResolvedOptions = {
  preset: 'viewer',
  controls: 'minimal',
  quality: 'sekai-viewer',
  environment: 'studio',
  background: '#0a0c10',
  transparent: false,
  backend: 'auto',
  navigation: true,
  pointerPan: true,
  autoFit: true,
  autoRotate: false,
  autoRotateSpeed: 0.45,
  shadows: true,
  maxPixelRatio: 2,
  normalization: 'preserve',
  recovery: true,
  keyboard: true,
  statusOverlay: true,
  allowFileLoading: false,
  vrma: { unmappedNodes: 'exact-match', unsupportedFeatures: 'skip' },
}

const PRESETS: Record<AnyoAvatarPreset, Partial<AnyoAvatarResolvedOptions>> = {
  bare: {
    controls: 'none', statusOverlay: false, keyboard: false, allowFileLoading: false,
  },
  portfolio: {
    controls: 'none', statusOverlay: false, transparent: true, keyboard: false,
    autoFit: true, navigation: true, pointerPan: true, allowFileLoading: false,
  },
  viewer: {
    controls: 'minimal', statusOverlay: true, allowFileLoading: false,
  },
  studio: {
    controls: 'full', statusOverlay: true, allowFileLoading: true,
  },
}

export function resolveAnyoAvatarOptions(
  local: AnyoAvatarVueDefaults = {},
  globalDefaults: AnyoAvatarVueDefaults = {},
): AnyoAvatarResolvedOptions {
  const preset = local.preset ?? globalDefaults.preset ?? BASE.preset
  const merged = {
    ...BASE,
    ...PRESETS[preset],
    ...defined(globalDefaults),
    ...defined(local),
    preset,
    vrma: { ...BASE.vrma, ...defined(globalDefaults.vrma ?? {}), ...defined(local.vrma ?? {}) },
  }
  return merged as AnyoAvatarResolvedOptions
}

export const ANYO_AVATAR_PRESETS = Object.freeze(['bare', 'portfolio', 'viewer', 'studio'] as const)

function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>
}
