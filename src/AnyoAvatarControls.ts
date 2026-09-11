import { defineComponent, h, ref, watch, type DefineComponent, type PropType } from 'vue'
import type { Sekai64AvatarEnvironment, Sekai64AvatarQuality } from '@blcklab/anyo-avatar-viewer/browser'
import { useAnyoAvatar } from './injection.js'
import type { AnyoAvatarControlsMode, AnyoAvatarControlsProps } from './types.js'

export const AnyoAvatarControls: DefineComponent<AnyoAvatarControlsProps> = defineComponent({
  name: 'AnyoAvatarControls',
  props: {
    mode: { type: String as PropType<Exclude<AnyoAvatarControlsMode, 'none'>>, default: 'minimal' },
    allowFileLoading: { type: Boolean, default: false },
    quality: { type: String as PropType<Sekai64AvatarQuality>, default: 'sekai-viewer' },
    environment: { type: String as PropType<Sekai64AvatarEnvironment>, default: 'studio' },
    background: { type: [String, Number, Array] as PropType<any>, default: '#0a0c10' },
    shadows: { type: Boolean, default: true },
    transparent: { type: Boolean, default: false },
  },
  setup(props: Readonly<AnyoAvatarControlsProps>) {
    const api = useAnyoAvatar()
    const more = ref(false)
    const selectedClip = ref('')
    const quality = ref(props.quality ?? 'sekai-viewer')
    const environment = ref(props.environment ?? 'studio')
    const shadows = ref(props.shadows ?? true)
    const background = ref(typeof props.background === 'string' && /^#[0-9a-f]{6}$/i.test(props.background) ? props.background : '#0a0c10')
    const expression = ref('')
    const expressionWeight = ref(1)
    const lookX = ref(0)
    const lookY = ref(1.6)
    const lookZ = ref(-2)
    const selectedPropId = ref('')
    const selectedPropClip = ref('')

    watch(() => props.quality, (value: Sekai64AvatarQuality | undefined) => { if (value) quality.value = value })
    watch(() => props.environment, (value: Sekai64AvatarEnvironment | undefined) => { if (value) environment.value = value })
    watch(() => props.shadows, (value: boolean | undefined) => { if (value !== undefined) shadows.value = value })
    watch(() => props.background, (value: unknown) => { if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) background.value = value })

    function viewer() { return api.state.viewer }
    function camera() { return api.state.camera }
    function currentClip() { return selectedClip.value || viewer().clip || viewer().clips[0]?.id || '' }
    function togglePlayback() { api.togglePlayback(currentClip()) }
    function playSelected() { const id = currentClip(); if (id) api.play(id) }
    function activeExpression() { return expression.value || api.state.viewer.expressions.available[0] || '' }
    function setExpression() { const name = activeExpression(); if (name) api.setExpression(name, expressionWeight.value) }
    function applyLookAt() { api.setLookAt([lookX.value, lookY.value, lookZ.value], { space: 'world', eyes: true, head: true, neck: true, smoothing: 0.12 }) }
    function sceneModels() { return api.state.sceneModels }
    function selectedProp() {
      const models = sceneModels()
      const found = models.find(model => model.id === selectedPropId.value) ?? models[0]
      if (found && selectedPropId.value !== found.id) selectedPropId.value = found.id
      return found
    }
    function updatePropPosition(index: 0 | 1 | 2, value: number) {
      const model = selectedProp(); if (!model) return
      const position = [...model.position] as [number, number, number]; position[index] = value
      api.updateProp(model.id, { position })
    }
    function updatePropRotation(index: 0 | 1 | 2, value: number) {
      const model = selectedProp(); if (!model) return
      const rotation = [...model.rotation] as [number, number, number]; rotation[index] = value
      api.updateProp(model.id, { rotation })
    }
    function updatePropScale(value: number) { const model = selectedProp(); if (model) api.updateProp(model.id, { scale: value }) }
    function playSelectedProp() { const model = selectedProp(); if (model) api.playProp(model.id, selectedPropClip.value || undefined) }

    const button = (label: string, onClick: () => void | Promise<void>, attrs: Record<string, any> = {}) =>
      h('button', { type: 'button', class: 'anyo-avatar-control-button', onClick, ...attrs }, label)

    const section = (title: string, children: any[]) => h('section', { class: 'anyo-avatar-control-section' }, [
      h('div', { class: 'anyo-avatar-control-label' }, title),
      ...children,
    ])

    return () => {
      const state = viewer()
      const hasModel = state.phase === 'ready' && Boolean(state.model)
      const hasAnimation = state.clips.length > 0
      const isPlaying = state.status === 'playing'
      const primary = h('div', { class: 'anyo-avatar-control-bar' }, [
        props.allowFileLoading ? button('Avatar', api.openModelPicker) : null,
        button('−', api.zoomOut, { title: 'Zoom out', disabled: !hasModel }),
        button('+', api.zoomIn, { title: 'Zoom in', disabled: !hasModel }),
        button('←', api.rotateLeft, { title: 'Rotate left', disabled: !hasModel }),
        button('→', api.rotateRight, { title: 'Rotate right', disabled: !hasModel }),
        button(isPlaying ? 'Pause' : 'Play', togglePlayback, { disabled: !hasAnimation }),
        button('Fit', api.fit, { disabled: !hasModel }),
        (props.mode ?? 'minimal') === 'full' ? button('More', () => { more.value = !more.value }, { 'aria-expanded': more.value }) : null,
      ])

      if ((props.mode ?? 'minimal') !== 'full' || !more.value) return h('div', { class: 'anyo-avatar-controls' }, [primary])

      const clipOptions = [h('option', { value: '' }, 'Choose animation'), ...state.clips.map(clip => h('option', { value: clip.id }, `${clip.name} · ${clip.duration.toFixed(2)}s`))]
      const expressions = state.expressions.available

      const panel = h('div', { class: 'anyo-avatar-more-panel' }, [
        section('Load', [
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--2' }, [
            button('Choose avatar', api.openModelPicker, { disabled: !props.allowFileLoading }),
            button('Add animation', api.openAnimationPicker, { disabled: !props.allowFileLoading || !hasModel }),
            button('Add GLB prop', api.openPropPicker, { disabled: !props.allowFileLoading }),
          ]),
        ]),
        section('Animation', [
          h('select', {
            class: 'anyo-avatar-select', value: currentClip(), disabled: !hasAnimation,
            onChange: (event: Event) => { selectedClip.value = (event.target as HTMLSelectElement).value },
          }, clipOptions),
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--3' }, [
            button('Play', playSelected, { disabled: !hasAnimation }),
            button('Pause', api.pause, { disabled: !hasAnimation }),
            button('Stop', api.stop, { disabled: !hasAnimation }),
          ]),
          h('label', { class: 'anyo-avatar-field' }, [
            h('span', null, `Seek ${state.time.toFixed(2)} / ${state.duration.toFixed(2)}s`),
            h('input', { type: 'range', min: 0, max: state.duration || 1, step: 0.01, value: state.time, disabled: !state.clip,
              onInput: (event: Event) => api.seek(Number((event.target as HTMLInputElement).value)) }),
          ]),
          h('label', { class: 'anyo-avatar-field' }, [
            h('span', null, `Speed ${state.speed.toFixed(1)}×`),
            h('input', { type: 'range', min: 0, max: 2, step: 0.1, value: state.speed,
              onInput: (event: Event) => api.setSpeed(Number((event.target as HTMLInputElement).value)) }),
          ]),
        ]),
        section('Focus & camera', [
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--3' }, [
            button('Body', () => api.focus('body'), { disabled: !hasModel }),
            button('Face', () => api.focus('face'), { disabled: !hasModel }),
            button('Eyes', () => api.focus('eyes'), { disabled: !hasModel }),
            button('Focus ↑', () => api.focusUp(), { disabled: !hasModel }),
            button('Focus ↓', () => api.focusDown(), { disabled: !hasModel }),
            button('Reset', api.resetView, { disabled: !hasModel }),
          ]),
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--4' }, [
            button('Pan ←', () => api.panBy(-32, 0), { disabled: !hasModel }),
            button('Pan ↑', () => api.panBy(0, 32), { disabled: !hasModel }),
            button('Pan ↓', () => api.panBy(0, -32), { disabled: !hasModel }),
            button('Pan →', () => api.panBy(32, 0), { disabled: !hasModel }),
          ]),
          h('label', { class: 'anyo-avatar-check' }, [
            h('input', { type: 'checkbox', checked: camera()?.autoRotate ?? false, disabled: !hasModel,
              onChange: (event: Event) => api.setAutoRotate((event.target as HTMLInputElement).checked) }),
            h('span', null, 'Auto rotate'),
          ]),
        ]),
        section('Visuals', [
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--2' }, [
            h('label', { class: 'anyo-avatar-field' }, [h('span', null, 'Quality'), h('select', { class: 'anyo-avatar-select', value: quality.value,
              onChange: (event: Event) => { quality.value = (event.target as HTMLSelectElement).value as Sekai64AvatarQuality; api.setQuality(quality.value) } }, [
                'sekai-viewer', 'character', 'ultra', 'balanced', 'performance',
              ].map(value => h('option', { value }, value === 'sekai-viewer' ? 'Sekai Viewer · Exact' : value)))]),
            h('label', { class: 'anyo-avatar-field' }, [h('span', null, 'Lighting'), h('select', { class: 'anyo-avatar-select', value: environment.value,
              onChange: (event: Event) => { environment.value = (event.target as HTMLSelectElement).value as Sekai64AvatarEnvironment; api.setEnvironment(environment.value) } }, [
                'studio', 'soft', 'none',
              ].map(value => h('option', { value }, value)))]),
          ]),
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--2' }, [
            h('label', { class: 'anyo-avatar-field' }, [h('span', null, props.transparent ? 'Background (host)' : 'Background'), h('input', { type: 'color', value: background.value, disabled: props.transparent,
              onInput: (event: Event) => { background.value = (event.target as HTMLInputElement).value; api.setBackground(background.value) } })]),
            h('label', { class: 'anyo-avatar-check' }, [h('input', { type: 'checkbox', checked: shadows.value,
              onChange: (event: Event) => { shadows.value = (event.target as HTMLInputElement).checked; api.setShadows(shadows.value) } }), h('span', null, 'Shadows')]),
          ]),
          props.transparent ? h('p', { class: 'anyo-avatar-muted' }, 'Transparent canvas is active; the host/card supplies the background.') : null,
        ]),
        section('Scene props', sceneModels().length ? (() => {
          const model = selectedProp()!
          const clips = model.clips
          return [
            h('select', { class: 'anyo-avatar-select', value: model.id, onChange: (event: Event) => { selectedPropId.value = (event.target as HTMLSelectElement).value; selectedPropClip.value = '' } },
              sceneModels().map(item => h('option', { value: item.id }, item.name))),
            h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--3' }, [
              numericValue('X', model.position[0], value => updatePropPosition(0, value)),
              numericValue('Y', model.position[1], value => updatePropPosition(1, value)),
              numericValue('Z', model.position[2], value => updatePropPosition(2, value)),
              numericValue('Rot X', model.rotation[0], value => updatePropRotation(0, value)),
              numericValue('Rot Y', model.rotation[1], value => updatePropRotation(1, value)),
              numericValue('Rot Z', model.rotation[2], value => updatePropRotation(2, value)),
            ]),
            numericValue('Scale', model.scale[0], updatePropScale, 0.05),
            h('label', { class: 'anyo-avatar-check' }, [
              h('input', { type: 'checkbox', checked: model.visible, onChange: (event: Event) => api.setPropVisible(model.id, (event.target as HTMLInputElement).checked) }),
              h('span', null, 'Visible'),
            ]),
            h('select', { class: 'anyo-avatar-select', value: selectedPropClip.value || model.currentClip || '', disabled: !clips.length,
              onChange: (event: Event) => { selectedPropClip.value = (event.target as HTMLSelectElement).value } },
              [h('option', { value: '' }, clips.length ? 'Choose prop clip' : 'No prop animation'), ...clips.map(clip => h('option', { value: clip.id }, `${clip.name} · ${clip.duration.toFixed(2)}s`))]),
            h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--3' }, [
              button('Play prop', playSelectedProp, { disabled: !clips.length }),
              button('Pause prop', () => { api.pauseProp(model.id) }, { disabled: !clips.length }),
              button('Stop prop', () => { api.stopProp(model.id) }, { disabled: !clips.length }),
            ]),
            h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--2' }, [
              button('Add prop animation', () => api.openPropAnimationPicker(model.id), { disabled: !props.allowFileLoading }),
              button('Remove prop', () => api.removeProp(model.id)),
            ]),
          ]
        })() : [
          h('p', { class: 'anyo-avatar-muted' }, 'No scene props loaded.'),
          button('Add GLB prop', api.openPropPicker, { disabled: !props.allowFileLoading }),
        ]),
        section('Expressions', expressions.length ? [
          h('select', { class: 'anyo-avatar-select', value: activeExpression(),
            onChange: (event: Event) => { expression.value = (event.target as HTMLSelectElement).value } }, expressions.map(name => h('option', { value: name }, name))),
          h('label', { class: 'anyo-avatar-field' }, [h('span', null, `Weight ${expressionWeight.value.toFixed(2)}`), h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: expressionWeight.value,
            onInput: (event: Event) => { expressionWeight.value = Number((event.target as HTMLInputElement).value); setExpression() } })]),
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--3' }, [button('Apply', setExpression), button('Clear', () => { const name = activeExpression(); if (name) api.clearExpression(name) }), button('Reset all', api.resetExpressions)]),
        ] : [h('p', { class: 'anyo-avatar-muted' }, 'No direct VRM expressions are exposed by the current model.')]),
        section('Look at', [
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--3' }, [
            numeric('X', lookX), numeric('Y', lookY), numeric('Z', lookZ),
          ]),
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--2' }, [button('Apply target', applyLookAt, { disabled: !hasModel }), button('Clear look-at', api.clearLookAt, { disabled: !hasModel })]),
        ]),
        section('Runtime', [
          h('div', { class: 'anyo-avatar-runtime-line' }, [h('span', null, 'Renderer'), h('strong', null, api.state.backend || '—')]),
          h('div', { class: 'anyo-avatar-runtime-line' }, [h('span', null, 'Recovery'), h('strong', null, api.state.recovery?.status ?? '—')]),
          h('div', { class: 'anyo-avatar-grid anyo-avatar-grid--2' }, [
            button('Recover renderer', () => api.recover('Manual recovery request')),
            button(api.state.fullscreen ? 'Exit fullscreen' : 'Fullscreen', api.toggleFullscreen),
            button('Screenshot', () => { void api.screenshot() }),
            button('Recreate runtime', api.recreate),
          ]),
        ]),
      ])

      return h('div', { class: 'anyo-avatar-controls' }, [panel, primary])
    }

    function numericValue(label: string, value: number, onValue: (value: number) => void, step = 0.1) {
      return h('label', { class: 'anyo-avatar-field' }, [h('span', null, label), h('input', { type: 'number', step, value,
        onChange: (event: Event) => onValue(Number((event.target as HTMLInputElement).value)) })])
    }

    function numeric(label: string, value: { value: number }) {
      return h('label', { class: 'anyo-avatar-field' }, [h('span', null, label), h('input', { type: 'number', step: 0.05, value: value.value,
        onInput: (event: Event) => { value.value = Number((event.target as HTMLInputElement).value) } })])
    }
  },
}) as unknown as DefineComponent<AnyoAvatarControlsProps>
