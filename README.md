# @blcklab/anyo-avatar-vue

Vue 3 plugin and dynamic avatar component for `@blcklab/anyo-avatar-viewer`, including portfolio/viewer/studio presets, full viewer controls, manual file loading, JSON scene props, per-prop animation, and high-end glTF loading options.

> `0.2.0-alpha.2` is a prerelease and is published under the `next` npm dist-tag.

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

## Portfolio

```vue
<AnyoAvatarViewer
  preset="portfolio"
  model="/models/me.vrm"
  animation="/animations/idle.vrma"
  autoplay
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

Presets: `bare`, `portfolio`, `viewer`, `studio`. Controls: `none`, `minimal`, `full`. Every preset is overridable through component props.

## Custom UI

Use `controls="none"`, scoped slots, or the component template ref when your application needs its own design system. The public handle exposes playback, camera navigation, visuals, expressions, look-at, recovery, fullscreen, screenshots, and scene-prop controls.

## Documentation

- [API](docs/API.md)
- [Presets](docs/PRESETS.md)
- [High-end props](docs/HIGH-END-PROPS.md)

## License

MIT
