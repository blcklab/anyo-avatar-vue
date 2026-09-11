<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  AnyoAvatarControlsMode,
  AnyoAvatarPreset,
  AnyoAvatarViewerHandle,
  AnyoSceneConfig,
  AnyoSceneModelInfo,
} from '@blcklab/anyo-avatar-vue'
import type {
  Sekai64AvatarEnvironment,
  Sekai64AvatarQuality,
} from '@blcklab/anyo-avatar-viewer/browser'

const viewer = ref<AnyoAvatarViewerHandle | null>(null)
const modelInput = ref<HTMLInputElement | null>(null)
const animationInput = ref<HTMLInputElement | null>(null)
const propInput = ref<HTMLInputElement | null>(null)
const propAnimationInput = ref<HTMLInputElement | null>(null)

const preset = ref<AnyoAvatarPreset>('studio')
const controls = ref<AnyoAvatarControlsMode>('full')
const quality = ref<Sekai64AvatarQuality>('sekai-viewer')
const environment = ref<Sekai64AvatarEnvironment>('studio')
const transparent = ref(false)
const background = ref('#0a0c10')
const shadows = ref(true)
const autoRotate = ref(false)
const message = ref('Choose a VRM / GLB / glTF avatar, or add a GLB scene prop.')
const tick = ref(0)

const propPosition = ref<[number, number, number]>([0, 0, 0])
const propRotation = ref<[number, number, number]>([0, 0, 0])
const propScale = ref(1)
const autoplayEmbeddedProp = ref(false)
const autoplayPropAnimation = ref(true)
const selectedPropId = ref('')
const sceneModels = ref<readonly AnyoSceneModelInfo[]>([])
const sceneJson = ref(JSON.stringify({ version: 1, props: [] }, null, 2))

const state = computed(() => {
  tick.value
  return viewer.value?.state.viewer
})
const clips = computed(() => state.value?.clips ?? [])
const selectedClip = ref('')
const selectedProp = computed(() => sceneModels.value.find(model => model.id === selectedPropId.value) ?? null)

function touch() { tick.value++ }
function numberValue(event: Event) { return Number((event.currentTarget as HTMLInputElement).value) }
function setPosition(index: number, value: number) {
  const next: [number, number, number] = [...propPosition.value]
  next[index] = Number.isFinite(value) ? value : 0
  propPosition.value = next
}
function setRotation(index: number, value: number) {
  const next: [number, number, number] = [...propRotation.value]
  next[index] = Number.isFinite(value) ? value : 0
  propRotation.value = next
}
function onPropClip(event: Event) {
  if (!viewer.value || !selectedProp.value) return
  const value = (event.currentTarget as HTMLSelectElement).value
  if (value) viewer.value.playProp(selectedProp.value.id, value)
}
function onSelectedPropChange() { copySelectedTransform() }

async function onModel(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !viewer.value) return
  await run(async () => {
    await viewer.value!.loadModelFile(file)
    selectedClip.value = ''
    message.value = `${file.name} loaded as the primary avatar.`
    touch()
  })
}

async function onAnimation(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !viewer.value) return
  await run(async () => {
    await viewer.value!.loadAnimationFile(file)
    selectedClip.value = viewer.value!.state.viewer.clips.at(-1)?.id ?? ''
    message.value = `${file.name} added to the avatar.`
    touch()
  })
}

async function onProp(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !viewer.value) return
  await run(async () => {
    const model = await viewer.value!.loadPropFile(file, {
      position: propPosition.value,
      rotation: propRotation.value,
      scale: propScale.value,
      animations: autoplayEmbeddedProp.value ? [{ autoplay: true, loop: 'repeat' }] : undefined,
    })
    selectedPropId.value = model.id
    message.value = `${file.name} added as scene prop ${model.id}.`
  })
}

async function onPropAnimation(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !viewer.value || !selectedPropId.value) return
  await run(async () => {
    await viewer.value!.loadPropAnimationFile(selectedPropId.value, file, {
      autoplay: autoplayPropAnimation.value,
      loop: 'repeat',
    })
    message.value = `${file.name} assigned to ${selectedPropId.value}.`
  })
}

async function applySceneJson() {
  if (!viewer.value) return
  await run(async () => {
    const parsed = JSON.parse(sceneJson.value) as AnyoSceneConfig
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.props ?? [])) {
      throw new Error('Scene JSON must be an object with a props array.')
    }
    await viewer.value!.loadScene(parsed, { replace: true })
    message.value = `Applied scene JSON with ${parsed.props?.length ?? 0} prop(s).`
  })
}

function useSceneTemplate() {
  sceneJson.value = JSON.stringify({
    version: 1,
    props: [
      {
        id: 'desk',
        src: '/models/desk.glb',
        position: [0, 0, -0.8],
        rotation: [0, 180, 0],
        scale: 1,
      },
      {
        id: 'computer',
        src: '/models/computer.glb',
        position: [0.65, 0.75, -0.8],
        rotation: [0, -25, 0],
        scale: 0.9,
        animations: [
          { src: '/animations/computer.glb', clip: 'Screen', autoplay: true, loop: 'repeat' },
        ],
      },
    ],
  }, null, 2)
}

function applySelectedTransform() {
  if (!viewer.value || !selectedPropId.value) return
  viewer.value.updateProp(selectedPropId.value, {
    position: propPosition.value,
    rotation: propRotation.value,
    scale: propScale.value,
  })
  message.value = `Updated ${selectedPropId.value} transform.`
}

function copySelectedTransform() {
  const model = selectedProp.value
  if (!model) return
  propPosition.value = [...model.position]
  propRotation.value = [...model.rotation]
  propScale.value = model.scale[0]
}

function removeSelectedProp() {
  if (!viewer.value || !selectedPropId.value) return
  const id = selectedPropId.value
  viewer.value.removeProp(id)
  selectedPropId.value = ''
  message.value = `Removed ${id}.`
}

function onSceneChange(models: readonly AnyoSceneModelInfo[]) {
  sceneModels.value = models
  if (selectedPropId.value && !models.some(model => model.id === selectedPropId.value)) selectedPropId.value = ''
  if (!selectedPropId.value && models[0]) selectedPropId.value = models[0].id
  touch()
}

function play() { viewer.value?.play(selectedClip.value || undefined); touch() }
function pause() { viewer.value?.pause(); touch() }
function stop() { viewer.value?.stop(); touch() }
function onViewerError(error: unknown) { message.value = error instanceof Error ? error.message : String(error) }
async function run(action: () => Promise<void>) {
  try { await action() }
  catch (error) { message.value = error instanceof Error ? error.message : String(error) }
}
</script>

<template>
  <main class="page-shell">
    <aside class="panel">
      <div class="eyebrow">@blcklab/anyo-avatar-vue · local</div>
      <h1>Avatar + scene lab</h1>
      <p class="lede">One component for portfolio cards, viewers and studios. Load the avatar, motion and animated GLB props manually, or describe the environment with JSON.</p>

      <section class="section">
        <span class="label">Primary avatar</span>
        <input ref="modelInput" class="sr-only" type="file" accept=".vrm,.glb,.gltf" @change="onModel" />
        <input ref="animationInput" class="sr-only" type="file" accept=".vrma,.glb,.gltf" @change="onAnimation" />
        <div class="button-row">
          <button class="primary" @click="modelInput?.click()">Choose avatar</button>
          <button :disabled="!state?.model" @click="animationInput?.click()">Add animation</button>
        </div>
      </section>

      <section class="section two-cols">
        <label><span>Preset</span><select v-model="preset"><option>bare</option><option>portfolio</option><option>viewer</option><option>studio</option></select></label>
        <label><span>Controls</span><select v-model="controls"><option>none</option><option>minimal</option><option>full</option></select></label>
        <label><span>Quality</span><select v-model="quality"><option value="sekai-viewer">Sekai Viewer · Exact</option><option>character</option><option>ultra</option><option>balanced</option><option>performance</option></select></label>
        <label><span>Lighting</span><select v-model="environment"><option>studio</option><option>soft</option><option>none</option></select></label>
      </section>

      <section class="section">
        <span class="label">Presentation</span>
        <label class="check"><input v-model="transparent" type="checkbox" />Transparent canvas</label>
        <label class="check"><input v-model="shadows" type="checkbox" />Shadows</label>
        <label class="check"><input v-model="autoRotate" type="checkbox" />Auto rotate</label>
        <label class="color" :class="{ muted: transparent }"><span>Background</span><input v-model="background" type="color" :disabled="transparent" /></label>
        <small v-if="transparent">Canvas alpha is zero; the checker below is the host/card background.</small>
      </section>

      <section class="section">
        <span class="label">Avatar playback</span>
        <select v-model="selectedClip" :disabled="!clips.length">
          <option value="">{{ clips.length ? 'Choose clip' : 'No animation loaded' }}</option>
          <option v-for="clip in clips" :key="clip.id" :value="clip.id">{{ clip.name }} · {{ clip.duration.toFixed(2) }}s</option>
        </select>
        <div class="button-row three">
          <button :disabled="!clips.length" @click="play">Play</button>
          <button :disabled="!clips.length" @click="pause">Pause</button>
          <button :disabled="!clips.length" @click="stop">Stop</button>
        </div>
      </section>

      <section class="section">
        <span class="label">Add local GLB prop</span>
        <input ref="propInput" class="sr-only" type="file" accept=".glb" @change="onProp" />
        <div class="xyz-grid">
          <span>Pos</span>
          <input :value="propPosition[0]" type="number" step="0.05" @input="setPosition(0, numberValue($event))" />
          <input :value="propPosition[1]" type="number" step="0.05" @input="setPosition(1, numberValue($event))" />
          <input :value="propPosition[2]" type="number" step="0.05" @input="setPosition(2, numberValue($event))" />
          <span>Rot°</span>
          <input :value="propRotation[0]" type="number" step="5" @input="setRotation(0, numberValue($event))" />
          <input :value="propRotation[1]" type="number" step="5" @input="setRotation(1, numberValue($event))" />
          <input :value="propRotation[2]" type="number" step="5" @input="setRotation(2, numberValue($event))" />
        </div>
        <label><span>Uniform scale</span><input v-model.number="propScale" type="number" min="0.001" max="1000" step="0.05" /></label>
        <label class="check"><input v-model="autoplayEmbeddedProp" type="checkbox" />Autoplay first embedded prop clip</label>
        <button class="primary" @click="propInput?.click()">Add GLB prop</button>
      </section>

      <section class="section">
        <span class="label">Selected prop</span>
        <select v-model="selectedPropId" @change="onSelectedPropChange">
          <option value="">{{ sceneModels.length ? 'Choose prop' : 'No scene props' }}</option>
          <option v-for="model in sceneModels" :key="model.id" :value="model.id">{{ model.name }} · {{ model.id }}</option>
        </select>
        <template v-if="selectedProp">
          <div class="xyz-grid">
            <span>Pos</span>
            <input :value="propPosition[0]" type="number" step="0.05" @input="setPosition(0, numberValue($event))" />
            <input :value="propPosition[1]" type="number" step="0.05" @input="setPosition(1, numberValue($event))" />
            <input :value="propPosition[2]" type="number" step="0.05" @input="setPosition(2, numberValue($event))" />
            <span>Rot°</span>
            <input :value="propRotation[0]" type="number" step="5" @input="setRotation(0, numberValue($event))" />
            <input :value="propRotation[1]" type="number" step="5" @input="setRotation(1, numberValue($event))" />
            <input :value="propRotation[2]" type="number" step="5" @input="setRotation(2, numberValue($event))" />
          </div>
          <div class="button-row three">
            <button @click="applySelectedTransform">Apply transform</button>
            <button @click="viewer?.setPropVisible(selectedProp.id, !selectedProp.visible)">{{ selectedProp.visible ? 'Hide' : 'Show' }}</button>
            <button class="danger" @click="removeSelectedProp">Remove</button>
          </div>

          <input ref="propAnimationInput" class="sr-only" type="file" accept=".glb" @change="onPropAnimation" />
          <label class="check"><input v-model="autoplayPropAnimation" type="checkbox" />Autoplay assigned prop animation</label>
          <button @click="propAnimationInput?.click()">Assign GLB animation</button>

          <select :value="selectedProp.currentClip ?? ''" @change="onPropClip">
            <option value="">{{ selectedProp.clips.length ? 'Choose prop clip' : 'No prop animation clips' }}</option>
            <option v-for="clip in selectedProp.clips" :key="clip.id" :value="clip.id">{{ clip.name }} · {{ clip.duration.toFixed(2) }}s</option>
          </select>
          <div class="button-row three">
            <button :disabled="!selectedProp.clips.length" @click="viewer?.playProp(selectedProp.id)">Play</button>
            <button :disabled="!selectedProp.clips.length" @click="viewer?.pauseProp(selectedProp.id)">Pause</button>
            <button :disabled="!selectedProp.clips.length" @click="viewer?.stopProp(selectedProp.id)">Stop</button>
          </div>
        </template>
      </section>

      <section class="section">
        <div class="section-head"><span class="label">JSON scene config</span><button class="text-button" @click="useSceneTemplate">Template</button></div>
        <textarea v-model="sceneJson" spellcheck="false" rows="12" />
        <button @click="applySceneJson">Apply JSON scene</button>
        <small>JSON scenes use URL-backed GLB/glTF props. Local files cannot be serialized, so use the local prop controls above.</small>
      </section>

      <section class="section">
        <span class="label">Camera API</span>
        <div class="button-row three">
          <button @click="viewer?.focus('body')">Body</button>
          <button @click="viewer?.focus('face')">Face</button>
          <button @click="viewer?.focus('eyes')">Eyes</button>
          <button @click="viewer?.zoomIn()">Zoom +</button>
          <button @click="viewer?.zoomOut()">Zoom −</button>
          <button @click="viewer?.fit()">Fit</button>
        </div>
      </section>

      <p class="status">{{ message }}</p>
    </aside>

    <section class="preview-column">
      <div class="preview-header">
        <div><strong>{{ preset }}</strong><span>{{ controls }} controls · {{ sceneModels.length }} prop{{ sceneModels.length === 1 ? '' : 's' }}</span></div>
        <code>{{ state?.status ?? 'empty' }}</code>
      </div>
      <div class="viewer-card" :class="{ checker: transparent }">
        <AnyoAvatarViewer
          ref="viewer"
          :preset="preset"
          :controls="controls"
          :quality="quality"
          :environment="environment"
          :transparent="transparent"
          :background="background"
          :shadows="shadows"
          :auto-rotate="autoRotate"
          :allow-file-loading="controls === 'full'"
          :status-overlay="preset !== 'portfolio' && preset !== 'bare'"
          min-height="720px"
          @state-change="touch"
          @scene-change="onSceneChange"
          @error="onViewerError"
        />
      </div>
      <p class="hint">Avatar and animated props share one Sekai64 scene + animation clock. Drag to orbit · wheel/pinch to zoom · middle/right drag to pan.</p>
    </section>
  </main>
</template>
