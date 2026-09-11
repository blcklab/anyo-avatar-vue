import { readFile } from 'node:fs/promises'
import { Scene } from '@blcklab/sekai64'
import { createAnimationRendererModule } from '@blcklab/sekai64/animation'
import { AnyoSceneModelManager } from '../dist/scene.js'

const animation = createAnimationRendererModule()
const runtime = { scene: new Scene(), animation }
const diagnostics = []
const progress = []
const manager = new AnyoSceneModelManager(runtime, {
  onDiagnostic: value => diagnostics.push(value),
  onProgress: value => progress.push(value),
})

const keyboardBytes = await readFile(new URL('../tests/assets/keyboard.glb', import.meta.url))
const pcBytes = await readFile(new URL('../tests/assets/pc-animated.glb', import.meta.url))

const keyboard = await manager.load(new File([keyboardBytes], 'keyboard.glb'), {
  id: 'keyboard',
  load: {
    mode: 'static',
    cache: true,
    draco: 'auto',
    texture: { maxBytes: 64 * 1024 * 1024, maxDimension: 8192 },
    staticBatching: { minInstances: 3 },
  },
  render: { castShadow: true, receiveShadow: true },
})
if (keyboard.loadMode !== 'static') throw new Error('keyboard did not use static mode')
if (keyboard.clips.length !== 0) throw new Error('static keyboard unexpectedly exposed clips')

const pc = await manager.load(new File([pcBytes], 'pc-animated.glb'), {
  id: 'pc',
  load: { mode: 'animated', cache: true, draco: 'auto' },
  animations: [{ clip: 'PCFanSpin', autoplay: true, loop: 'repeat' }],
  render: { castShadow: true, receiveShadow: true },
})
if (pc.loadMode !== 'animated') throw new Error('pc did not use animated mode')
if (!pc.clips.some(clip => clip.name === 'PCFanSpin')) throw new Error('embedded PCFanSpin missing')
if (!pc.playing) throw new Error('PCFanSpin did not autoplay')

let rejected = false
try {
  await manager.loadAnimation('keyboard', { src: new File([pcBytes], 'pc.glb') })
} catch (error) {
  rejected = /static mode/.test(String(error))
}
if (!rejected) throw new Error('static prop accepted animation unexpectedly')

// This also proves local File sources do not collide in the shared AssetManager cache.
if (keyboard.name === pc.name || keyboard.id === pc.id) throw new Error('local prop identities collided')

manager.dispose()
console.log(`High-end prop integration verified: ${keyboard.loadMode} keyboard + ${pc.loadMode} PC, ${pc.clips.length} PC clip(s).`)
console.log(`Progress callbacks: ${progress.length}; diagnostics: ${diagnostics.length}`)
