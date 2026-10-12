import assert from 'node:assert/strict'
import { Scene, Node } from '@blcklab/sekai64'
import { createAnimationRendererModule } from '@blcklab/sekai64/animation'
import { GltfLoader } from '@blcklab/sekai64/gltf'
import { AnyoSceneModelManager } from '../dist/scene.js'
const makeManager = () => new AnyoSceneModelManager({ scene: new Scene(), animation: createAnimationRendererModule() })
const original = GltfLoader.prototype.loadNode
function deferred() { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
try {
  {
    const gate = deferred(); const entered=deferred();
    GltfLoader.prototype.loadNode = async () => { entered.resolve(); await gate.promise; return new Node() }
    const manager = makeManager(); const pending = manager.load('https://example.test/prop.glb',{id:'pending',load:{mode:'static'}})
    await entered.promise
    manager.dispose()
    gate.resolve()
    await assert.rejects(pending, /disposed/)
    assert.equal(manager.list().length,0, 'Disposed manager must not retain late-loaded node')
    console.log('PASS scene load disposal')
  }
  {
    const gate = deferred(); const entered=deferred();
    GltfLoader.prototype.loadNode = async () => { entered.resolve(); await gate.promise; return new Node() }
    const manager=makeManager(); const first=manager.load('https://example.test/prop.glb',{id:'duplicate',load:{mode:'static'}})
    await entered.promise
    await assert.rejects(manager.load('https://example.test/prop.glb',{id:'duplicate',load:{mode:'static'}}), /already in use/)
    gate.resolve(); await first; assert.equal(manager.list().length,1)
    manager.dispose();console.log('PASS concurrent prop ID reservation')
  }
  {
    const gate = deferred(); const entered=deferred();
    GltfLoader.prototype.loadNode = async () => { entered.resolve(); await gate.promise; return new Node() }
    const manager=makeManager()
    const pending=manager.load('https://example.test/prop.glb',{id:'replaced',load:{mode:'static'}})
    await entered.promise
    manager.clear()
    gate.resolve()
    await assert.rejects(pending, /scene was cleared or replaced/)
    assert.equal(manager.list().length,0)
    manager.dispose(); console.log('PASS pending load canceled by clear/replace')
  }
  {
    GltfLoader.prototype.loadNode = async () => Object.assign(new Node(), {asset:{getExtension:()=>undefined}})
    const manager=makeManager()
    await assert.rejects(manager.load('https://example.test/prop.glb',{id:'badclip',animations:[{src:'https://example.test/clip.vrma'}],load:{mode:'animated'}}),/VRMA belongs to the avatar viewer/)
    assert.equal(manager.list().length,0, 'Failed animation must remove partially loaded model record')
    manager.dispose();console.log('PASS failed prop animation cleanup')
  }
} finally {GltfLoader.prototype.loadNode = original}
