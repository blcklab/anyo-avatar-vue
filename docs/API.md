# Vue API

## Component

```vue
<AnyoAvatarViewer
  preset="portfolio"
  model="/me.vrm"
  animation="/idle.vrma"
  autoplay
  framing="portrait"
  transparent
/>
```

The exposed component handle mirrors the framework-neutral viewer plus Vue host-scene helpers.

## Primary avatar

`loadModel`, `loadModelFile`, `loadAnimation`, `loadAnimationFile`, `play`, `pause`, `resume`, `stop`, `seek`, `setSpeed`, `setExpression`, `setLookAt`, camera/navigation methods, visual controls, recovery, screenshot and fullscreen are available through the template ref. `loadAnimation` / `loadAnimationFile` return the newly installed clip records, which lets adapters autoplay the animation that was just selected instead of falling back to the first clip in the library.


## Responsive framing

Use semantic framing when a UI needs composition rather than point focus:

```vue
<AnyoAvatarViewer
  preset="portfolio"
  model="/me.vrm"
  framing="portrait"
  transparent
/>
```

The string shorthand is responsive by default in Vue. For art direction:

```vue
<AnyoAvatarViewer
  :framing="{ preset: 'portrait', coverage: 0.82, offsetY: 0.02, responsive: true }"
/>
```

`portrait` derives a compact upper-body frame from VRM humanoid landmarks plus authored hair/model bounds, so it does not call full-body `fit()`. The exposed handle also provides `frame(preset, options)`, `clearFrame()`, and `rotateBy(angleRadians)`.

### Semantic view direction

Framing and view direction are separate. `framing` controls composition; `view` controls which side of the avatar faces the camera:

```vue
<AnyoAvatarViewer
  model="/me.vrm"
  framing="portrait"
  view="front"
  transparent
/>
```

For eye-level or slightly low/high-angle portraits, pass a view object:

```vue
<AnyoAvatarViewer
  framing="portrait"
  :view="{ preset: 'front', elevation: -0.035 }"
/>
```

`elevation: 0` is eye-level. Positive values place the camera above the target; negative values place it slightly below and look upward.

`view="front"` is VRM-version-aware (VRM 0.x and VRM 1.0 use opposite authored forward axes). The exposed handle also provides `setView('front' | 'back' | 'left' | 'right')` and `setAzimuth(angleRadians)`. Responsive framing preserves the current orbit direction.

### VRMA initial-heading normalization

Some VRMA clips are authored with a non-zero hips yaw at their first frame. When the desired presentation is a front-facing portrait, opt into initial-heading normalization:

```vue
<AnyoAvatarViewer
  model="/me.vrm"
  animation="/pose.vrma"
  view="front"
  framing="portrait"
  :vrma="{ heading: 'normalize' }"
/>
```

`heading: 'normalize'` removes only the clip's initial hips heading as a constant correction; later turns in the motion are preserved. The default remains `heading: 'preserve'`.

Changing the declarative `animation` prop does not recreate the renderer or camera. Previously loaded URL animations are reused and the newly selected clip is the autoplay target.

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
