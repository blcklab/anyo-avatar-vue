# @blcklab/anyo-avatar-vue

Vue 3 plugin and dynamic avatar component for `@blcklab/anyo-avatar-viewer`, including portfolio/viewer/studio presets, full viewer controls, manual file loading, JSON scene props, per-prop animation, and high-end glTF loading options.

> `0.2.0-alpha.6` is a proposed prerelease. Published prereleases use the `next` npm dist-tag.

## Installation

```bash
npm install vue @blcklab/anyo-avatar-vue@next \
  @blcklab/anyo-avatar-viewer@next \
  @blcklab/anyo-avatar \
  @blcklab/sekai64@next
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import AnyoAvatarVue from '@blcklab/anyo-avatar-vue'
import '@blcklab/anyo-avatar-vue/style.css'

createApp(App)
  .use(AnyoAvatarVue)
  .mount('#app')
```

## Stylesheet and package integrity

Import the bundled stylesheet once at the application entry point:

```ts
import '@blcklab/anyo-avatar-vue/style.css'
```

The package build copies `src/style.css` to `dist/style.css`; the CSS is preserved by the package `sideEffects` contract. Run `npm run check` before publishing: it verifies that the CSS, JavaScript entry point, and declarations are **actually included** in the npm pack manifest. The check deliberately uses `npm pack --ignore-scripts --dry-run`, so an omitted build artifact cannot be silently restored by `prepack`.

`0.2.0-alpha.6` is a candidate until validated with genuine Vue and published after its Avatar 0.2.2 and Avatar Viewer alpha.12 prerequisites. Do not use the `next` dist-tag as evidence that these candidate versions are already available.

## Portfolio

```vue
<AnyoAvatarViewer
  preset="portfolio"
  model="/models/me.vrm"
  animation="/animations/idle.vrma"
  autoplay
  framing="portrait"
  transparent
/>
```

## Config-driven usage

For larger applications, keep configuration outside the component and feed it through `v-bind`.

```ts
import type { AnyoAvatarViewerProps } from '@blcklab/anyo-avatar-vue'

export const avatarConfig = {
  preset: 'portfolio',
  model: '/models/me.vrm',
  animation: '/animations/idle.vrma',
  autoplay: true,
  transparent: true,
  quality: 'sekai-viewer',
  environment: 'studio',
  controls: 'none',
  framing: { preset: 'portrait', coverage: 0.84, responsive: true },
} satisfies AnyoAvatarViewerProps
```

```vue
<AnyoAvatarViewer v-bind="avatarConfig" />
```

## Scene props

Use JSON-friendly scene configuration for desks, computers, rooms, furniture, screens, and other non-avatar GLB/glTF models.

```ts
import type { AnyoSceneConfig } from '@blcklab/anyo-avatar-vue'

export const scene = {
  version: 1,
  defaults: {
    load: {
      draco: 'auto',
      cache: true,
      texture: { maxDimension: 8192 },
    },
    render: { castShadow: true, receiveShadow: true },
  },
  props: [
    {
      id: 'desk',
      src: '/models/desk.glb',
      position: [0, 0, -1.2],
      rotation: [0, 0, 0],
      scale: 1,
      load: { mode: 'static', staticBatching: true },
    },
    {
      id: 'computer',
      src: '/models/computer.glb',
      position: [0.7, 0, -1.3],
      load: { mode: 'animated' },
      animations: [
        { clip: 'FanSpin', autoplay: true, loop: 'repeat' },
      ],
    },
  ],
} satisfies AnyoSceneConfig
```

```vue
<AnyoAvatarViewer
  v-bind="avatarConfig"
  :scene="scene"
/>
```

Static props can use batching and shared caching. Animated props share the same Sekai64 animation module/frame owner as the avatar. External prop animation uses same-rig GLB/glTF clips; VRMA remains avatar-specific.

## Manual files

```ts
const handle = viewer.value
await handle?.loadModelFile(modelFile)
await handle?.loadAnimationFile(animationFile)
await handle?.loadPropFile(propFile, {
  position: [0, 0, -1],
  scale: 1,
})
```

## Presets and controls

Presets: `bare`, `portfolio`, `viewer`, `studio`. Controls: `none`, `minimal`, `full`. Every preset is overridable through component props. Use `framing="portrait"` for responsive head-and-shoulders composition; an object form accepts `coverage`, `offsetX`, `offsetY`, and `responsive`.

## Custom UI

Use `controls="none"`, scoped slots, or the component template ref when your application needs its own design system. The public handle exposes playback, camera navigation, semantic framing (`frame` / `clearFrame`), exact-radian `rotateBy`, visuals, expressions, look-at, recovery, fullscreen, screenshots, and scene-prop controls. Declarative `animation` changes load/cache the new source and autoplay the newly loaded clip without recreating the viewer or resetting the camera.

## Documentation

- [API](docs/API.md)
- [Presets](docs/PRESETS.md)
- [High-end props](docs/HIGH-END-PROPS.md)

## License

MIT


### Responsive portrait with a semantic front view

`framing` controls composition while `view` controls the absolute orbit direction. The `front` view is VRM-version aware: VRM 0.x uses Z- forward and VRM 1.0 uses Z+ forward.

```vue
<AnyoAvatarViewer
  model="/avatar.vrm"
  animation="/pose.vrma"
  framing="portrait"
  view="front"
  :vrma="{ heading: 'normalize' }"
  transparent
  autoplay
/>
```

`vrma.heading = 'normalize'` removes only the animation's initial hips heading and rotates hips translation by the same constant correction, so sideways-authored motions begin facing forward without deleting later turns.
