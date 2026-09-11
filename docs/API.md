# Vue API

## Component

```vue
<AnyoAvatarViewer
  preset="portfolio"
  model="/me.vrm"
  animation="/idle.vrma"
  autoplay
  transparent
/>
```

The exposed component handle mirrors the framework-neutral viewer plus Vue host-scene helpers.

## Primary avatar

`loadModel`, `loadModelFile`, `loadAnimation`, `loadAnimationFile`, `play`, `pause`, `resume`, `stop`, `seek`, `setSpeed`, `setExpression`, `setLookAt`, camera/navigation methods, visual controls, recovery, screenshot and fullscreen are available through the template ref.

## Scene props

```ts
await viewer.value?.loadProp('/models/desk.glb', {
  id: 'desk',
  position: [0, 0, -0.8],
  rotation: [0, 180, 0],
  scale: 1,
})

await viewer.value?.loadPropAnimation('desk', {
  src: '/animations/desk-idle.glb',
  clip: 'Idle',
  autoplay: true,
  loop: 'repeat',
})
```

Available scene methods:

- `loadScene(config, { replace? })`
- `loadProp(input, config?)` / `loadPropFile(file, config?)`
- `loadPropAnimation(id, config)` / `loadPropAnimationFile(id, file, config?)`
- `playProp`, `pauseProp`, `resumeProp`, `stopProp`
- `updateProp(id, { position?, rotation?, scale?, visible? })`
- `setPropVisible`, `removeProp`, `clearProps`

`state.sceneModels` exposes immutable snapshots of each prop's transform, clips, current clip and playback state.

## Declarative JSON scene

```ts
const scene = {
  version: 1,
  props: [
    {
      id: 'computer',
      src: '/models/computer.glb',
      position: [0.65, 0.75, -0.8],
      rotation: [0, -25, 0],
      scale: 0.9,
      animations: [
        { src: '/animations/computer.glb', clip: 'Screen', autoplay: true }
      ],
    },
  ],
}
```

Pass it as `:scene="scene"` or call `loadScene(scene)`.

## Transparent output

Set `transparent` or use `preset="portfolio"`. The runtime is recreated with an alpha-capable renderer when transparency changes, and the clear color is forced to alpha zero. The surrounding page/card remains responsible for the visible background.

## Slots/events

Scoped slots receive `{ api, state, viewer, camera, recovery }`. Events include `ready`, `state-change`, `camera-change`, `recovery-change`, `diagnostic`, `error`, `model-loaded`, `animation-loaded`, `scene-change`, `prop-loaded`, and `prop-animation-loaded`.
