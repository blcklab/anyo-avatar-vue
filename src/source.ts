import type { AnimationSource, ModelSource } from '@blcklab/anyo-avatar-viewer'
import type { AnyoAvatarAnimationInput, AnyoAvatarModelInput } from './types.js'

export function isBrowserFile(value: unknown): value is File {
  return typeof File !== 'undefined' && value instanceof File
}

export function inferModelFormat(name: string): ModelSource['format'] {
  const clean = stripQuery(name).toLowerCase()
  if (clean.endsWith('.vrm')) return 'vrm'
  if (clean.endsWith('.gltf')) return 'gltf'
  if (clean.endsWith('.glb')) return 'glb'
  throw new Error('Avatar model must be .vrm, .glb, or .gltf.')
}

export function inferAnimationFormat(name: string): string {
  const clean = stripQuery(name).toLowerCase()
  if (clean.endsWith('.vrma')) return 'vrma'
  if (clean.endsWith('.gltf')) return 'gltf'
  if (clean.endsWith('.glb')) return 'glb'
  throw new Error('Animation must be .vrma, .glb, or .gltf.')
}

export async function withModelSource<T>(input: AnyoAvatarModelInput, run: (source: ModelSource) => Promise<T>): Promise<T> {
  if (typeof input === 'string') return run({ url: input, format: inferModelFormat(input) })
  if (isBrowserFile(input)) {
    const url = URL.createObjectURL(input)
    try { return await run({ url, format: inferModelFormat(input.name) }) }
    finally { URL.revokeObjectURL(url) }
  }
  return run(input)
}

export async function withAnimationSource<T>(input: AnyoAvatarAnimationInput, run: (source: AnimationSource) => Promise<T>): Promise<T> {
  if (typeof input === 'string') return run({ url: input, format: inferAnimationFormat(input) })
  if (isBrowserFile(input)) {
    const url = URL.createObjectURL(input)
    try { return await run({ url, format: inferAnimationFormat(input.name) }) }
    finally { URL.revokeObjectURL(url) }
  }
  return run(input)
}

function stripQuery(value: string): string { return value.split(/[?#]/, 1)[0] ?? value }
