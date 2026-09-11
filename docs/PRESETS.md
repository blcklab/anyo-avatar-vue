# Presets

Presets are defaults, not hard modes. Every option can be overridden on the component.

| Preset | Controls | Transparent | Typical use |
| --- | --- | --- | --- |
| `bare` | none | no | fully custom host UI |
| `portfolio` | none | yes | avatar embedded in a card/hero |
| `viewer` | minimal | no | interactive model viewer |
| `studio` | full | no | inspection, manual loading and authoring |

All presets use the same `@blcklab/anyo-avatar-viewer` runtime and can use scene props. `portfolio` defaults to a transparent alpha canvas so the host card supplies the background.

Quality values are `sekai-viewer`, `character`, `ultra`, `balanced`, and `performance`. In core `0.2.0-alpha.8`, the tunable character/balanced/ultra profiles retain character-quality AA/IBL/shadows while avoiding the extra global inverted-hull outline pass that can create oversized silhouettes on some VRMs. `sekai-viewer` remains the exact reference presentation path.
