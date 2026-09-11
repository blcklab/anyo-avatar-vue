# Changelog

## 0.2.0-alpha.2

- Added npm package metadata and explicit development peers.

- Add high-end prop loading controls for strict mode, retries/cache/headers, texture limits, Draco auto/self-hosted decoder paths, and explicit static batching.
- Add `load.mode: "static" | "animated"`; static props can use Sekai64 repeated-mesh batching while animated props retain embedded/external clip support.
- Share one Sekai64 AssetManager across scene props for cache/resource reuse.
- Add recursive per-prop cast/receive-shadow controls.
- Add `prop-progress` and `prop-diagnostic` events for large asset loading and glTF diagnostics.
- Preserve the existing scene config format; all additions are optional and JSON-friendly.

## 0.2.0-alpha.1

- Add declarative `scene` configuration for host-owned GLB/glTF props with JSON position/rotation/scale/visibility.
- Add imperative prop loading/removal/transform APIs for local GLB files and remote GLB/glTF URLs.
- Add per-prop embedded animation playback and external same-rig GLB/glTF animation loading on the shared Sekai64 animation module.
- Preserve manually loaded scene props across renderer/runtime recreation.
- Fix transparent mode so `transparent: true` always clears with alpha 0 instead of inheriting the default opaque background.
- Consume Avatar Viewer 0.2.0-alpha.8, including safe non-exact quality profiles and the shared animation-module runtime hook.
- Extend the full More panel with scene prop transforms and prop animation controls while keeping minimal/portfolio modes compact.

## 0.1.0-alpha.1

- Initial Vue 3 adapter for `@blcklab/anyo-avatar-viewer@0.2.0-alpha.7`.
- Add globally installable `AnyoAvatarVue` plugin and `createAnyoAvatarVue()` with host defaults.
- Add dynamic `AnyoAvatarViewer` component with bare, portfolio, viewer and studio presets.
- Add optional minimal/full built-in controls with advanced options behind More.
- Add `useAnyoAvatarViewer()` and `useAnyoAvatar()` for custom Vue integrations.
- Expose model/animation loading, playback, camera, expressions, look-at, visuals, recovery, screenshot and fullscreen APIs.
- Support manual `File` loading and URL/source-object loading without putting file logic into the core viewer.
- Keep scene props/multi-avatar orchestration outside the adapter; those remain application-scene responsibilities.
