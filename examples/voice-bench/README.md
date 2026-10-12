# Voice Bench

A browser playground for speech-to-text on self-hosted models, next to a cloud reference, with a
correction pipeline that uses a **decision model** to guard dictionary substitutions. It is the
test bed for NeuroLink's streaming STT and `decide()`-assisted correction. The page is a small
React + MUI app built with Vite; it has its own lockfile and is not part of the repo-root build.

```
examples/voice-bench/
├── index.html, src/   the app: engine/ (capture, endpointing, engines, corrector, NeuroLink transport),
│                      ui/ (views), fx/ (the live NeuroLink mark, waveform), theme/ (light + dark tokens)
├── public/            static files copied into the build: config.js (yours, gitignored)
│   ├── whistle/       Cactus Whistle worker (the build copies needle.js / needle.wasm / whistle.cact here from models/whistle)
│   └── illustrations/ one light and one dark plate per view
├── indic-conformer/   FastAPI wrapper that serves AI4Bharat IndicConformer-600M with auto language ID
├── serve.mjs          serves dist/ and proxies /api and /v1 to a NeuroLink server
└── samples/           your own test clips (gitignored); public/samples links here
```

## Run

```sh
cp public/config.example.js public/config.js     # fill in endpoints and keys
pnpm install
pnpm dev                                          # http://localhost:5173; /api and /v1 go to NEUROLINK_URL (default :8788)
pnpm build && node serve.mjs                      # production build on :8765
```

Optional engines:

- **IndicConformer** (22 Indian languages, native script, runs on a laptop CPU):
  `cd indic-conformer && uv venv --python 3.12 && VIRTUAL_ENV=$PWD/.venv uv pip install -r requirements.txt && ./serve.sh`.
  The model is gated on Hugging Face — accept its terms and `huggingface-cli login` once.
- **Whistle** (Cactus, 16.9 MB, runs in the browser): nothing to fetch. `pnpm dev` / `pnpm build`
  copy the three files NeuroLink ships in `models/whistle/` (pinned Hugging Face revisions) into
  `public/whistle/`.

## One port for the internet

`node serve.mjs` serves the page **and** forwards `/api/*` and `/v1/*` (the WebSocket
included) to a NeuroLink server, so a single hostname on a tunnel carries the whole demo,
same-origin, with no CORS and no key in the page. Set `neurolinkBaseUrl: window.location.origin`
in `config.js`.

```sh
neurolink serve --port 8788                                   # the API, on this machine
PORT=8765 HOST=0.0.0.0 NEUROLINK_URL=http://127.0.0.1:8788 node serve.mjs
```

The Speak tab (text to speech and voice cloning) goes to `/tts/*` on the same port, which `serve.mjs`
passes to an OpenAI-compatible TTS gateway with a key it holds itself. Only `/v1/audio/speech`
(always with `TTS_MODEL`) and `/s2pro/voices` are passed:

```sh
TTS_BASE_URL=https://<litellm-gateway> TTS_API_KEY=sk-<key-with-the-tts-model> TTS_MODEL=s2-pro \
  PORT=8765 HOST=0.0.0.0 NEUROLINK_URL=http://127.0.0.1:8788 node serve.mjs
```

A clone uses the newest recording of 3–30 s (Live or push to talk) and its transcript; the Speak tab
shows which one, with a Play button, before you clone.

Anyone who can open the page can run transcriptions on the engines behind the server and, with
`TTS_BASE_URL` set, synthesize speech on the gateway's key. `config.js` is served to every visitor, so
`neurolinkToken` is not an access gate on a public deployment: it only stops clients that never load
the page. Put access control in front of `serve.mjs` itself (an authenticating reverse proxy or the
tunnel's access policy) before exposing it. The `/tts` routes additionally accept only requests from
the page's own origin, which keeps other sites from using the key.

## Run through the NeuroLink server

The page can hand every transcription to a NeuroLink server instead of calling the engines itself.
Start one with the engines registered as STT endpoints, a decision model for the guard, and a rewrite
model (placeholders throughout):

```sh
export NEUROLINK_STT_ENDPOINTS='{
  "spark": { "baseURL": "http://<litellm-host>:4000/v1", "apiKey": "sk-<litellm-key>", "model": "qwen3-asr" },
  "indic": { "baseURL": "http://127.0.0.1:8007/v1", "model": "indic-conformer" }
}'
export NEUROLINK_STT_PROVIDER=spark                 # default engine when a request names none
export NEUROLINK_STT_REWRITE_PROVIDER=litellm       # the correction's rewrite pass …
export NEUROLINK_STT_REWRITE_MODEL=<fast-chat-model>
export LITELLM_BASE_URL=https://<gateway> LITELLM_API_KEY=sk-<gateway-key>
export XOR_BASE_URL=https://<decision-host> XOR_API_KEY=<key> XOR_MODEL=<decision-model>   # decision guard
neurolink serve --port 8788 --cors-origin http://localhost:8765,http://127.0.0.1:8765
```

`whistle` is built into the server; `elevenlabs-stt` appears when `ELEVENLABS_API_KEY` is set. The
server allows no cross-origin page by default, so the page's origin must be listed: `--cors-origin`
as above, or `cors.origins` in a `--config` file. Before exposing the server beyond this machine,
also set `NEUROLINK_SERVER_API_KEY` (and `neurolinkToken` in `config.js`); the banner says which
case you are in.

Then set `neurolinkBaseUrl` (and `neurolinkToken` when the server sets `NEUROLINK_SERVER_API_KEY`) in
`config.js`. With a server configured, everything goes through it; the sidebar shows a single
connection state. The page reads the server's engines from `GET /api/agent/transcribe/providers` and
falls back to `/api/health` (and the HTTP routes below) on a server without that route.

| Page          | What goes to the server                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live captions | A WebSocket to `/v1/audio/transcriptions/stream`: a JSON config frame (`provider: "indic"` with `fallback: { provider: "spark" }` under Auto, `language` only when pinned, `dictionary`, `correction.transliterate`), then 16 kHz PCM16 frames. The server endpoints, routes each utterance, and corrects it; the page renders `interim` / `final` / `corrected` / `silence`. |
| Push to talk  | One `POST /api/agent/transcribe` with the audio, the same routing, `dictionary` and `correction` (`transliterate`, optional `cleanup`). The card, "before correction", the language and the Decisions panel come from the response.                                                                                                                                           |
| Files         | IndicConformer and Whistle: one WebSocket session per column in file mode (`mode: "file"`), the whole file streamed and each utterance shown as it lands. Spark: `POST /api/agent/transcribe` with diarization; a large file goes in parts (parallel, overlapping at the seams, with a retry per failed part).                                                                |

Scribe is called directly with `elevenlabsKey`. Without a server, the page calls the engines itself and
corrects in the browser.

## What is in the page

| Section      | What it does                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live**     | _Live captions_: words type into one editable document as they are recognised (the uncertain tail is grey); on a pause the sentence is finalized, corrected and replaced in place. _Push to talk_: hold the mic or <kbd>Space</kbd>; a tap toggles. The strip below the document shows the raw engine text per sentence and what changed; the Decisions panel shows why each term was applied. |
| **Files**    | Drop a recording and run any mix of engines side by side: Spark (Nemotron-3 diarization + Qwen3-ASR, speaker labels), ElevenLabs Scribe, Whistle, IndicConformer. Rows appear as they are transcribed, each with its language. Copy / download per column.                                                                                                                                     |
| **Memory**   | `Term · also heard as · meaning`. Terms are sent to the ASR as context, every alias found in a transcript becomes a candidate replacement, and the meaning is given to the decision model and the rewrite model.                                                                                                                                                                               |
| **Settings** | Engine (Auto, or Whistle / Scribe as an override), a pinned language, correction on/off, output script (Latin / Native), clean verbatim, and a link to **Speak**: TTS with voice cloning from the newest 3–30 s recording.                                                                                                                                                                     |

### The corrector

Runs on every finished sentence (and on push-to-talk / file rows). Through a NeuroLink server the
server runs it; without one, the page does:

1. **Dictionary** — aliases present in the text become candidates.
2. **Decision model** — one System One call (XOR, or any model that speaks the API) asks, per candidate, _term or
   literal?_ so a dictionary entry for a name does not rewrite the ordinary word it sounds like. The answers
   and their probabilities are shown in the **Decisions** panel next to the document.
3. **Rewrite** — a fast OpenAI-compatible chat model writes the sentence the way people type: Hindi
   stays Hindi in Latin letters (never translated), Tamil becomes Tanglish, English words get
   their real spelling, punctuation and capitalization are added, the dictionary is applied.
   **Output script** chooses Latin (the default) or the speaker's native script.

### Language auto-detection for IndicConformer

The model has no language ID. `language=auto` is implemented in `indic-conformer/server.py` from
the model's own CTC head: one encoder pass, then each candidate language's vocab mask is scored by
the mean greedy confidence on non-blank frames. Tamil scores about −0.09 against −0.25 for the
runner-up on a 2 s clip; English or far-field audio scores below −0.18 for every language and is
reported as `language_detected: false`, which makes the page let the Spark's text lead. The
previous utterance's language gets a small stickiness bonus (`prior`).

### Nothing is ever dropped

- A final pass that returns nothing, or fewer than half the words already shown, is ignored in favour
  of the live text. If no engine heard anything, the card keeps the audio and the strip says so; no
  placeholder sentence goes into the document.
- IndicConformer returns **nothing** for English or far-field speech. When it has been unsure or empty
  on two passes in a row (after 3 s of audio and 1.5 s of speech, and never once a pass was confident),
  the Spark's Qwen3-ASR takes over that utterance's remaining passes — the badge says so.
- The rewrite is streamed into the document as it arrives (first tokens in ~0.3 s); the decision
  model has a 4 s timeout and the rewrite 12 s, after which the dictionary-applied raw text is kept.

### Endpointing notes

Energy gating on 20 ms blocks. The noise floor is a minimum statistic (quietest block in 1.5 s,
rising at most ~2×/s), so a loud talker can never push a quieter second speaker below the gate;
speech has onset/sustain hysteresis; long turns end at the first pause after 16 s and are hard-cut
at 28 s at the quietest recent block with the remainder carried into the next utterance. An
utterance that already produced words is always finalized. On a 45 s three-speaker meeting slice
this recovers 155 of the 156 words a batch transcription finds (the first version got 125).
