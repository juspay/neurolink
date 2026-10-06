# Voice Bench

A browser playground for speech-to-text on self-hosted models, next to a cloud reference, with a
correction pipeline that uses a **decision model** to guard dictionary substitutions. It is the
test bed for NeuroLink's streaming STT and `decide()`-assisted correction; nothing here needs a
build step.

```
examples/voice-bench/
├── public/            the app: index.html, styles.css, app.js, config.js (yours, gitignored)
│   └── whistle/       Cactus Whistle worker (serve.sh copies needle.js / needle.wasm / whistle.cact here from models/whistle)
├── indic-conformer/   FastAPI wrapper that serves AI4Bharat IndicConformer-600M with auto language ID
├── serve.sh           python http.server on :8765
└── samples/           your own test clips (gitignored); public/samples links here
```

## Run

```sh
cp public/config.example.js public/config.js     # fill in endpoints and keys
./serve.sh                                        # http://localhost:8765
```

Optional engines:

- **IndicConformer** (22 Indian languages, native script, runs on a laptop CPU):
  `cd indic-conformer && uv venv --python 3.12 && VIRTUAL_ENV=$PWD/.venv uv pip install -r requirements.txt && ./serve.sh`.
  The model is gated on Hugging Face — accept its terms and `huggingface-cli login` once.
- **Whistle** (Cactus, 16.9 MB, runs in the browser): nothing to fetch. `serve.sh` copies the
  three files NeuroLink ships in `models/whistle/` (pinned Hugging Face revisions) into
  `public/whistle/` on first start.

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
`config.js`. The sidebar's **NeuroLink server** row checks `/api/health` and shows the active
transport; **Settings → Transcribe through NeuroLink server** switches it (on by default once the URL
is set, remembered per browser). With it on:

| Page          | What goes to the server                                                                                                                                                                                                                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push to talk  | One `POST /v1/audio/transcriptions` (`verbose_json`): `model` = the mapped provider, `language`, `prompt` (the context), `dictionary`, `correct=1` when _Correct finals_ is on, `second_opinion` = Spark with _Dual engine_ on Indic/Whistle, `fallback` = Spark for Indic. The card, "before correction", the language and the Decisions panel come from the response. |
| Files         | The same request per column; the Spark column asks for `spark/qwen3-asr-diarized` with `diarize=1` and shows its speakers. The server corrects the transcript as a whole, so the corrected text is an extra row under the segments.                                                                                                                                     |
| Live captions | A WebSocket to `/v1/audio/transcriptions/stream`: a JSON config frame, then 16 kHz PCM16 frames. The server endpoints, transcribes, hands an unsure Indic utterance to Spark, and corrects each sentence; the page only renders `interim` / `language` / `final` / `correcting` / `corrected` / `silence` events. The page's own endpointer does not run in this mode.  |

Scribe is still called directly. With the toggle off, everything works as before: direct engines and
the browser-side corrector, which makes the two paths easy to compare on the same audio.

## What is in the page

| Section        | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live**       | _Live captions_: the mic runs continuously, an energy gate finds utterances, the current utterance is re-transcribed every few hundred ms and words type into one big editable document (LocalAgreement commits the stable prefix; the uncertain tail is grey). On a pause the sentence is finalized, corrected and replaced in place. _Push to talk_: hold the mic or <kbd>Space</kbd>; a tap toggles. The strip below the document shows the raw engine text per sentence and what changed. |
| **Files**      | Drop a recording and run any mix of engines side by side: Spark (Nemotron-3 diarization + Qwen3-ASR, speaker labels), ElevenLabs Scribe, Whistle, IndicConformer. Copy / download per column.                                                                                                                                                                                                                                                                                                 |
| **Dictionary** | `Term · also heard as · meaning`. Terms are sent to the ASR as context, every alias found in a transcript becomes a candidate replacement, and the meaning is given to the decision model and the rewrite model.                                                                                                                                                                                                                                                                              |
| **Speak**      | Fish Audio S2-Pro TTS through LiteLLM, with voice cloning from the last push-to-talk recording.                                                                                                                                                                                                                                                                                                                                                                                               |
| **Settings**   | Endpoints from `config.js`, the NeuroLink transport toggle, and the live-caption tuning (silence gap, pass intervals, onset floor) kept in the browser.                                                                                                                                                                                                                                                                                                                                       |

### The corrector

Runs on every finished sentence (and on push-to-talk / file rows when Romanize is on):

1. **Dictionary** — aliases present in the text become candidates.
2. **Decision model** — one System One call (XOR, or any model that speaks the API) asks, per candidate, _term or
   literal?_ so a dictionary entry for a name does not rewrite the ordinary word it sounds like. The answers
   and their probabilities are shown in the **Decisions** panel next to the document.
3. **Rewrite** — a fast OpenAI-compatible chat model writes the sentence the way people type: Hindi
   stays Hindi in Latin letters (never translated), Tamil becomes Tanglish, English words get
   their real spelling, punctuation and capitalization are added, the dictionary is applied.
   With **Dual engine** on, IndicConformer / Whistle finals also get a Spark pass and the rewrite
   reconciles both (Indian-language words from the Indic engine, English from Qwen).

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
- The Spark second opinion runs in parallel with the final pass; the rewrite is streamed into the
  document as it arrives (first tokens in ~0.3 s); the decision model has a 4 s timeout and the
  rewrite 12 s, after which the dictionary-applied raw text is kept.

### Endpointing notes

Energy gating on 20 ms blocks. The noise floor is a minimum statistic (quietest block in 1.5 s,
rising at most ~2×/s), so a loud talker can never push a quieter second speaker below the gate;
speech has onset/sustain hysteresis; long turns end at the first pause after 16 s and are hard-cut
at 28 s at the quietest recent block with the remainder carried into the next utterance. An
utterance that already produced words is always finalized. On a 45 s three-speaker meeting slice
this recovers 155 of the 156 words a batch transcription finds (the first version got 125).
