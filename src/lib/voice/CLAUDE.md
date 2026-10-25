# Speech-to-text and `transcribe` (src/lib/voice)

Loaded automatically when working under `src/lib/voice/`. Moved out of the root CLAUDE.md.

## The `transcribe` inference type

`neurolink.transcribe()` (a whole recording: Buffer, path, `file://` or
`http(s)://` URL) and `neurolink.transcribeStream()` (PCM16LE frames →
`interim` / `final` / `corrected` / `silence` events), the CLI's
`neurolink transcribe <file>` (`src/cli/commands/transcribe.ts`), and the
server's `POST /api/agent/transcribe` and OpenAI-compatible
`POST /v1/audio/transcriptions` (`server/routes/transcribeRoutes.ts`). Audio
attached to `generate()` (`AudioProcessor` / `VideoProcessor`) picks its engine
by the same rule.

**STT providers; descriptor order is precedence.** `STT_PROVIDER_DESCRIPTORS`
in `src/lib/factories/sttDescriptors.ts` is the single source of truth for
every STT provider's name, aliases, credentials slice, env vars and
capabilities, exactly as `DECISION_PROVIDERS` is for `decide`. With no
provider named, `resolveDefaultSTTProvider()` returns `NEUROLINK_STT_PROVIDER`
(a shipped name, alias, or a `NEUROLINK_STT_ENDPOINTS` endpoint), else the
first configured descriptor — `whisper`, `deepgram`, `elevenlabs-stt`,
`google-stt`, `azure-stt` — else **Whistle**, the built-in local engine.
Reordering the list changes which engine every implicit transcription uses.
Note that `OPENAI_API_KEY` configures `whisper` and the Google AI Studio keys
configure `google-stt`, so an ambient text-provider key silently becomes the
STT default; a test asserting the Whistle default must blank them.

**Whistle is the zero-config default, and it ships with the package.**
`voice/providers/WhistleSTT.ts` runs a 17 MB model in WebAssembly on this
machine. Its three files are committed under `models/whistle/` (pinned
Hugging Face revisions, Apache-2.0, verified by SHA-256 in
`voice/whistle/assets.ts` before use) and listed in package.json `files`, so a
fresh install transcribes with no network. The directory order is an explicit
`credentials.stt.whistle.modelDir` / `NEUROLINK_WHISTLE_DIR`, then
`NEUROLINK_MODEL_DIR/whistle`, then the bundled copy (found by walking up from
the module to the package's own `package.json`), then
`~/.neurolink/models/whistle`, the only directory a download ever writes to and
now a fallback for installs that lost the bundled files. Whistle counts as
configured whenever its files are present **or** it may download them, so "no
STT backend configured" is only reachable with an **explicit, empty** model dir
(`NEUROLINK_WHISTLE_DIR` / `modelDir`, which skips the bundled copy) **and**
`NEUROLINK_WHISTLE_AUTO_DOWNLOAD=0` (or `credentials.stt.whistle.autoDownload:
false`). Tests that assert "no backend" must set both.

**The correction layer fails open through `tryDecide`.**
`voice/correction/` finds dictionary aliases in the transcript, asks the
decision provider per candidate whether the speaker meant the term or the
literal word (a `choice`, never a leading yes/no), then optionally rewrites the
text with a `generate`/`stream` call. With no decision provider, on the 4 s
guard timeout, or on any error, the dictionary is applied as is and every
`STTDecisionRecord` carries a `note` saying why — the same degradation contract
as the five `decide` call sites (see the `neurolink-decide` skill; the guard calls `tryDecide` directly, so
it is not one of the `await decide(` sites). A lone `OPENAI_API_KEY` now counts as
a decision provider, so a host that set it for `whisper` and passes a dictionary
sends the first 4,000 characters of the transcript to OpenAI's Decisions endpoint;
a test of the "no decision provider" note must blank it.

**Nothing may lose words.** Each layer keeps the text it was given when it
fails: a rewrite that drops more than `maxDropRatio` (0.25) of the words, times
out or errors is discarded; a correction that returns nothing keeps the engine
text; a failed fallback or second opinion keeps the primary; a streamed final
pass that comes back empty or with fewer than half the words already shown
keeps the live text; LocalAgreement's committed prefix only grows while passes
keep their words (it is capped at the newest pass's length); and an
utterance no engine could read is reported as a `silence` event with its length
rather than disappearing. `steps` on every result records which of these
happened. Covered by `pnpm run test:transcribe` (public surface, stub engines,
CLI, routes) and `pnpm run test:transcribe:stream` (the chunked adapter under
the determinism exception).

**The endpointer is a public, dependency-free subpath.**
`@juspay/neurolink/voice/endpointer` (package.json `exports`) points at
`dist/voice/streaming/endpointer.js`, so a browser app can find where a spoken
turn starts and ends without bundling the `voice` entry, which pulls in Node
built-ins. The file must stay free of runtime imports (type-only imports are
erased and fine): `test:transcribe` reads the shipped file and fails if an
`import` or `require` appears. Put a shared helper inside the file, not behind
an import.
