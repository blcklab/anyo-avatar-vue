import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type Ref,
} from 'vue'
import type {
  PlayOptions,
  ViewerLookAtOptions,
  ViewerState,
  ViewerVec3,
} from '@blcklab/anyo-avatar-viewer'
import {
  createSekai64AvatarViewer,
  type Sekai64AvatarBackground,
  type Sekai64AvatarCameraSnapshot,
  type Sekai64AvatarEnvironment,
  type Sekai64AvatarQuality,
  type Sekai64FocusPreset,
  type Sekai64RecoverySnapshot,
} from '@blcklab/anyo-avatar-viewer/browser'
import type {
  AnyoAvatarAnimationInput,
  AnyoAvatarModelInput,
  AnyoAvatarResolvedOptions,
  AnyoAvatarRuntime,
  AnyoAvatarViewerHandle,
  AnyoSceneAnimationConfig,
  AnyoSceneConfig,
  AnyoSceneDiagnostic,
  AnyoSceneLoadProgress,
  AnyoSceneModelConfig,
  AnyoSceneModelInfo,
  AnyoSceneModelInput,
  AnyoSceneTransform,
} from './types.js'
import { withAnimationSource, withModelSource } from './source.js'
import { AnyoSceneModelManager, mergeSceneModelConfig } from './scene.js'

const EMPTY_VIEWER: ViewerState = Object.freeze({
  phase: 'empty', model: null, clips: Object.freeze([]), loadingAnimations: 0, error: null,
  status: 'stopped', clip: null, time: 0, duration: 0, speed: 1,
  bounds: null, expressions: Object.freeze({ available: Object.freeze([]), values: Object.freeze({}) }), lookAt: null,
})

export interface UseAnyoAvatarViewerOptions {
  readonly canvas: Ref<HTMLCanvasElement | null>
  readonly host: Ref<HTMLElement | null>
  readonly options: Ref<AnyoAvatarResolvedOptions>
  readonly onReady?: (runtime: AnyoAvatarRuntime) => void
  readonly onStateChange?: (state: ViewerState) => void
  readonly onCameraChange?: (state: Sekai64AvatarCameraSnapshot) => void
  readonly onRecoveryChange?: (state: Sekai64RecoverySnapshot) => void
  readonly onDiagnostic?: (message: string) => void
  readonly onError?: (error: unknown) => void
  readonly onModelLoaded?: () => void
  readonly onAnimationLoaded?: () => void
  readonly onSceneChange?: (models: readonly AnyoSceneModelInfo[]) => void
  readonly onPropLoaded?: (model: AnyoSceneModelInfo) => void
  readonly onPropAnimationLoaded?: (model: AnyoSceneModelInfo) => void
  readonly onPropProgress?: (progress: AnyoSceneLoadProgress) => void
  readonly onPropDiagnostic?: (diagnostic: AnyoSceneDiagnostic) => void
}

export function useAnyoAvatarViewer(options: UseAnyoAvatarViewerOptions) {
  const viewerState = shallowRef<ViewerState>(EMPTY_VIEWER)
  const cameraState = shallowRef<Sekai64AvatarCameraSnapshot | null>(null)
  const recoveryState = shallowRef<Sekai64RecoverySnapshot | null>(null)
  const ready = ref(false)
  const backend = ref('')
  const diagnostic = ref('')
  const fatalError = ref('')
  const fullscreen = ref(false)
  const sceneModels = shallowRef<readonly AnyoSceneModelInfo[]>(Object.freeze([]))

  let runtime: AnyoAvatarRuntime | undefined
  let sceneManager: AnyoSceneModelManager | undefined
  let unsubscribeViewer: (() => void) | undefined
  let unsubscribeCamera: (() => void) | undefined
  let unsubscribeRecovery: (() => void) | undefined
  let currentModel: AnyoAvatarModelInput | undefined
  let currentAnimations: AnyoAvatarAnimationInput[] = []
  let disposed = false
  let recreateQueue = Promise.resolve()
  let modelPicker: HTMLInputElement | undefined
  let animationPicker: HTMLInputElement | undefined
  let propPicker: HTMLInputElement | undefined
  let propAnimationPicker: HTMLInputElement | undefined
  let propAnimationTarget = ''
  let sceneSequence = 0
  const sceneMemory = new Map<string, { input: AnyoSceneModelInput; config: Omit<AnyoSceneModelConfig, 'src'> }>()

  const hasModel = computed(() => viewerState.value.phase === 'ready' && Boolean(viewerState.value.model))
  const isPlaying = computed(() => viewerState.value.status === 'playing')

  async function initialize() {
    if (runtime || disposed) return
    const canvas = options.canvas.value
    if (!canvas) return
    try {
      const value = options.options.value
      runtime = await createSekai64AvatarViewer({
        canvas,
        backend: value.backend,
        pixelRatio: value.pixelRatio,
        maxPixelRatio: value.maxPixelRatio,
        quality: value.quality,
        environment: value.environment,
        background: value.transparent ? [0, 0, 0, 0] as const : value.background,
        transparent: value.transparent,
        exposure: value.exposure,
        shadows: value.shadows,
        navigation: value.navigation,
        pointerPan: value.pointerPan,
        autoFit: value.autoFit,
        autoRotate: value.autoRotate,
        autoRotateSpeed: value.autoRotateSpeed,
        recovery: value.recovery,
        normalization: value.normalization,
        targetHeight: value.targetHeight,
        vrma: value.vrma,
        importers: value.importers,
        onDiagnostic(message) {
          diagnostic.value = message
          options.onDiagnostic?.(message)
        },
      })
      sceneManager = new AnyoSceneModelManager(runtime, {
        onProgress: progress => options.onPropProgress?.(progress),
        onDiagnostic: value => {
          diagnostic.value = `[${value.id}] ${value.message}`
          options.onPropDiagnostic?.(value)
        },
      })
      backend.value = String(runtime.engine.capabilities.backend ?? '').toUpperCase()
      viewerState.value = runtime.viewer.getSnapshot()
      cameraState.value = runtime.navigation.getSnapshot()
      recoveryState.value = runtime.recovery.getSnapshot()
      unsubscribeViewer = runtime.viewer.subscribe(() => {
        if (!runtime) return
        viewerState.value = runtime.viewer.getSnapshot()
        options.onStateChange?.(viewerState.value)
      })
      unsubscribeCamera = runtime.navigation.subscribe(() => {
        if (!runtime) return
        cameraState.value = runtime.navigation.getSnapshot()
        options.onCameraChange?.(cameraState.value)
      })
      unsubscribeRecovery = runtime.recovery.subscribe(() => {
        if (!runtime) return
        recoveryState.value = runtime.recovery.getSnapshot()
        options.onRecoveryChange?.(recoveryState.value)
      })
      ready.value = true
      fatalError.value = ''
      options.onReady?.(runtime)
    } catch (error) {
      fatalError.value = error instanceof Error ? error.message : String(error)
      options.onError?.(error)
    }
  }

  async function destroyRuntime() {
    unsubscribeViewer?.(); unsubscribeViewer = undefined
    unsubscribeCamera?.(); unsubscribeCamera = undefined
    unsubscribeRecovery?.(); unsubscribeRecovery = undefined
    const previous = runtime
    sceneManager?.dispose(); sceneManager = undefined
    runtime = undefined
    ready.value = false
    backend.value = ''
    viewerState.value = EMPTY_VIEWER
    cameraState.value = null
    recoveryState.value = null
    sceneModels.value = Object.freeze([])
    if (previous) await previous.dispose()
  }

  async function recreate() {
    recreateQueue = recreateQueue.then(async () => {
      if (disposed) return
      const model = currentModel
      const animations = [...currentAnimations]
      await destroyRuntime()
      await initialize()
      if (model) {
        await loadModel(model, false)
        for (const animation of animations) await loadAnimation(animation, false)
      }
      if (sceneManager) {
        for (const { input, config } of sceneMemory.values()) await sceneManager.load(input, config)
        refreshSceneModels()
      }
    }).catch(error => { options.onError?.(error) })
    return recreateQueue
  }

  async function loadModel(input: AnyoAvatarModelInput, remember = true) {
    await requireRuntime()
    await withModelSource(input, source => runtime!.viewer.loadModel(source))
    if (remember) {
      currentModel = input
      currentAnimations = []
    }
    options.onModelLoaded?.()
  }

  async function loadAnimation(input: AnyoAvatarAnimationInput, remember = true) {
    await requireRuntime()
    if (!hasModel.value) throw new Error('Load an avatar model before loading an animation.')
    await withAnimationSource(input, source => runtime!.viewer.loadAnimation(source))
    if (remember) currentAnimations.push(input)
    options.onAnimationLoaded?.()
  }

  async function loadScene(config: AnyoSceneConfig, loadOptions: { readonly replace?: boolean } = {}) {
    await requireRuntime()
    const replace = loadOptions.replace ?? true
    if (replace) { sceneManager!.clear(); sceneMemory.clear() }
    for (const item of config.props ?? []) {
      const merged = mergeSceneModelConfig(item, config.defaults)
      const { src, ...rest } = merged
      await loadProp(src, rest)
    }
    return sceneModels.value
  }

  async function loadProp(input: AnyoSceneModelInput, config: Omit<AnyoSceneModelConfig, 'src'> = {}) {
    await requireRuntime()
    const id = config.id?.trim() || `vue-scene-model-${++sceneSequence}`
    const normalized = { ...config, id }
    const info = await sceneManager!.load(input, normalized)
    sceneMemory.set(id, { input, config: normalized })
    refreshSceneModels()
    options.onPropLoaded?.(info)
    return info
  }

  async function loadPropAnimation(id: string, config: AnyoSceneAnimationConfig) {
    await requireRuntime()
    const info = await sceneManager!.loadAnimation(id, config)
    const remembered = sceneMemory.get(id)
    if (remembered) {
      const animations = [...(remembered.config.animations ?? []), config]
      sceneMemory.set(id, { ...remembered, config: { ...remembered.config, animations } })
    }
    refreshSceneModels()
    options.onPropAnimationLoaded?.(info)
    return info
  }

  function playProp(id: string, clip?: string | number, playOptions: Pick<AnyoSceneAnimationConfig, 'loop' | 'speed' | 'weight'> = {}) {
    const info = requireSceneManager().play(id, clip, playOptions); refreshSceneModels(); return info
  }
  function pauseProp(id: string) { const info = requireSceneManager().pause(id); refreshSceneModels(); return info }
  function resumeProp(id: string) { const info = requireSceneManager().resume(id); refreshSceneModels(); return info }
  function stopProp(id: string) { const info = requireSceneManager().stop(id); refreshSceneModels(); return info }
  function updateProp(id: string, transform: AnyoSceneTransform) {
    const info = requireSceneManager().update(id, transform)
    const remembered = sceneMemory.get(id)
    if (remembered) sceneMemory.set(id, { ...remembered, config: { ...remembered.config, ...transform } })
    refreshSceneModels(); return info
  }
  function setPropVisible(id: string, visible: boolean) {
    const info = requireSceneManager().setVisible(id, visible)
    const remembered = sceneMemory.get(id)
    if (remembered) sceneMemory.set(id, { ...remembered, config: { ...remembered.config, visible } })
    refreshSceneModels(); return info
  }
  function removeProp(id: string) { requireSceneManager().remove(id); sceneMemory.delete(id); refreshSceneModels() }
  function clearProps() { sceneManager?.clear(); sceneMemory.clear(); refreshSceneModels() }
  function refreshSceneModels() {
    sceneModels.value = sceneManager?.list() ?? Object.freeze([])
    options.onSceneChange?.(sceneModels.value)
  }

  function unload() {
    runtime?.viewer.unload()
    currentModel = undefined
    currentAnimations = []
  }

  function play(clipId?: string, playOptions: PlayOptions = {}) {
    const rt = requireRuntimeSync()
    const id = clipId || viewerState.value.clip || viewerState.value.clips[0]?.id
    if (!id) return
    rt.viewer.play(id, { loop: 'repeat', speed: viewerState.value.speed, fade: 0.2, ...playOptions })
  }
  function pause() { requireRuntimeSync().viewer.pause() }
  function resume() { requireRuntimeSync().viewer.resume() }
  function togglePlayback(clipId?: string) {
    const rt = requireRuntimeSync()
    if (viewerState.value.status === 'playing') rt.viewer.pause()
    else if (viewerState.value.status === 'paused' && (!clipId || clipId === viewerState.value.clip)) rt.viewer.resume()
    else play(clipId)
  }
  function stop() { requireRuntimeSync().viewer.stop() }
  function seek(seconds: number) { requireRuntimeSync().viewer.seek(seconds) }
  function setSpeed(speed: number) { requireRuntimeSync().viewer.setSpeed(speed) }

  function fit() { requireRuntimeSync().navigation.fit() }
  function resetView() { requireRuntimeSync().navigation.resetView() }
  function focus(preset: Sekai64FocusPreset) { requireRuntimeSync().navigation.focus(preset) }
  function focusAt(target: ViewerVec3, distance?: number) { requireRuntimeSync().navigation.focusAt(target, distance) }
  function focusHeight(ratio: number, distance?: number) { requireRuntimeSync().navigation.focusHeight(ratio, distance) }
  function focusUp(step?: number) { requireRuntimeSync().navigation.focusUp(step) }
  function focusDown(step?: number) { requireRuntimeSync().navigation.focusDown(step) }
  function zoomIn() { requireRuntimeSync().navigation.zoomIn() }
  function zoomOut() { requireRuntimeSync().navigation.zoomOut() }
  function rotateLeft() { requireRuntimeSync().navigation.rotateLeft() }
  function rotateRight() { requireRuntimeSync().navigation.rotateRight() }
  function panBy(x: number, y: number) { requireRuntimeSync().navigation.panBy(x, y) }
  function setAutoRotate(enabled: boolean) { requireRuntimeSync().navigation.setAutoRotate(enabled) }
  function setAutoRotateSpeed(speed: number) { requireRuntimeSync().navigation.setAutoRotateSpeed(speed) }
  function setNavigationEnabled(enabled: boolean) { requireRuntimeSync().navigation.setEnabled(enabled) }

  function setQuality(value: Sekai64AvatarQuality) { requireRuntimeSync().visuals.setQuality(value) }
  function setEnvironment(value: Sekai64AvatarEnvironment) { requireRuntimeSync().visuals.setEnvironment(value) }
  function setBackground(value: Sekai64AvatarBackground) { requireRuntimeSync().visuals.setBackground(options.options.value.transparent ? [0, 0, 0, 0] as const : value) }
  function setExposure(value: number | undefined) { requireRuntimeSync().visuals.setExposure(value) }
  function setShadows(value: boolean) { requireRuntimeSync().visuals.setShadows(value) }

  function setExpression(name: string, weight: number) { return requireRuntimeSync().viewer.setExpression(name, weight) }
  function clearExpression(name: string) { return requireRuntimeSync().viewer.clearExpression(name) }
  function resetExpressions() { requireRuntimeSync().viewer.resetExpressions() }
  function setLookAt(target: ViewerVec3 | null, lookAtOptions: ViewerLookAtOptions = {}) { requireRuntimeSync().viewer.setLookAt(target, lookAtOptions) }
  function clearLookAt() { requireRuntimeSync().viewer.clearLookAt() }
  function recover(reason?: unknown) { return requireRuntimeSync().recovery.recover(reason) }
  function start() { requireRuntimeSync().start() }
  function suspend() { requireRuntimeSync().stop() }

  async function screenshot(filename = 'anyo-avatar.png'): Promise<Blob> {
    const rt = requireRuntimeSync()
    rt.engine.render(rt.scene, rt.camera)
    const canvas = options.canvas.value
    if (!canvas) throw new Error('Avatar canvas is unavailable.')
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Unable to capture canvas.')), 'image/png'))
    if (typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = filename; anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }
    return blob
  }

  async function enterFullscreen() {
    const host = options.host.value
    if (!host?.requestFullscreen) throw new Error('Fullscreen is not available for this viewer.')
    await host.requestFullscreen()
  }
  async function exitFullscreen() { if (typeof document !== 'undefined' && document.fullscreenElement) await document.exitFullscreen() }
  async function toggleFullscreen() { if (typeof document !== 'undefined' && document.fullscreenElement === options.host.value) await exitFullscreen(); else await enterFullscreen() }

  function openModelPicker() { ensurePickers(); modelPicker?.click() }
  function openAnimationPicker() { ensurePickers(); animationPicker?.click() }
  function openPropPicker() { ensurePickers(); propPicker?.click() }
  function openPropAnimationPicker(id: string) { propAnimationTarget = id; ensurePickers(); propAnimationPicker?.click() }
  function ensurePickers() {
    if (typeof document === 'undefined') return
    if (!modelPicker) {
      modelPicker = createPicker('.vrm,.glb,.gltf', async file => { if (file) await loadModel(file).catch(error => options.onError?.(error)) })
      animationPicker = createPicker('.vrma,.glb,.gltf', async file => { if (file) await loadAnimation(file).catch(error => options.onError?.(error)) })
      propPicker = createPicker('.glb', async file => { if (file) await loadProp(file).catch(error => options.onError?.(error)) })
      propAnimationPicker = createPicker('.glb,.gltf', async file => {
        if (file && propAnimationTarget) await loadPropAnimation(propAnimationTarget, { src: file }).catch(error => options.onError?.(error))
      })
    }
  }

  async function dispose() {
    if (disposed) return
    disposed = true
    removeFullscreenListener()
    modelPicker?.remove(); animationPicker?.remove(); propPicker?.remove(); propAnimationPicker?.remove()
    modelPicker = undefined; animationPicker = undefined; propPicker = undefined; propAnimationPicker = undefined
    await destroyRuntime()
  }

  const publicState = computed(() => Object.freeze({
    viewer: viewerState.value,
    camera: cameraState.value,
    recovery: recoveryState.value,
    ready: ready.value,
    backend: backend.value,
    diagnostic: diagnostic.value,
    fatalError: fatalError.value,
    fullscreen: fullscreen.value,
    sceneModels: sceneModels.value,
  }))

  const handle: AnyoAvatarViewerHandle = {
    get state() { return publicState.value },
    getRuntime: () => runtime ?? null,
    loadModel: input => loadModel(input),
    loadModelFile: file => loadModel(file),
    loadAnimation: input => loadAnimation(input),
    loadAnimationFile: file => loadAnimation(file),
    loadScene,
    loadProp,
    loadPropFile: (file, config) => loadProp(file, config),
    loadPropAnimation,
    loadPropAnimationFile: (id, file, config = {}) => loadPropAnimation(id, { ...config, src: file }),
    playProp, pauseProp, resumeProp, stopProp, updateProp, setPropVisible, removeProp, clearProps,
    unload, play, pause, resume, togglePlayback, stop, seek, setSpeed,
    fit, resetView, focus, focusAt, focusHeight, focusUp, focusDown,
    zoomIn, zoomOut, rotateLeft, rotateRight, panBy,
    setAutoRotate, setAutoRotateSpeed, setNavigationEnabled,
    setQuality, setEnvironment, setBackground, setExposure, setShadows,
    setExpression, clearExpression, resetExpressions, setLookAt, clearLookAt,
    recover, start, suspend, screenshot, enterFullscreen, exitFullscreen, toggleFullscreen,
    openModelPicker, openAnimationPicker, openPropPicker, openPropAnimationPicker, recreate, dispose,
  }

  function onFullscreenChange() { fullscreen.value = typeof document !== 'undefined' && document.fullscreenElement === options.host.value }
  function addFullscreenListener() { if (typeof document !== 'undefined') document.addEventListener('fullscreenchange', onFullscreenChange) }
  function removeFullscreenListener() { if (typeof document !== 'undefined') document.removeEventListener('fullscreenchange', onFullscreenChange) }

  onMounted(async () => { addFullscreenListener(); await initialize() })
  onBeforeUnmount(() => { void dispose() })

  watch(() => [options.options.value.quality, options.options.value.environment, options.options.value.background, options.options.value.shadows, options.options.value.exposure] as const,
    ([quality, environment, background, shadows, exposure]: readonly [Sekai64AvatarQuality, Sekai64AvatarEnvironment, Sekai64AvatarBackground, boolean, number | undefined]) => {
      if (!runtime) return
      runtime.visuals.setQuality(quality)
      runtime.visuals.setEnvironment(environment)
      runtime.visuals.setBackground(options.options.value.transparent ? [0, 0, 0, 0] as const : background)
      runtime.visuals.setShadows(shadows)
      runtime.visuals.setExposure(exposure)
    })
  watch(() => [options.options.value.navigation, options.options.value.autoRotate, options.options.value.autoRotateSpeed] as const,
    ([navigation, autoRotate, autoRotateSpeed]: readonly [boolean, boolean, number]) => {
      if (!runtime) return
      runtime.navigation.setEnabled(navigation)
      runtime.navigation.setAutoRotate(autoRotate)
      runtime.navigation.setAutoRotateSpeed(autoRotateSpeed)
    })

  let creationSignature = creationKey(options.options.value)
  watch(() => creationKey(options.options.value), (key: string) => {
    if (key === creationSignature) return
    creationSignature = key
    void recreate()
  })

  function requireSceneManager() { if (!sceneManager) throw new Error(fatalError.value || 'Scene manager is not ready.'); return sceneManager }

  async function requireRuntime() { if (!runtime) await initialize(); if (!runtime) throw new Error(fatalError.value || 'Avatar viewer is not ready.'); return runtime }
  function requireRuntimeSync() { if (!runtime) throw new Error(fatalError.value || 'Avatar viewer is not ready.'); return runtime }

  return {
    handle,
    viewerState,
    cameraState,
    recoveryState,
    publicState,
    ready,
    hasModel,
    isPlaying,
    backend,
    diagnostic,
    fatalError,
    fullscreen,
    sceneModels,
    initialize,
  }
}

function creationKey(value: AnyoAvatarResolvedOptions): string {
  const recovery = typeof value.recovery === 'object' ? `r:${value.recovery.maxAttempts ?? ''}` : String(value.recovery)
  return [value.backend, value.transparent, value.pixelRatio ?? '', value.maxPixelRatio, value.pointerPan, value.autoFit,
    value.normalization, value.targetHeight ?? '', recovery, value.vrma.unmappedNodes ?? '', value.vrma.unsupportedFeatures ?? '', value.vrma.bakeRate ?? ''].join('|')
}

function createPicker(accept: string, onFile: (file: File | undefined) => void | Promise<void>): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = accept; input.hidden = true
  input.addEventListener('change', () => { const file = input.files?.[0]; input.value = ''; void onFile(file) })
  document.body.appendChild(input)
  return input
}
