# Changelog

## 0.2.0-alpha.5

- Add declarative responsive `framing`, including `framing="portrait"` for portfolio head-and-shoulders composition without full-body `fit()`.
- Expose Viewer `frame`, `clearFrame`, and exact-radian `rotateBy` methods through the Vue public handle.
- Fix reactive animation selection: autoplay now targets the clips returned by the newly loaded animation instead of always replaying the first clip in the library.
- Cache URL/source-backed animation clip IDs per active model so switching back to an already loaded motion does not import duplicate clips.
- Apply declarative framing before emitting `model-loaded`, allowing host orientation correction to run on the final framed camera while keeping animation changes camera-neutral.

## 0.2.0-alpha.4

- Add a release-package integrity check: verify that `@blcklab/anyo-avatar-vue/style.css` exists in the actual npm pack manifest, is identical to the source stylesheet, and remains marked as a bundler side effect.
- Prevent missing CSS/JS/declaration artifacts from passing `npm run check` or the publish workflow.
- Update the manual-loader example's stale local vendor dependencies to the tested Avatar 0.2.2, Viewer alpha.10, and Sekai64 rc.56 versions.

- Accept Avatar Viewer alpha.9 and later compatible 0.2 prereleases, including alpha.10.
- Align development dependency baselines to Avatar 0.2.2 and Sekai64 0.8.0-rc.56.
- Ignore and release late renderer initialization after Vue component unmount or runtime replacement.
- Reject late scene-prop loads after scene-manager disposal, and reserve model IDs during parallel loads.
- Preserve current public API, presets, rendering settings, and scene authoring formats.

## 0.2.0-alpha.3

- Refresh ecosystem peer metadata for the frozen S24 renderer line.
- Consume `@blcklab/anyo-avatar-viewer@0.2.0-alpha.9` and compatible `@blcklab/anyo-avatar` `0.2.x` releases.
- Accept `@blcklab/sekai64 >=0.8.0-0 <0.9.0` instead of pinning only `0.8.0-rc.33`.
- No Vue component, scene-config, or runtime behavior changes are introduced by this compatibility patch.

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
