import { Mesh, type Node } from '@blcklab/sekai64'
import { AssetManager, type AssetProgress } from '@blcklab/sekai64/assets'
import {
  AnimationClip,
  AnimationTrack,
  SkinnedGeometry,
  createGltfAnimationAdapter,
  GLTF_ANIMATION_EXTENSION_ID,
  type AnimationAction,
  type AnimationMixer,
  type GltfAnimationSet,
} from '@blcklab/sekai64/animation'
import { GltfLoader, type GltfDiagnostic, type GltfModelNode } from '@blcklab/sekai64/gltf'
import { createGltfClipImporter, type TargetNode } from '@blcklab/anyo-avatar-viewer/browser'
import type { AnimationSource, ViewerVec3 } from '@blcklab/anyo-avatar-viewer'
import type {
  AnyoAvatarRuntime,
  AnyoSceneAnimationConfig,
  AnyoSceneConfig,
  AnyoSceneDiagnostic,
  AnyoSceneLoadProgress,
  AnyoSceneModelConfig,
  AnyoSceneModelInfo,
  AnyoSceneModelInput,
  AnyoSceneRenderConfig,
  AnyoSceneTransform,
} from './types.js'

interface SceneRecord {
  readonly id: string
  readonly loader: GltfLoader
  readonly node: GltfModelNode
  readonly mixer: AnimationMixer
  readonly ownsMixer: boolean
  readonly ownedExternalClips: AnimationClip[]
  readonly loadMode: 'animated' | 'static'
  currentAction?: AnimationAction
}

export interface LoadSceneOptions { readonly replace?: boolean }
export interface AnyoSceneModelManagerOptions {
  readonly onProgress?: (progress: AnyoSceneLoadProgress) => void
  readonly onDiagnostic?: (diagnostic: AnyoSceneDiagnostic) => void
}

/**
 * Host-owned Sekai64 scene layer for non-avatar GLB/glTF assets.
 *
 * Avatar Viewer intentionally remains single-avatar. Props share the same scene,
 * renderer, animation module and AssetManager but have independent ownership and playback.
 * A shared AssetManager allows repeated URLs/textures to reuse Sekai64's cache.
 */
export class AnyoSceneModelManager {
  private readonly records = new Map<string, SceneRecord>()
  private readonly assets = new AssetManager()
  private sequence = 0
  private externalSequence = 0
  private disposed = false

  constructor(
    private readonly runtime: AnyoAvatarRuntime,
    private readonly hooks: AnyoSceneModelManagerOptions = {},
  ) {}

  list(): readonly AnyoSceneModelInfo[] {
    return Object.freeze([...this.records.values()].map(record => snapshot(record)))
  }

  async loadScene(config: AnyoSceneConfig, options: LoadSceneOptions = {}): Promise<readonly AnyoSceneModelInfo[]> {
    this.alive()
    if (config.version !== undefined && config.version !== 1) throw new Error(`Unsupported Anyo scene config version: ${String(config.version)}`)
    if (options.replace ?? true) this.clear()
    for (const item of config.props ?? []) {
      const merged = mergeSceneModelConfig(item, config.defaults)
      await this.load(merged.src, merged)
    }
    return this.list()
  }

  async load(input: AnyoSceneModelInput, config: Omit<AnyoSceneModelConfig, 'src'> = {}): Promise<AnyoSceneModelInfo> {
    this.alive()
    const id = config.id?.trim() || `anyo-scene-model-${++this.sequence}`
    if (this.records.has(id)) throw new Error(`Scene model id is already in use: ${id}`)
    const name = config.name?.trim() || (typeof input === 'string' ? nameFromUrl(input) : isFile(input) ? input.name.replace(/\.glb$/i, '') : nameFromUrl(input.url)) || id
    const load = normalizeLoadConfig(config.load)
    const loadMode = load.mode ?? 'animated'
    if (loadMode === 'static' && (config.animations?.length ?? 0) > 0) {
      throw new Error(`Scene model "${id}" is configured as static but also declares animations. Use load.mode: "animated".`)
    }

    const loader = new GltfLoader(this.assets)
    const prepared = await prepareModelInput(loader, input)
    let node: GltfModelNode | undefined
    try {
      const animationAdapter = loadMode === 'animated'
        ? createGltfAnimationAdapter(this.runtime.animation, { createMixer: true })
        : undefined

      node = await loader.loadNode(prepared.url, {
        id,
        name: config.name ?? prepared.name ?? id,
        animation: animationAdapter,
        animatedFallback: 'static-pose',
        // Sekai64 disables batching when an animation adapter is attached. Make that
        // explicit so high-detail static environments can opt into real instancing.
        staticBatching: loadMode === 'static' ? (load.staticBatching ?? true) : false,
        strict: load.strict,
        retries: load.retries,
        cache: load.cache,
        headers: load.headers,
        texture: load.texture,
        draco: load.draco,
        dracoDecoderPath: load.dracoDecoderPath,
        onProgress: (progress: AssetProgress) => this.hooks.onProgress?.(Object.freeze({
          id,
          name,
          loaded: progress.loaded,
          ...(progress.total === undefined ? {} : { total: progress.total }),
          ...(progress.ratio === undefined ? {} : { ratio: progress.ratio }),
        })),
        onDiagnostic: (diagnostic: GltfDiagnostic) => this.hooks.onDiagnostic?.(Object.freeze({
          id,
          name,
          severity: diagnostic.severity,
          code: diagnostic.code,
          message: diagnostic.message,
        })),
      })
      applyTransform(node, config)
      applyRenderConfig(node, config.render)
      this.runtime.scene.add(node)

      const embedded = loadMode === 'animated'
        ? node.asset.getExtension<GltfAnimationSet>(GLTF_ANIMATION_EXTENSION_ID)
        : undefined
      const mixer = embedded?.mixer ?? this.runtime.animation.createMixer(node, embedded?.clips ?? [])
      const record: SceneRecord = {
        id,
        loader,
        node,
        mixer,
        ownsMixer: !embedded?.mixer,
        ownedExternalClips: [],
        loadMode,
      }
      this.records.set(id, record)
      for (const animation of config.animations ?? []) await this.loadAnimation(id, animation)
      return snapshot(record)
    } catch (error) {
      node?.removeFromParent()
      node?.dispose()
      loader.dispose()
      throw error
    } finally {
      prepared.dispose()
    }
  }

  async loadAnimation(id: string, config: AnyoSceneAnimationConfig): Promise<AnyoSceneModelInfo> {
    const record = this.require(id)
    if (record.loadMode === 'static') {
      throw new Error(`Scene model "${id}" was loaded in static mode. Reload it with load.mode: "animated" before adding animation.`)
    }
    if (config.src) {
      const source = await prepareAnimationInput(config.src)
      try {
        if (source.source.format !== 'glb' && source.source.format !== 'gltf') {
          throw new Error('Scene prop external animations support same-rig .glb/.gltf. VRMA belongs to the avatar viewer.')
        }
        const imported = await createGltfClipImporter().load({
          source: source.source,
          signal: new AbortController().signal,
          targets: captureTargets(record.node),
        })
        for (const [index, clip] of imported.entries()) {
          const owned = cloneClip(clip, `scene:${id}:external:${++this.externalSequence}:${index}`)
          record.mixer.addClip(owned)
          record.ownedExternalClips.push(owned)
          clip.dispose()
        }
      } finally {
        source.dispose()
      }
    }
    if (config.autoplay) this.play(id, config.clip, config)
    return snapshot(record)
  }

  play(id: string, clip?: string | number, options: Pick<AnyoSceneAnimationConfig, 'loop' | 'speed' | 'weight'> = {}): AnyoSceneModelInfo {
    const record = this.require(id)
    if (record.loadMode === 'static') throw new Error(`Scene model "${id}" is static and has no animation runtime.`)
    const mixer = record.mixer
    if (mixer.clips.size === 0) throw new Error(`Scene model "${id}" has no animation clips.`)
    const resolved = resolveClip(mixer, clip)
    mixer.stopAll()
    record.currentAction = mixer.play(resolved, {
      loop: options.loop ?? 'repeat',
      speed: finiteOr(options.speed, 1, 'Animation speed'),
      weight: finiteOr(options.weight, 1, 'Animation weight'),
    })
    return snapshot(record)
  }

  pause(id: string): AnyoSceneModelInfo { const record = this.require(id); record.currentAction?.pause(); return snapshot(record) }
  resume(id: string): AnyoSceneModelInfo { const record = this.require(id); record.currentAction?.resume(); return snapshot(record) }
  stop(id: string): AnyoSceneModelInfo { const record = this.require(id); record.mixer.stopAll(); record.currentAction = undefined; return snapshot(record) }

  update(id: string, transform: AnyoSceneTransform): AnyoSceneModelInfo {
    const record = this.require(id)
    applyTransform(record.node, transform)
    return snapshot(record)
  }

  setVisible(id: string, visible: boolean): AnyoSceneModelInfo {
    const record = this.require(id)
    record.node.visible = visible
    return snapshot(record)
  }

  remove(id: string): void {
    const record = this.records.get(id)
    if (!record) return
    this.records.delete(id)
    record.mixer.stopAll()
    if (record.ownsMixer) { this.runtime.animation.removeMixer(record.mixer); record.mixer.clearListeners() }
    for (const clip of record.ownedExternalClips) clip.dispose()
    record.node.removeFromParent()
    record.node.dispose()
    record.loader.dispose()
  }

  clear(): void { for (const id of [...this.records.keys()]) this.remove(id) }
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.clear()
    this.assets.dispose()
  }

  private require(id: string): SceneRecord {
    this.alive()
    const record = this.records.get(id)
    if (!record) throw new Error(`Unknown scene model: ${id}`)
    return record
  }
  private alive(): void { if (this.disposed) throw new Error('Scene model manager is disposed.') }
}

export function mergeSceneModelConfig(
  item: AnyoSceneModelConfig,
  defaults?: AnyoSceneConfig['defaults'],
): AnyoSceneModelConfig {
  if (!defaults) return item
  return {
    ...item,
    load: mergeLoadConfig(defaults.load, item.load),
    render: { ...defaults.render, ...item.render },
  }
}

function mergeLoadConfig(
  defaults: AnyoSceneModelConfig['load'],
  local: AnyoSceneModelConfig['load'],
): AnyoSceneModelConfig['load'] {
  if (!defaults) return local
  if (!local) return defaults
  return {
    ...defaults,
    ...local,
    texture: { ...defaults.texture, ...local.texture },
  }
}

function normalizeLoadConfig(load: AnyoSceneModelConfig['load']) {
  const value = load ?? {}
  if (value.retries !== undefined && (!Number.isInteger(value.retries) || value.retries < 0 || value.retries > 10)) {
    throw new Error('Scene model load.retries must be an integer from 0 to 10.')
  }
  if (value.texture?.maxBytes !== undefined && (!Number.isFinite(value.texture.maxBytes) || value.texture.maxBytes <= 0)) {
    throw new Error('Scene model texture.maxBytes must be greater than 0.')
  }
  if (value.texture?.maxDimension !== undefined && (!Number.isInteger(value.texture.maxDimension) || value.texture.maxDimension <= 0)) {
    throw new Error('Scene model texture.maxDimension must be a positive integer.')
  }
  if (typeof value.staticBatching === 'object') {
    const min = value.staticBatching.minInstances
    if (min !== undefined && (!Number.isInteger(min) || min < 2)) throw new Error('staticBatching.minInstances must be an integer >= 2.')
  }
  return value
}

function applyRenderConfig(node: GltfModelNode, render?: AnyoSceneRenderConfig): void {
  if (!render) return
  node.traverse(child => {
    if (!(child instanceof Mesh)) return
    if (render.castShadow !== undefined) child.castShadow = render.castShadow
    if (render.receiveShadow !== undefined) child.receiveShadow = render.receiveShadow
  })
}

function applyTransform(node: Node, transform: AnyoSceneTransform): void {
  if (transform.position) node.position.set(...vec3(transform.position, 'Position'))
  if (transform.rotation) {
    const [x, y, z] = vec3(transform.rotation, 'Rotation')
    node.rotation.set(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180)
  }
  if (transform.scale !== undefined) {
    const value = typeof transform.scale === 'number'
      ? [transform.scale, transform.scale, transform.scale] as const
      : vec3(transform.scale, 'Scale')
    if (value.some(entry => entry <= 0 || entry > 1000)) throw new Error('Scene model scale values must be greater than 0 and at most 1000.')
    node.scale.set(...value)
  }
  if (transform.visible !== undefined) node.visible = transform.visible
}

function snapshot(record: SceneRecord): AnyoSceneModelInfo {
  const { node, mixer, currentAction } = record
  return Object.freeze({
    id: record.id,
    name: node.name || record.id,
    visible: node.visible,
    position: Object.freeze([node.position.x, node.position.y, node.position.z] as const),
    rotation: Object.freeze([node.rotation.x * 180 / Math.PI, node.rotation.y * 180 / Math.PI, node.rotation.z * 180 / Math.PI] as const),
    scale: Object.freeze([node.scale.x, node.scale.y, node.scale.z] as const),
    clips: Object.freeze([...(mixer?.clips.values() ?? [])].map(clip => Object.freeze({ id: clip.id, name: clip.name, duration: clip.duration }))),
    currentClip: currentAction?.clip.id ?? null,
    playing: Boolean(currentAction && currentAction.enabled && !currentAction.paused && !currentAction.finished),
    loadMode: record.loadMode,
  })
}

function captureTargets(root: GltfModelNode): readonly TargetNode[] {
  root.updateWorldFromRoot()
  const nodes: Node[] = []
  root.traverse(node => { if (node !== root) nodes.push(node) })
  return Object.freeze(nodes.map(node => Object.freeze({
    id: node.id,
    name: node.name,
    restMatrix: Object.freeze(Array.from(node.localMatrix.elements)),
    parentId: node.parent === root ? null : node.parent?.id ?? null,
    morphNames: Object.freeze(node instanceof Mesh && node.geometry instanceof SkinnedGeometry
      ? node.geometry.morphTargets.map(target => target.name)
      : []),
  })))
}

function cloneClip(clip: AnimationClip, id: string): AnimationClip {
  return new AnimationClip({
    id,
    name: clip.name,
    duration: clip.duration,
    markers: clip.markers,
    tracks: clip.tracks.map(track => new AnimationTrack({
      target: track.target,
      path: track.path,
      times: track.times.slice(),
      values: track.values.slice(),
      interpolation: track.interpolation,
      valueSize: track.valueSize,
    })),
  })
}

function resolveClip(mixer: AnimationMixer, value?: string | number): AnimationClip {
  const clips = [...mixer.clips.values()]
  if (typeof value === 'number') {
    const clip = clips[value]
    if (!clip) throw new Error(`Scene animation clip index is out of range: ${value}`)
    return clip
  }
  if (typeof value === 'string' && value) {
    const clip = mixer.clips.get(value) ?? clips.find(candidate => candidate.name === value)
    if (!clip) throw new Error(`Unknown scene animation clip: ${value}`)
    return clip
  }
  const clip = clips[0]
  if (!clip) throw new Error('Scene model has no animation clips.')
  return clip
}

async function prepareModelInput(loader: GltfLoader, input: AnyoSceneModelInput) {
  if (typeof input === 'string') return prepareSceneUrl(loader, input, inferModelFormat(input), nameFromUrl(input))
  if (isFile(input)) {
    if (!input.name.toLowerCase().endsWith('.glb')) throw new Error('Local scene models must be self-contained .glb files. Use a URL for .gltf with sidecar resources.')
    const real = URL.createObjectURL(input)
    const virtual = nextVirtualSceneUrl('glb')
    const removeResolver = loader.assets.addResolver({
      canResolve: candidate => candidate.href === virtual.href,
      fetch: (_candidate, options) => fetch(real, { signal: options.signal, headers: options.headers }),
    })
    return { url: virtual.href, name: input.name.replace(/\.glb$/i, ''), dispose: () => { removeResolver(); URL.revokeObjectURL(real) } }
  }
  if (input.format !== 'glb' && input.format !== 'gltf') throw new Error('Scene models support .glb and .gltf only.')
  return prepareSceneUrl(loader, input.url, input.format, nameFromUrl(input.url))
}

function prepareSceneUrl(loader: GltfLoader, source: string, format: 'glb' | 'gltf', name: string) {
  const real = new URL(source, typeof location === 'undefined' ? 'file:///' : location.href)
  if (real.pathname.toLowerCase().endsWith(`.${format}`)) return { url: real.href, name, dispose: () => {} }
  const virtual = nextVirtualSceneUrl(format)
  const removeResolver = loader.assets.addResolver({
    canResolve: candidate => candidate.href === virtual.href,
    fetch: (_candidate, options) => fetch(real, { signal: options.signal, headers: options.headers }),
  })
  return { url: virtual.href, name, dispose: removeResolver }
}

function inferModelFormat(value: string): 'glb' | 'gltf' {
  const path = value.split(/[?#]/, 1)[0]?.toLowerCase() ?? ''
  if (path.endsWith('.gltf')) return 'gltf'
  if (path.endsWith('.glb')) return 'glb'
  throw new Error('Scene model URL must end in .glb or .gltf.')
}

async function prepareAnimationInput(input: AnyoSceneAnimationConfig['src'] & {}) {
  if (typeof input === 'string') return { source: { url: input, format: inferAnimationFormat(input) } as AnimationSource, dispose: () => {} }
  if (isFile(input)) {
    const format = inferAnimationFormat(input.name)
    if (format === 'gltf') throw new Error('Local scene animation files must be self-contained .glb. Use a URL for .gltf with sidecar resources.')
    const url = URL.createObjectURL(input)
    return { source: { url, format } as AnimationSource, dispose: () => URL.revokeObjectURL(url) }
  }
  return { source: input as AnimationSource, dispose: () => {} }
}

function inferAnimationFormat(value: string): string {
  const path = value.split(/[?#]/, 1)[0]?.toLowerCase() ?? ''
  if (path.endsWith('.gltf')) return 'gltf'
  if (path.endsWith('.glb')) return 'glb'
  if (path.endsWith('.vrma')) return 'vrma'
  throw new Error('Scene animation source must end in .glb or .gltf.')
}

let virtualSceneSourceSequence = 0
function nextVirtualSceneUrl(format: 'glb' | 'gltf'): URL {
  return new URL(`https://anyo-avatar-vue.invalid/scene-model-${++virtualSceneSourceSequence}.${format}`)
}

function nameFromUrl(value: string): string {
  const path = value.split(/[?#]/, 1)[0] ?? ''
  try { return decodeURIComponent(path.split('/').pop() || 'Scene model').replace(/\.(?:glb|gltf)$/i, '') }
  catch { return 'Scene model' }
}
function isFile(value: unknown): value is File { return typeof File !== 'undefined' && value instanceof File }
function vec3(value: ViewerVec3, label: string): [number, number, number] {
  if (value.length !== 3 || value.some(entry => !Number.isFinite(entry))) throw new Error(`${label} must contain three finite numbers.`)
  return [value[0], value[1], value[2]]
}
function finiteOr(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback
  if (!Number.isFinite(resolved)) throw new Error(`${label} must be finite.`)
  return resolved
}
