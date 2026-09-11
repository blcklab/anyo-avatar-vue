import type {
  AnimationSource,
  ModelSource,
  PlayOptions,
  ViewerLookAtOptions,
  ViewerState,
  ViewerVec3,
} from '@blcklab/anyo-avatar-viewer'
import type {
  Sekai64AvatarBackground,
  Sekai64AvatarCameraSnapshot,
  Sekai64AvatarEnvironment,
  Sekai64AvatarNormalization,
  Sekai64AvatarQuality,
  Sekai64FocusPreset,
  Sekai64RecoverySnapshot,
  VrmAnimationImporterOptions,
  Sekai64AnimationImporter,
} from '@blcklab/anyo-avatar-viewer/browser'

export type AnyoAvatarPreset = 'bare' | 'portfolio' | 'viewer' | 'studio'
export type AnyoAvatarControlsMode = 'none' | 'minimal' | 'full'
export type AnyoAvatarModelInput = string | ModelSource | File
export type AnyoAvatarAnimationInput = string | AnimationSource | File

export type AnyoSceneModelInput = string | { readonly url: string; readonly format: 'glb' | 'gltf' } | File
export type AnyoSceneLoadMode = 'animated' | 'static'

export interface AnyoSceneTextureLoadConfig {
  /** Maximum encoded size per texture. Sekai64 defaults to 32 MiB. */
  readonly maxBytes?: number
  /** Maximum decoded width or height. Sekai64 defaults to 8192. */
  readonly maxDimension?: number
}

export interface AnyoSceneAssetLoadConfig {
  /** Animated keeps embedded/external animation support. Static enables Sekai64 static batching. */
  readonly mode?: AnyoSceneLoadMode
  readonly strict?: boolean
  readonly retries?: number
  readonly cache?: boolean
  readonly headers?: Readonly<Record<string, string>>
  readonly texture?: AnyoSceneTextureLoadConfig
  /** Draco is auto-decoded by Sekai64 when needed. Set false to disallow it. */
  readonly draco?: 'auto' | false
  /** Self-hosted Google Draco decoder folder for offline/CSP-restricted apps. */
  readonly dracoDecoderPath?: string
  /** Repeated static sibling meshes can be instanced when mode is static. */
  readonly staticBatching?: boolean | { readonly minInstances?: number }
}

export interface AnyoSceneRenderConfig {
  readonly castShadow?: boolean
  readonly receiveShadow?: boolean
}

export interface AnyoSceneDiagnostic {
  readonly id: string
  readonly name: string
  readonly severity: 'warning' | 'error'
  readonly code: string
  readonly message: string
}

export interface AnyoSceneLoadProgress {
  readonly id: string
  readonly name: string
  readonly loaded: number
  readonly total?: number
  readonly ratio?: number
}

export interface AnyoSceneTransform {
  /** World-space position in Sekai64 units. */
  readonly position?: ViewerVec3
  /** Euler rotation in degrees: [x, y, z]. */
  readonly rotation?: ViewerVec3
  /** Uniform scalar or [x, y, z] scale. */
  readonly scale?: number | ViewerVec3
  readonly visible?: boolean
}

export interface AnyoSceneAnimationConfig {
  /** Omit src to select an embedded clip; external prop animation supports same-rig GLB/glTF. */
  readonly src?: AnyoAvatarAnimationInput
  readonly clip?: string | number
  readonly autoplay?: boolean
  readonly loop?: 'once' | 'repeat' | 'ping-pong'
  readonly speed?: number
  readonly weight?: number
}

export interface AnyoSceneModelConfig extends AnyoSceneTransform {
  readonly id?: string
  readonly name?: string
  readonly src: AnyoSceneModelInput
  readonly animations?: readonly AnyoSceneAnimationConfig[]
  readonly load?: AnyoSceneAssetLoadConfig
  readonly render?: AnyoSceneRenderConfig
}

export interface AnyoSceneConfig {
  readonly version?: 1
  /** Defaults are shallow-merged into each prop; nested texture settings are merged too. */
  readonly defaults?: { readonly load?: AnyoSceneAssetLoadConfig; readonly render?: AnyoSceneRenderConfig }
  readonly props?: readonly AnyoSceneModelConfig[]
}

export interface AnyoSceneModelClipInfo { readonly id: string; readonly name: string; readonly duration: number }
export interface AnyoSceneModelInfo {
  readonly id: string
  readonly name: string
  readonly visible: boolean
  readonly position: ViewerVec3
  readonly rotation: ViewerVec3
  readonly scale: ViewerVec3
  readonly clips: readonly AnyoSceneModelClipInfo[]
  readonly currentClip: string | null
  readonly playing: boolean
  readonly loadMode: AnyoSceneLoadMode
}

export interface AnyoAvatarVueDefaults {
  readonly preset?: AnyoAvatarPreset
  readonly controls?: AnyoAvatarControlsMode
  readonly quality?: Sekai64AvatarQuality
  readonly environment?: Sekai64AvatarEnvironment
  readonly background?: Sekai64AvatarBackground
  readonly transparent?: boolean
  readonly backend?: 'auto' | 'webgl2' | 'webgpu'
  readonly navigation?: boolean
  readonly pointerPan?: boolean
  readonly autoFit?: boolean
  readonly autoRotate?: boolean
  readonly autoRotateSpeed?: number
  readonly shadows?: boolean
  readonly exposure?: number
  readonly pixelRatio?: number
  readonly maxPixelRatio?: number
  readonly normalization?: Sekai64AvatarNormalization
  readonly targetHeight?: number
  readonly recovery?: boolean | { readonly maxAttempts?: number }
  readonly keyboard?: boolean
  readonly statusOverlay?: boolean
  readonly allowFileLoading?: boolean
  readonly vrma?: VrmAnimationImporterOptions
  /** Custom animation importers run before the built-in glTF/VRMA importers. */
  readonly importers?: readonly Sekai64AnimationImporter[]
}


export interface AnyoAvatarViewerProps extends AnyoAvatarVueDefaults {
  readonly model?: AnyoAvatarModelInput | null
  readonly animation?: AnyoAvatarAnimationInput | null
  readonly animations?: AnyoAvatarAnimationInput | readonly AnyoAvatarAnimationInput[] | null
  /** Optional declarative non-avatar GLB/glTF scene props. */
  readonly scene?: AnyoSceneConfig | null
  readonly autoplay?: boolean | string
  readonly loop?: 'once' | 'repeat'
  readonly speed?: number
  readonly fade?: number
  /** Change this value to force a runtime rebuild when custom creation-time objects such as importers change. */
  readonly runtimeKey?: string | number
  readonly aspectRatio?: string | number
  readonly minHeight?: string | number
}

export interface AnyoAvatarControlsProps {
  readonly mode?: Exclude<AnyoAvatarControlsMode, 'none'>
  readonly allowFileLoading?: boolean
  readonly quality?: Sekai64AvatarQuality
  readonly environment?: Sekai64AvatarEnvironment
  readonly background?: Sekai64AvatarBackground
  readonly shadows?: boolean
  readonly transparent?: boolean
}


export interface AnyoAvatarVuePluginOptions {
  readonly defaults?: AnyoAvatarVueDefaults
  readonly componentName?: string
  readonly controlsComponentName?: string
}

export interface AnyoAvatarResolvedOptions extends Required<Pick<AnyoAvatarVueDefaults,
  'preset' | 'controls' | 'quality' | 'environment' | 'transparent' | 'backend' | 'navigation' |
  'pointerPan' | 'autoFit' | 'autoRotate' | 'autoRotateSpeed' | 'shadows' | 'maxPixelRatio' |
  'normalization' | 'recovery' | 'keyboard' | 'statusOverlay' | 'allowFileLoading'>> {
  readonly background: Sekai64AvatarBackground
  readonly exposure?: number
  readonly pixelRatio?: number
  readonly targetHeight?: number
  readonly vrma: VrmAnimationImporterOptions
  readonly importers?: readonly Sekai64AnimationImporter[]
}

export interface AnyoAvatarPublicState {
  readonly viewer: ViewerState
  readonly camera: Sekai64AvatarCameraSnapshot | null
  readonly recovery: Sekai64RecoverySnapshot | null
  readonly ready: boolean
  readonly backend: string
  readonly diagnostic: string
  readonly fatalError: string
  readonly fullscreen: boolean
  readonly sceneModels: readonly AnyoSceneModelInfo[]
}


export interface AnyoAvatarViewerHandle {
  readonly state: AnyoAvatarPublicState
  getRuntime(): AnyoAvatarRuntime | null
  loadModel(input: AnyoAvatarModelInput): Promise<void>
  loadModelFile(file: File): Promise<void>
  loadAnimation(input: AnyoAvatarAnimationInput): Promise<void>
  loadAnimationFile(file: File): Promise<void>
  loadScene(config: AnyoSceneConfig, options?: { readonly replace?: boolean }): Promise<readonly AnyoSceneModelInfo[]>
  loadProp(input: AnyoSceneModelInput, config?: Omit<AnyoSceneModelConfig, 'src'>): Promise<AnyoSceneModelInfo>
  loadPropFile(file: File, config?: Omit<AnyoSceneModelConfig, 'src'>): Promise<AnyoSceneModelInfo>
  loadPropAnimation(id: string, config: AnyoSceneAnimationConfig): Promise<AnyoSceneModelInfo>
  loadPropAnimationFile(id: string, file: File, config?: Omit<AnyoSceneAnimationConfig, 'src'>): Promise<AnyoSceneModelInfo>
  playProp(id: string, clip?: string | number, options?: Pick<AnyoSceneAnimationConfig, 'loop' | 'speed' | 'weight'>): AnyoSceneModelInfo
  pauseProp(id: string): AnyoSceneModelInfo
  resumeProp(id: string): AnyoSceneModelInfo
  stopProp(id: string): AnyoSceneModelInfo
  updateProp(id: string, transform: AnyoSceneTransform): AnyoSceneModelInfo
  setPropVisible(id: string, visible: boolean): AnyoSceneModelInfo
  removeProp(id: string): void
  clearProps(): void
  unload(): void
  play(clipId?: string, options?: PlayOptions): void
  pause(): void
  resume(): void
  togglePlayback(clipId?: string): void
  stop(): void
  seek(seconds: number): void
  setSpeed(speed: number): void
  fit(): void
  resetView(): void
  focus(preset: Sekai64FocusPreset): void
  focusAt(target: ViewerVec3, distance?: number): void
  focusHeight(ratio: number, distance?: number): void
  focusUp(step?: number): void
  focusDown(step?: number): void
  zoomIn(): void
  zoomOut(): void
  rotateLeft(): void
  rotateRight(): void
  panBy(x: number, y: number): void
  setAutoRotate(enabled: boolean): void
  setAutoRotateSpeed(speed: number): void
  setNavigationEnabled(enabled: boolean): void
  setQuality(value: Sekai64AvatarQuality): void
  setEnvironment(value: Sekai64AvatarEnvironment): void
  setBackground(value: Sekai64AvatarBackground): void
  setExposure(value: number | undefined): void
  setShadows(value: boolean): void
  setExpression(name: string, weight: number): boolean
  clearExpression(name: string): boolean
  resetExpressions(): void
  setLookAt(target: ViewerVec3 | null, options?: ViewerLookAtOptions): void
  clearLookAt(): void
  recover(reason?: unknown): Promise<void>
  start(): void
  suspend(): void
  screenshot(filename?: string): Promise<Blob>
  enterFullscreen(): Promise<void>
  exitFullscreen(): Promise<void>
  toggleFullscreen(): Promise<void>
  openModelPicker(): void
  openAnimationPicker(): void
  openPropPicker(): void
  openPropAnimationPicker(id: string): void
  recreate(): Promise<void>
  dispose(): Promise<void>
}

export type AnyoAvatarRuntime = Awaited<ReturnType<typeof import('@blcklab/anyo-avatar-viewer/browser')['createSekai64AvatarViewer']>>
