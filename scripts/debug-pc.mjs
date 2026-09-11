import { readFile } from 'node:fs/promises'
import { createAnimationRendererModule, createGltfAnimationAdapter, GLTF_ANIMATION_EXTENSION_ID } from '@blcklab/sekai64/animation'
import { GltfLoader } from '@blcklab/sekai64/gltf'
const bytes=await readFile('/mnt/data/anyo-avatar-vue-showcase-0.1.2-local/public/models/workstation/pc-animated.glb')
const f=new File([bytes],'pc-animated.glb')
const real=URL.createObjectURL(f)
const loader=new GltfLoader()
const mod=createAnimationRendererModule()
const anim=createGltfAnimationAdapter(mod,{createMixer:true})
const node=await loader.loadNode(real,{animation:anim, animatedFallback:'static-pose'})
console.log('doc animations', node.asset.document.animations?.length, node.asset.document.animations?.map(x=>x.name))
const ext=node.asset.getExtension(GLTF_ANIMATION_EXTENSION_ID)
console.log('ext', ext, 'clips', ext?.clips?.length, ext?.clips?.map(x=>x.name), 'mixer', !!ext?.mixer)
node.dispose(); loader.dispose(); URL.revokeObjectURL(real)
