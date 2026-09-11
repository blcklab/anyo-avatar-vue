# High-end scene props

`@blcklab/anyo-avatar-vue` delegates prop rendering to Sekai64's native glTF pipeline. The Vue layer does not flatten models or convert materials.

## Supported through Sekai64 0.8.0-rc.33

- binary GLB and URL-backed glTF
- nested node hierarchies and multiple meshes/primitives
- PBR materials plus Sekai64's documented glTF material extensions
- base-color/normal and other supported texture slots
- WebP textures
- vertex colors, alpha mask/blend, double-sided materials and authored samplers
- sparse accessors
- skins and morph targets
- embedded glTF animation and same-rig external GLB/glTF animation
- browser Draco auto-decoding for `KHR_draco_mesh_compression`
- repeated-static-mesh batching when a prop is loaded with `load.mode: 'static'`
- cast/receive-shadow policy per prop
- shared asset caching across all props in one viewer instance

## Load modes

Use `animated` for anything that needs clips, skin/morph animation, or may receive an external animation later.

Use `static` for architecture, furniture, vegetation, room shells, machinery that never moves, and other heavy environment geometry. Static mode omits the animation adapter and lets Sekai64 batch repeated static sibling meshes.

```ts
const scene = {
  version: 1,
  defaults: {
    load: {
      draco: 'auto',
      retries: 1,
      cache: true,
      texture: { maxBytes: 64 * 1024 * 1024, maxDimension: 8192 },
    },
    render: { castShadow: true, receiveShadow: true },
  },
  props: [
    {
      id: 'room',
      src: '/models/room.glb',
      load: { mode: 'static', staticBatching: { minInstances: 3 } },
    },
    {
      id: 'machine',
      src: '/models/machine.glb',
      load: { mode: 'animated' },
      animations: [{ clip: 'Idle', autoplay: true }],
    },
  ],
}
```

## Loading feedback

Large model downloads can be surfaced with `prop-progress`; glTF warnings/errors can be surfaced with `prop-diagnostic`.

## Limits inherited from Sekai64 rc.33

This package does not claim support beyond the renderer. Meshopt and KTX2/Basis use separate host-injected Sekai64 bridge packages and are not wired into this Vue scene API in alpha.2. glTF cubic-spline animation is not supported. Texture-slot coverage for some advanced glTF material extensions is incomplete. Animated/skinned deformation is CPU-based in rc.33, so extremely complex animated props can become CPU-bound.

For large production scenes, prefer static mode for non-moving environment assets, compressed geometry where supported, sensible texture sizes, and separate animated props only where motion is needed.
