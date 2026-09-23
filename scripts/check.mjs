import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
assert.equal(pkg.name, '@blcklab/anyo-avatar-vue')
assert.equal(pkg.version, '0.2.0-alpha.3')
assert.equal(pkg.peerDependencies['@blcklab/anyo-avatar-viewer'], '0.2.0-alpha.9')
assert.equal(pkg.peerDependencies['@blcklab/anyo-avatar'], '^0.2.0')
assert.equal(pkg.peerDependencies['@blcklab/sekai64'], '>=0.8.0-0 <0.9.0')
assert.ok(pkg.exports['./style.css'])

const source = await readFile(new URL('../src/useAnyoAvatarViewer.ts', import.meta.url), 'utf8')
assert.match(source, /createSekai64AvatarViewer/)
assert.match(source, /AnyoSceneModelManager/)
assert.match(source, /loadScene/)
assert.match(source, /loadPropAnimation/)
assert.match(source, /\[0, 0, 0, 0\]/)
assert.doesNotMatch(source, /anyo-avatar-viewer\/(?:src|dist)\//)

const scene = await readFile(new URL('../src/scene.ts', import.meta.url), 'utf8')
assert.match(scene, /createGltfAnimationAdapter/)
assert.match(scene, /createGltfClipImporter/)
assert.match(scene, /runtime\.animation/)
assert.match(scene, /new AssetManager/)
assert.match(scene, /loadMode === 'static'/)
assert.match(scene, /staticBatching/)
assert.match(scene, /dracoDecoderPath/)
assert.match(scene, /texture: load\.texture/)
assert.match(scene, /applyRenderConfig/)
assert.match(scene, /Scene prop external animations support same-rig/)
assert.doesNotMatch(scene, /anyo-avatar-viewer\/(?:src|dist)\//)

const component = await readFile(new URL('../src/AnyoAvatarViewer.ts', import.meta.url), 'utf8')
for (const feature of ['quality', 'environment', 'transparent', 'normalization', 'recovery', 'importers', 'runtimeKey', 'scene']) {
  assert.match(component, new RegExp(feature))
}
for (const event of ['scene-change', 'prop-loaded', 'prop-animation-loaded', 'prop-progress', 'prop-diagnostic']) assert.match(component, new RegExp(event))

const types = await readFile(new URL('../src/types.ts', import.meta.url), 'utf8')
for (const api of ['loadScene', 'loadProp', 'loadPropAnimation', 'playProp', 'updateProp', 'setPropVisible', 'clearProps']) {
  assert.match(types, new RegExp(api))
}

const presets = await import('../dist/presets.js')
assert.deepEqual([...presets.ANYO_AVATAR_PRESETS], ['bare', 'portfolio', 'viewer', 'studio'])
const portfolio = presets.resolveAnyoAvatarOptions({ preset: 'portfolio' }, {})
assert.equal(portfolio.transparent, true)
assert.equal(portfolio.controls, 'none')

const sourceUtil = await import('../dist/source.js')
assert.equal(sourceUtil.inferModelFormat('hero.vrm'), 'vrm')
assert.equal(sourceUtil.inferModelFormat('scene.glb?x=1'), 'glb')
assert.equal(sourceUtil.inferAnimationFormat('idle.vrma'), 'vrma')

console.log('Vue adapter package contract verified: core alpha.9, high-end scene props, static/animated modes, progress/diagnostics, transparent portfolio mode.')
