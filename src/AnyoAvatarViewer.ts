import {
  computed,
  defineComponent,
  h,
  inject,
  nextTick,
  onMounted,
  provide,
  ref,
  watch,
  type PropType,
  type DefineComponent,
  type SetupContext,
} from 'vue'
import type { ViewerState } from '@blcklab/anyo-avatar-viewer'
import type {
  Sekai64AnimationImporter,
  Sekai64AvatarBackground,
  Sekai64AvatarEnvironment,
  Sekai64AvatarNormalization,
  Sekai64AvatarQuality,
  VrmAnimationImporterOptions,
} from '@blcklab/anyo-avatar-viewer/browser'
import { AnyoAvatarControls } from './AnyoAvatarControls.js'
import { ANYO_AVATAR_CONTEXT, ANYO_AVATAR_DEFAULTS } from './injection.js'
import { resolveAnyoAvatarOptions } from './presets.js'
import type {
  AnyoAvatarAnimationInput,
  AnyoAvatarControlsMode,
  AnyoAvatarModelInput,
  AnyoAvatarPreset,
  AnyoAvatarVueDefaults,
  AnyoSceneConfig,
  AnyoAvatarViewerProps,
} from './types.js'
import { useAnyoAvatarViewer } from './useAnyoAvatarViewer.js'

export const AnyoAvatarViewer: DefineComponent<AnyoAvatarViewerProps> = defineComponent({
  name: 'AnyoAvatarViewer',
  inheritAttrs: true,
  props: {
    model: { type: [String, Object] as PropType<AnyoAvatarModelInput | null>, default: null },
    animation: { type: [String, Object] as PropType<AnyoAvatarAnimationInput | null>, default: null },
    animations: { type: [String, Object, Array] as PropType<AnyoAvatarAnimationInput | readonly AnyoAvatarAnimationInput[] | null>, default: null },
    scene: { type: Object as PropType<AnyoSceneConfig | null>, default: null },
    autoplay: { type: [Boolean, String] as PropType<boolean | string>, default: false },
    loop: { type: String as PropType<'once' | 'repeat'>, default: 'repeat' },
    speed: { type: Number, default: 1 },
    fade: { type: Number, default: 0.2 },
    preset: { type: String as PropType<AnyoAvatarPreset>, default: undefined },
    controls: { type: String as PropType<AnyoAvatarControlsMode>, default: undefined },
    quality: { type: String as PropType<Sekai64AvatarQuality>, default: undefined },
    environment: { type: String as PropType<Sekai64AvatarEnvironment>, default: undefined },
    background: { type: [String, Number, Array] as PropType<Sekai64AvatarBackground>, default: undefined },
    transparent: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    backend: { type: String as PropType<'auto' | 'webgl2' | 'webgpu'>, default: undefined },
    navigation: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    pointerPan: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    autoFit: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    autoRotate: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    autoRotateSpeed: { type: Number, default: undefined },
    shadows: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    exposure: { type: Number, default: undefined },
    pixelRatio: { type: Number, default: undefined },
    maxPixelRatio: { type: Number, default: undefined },
    normalization: { type: String as PropType<Sekai64AvatarNormalization>, default: undefined },
    targetHeight: { type: Number, default: undefined },
    recovery: { type: [Boolean, Object] as PropType<boolean | { readonly maxAttempts?: number }>, default: undefined },
    keyboard: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    statusOverlay: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    allowFileLoading: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    vrma: { type: Object as PropType<VrmAnimationImporterOptions>, default: undefined },
    importers: { type: Array as PropType<readonly Sekai64AnimationImporter[]>, default: undefined },
    runtimeKey: { type: [String, Number], default: 0 },
    aspectRatio: { type: [String, Number], default: undefined },
    minHeight: { type: [String, Number], default: 320 },
  },
  emits: ['ready', 'state-change', 'camera-change', 'recovery-change', 'diagnostic', 'error', 'model-loaded', 'animation-loaded', 'scene-change', 'prop-loaded', 'prop-animation-loaded', 'prop-progress', 'prop-diagnostic'],
  setup(props: Readonly<AnyoAvatarViewerProps>, { emit, slots, expose }: SetupContext) {
    const host = ref<HTMLElement | null>(null)
    const canvas = ref<HTMLCanvasElement | null>(null)
    const globalDefaults = inject(ANYO_AVATAR_DEFAULTS, Object.freeze({}) as Readonly<AnyoAvatarVueDefaults>) ?? {}
    const localDefaults = computed<AnyoAvatarVueDefaults>(() => ({
      preset: props.preset,
      controls: props.controls,
      quality: props.quality,
      environment: props.environment,
      background: props.background,
      transparent: props.transparent,
      backend: props.backend,
      navigation: props.navigation,
      pointerPan: props.pointerPan,
      autoFit: props.autoFit,
      autoRotate: props.autoRotate,
      autoRotateSpeed: props.autoRotateSpeed,
      shadows: props.shadows,
      exposure: props.exposure,
      pixelRatio: props.pixelRatio,
      maxPixelRatio: props.maxPixelRatio,
      normalization: props.normalization,
      targetHeight: props.targetHeight,
      recovery: props.recovery,
      keyboard: props.keyboard,
      statusOverlay: props.statusOverlay,
      allowFileLoading: props.allowFileLoading,
      vrma: props.vrma,
      importers: props.importers,
    } as AnyoAvatarVueDefaults))
    const resolved = computed(() => resolveAnyoAvatarOptions(localDefaults.value, globalDefaults))

    const controller = useAnyoAvatarViewer({
      canvas,
      host,
      options: resolved,
      onReady: runtime => emit('ready', runtime),
      onStateChange: state => emit('state-change', state),
      onCameraChange: state => emit('camera-change', state),
      onRecoveryChange: state => emit('recovery-change', state),
      onDiagnostic: message => emit('diagnostic', message),
      onError: error => emit('error', error),
      onModelLoaded: () => emit('model-loaded'),
      onAnimationLoaded: () => emit('animation-loaded'),
      onSceneChange: models => emit('scene-change', models),
      onPropLoaded: model => emit('prop-loaded', model),
      onPropAnimationLoaded: model => emit('prop-animation-loaded', model),
      onPropProgress: progress => emit('prop-progress', progress),
      onPropDiagnostic: diagnostic => emit('prop-diagnostic', diagnostic),
    })
    provide(ANYO_AVATAR_CONTEXT, controller.handle)
    expose(controller.handle)

    let modelToken = 0
    let animationToken = 0
    watch(() => [controller.ready.value, props.model] as const, async ([ready, model]: readonly [boolean, AnyoAvatarModelInput | null | undefined]) => {
      if (!ready || !model) return
      const token = ++modelToken
      try {
        await controller.handle.loadModel(model)
        if (token !== modelToken) return
        await loadAnimationProps()
      } catch (error) { emit('error', error) }
    }, { immediate: true })

    watch(() => [props.animation, props.animations] as const, async () => {
      if (!controller.hasModel.value || (!props.animation && !props.animations)) return
      const token = ++animationToken
      try {
        await loadAnimationProps()
        if (token !== animationToken) return
      } catch (error) { emit('error', error) }
    })

    watch(() => [controller.ready.value, props.scene] as const, async ([ready, scene]: readonly [boolean, AnyoSceneConfig | null | undefined]) => {
      if (!ready || !scene) return
      try { await controller.handle.loadScene(scene, { replace: true }) }
      catch (error) { emit('error', error) }
    }, { deep: true, immediate: true })

    watch(() => props.runtimeKey, () => { void controller.handle.recreate() })
    watch(() => props.speed, (value: number | undefined) => { if (controller.hasModel.value && value !== undefined && Number.isFinite(value) && value >= 0) controller.handle.setSpeed(value) })

    async function loadAnimationProps() {
      const inputs: AnyoAvatarAnimationInput[] = []
      if (props.animation) inputs.push(props.animation)
      if (props.animations) inputs.push(...(Array.isArray(props.animations) ? props.animations : [props.animations]))
      for (const input of inputs) await controller.handle.loadAnimation(input)
      if (props.autoplay && controller.viewerState.value.clips.length) {
        const id = typeof props.autoplay === 'string'
          ? controller.viewerState.value.clips.find(clip => clip.id === props.autoplay || clip.name === props.autoplay)?.id
          : controller.viewerState.value.clips[0]?.id
        if (id) controller.handle.play(id, { loop: props.loop ?? 'repeat', speed: props.speed ?? 1, fade: props.fade ?? 0.2 })
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!resolved.value.keyboard || !controller.hasModel.value) return
      const target = event.target as HTMLElement | null
      if (target?.matches('input,select,textarea,button,[contenteditable="true"]')) return
      let handled = true
      if (event.shiftKey && event.key === 'ArrowLeft') controller.handle.panBy(-28, 0)
      else if (event.shiftKey && event.key === 'ArrowRight') controller.handle.panBy(28, 0)
      else if (event.shiftKey && event.key === 'ArrowUp') controller.handle.panBy(0, 28)
      else if (event.shiftKey && event.key === 'ArrowDown') controller.handle.panBy(0, -28)
      else if (event.key === 'ArrowLeft') controller.handle.rotateLeft()
      else if (event.key === 'ArrowRight') controller.handle.rotateRight()
      else if (event.key === 'ArrowUp') controller.handle.focusUp()
      else if (event.key === 'ArrowDown') controller.handle.focusDown()
      else if (event.key === '+' || event.key === '=') controller.handle.zoomIn()
      else if (event.key === '-' || event.key === '_') controller.handle.zoomOut()
      else if (event.key === '1') controller.handle.focus('body')
      else if (event.key === '2') controller.handle.focus('face')
      else if (event.key === '3') controller.handle.focus('eyes')
      else if (event.key.toLowerCase() === 'f') controller.handle.fit()
      else if (event.key.toLowerCase() === 'r') controller.handle.resetView()
      else if (event.code === 'Space') controller.handle.togglePlayback()
      else handled = false
      if (handled) event.preventDefault()
    }

    onMounted(() => { void nextTick(() => host.value?.focus({ preventScroll: true })) })

    function statusText(state: ViewerState) {
      if (controller.fatalError.value) return controller.fatalError.value
      if (state.error) return state.error
      if (state.phase === 'loading') return 'Loading avatar…'
      if (state.loadingAnimations) return 'Loading animation…'
      if (!state.model) return 'Ready for avatar'
      if (!state.clips.length) return 'Avatar ready'
      return `${state.clips.length} clip${state.clips.length === 1 ? '' : 's'} · ${state.status}`
    }

    return () => {
      const state = controller.viewerState.value
      const value = resolved.value
      const ratio = props.aspectRatio !== undefined ? String(props.aspectRatio) : undefined
      const minHeight = typeof props.minHeight === 'number' ? `${props.minHeight}px` : String(props.minHeight)
      const slotProps = { api: controller.handle, state: controller.publicState.value, viewer: state, camera: controller.cameraState.value, recovery: controller.recoveryState.value }
      const controls = value.controls === 'none' ? null : (slots.controls
        ? slots.controls(slotProps)
        : h(AnyoAvatarControls, { mode: value.controls === 'full' ? 'full' : 'minimal', allowFileLoading: value.allowFileLoading,
          quality: value.quality, environment: value.environment, background: value.background, shadows: value.shadows, transparent: value.transparent }))
      const overlay = slots.default?.(slotProps)
      const empty = !state.model && slots.empty ? slots.empty(slotProps) : null
      const loading = state.phase === 'loading' && slots.loading ? slots.loading(slotProps) : null
      const error = (state.error || controller.fatalError.value) && slots.error ? slots.error(slotProps) : null
      return h('div', {
        ref: host,
        class: ['anyo-avatar-viewer', `anyo-avatar-viewer--${value.preset}`, value.transparent ? 'is-transparent' : ''],
        tabindex: value.keyboard ? 0 : undefined,
        onKeydown: onKeyDown,
        style: { aspectRatio: ratio, minHeight },
      }, [
        h('canvas', { ref: canvas, class: 'anyo-avatar-viewer__canvas', 'aria-label': 'Interactive 3D avatar viewer' }),
        value.statusOverlay ? h('div', { class: ['anyo-avatar-viewer__status', state.error || controller.fatalError.value ? 'is-error' : ''] }, [
          h('span', { class: 'anyo-avatar-viewer__dot' }), statusText(state), controller.backend.value ? ` · ${controller.backend.value}` : '',
        ]) : null,
        empty, loading, error, overlay, controls,
      ])
    }
  },
}) as unknown as DefineComponent<AnyoAvatarViewerProps>
