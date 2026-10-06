# Whistle (bundled)

The files NeuroLink's built-in local speech-to-text engine needs, so that the
zero-config default works without any download:

| File           | Source                                                                | SHA-256 (prefix)   |
| -------------- | --------------------------------------------------------------------- | ------------------ |
| `needle.js`    | `Cactus-Compute/needle3` @ `2ae11323dc000f5e70c49f7403efa6af12ba9e67` | `964681b2a5ec3c4d` |
| `needle.wasm`  | `Cactus-Compute/needle3` @ `2ae11323dc000f5e70c49f7403efa6af12ba9e67` | `c43f48e11f302087` |
| `whistle.cact` | `Cactus-Compute/whistle` @ `b358ddadd89b7a713b5aa131f23032d3cca1b251` | `b6e02f048568ac5d` |

Both Hugging Face repositories are published under the Apache License 2.0.
The full hashes are pinned in `src/lib/voice/whistle/assets.ts`, which
verifies every file before use, here or in any other directory.

Resolution order: `credentials.stt.whistle.modelDir` / `NEUROLINK_WHISTLE_DIR`
→ `NEUROLINK_MODEL_DIR/whistle` → this directory → `~/.neurolink/models/whistle`
(where a missing file is downloaded, unless auto-download is off).
