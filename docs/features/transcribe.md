---
title: The transcribe inference type
description: Audio in, text out — transcribe() and transcribeStream(), the built-in local engine, dictionaries, the decision-guarded correction layer, fallback and second-opinion engines, the CLI command and the server routes.
keywords: transcribe, speech to text, stt, asr, whisper, dictionary, correction, transliteration, streaming transcription, openai audio transcriptions
---

# The `transcribe` inference type

NeuroLink has four inference types. `transcribe` is the one that starts from audio:

| Type             | Call                                                | Produces                         |
| ---------------- | --------------------------------------------------- | -------------------------------- |
| `generate`       | `neurolink.generate()`                              | text                             |
| `stream`         | `neurolink.stream()`                                | text, incrementally              |
| `decide`         | `neurolink.decide()`                                | typed judgements                 |
| **`transcribe`** | **`neurolink.transcribe()` / `transcribeStream()`** | **text from audio, with timing** |

It runs through any registered speech-to-text (STT) engine and adds the layers
that make an engine usable on real speech: a **dictionary** of names and
jargon, a **correction** pass guarded by the decision model and finished by an
LLM rewrite, a **second-opinion** engine, a **fallback** engine for audio the
first one cannot read, and **client-side streaming** for engines that only
take whole files.

**Zero configuration.** With no STT provider configured, `transcribe()` uses
**Whistle**, the built-in local engine: it runs on this machine, needs no key
and no network; its model files (about 18 MB) ship inside the package.
Whistle reads English, German, French, Spanish, Italian, Dutch and Polish; for
other languages, accents, noisy rooms or heavy jargon, configure a cloud or
self-hosted engine, or add a dictionary and correction.

## SDK

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.transcribe({
  audio: "./meeting.wav", // Buffer, Uint8Array, path, file:// or http(s):// URL
});

console.log(result.text);
console.log(result.engine, result.language, result.timings, result.steps);
```

`audio` accepts bytes (`Buffer`, `ArrayBuffer`, `Uint8Array`), a path, a
`file://` URL or an `http(s)://` URL. The container is inferred from the path
or the bytes; pass `format` (`"wav"`, `"mp3"`, `"m4a"`, `"ogg"`, `"opus"`,
`"webm"`, `"flac"`, `"mp4"`, `"pcm16"` …) for a buffer it cannot be read from.

### Options

| Option           | Meaning                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `provider`       | STT provider name or alias. Default: `NEUROLINK_STT_PROVIDER`, then the first configured provider, then Whistle.                  |
| `model`          | Model of that provider. Default: `NEUROLINK_STT_MODEL`, only when the provider also came from the environment.                    |
| `language`       | Language code or locale, or `"auto"`. Default: `NEUROLINK_STT_LANGUAGE`, else the engine detects it.                              |
| `prompt`         | Context prompt for engines that bias on one; dictionary terms are appended to it.                                                 |
| `diarization`    | Label speakers, on engines that diarize.                                                                                          |
| `wordTimestamps` | Ask for word-level timings.                                                                                                       |
| `dictionary`     | Names and jargon, see [Dictionary](#dictionary).                                                                                  |
| `correction`     | The correction layer, see [Correction](#correction).                                                                              |
| `fallback`       | `{ provider, model?, when? }`, see [Fallback](#fallback-and-second-opinion).                                                      |
| `streaming`      | Tuning for `transcribeStream()`, see [Streaming](#streaming).                                                                     |
| `timeoutMs`      | Whole-call timeout.                                                                                                               |
| `credentials`    | Per-call credentials; the `stt` slice (`credentials.stt.whisper.apiKey`, `credentials.stt.deepgram.apiKey` …) beats the env vars. |

### Result

`TranscribeResult` is the engine's `STTResult` (`text`, `confidence`,
`language`, `duration`, `words`, `segments`, `speakers`, `metadata`) plus what
the layers did:

| Field              | Meaning                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| `raw`              | The engine's text before any correction.                                                                 |
| `text`             | The final text — the corrected text when correction changed it, else `raw`.                              |
| `corrected`        | Present only when correction changed the text.                                                           |
| `languageDetected` | `false` when the engine reported a low language-detection score.                                         |
| `languageScores`   | Candidate languages with the engine's own scores, where it reports them.                                 |
| `decisions`        | One record per dictionary candidate: what was heard, the term, `term` or `literal`, and the probability. |
| `engine`           | `{ provider, model, fallbackUsed?, secondOpinion? }`.                                                    |
| `timings`          | `transcribeMs`, `secondOpinionMs`, `decideMs`, `rewriteMs`, `correctionMs`, `totalMs`.                   |
| `steps`            | A readable trail: `"dictionary 2/2"`, `"rewrite timed out · kept text"` …                                |

## Providers and environment

| Provider (aliases)                            | Configured by                                                                               | Notes                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `whisper` (`openai-stt`, `openai-compatible`) | `OPENAI_STT_API_KEY` or `OPENAI_API_KEY`; `OPENAI_STT_BASE_URL` for another server          | Any OpenAI-compatible `/audio/transcriptions` endpoint. |
| `deepgram`                                    | `DEEPGRAM_API_KEY`                                                                          | Native streaming.                                       |
| `elevenlabs-stt` (`scribe`, `elevenlabs`)     | `ELEVENLABS_API_KEY`                                                                        |                                                         |
| `google-stt`                                  | `GOOGLE_API_KEY`, `GOOGLE_AI_API_KEY`, `GEMINI_API_KEY` or `GOOGLE_APPLICATION_CREDENTIALS` |                                                         |
| `azure-stt`                                   | `AZURE_SPEECH_KEY`                                                                          |                                                         |
| `whistle` (`local`)                           | nothing                                                                                     | Built-in, local, always available.                      |

The order of that table is precedence: without `provider` or
`NEUROLINK_STT_PROVIDER`, the first configured provider is used, and Whistle
only when none is.

| Variable                          | Effect                                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `NEUROLINK_STT_PROVIDER`          | Default provider for `transcribe()`, `transcribeStream()`, the CLI and the server routes.                                              |
| `NEUROLINK_STT_MODEL`             | Default model, applied with the provider from `NEUROLINK_STT_PROVIDER` / auto-selection.                                               |
| `NEUROLINK_STT_LANGUAGE`          | Default language when a call does not name one.                                                                                        |
| `NEUROLINK_WHISTLE_DIR`           | Where Whistle keeps its model files. Default: the copy shipped in the package (`models/whistle/`), else `~/.neurolink/models/whistle`. |
| `NEUROLINK_WHISTLE_AUTO_DOWNLOAD` | `0` forbids fetching the files into `~/.neurolink/models/whistle`; with the bundled copy present nothing is ever fetched.              |
| `FFMPEG_PATH`                     | ffmpeg binary for compressed input to Whistle and for `--stream` on non-WAV files.                                                     |

## Dictionary

A dictionary teaches the pipeline the words an engine cannot know — product
names, people's names, internal jargon — and how engines tend to mis-hear them:

```json
[
  {
    "term": "Acme Pay",
    "heardAs": ["acne pay", "ack me pay"],
    "meaning": "the company's payments product"
  },
  { "term": "Kubernetes", "heardAs": ["cooper netties"] }
]
```

| Field     | Required | Use                                                                                               |
| --------- | -------- | ------------------------------------------------------------------------------------------------- |
| `term`    | yes      | The correct spelling, written exactly like this in the output.                                    |
| `heardAs` | no       | Mis-hearings, in any script. Each one found in a transcript becomes a candidate for replacement.  |
| `meaning` | no       | What the term means, given to the decision model and the rewrite so they can tell term from word. |

The dictionary is used three ways: its terms are sent to engines that take a
prompt or vocabulary, each `heardAs` found in the transcript becomes a
candidate repair, and the whole list is given to the rewrite model.

## Correction

```typescript
const result = await neurolink.transcribe({
  audio: "./standup.m4a",
  dictionary,
  correction: {
    rewrite: { provider: "<text-provider>", model: "<fast-chat-model>" },
    transliterate: "latin",
    context: "A daily engineering stand-up about the payments service.",
  },
});
```

Correction runs on a finished transcript (or on each final utterance when
streaming), in two stages:

1. **Dictionary, guarded.** Each candidate is put to the decision model as one
   question — did the speaker mean the term, or the ordinary word? — so a
   product name never rewrites the everyday word it sounds like. All
   candidates go in one `tryDecide()` call. With no decision provider, on a
   timeout (`decideTimeoutMs`, default 4000) or on any error, the dictionary is
   applied as is. `guard: "none"` always applies it. The guard asks for the
   default decision provider, and it sends the first 4,000 characters of the
   transcript to it. A lone `OPENAI_API_KEY` counts as one (it is also Whisper's
   key), so a host that set it only for Whisper and passes a dictionary sends the
   transcript text to OpenAI's Decisions endpoint, unless `OPENAI_BASE_URL`,
   `OPENAI_API_BASE` or `credentials.openai.baseURL` names a host other than `https://api.openai.com` (a gateway's
   key is not used for the default); see
   [One key, two providers](../getting-started/providers/openai-decisions.md#one-key-two-providers).
   `SCALEDOWN_API_KEY`, which no other provider reads, counts too: with it as the
   only decision key, the transcript text goes to ScaleDown, the last provider in
   the order.
2. **Rewrite.** A text model fixes spelling, punctuation and capitalisation,
   writes dictionary terms correctly, reconciles a second opinion and writes
   Indic-script words in Latin letters the way people type them (Hinglish,
   Tanglish …) — never translating them. `transliterate: "native"` keeps the
   original script. `rewrite: false` stops after the dictionary.

| Option              | Default                                                                             | Meaning                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`           | on with a dictionary or any `correction` object, unless it is only `rewrite: false` | Run the layer at all.                                                                                                                                                                                                       |
| `guard`             | `"decide"`                                                                          | `"decide"` asks the decision model per candidate; `"none"` always applies.                                                                                                                                                  |
| `decideTimeoutMs`   | 4000                                                                                | Guard timeout.                                                                                                                                                                                                              |
| `rewrite`           | `"auto"`                                                                            | `"auto"` runs the rewrite only when there is something for it to do (see below); `{ provider?, model?, timeoutMs?, mode? }` names the text model (`mode: "always"` runs it every time); `false` stops after the dictionary. |
| `perSentence`       | `true`                                                                              | Correct a final sentence by sentence (see below). `false` keeps one whole-text pass.                                                                                                                                        |
| `transliterate`     | `"latin"` for Indian languages, `"native"` for any other known language             | `"latin"` or `"native"`. Unset, Arabic, CJK, Cyrillic … text keeps its script; Urdu still romanises like the other Indian languages.                                                                                        |
| `punctuate`         | `true`                                                                              | Punctuation and capitalisation in the rewrite.                                                                                                                                                                              |
| `secondOpinion`     | none                                                                                | `{ provider, model? }`, or `"auto"` to use the `fallback` engine — see below.                                                                                                                                               |
| `contextUtterances` | 0 (off)                                                                             | Corrected utterances before this one that the rewrite sees as read-only context (streaming and `chunking: "utterances"`). Opt-in: a rewrite that copies context is refused by the added-words guard.                        |
| `context`           | none                                                                                | One sentence about who is talking and about what.                                                                                                                                                                           |
| `maxDropRatio`      | 0.25                                                                                | A rewrite that drops more than this share of the words is discarded.                                                                                                                                                        |

### When the rewrite runs, and on what

With `rewrite: "auto"` (the default) each text is checked before the model is
called, and the rewrite runs only when it has a job: a second opinion to
reconcile, a dictionary term that was applied, non-Latin script when Latin
output is requested, or a sentence of four or more words with no terminal
punctuation and `punctuate` on. An English sentence that arrived clean from
the engine therefore costs nothing after the dictionary, and `steps` says
`rewrite skipped · nothing to change`. `mode: "always"` restores the old
behaviour.

With `perSentence` (the default) a final is split on terminal punctuation
and the danda, and each sentence goes through the dictionary and its own
rewrite decision, three sentences at a time. A Hindi sentence followed by an
English one is romanised and left alone respectively, the English sentence
never waits for the Hindi one, and `steps` reports `per sentence (n)` with
how many sentences were rewritten, skipped or kept. A second opinion is
whole-utterance by nature and keeps the single pass.

### The rewrite knows the language

The detected language of each utterance picks the rewrite's rules. Indian
languages, English and speech whose language is unknown keep the Hinglish /
Tanglish prompt above. Any other known language (Spanish, Japanese, Arabic …)
gets a general post-editing prompt in that language: fix mis-hearings, keep
the language and its own script, never translate. When streaming, the last
`contextUtterances` corrected utterances travel with each rewrite as
read-only context, so a name spelled one way stays spelled that way and the
script does not drift between sentences.

### Guards on what the engine said

Two things a speech engine produces that were never said are caught before
the dictionary or the rewrite see the text, on every pass, live or file:

- **A decoding loop** ("Same one. Same one. …" for hundreds of words, which
  a long-form engine can fall into on a long or noisy chunk) is collapsed to
  two occurrences; natural repeats of up to three stay. `steps` reports
  `repetition collapsed (n words)`. On a file, an utterance that was mostly
  loop is re-run as two halves, since the loop belongs to the chunk, not the
  speech.
- **A prompt echo**, an engine answering a pause with the vocabulary prompt
  it was given ("Names and terms used: …", or a list of two or more terms), is
  discarded as no text (`prompt echo discarded`) and the empty path takes
  over. A speaker who says a single term ("Juspay.") is kept. The term list is
  sent to every OpenAI-compatible server; set `vocabularyPrompt: false` on an
  endpoint that echoes it (`OPENAI_STT_VOCABULARY_PROMPT=0` for the `whisper`
  slice).
- **A near-silent utterance** (under a quarter speech) whose whole output is a
  word or two in a script the session has not spoken is reported as silence,
  not text. With the speech detector on, so is a short utterance whose text
  would mean more than twelve words per second of detected speech.

### Clean verbatim

`correction: { cleanup: "clean" }` lets the rewrite remove fillers ("um",
a meaningless "like"), stutters ("they they they") and restarted false
starts, and never content; in that mode the rewrite may drop up to half the
words (`maxDropRatio` still overrides). The default, `"verbatim"`, keeps
every word as said.

### Nothing is ever dropped

Every layer fails open, and none may lose words:

- A rewrite that drops more than `maxDropRatio` of the words is discarded and
  the dictionary-applied text is kept.
- A rewrite that times out, fails or returns nothing keeps the text it was
  given.
- A guard that times out or fails applies the dictionary as is.
- When streaming, a final pass that returns less than the live text keeps the
  live text, and an utterance no engine could read is reported as a `silence`
  event with its length rather than disappearing.
- `raw` always holds the engine's own text, so a caller can show or diff it.

Each of those outcomes is written to `steps`, so a degraded path is visible
rather than silent.

## Fallback and second opinion

```typescript
await neurolink.transcribe({
  audio,
  provider: "<indic-capable-stt-provider>",
  fallback: { provider: "whisper", when: ["unsure", "empty", "error"] },
  correction: { secondOpinion: { provider: "whisper" } },
});
```

- **Fallback** takes the request (or, when streaming, the utterance) when the
  primary engine cannot read it: `when` defaults to `["unsure", "empty"]` — a
  low language-detection score, or no text — and `"error"` adds engine
  failures. `engine.fallbackUsed` says when it ran.
- **Second opinion** runs a second engine on the same audio in parallel; the
  rewrite reconciles the two transcripts, taking each language's words from the
  engine that reads it better. When the primary reports an unsure language,
  or no text, the second opinion's text leads. With `rewrite: false` that is
  all it does — there is no reconciliation without the rewrite.
  `secondOpinion: "auto"` uses the `fallback` engine: with an Indic primary
  and an English-oriented fallback, every utterance the primary leads is also
  read by the fallback, and the rewrite takes Indian-language words from one
  and English words from the other. One extra engine call per utterance, run
  in parallel with the final pass.

### Files through the live pipeline

```typescript
await neurolink.transcribe({
  audio: "./meeting.wav",
  provider: "indic",
  fallback: { provider: "spark" },
  chunking: "utterances",
});
```

By default a recording goes to the engine whole (`chunking: "engine"`).
With `chunking: "utterances"` it goes through the same pipeline as live
captions: the endpointer cuts it into utterances, each utterance gets the
language probe and its own engine, the dictionary with the decision guard and
the per-sentence correction, three utterances at a time
(`streaming.concurrency`), with a failed final tried once more
(`streaming.finalRetries`) and a 180 s engine timeout instead of the live
30 s. The result has one `segment` per utterance with its `language`, and
`steps` reports how many utterances the fallback took and any the engines
could not read (reported, never dropped). A mixed-language recording gets
the right engine per utterance; an English-only one costs the same as
before. Needs WAV, or ffmpeg on the server for other containers. The
OpenAI-compatible route takes it as the `chunking=utterances` form field.

The same pipeline is available over the WebSocket with `mode: "file"` in the
first frame: send the whole recording's PCM as fast as the socket takes it,
then `{"type":"end"}`, and receive `final` and `corrected` per utterance as
they finish. No request time limit applies, and up to 512 MB of audio
(about 4.5 hours) may be queued. File-mode utterances are cut at 20 s (12 s
at a pause) rather than the live 28 s.

### Routing: the probe and the prior

With a fallback set, the engines are not tried one after the other:

```typescript
await neurolink.transcribe({
  audio,
  provider: "indic",
  fallback: { provider: "spark" },
  routing: { probe: true, lockAfterPasses: 2, prior: "carry" }, // the defaults
});
```

- **Streaming probe.** The first pass of every utterance (from about 1.2 s of
  audio) runs the primary and the fallback **in parallel**. When the primary
  reports an unsure language, or nothing, and the fallback produced mostly
  Latin-script words, the fallback leads the utterance from that moment; a
  primary that is confident on two probes locks (or on one, when the
  fallback had no words to offer). By default the second pass probes again
  (`lockAfterPasses: 2`), so a Hindi utterance misjudged at 1.2 s is handed
  back to the Indic engine once it is sure, and words always beat an empty
  answer whatever the script. Verdicts that disagree buy one more probe: a
  language score on two or three seconds of audio jitters (an English clip
  scored −0.46, −0.16 and −0.44 on consecutive passes against a −0.18
  threshold), so one confident verdict after an unsure one never settles an
  utterance by itself. English spoken into an Indic engine shows Latin
  captions about 1.5 s after the first word instead of 5 s. The older rule
  (two unsure passes after 3 s; two confident passes rule it out for good,
  one only delays it) stays as a safety net for utterances the probe locked
  on the primary. `lockAfterPasses` keeps both engines running for more
  passes before locking; `probe: false` disables the probe.
- **Batch probe.** When the primary engine has a language-only model
  (`lidModel` on its endpoint; the IndicConformer wrapper serves
  `<model>-lid`), it is asked for a verdict on the first eight seconds, in
  about 200 ms, before anything is transcribed. Unsure sends the recording to
  the fallback without a full primary pass; confident runs the primary alone.
  A pinned `language` skips the probe.
- **Prior.** The last language an engine was confident about is carried into
  the next utterance (`prior: "carry"`), for engines that take one: an
  endpoint with `priorLanguageForm: "auto-{lang}"` receives `language=auto-hi`
  after a Hindi utterance, so a borderline next sentence is read as Hindi
  rather than flipping to a neighbour. The prior is never sent to the
  fallback, never sent when `language` is pinned, and never sent to a server
  that did not declare the form.
- **Language → engine table.** `routing.engines` names the engine for each
  language, `"*"` for the rest:

  ```typescript
  routing: { engines: { hi: "indic", ta: "indic", en: "spark", "*": "spark" } }
  ```

  A pass whose detected language belongs to another engine is read again by
  that engine (with the language as its prior), and the rest of the
  utterance goes straight to it. Its text is used when it heard words and
  reads the language; otherwise the original text stays. Batch transcription
  does the same for the whole recording. A pinned `language` turns routing
  off. The final names the engine that wrote it, and `steps` records
  `routed hi → indic`.

- **Level.** Quiet utterances are raised to a normal speech level before any
  engine hears them (gain only goes up, at most 8×, limited by the peak, so
  nothing clips and digital silence stays silent). `streaming.normalize:
false` sends the audio as captured.

## Output languages

Every utterance can also be written in other languages and scripts:

```typescript
const result = await neurolink.transcribe({
  audio,
  output: { languages: ["es", "hi-Latn", "source"] },
});
result.text; // the transcript, exactly as without `output`
result.outputs?.es; // { language: "es", text, status: "ok", ms, segments? }
result.outputs?.["hi-Latn"]; // Hindi in Latin letters, whatever was spoken
```

Each entry is a BCP-47 tag: a language (`es`, `ta`), optionally a script
(`hi-Latn` is Hindi written in Latin letters, the way people type it) and a
region (`fr-CA`). `"source"` is the transcript itself. Up to eight per
request.

- **One call per utterance.** A single structured call renders every
  requested language (four per call; more run in parallel). It gets both the
  native-script engine text and its corrected form, so a translation is never
  made from romanised text alone, the earlier utterances and their renderings
  as context (`contextUtterances`, default 3), and the dictionary terms as a
  glossary kept verbatim (`glossary: false` turns that off).
- **No call when there is nothing to do.** `"source"`, and a target in the
  transcript's own language and script, are the corrected text
  (`status: "same-language"`).
- **Guards.** An answer that is empty, in the wrong script for its tag, or
  the source handed back untranslated is refused; a refused target gets one
  retry on its own, then `status: "rejected"` with a `reason`.
- **Never costs the transcript.** Rendering runs after the text is settled
  and fails open: `text`, `final` and `corrected` are what they would be
  without it. Statuses: `ok`, `same-language`, `timeout`, `error`,
  `rejected`, and `partial` for a long recording where some batches rendered.
- **Long recordings** are rendered per segment (20 segments per call), so
  `outputs.<tag>.segments` line up with `result.segments` and their timings.
- **Model.** `output.provider` / `output.model`, else
  `NEUROLINK_STT_OUTPUT_PROVIDER` / `NEUROLINK_STT_OUTPUT_MODEL`, else the
  rewrite's model. Translation quality follows the model; a stronger one than
  the rewrite's is usually worth it. `timeoutMs` defaults to 15000.

When streaming, each utterance's renderings arrive as `output` events, one
per language, after its `corrected` event (`basedOn: "corrected"`) or after
the `final` when correction is off. `output.languages` may also be a live
source — `{ current(): string[] }` — read once per utterance, which is how a
socket's control frames and a session's listeners change the languages
mid-stream.

### Sessions: one call, many listeners

```typescript
import { TranscriptionSession } from "@juspay/neurolink";

const session = new TranscriptionSession(neurolink, { id: "standup" });
const es = session.subscribe({ languages: ["es"] }, (event) => show(event));
session.subscribe({ languages: ["hi-Latn"], speakers: ["alice"] }, render);
await Promise.all([
  session.addSpeaker("alice", {
    audio: aliceFrames,
    provider: "indic",
    fallback: { provider: "spark" },
  }),
  session.addSpeaker("bob", { audio: bobFrames }),
]);
```

Each speaker is one `transcribeStream()` (call platforms give one track per
participant). The session renders each utterance once into the **union** of
the languages its listeners read right now: ten listeners in Spanish cost one
rendering, a language nobody reads costs nothing. A listener receives every
event of the speakers it follows, tagged with `speaker`, and only the
`output` events of its own languages; `interim: false` drops live captions.
`subscription.update({ languages })` changes them from the next utterance.
A listener who joins late gets the backlog — the last `backlog` (default 50)
utterances with every rendering already made for them; a language added
later applies from the next utterance on.

## Streaming

```typescript
for await (const event of neurolink.transcribeStream({
  audio: micFrames, // AsyncIterable<Buffer> of PCM16LE mono
  streaming: { sampleRate: 16000 },
  dictionary,
})) {
  if (event.type === "interim") render(event.committed, event.tail);
  if (event.type === "final") commit(event.text);
  if (event.type === "corrected") replace(event.utterance, event.text);
}
```

Engines with a native stream use it; every other engine is streamed on the
client by a chunked adapter (a speech detector finds utterances, the current
utterance is re-transcribed every `intervalMs`, and the prefix two passes agree
on is committed). `streaming.mode: "chunked"` forces the adapter.

| Event        | Carries                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `interim`    | The utterance's current `text`, split into `committed` (stable) and `tail` (may still change). |
| `language`   | The detected language and whether the engine was sure.                                         |
| `final`      | The utterance's final text, segment and words, the engine, and whether the fallback took it.   |
| `correcting` | Partial text of the streamed rewrite.                                                          |
| `corrected`  | The corrected text, its `raw`, decisions, steps and timings.                                   |
| `silence`    | An utterance no engine could read, with its length.                                            |
| `error`      | A message, and `recoverable: true` when the stream carries on with the next utterance.         |

Tuning (`streaming`): `sampleRate` (16000), `endSilenceMs` (750), `intervalMs`
(900), `softCutSeconds` (16), `maxUtteranceSeconds` (28), `onsetRms` (0.006),
`prerollMs` (350), `minSpeechMs` (250).

**The speech detector** (`streaming.vad`). By default the adapter runs
[Silero VAD](https://github.com/snakers4/silero-vad) over the stream: a 2.3 MB
ONNX model (MIT, 6000+ languages) that scores every 32 ms frame with the
probability that it is a human voice, which an energy gate cannot tell from a
chair, a keyboard or a far-away TV. The model ships with the package under
`models/silero-vad/` and runs through the optional dependency
`onnxruntime-node` (prebuilt for Linux, macOS and Windows on x64 and arm64,
about 0.1 ms per frame). When either is missing the energy gate takes over,
with one warning in the log. `vad.engine` is `"auto"` (that), `"silero"` (an
error when it cannot load) or `"energy"`; `NEUROLINK_STT_VAD` sets the
default. An utterance opens after `vad.startMs` (120) of consecutive frames at
or above `vad.onset` (0.6) — the pre-roll keeps that audio — and a frame
counts as speech at or above `vad.sustain` (0.35). Every `final` and `silence`
event says which detector found the utterance (`vad`) and how much of it was
speech (`speechSeconds`). With the detector on, the engine is also spared the
closing pause: audio more than 300 ms after the last speech frame is not sent
(and every chunk any engine gets ends in 400 ms of digital silence, because a
chunk cut off right after speech sent Qwen3-ASR into a decoding loop until its
timeout), and a short utterance whose text would mean more than twelve words per second
of detected speech is reported as `silence`, since that is an engine filling a
pause with a stock phrase, not a sentence. `minSpeechMs`, the near-silence rule
and the language thresholds all count the detector's speech, not energy.

## Getting good results

The layers above are generic; which engine to point them at, and what to
expect from each, is not. The numbers below were measured on 2026-10-07 on a
laptop (Apple Silicon) through `neurolink serve`: Whistle in-process, an
IndicConformer wrapper on the same machine, and Qwen3-ASR ("spark") on a GPU
box behind LiteLLM; the guard is a System One decision model, the rewrite an
`open-fast` chat model, both over the network. Your numbers will differ, the
ratios will not.

### Pick the engine by what is said

| Engine                            | Good at                                                                              | Weak at                                                                                    | Batch speed       |
| --------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------- |
| `whistle` (built in, no network)  | English and six European languages, clean speech, long files (5 min in 15 s)         | Anything else: it will produce fluent English that is not what was said                    | ~18–20× real time |
| IndicConformer (`indic` endpoint) | 22 Indian languages in native script, code-mixed Hindi/English, language auto-detect | English-only or non-Indian speech: it reports `languageDetected: false` and returns little | ~28× real time    |
| Qwen3-ASR (`spark` endpoint)      | Mixed-language speech, Hinglish in Latin letters, long files, jargon                 | Slowest of the three; Tamil/Kannada phonetics are approximate                              | ~5–9× real time   |
| `elevenlabs-stt`                  | Hosted, 90+ languages, speaker diarization                                           | Needs a key and the network                                                                | network bound     |

Two patterns cover most rooms:

- **Indian languages with English in the mix:** `provider: "indic"` with
  `fallback: { provider: "spark" }`. Indic answers when it is sure; when it
  reports `languageDetected: false` or comes back empty (an English-only
  meeting, for instance) the fallback takes over and the result says so in
  `steps` (`fallback spark (unsure)`). Measured on a 45 s English meeting:
  Indic alone returned nothing, Indic + fallback returned all 156 words.
- **English, offline, no keys:** `whistle`, which is also what you get with
  nothing configured.

Pin `language` when you know it; `auto` costs a detection pass on Indic and
lets a short utterance be mis-detected. Send 16 kHz mono where you can: every
engine resamples to it, and the stream requires it.

### A file is transcribed whole; a stream is cut into utterances

`transcribe()` and both POST routes hand the **entire recording** to the
engine in one request. Whistle and the Indic wrapper split long audio on
silence internally; Qwen3-ASR takes it whole; none of them need you to chunk,
and the measured 5-minute file came back complete from all three (851, 849 and
849 words). The one limit is the upload: `bodyParser.rawMaxSize` (64 MB; `neurolink serve --max-upload`) on the
multipart route and the JSON body limit (10 MB) on the envelope route, so send long
recordings as multipart, or raise the limit. Correction then runs
**per segment line** (the engine's segments, or sentences), so a dictionary
term found in minute four is judged on its own sentence, not on five minutes
of context; set `NEUROLINK_STT_CORRECT_WHOLE=1` to correct the whole text in
one pass instead.

`transcribeStream()` and the WebSocket are what the demo's **Live** page uses,
and they work differently: audio arrives as 20 ms blocks, a speech detector
(Silero VAD, or an energy gate with a noise-floor estimate when it is not
available) finds **utterances** (speech onset, 750 ms of silence to
close, soft cut at 16 s, hard cut at 28 s with the remainder carried over),
the open utterance is re-transcribed every 900 ms (`interim` events, with the
prefix two passes agreed on as `committed`), and when it closes you get one
`final`. The dictionary, the guard and the rewrite then run on **that
utterance** and come back as one `corrected` event, which is why the demo
shows a sentence appear, then change a word or two about a second later. A
stream never waits for the whole recording, and nothing is held back: an
utterance no engine could read is reported as `silence` with its length.

### Dictionary and correction: what they cost and when to use which

| Configuration                                            | Adds to a 10 s clip  | What you get                                                                                  |
| -------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `dictionary` only (`correction: { rewrite: false }`)     | ~0.1 s per candidate | Each `heardAs` hit is judged by the decision model (term or literal) and replaced when a term |
| `dictionary` + rewrite (`correction: { enabled: true }`) | +0.4–1.7 s           | The judged text is then rewritten for punctuation, casing and script by a chat model          |
| `correction.guard: "none"`                               | ~0 s                 | Dictionary applied without asking; use when every alias is unambiguous                        |
| `transliterate: "latin"`                                 | inside the rewrite   | Hinglish in Latin letters from a Devanagari engine (Indic → `khaali meeting hai at three pm`) |

Write `heardAs` in the script the engine actually emits: Devanagari aliases
for Indic (`"न्यूरोलिंक"`), Latin for Whistle and Qwen3-ASR (`"nurellink"`,
`"neural link"`). A `meaning` helps the guard decide between a product name and
a common word. The decision model is asked per candidate and fails open: with
no decision provider configured the dictionary is applied as is and every
decision carries a `note` saying so.

The rewrite is the one layer that can change words, so it is bounded: a rewrite
that drops more than a quarter of the words, times out or errors is discarded
and `steps` says `kept text`. With a weak engine on the wrong language the
rewrite will "fix" nonsense into fluent nonsense (Whistle on Tamil becomes
"Now like a meeting, Iraqi Mondo Muniki…"); the fix is the engine, not the
corrector.

### Latency to expect

Batch, `POST /api/agent/transcribe`, median of three runs, server-side
`timings` in ms, 9–11 s clips:

| Engine  | Clip     | Engine | Guard | Rewrite | Total | × real time |
| ------- | -------- | -----: | ----: | ------: | ----: | ----------: |
| whistle | English  |    535 |   145 |     564 |  1636 |        6.5× |
| whistle | Hinglish |    457 |     – |     507 |   962 |        9.4× |
| indic   | Hinglish |    323 |   107 |    1162 |  1607 |        5.6× |
| indic   | Tamil    |    356 |     – |     897 |  1282 |        8.3× |
| spark   | English  |   1187 |     – |     445 |  1809 |        5.9× |
| spark   | Hinglish |   1667 |     – |     918 |  2447 |        3.7× |
| spark   | Tamil    |   2067 |     – |     444 |  2781 |        3.8× |

Raw (no correction) is the Engine column alone: Whistle ≈ 0.5 s, Indic ≈ 0.35 s,
Spark 1.2–2.1 s for ten seconds of audio. The guard column is blank when no
dictionary alias was heard; it is ~100–150 ms when one was.

Streaming, WebSocket, 100 ms frames paced in real time:

| Engine  | First interim | Final after end of speech | Corrected after final |
| ------- | ------------: | ------------------------: | --------------------: |
| whistle |        ~1.0 s |                    ~0.5 s |                ~0.5 s |
| indic   |        ~0.8 s |                    <0.1 s |             0.7–1.6 s |
| spark   |        ~1.1 s |                 0.7–1.7 s |             0.5–0.7 s |

"First interim" includes the 350 ms pre-roll and the first engine pass; the
demo shows text about a second after you start talking, the sentence settles
within a second of the pause, and the corrected version replaces it under two
seconds later.

### Finding the end of a spoken turn in a browser

`@juspay/neurolink/voice/endpointer` exports the energy gate the chunked adapter
uses. It is a self-contained module (no Node built-ins, no other imports), so a
browser app can ask where a spoken turn starts and ends without running a speech
engine and without bundling the `voice` entry.

```typescript
import {
  Endpointer,
  resolveEndpointerConfig,
} from "@juspay/neurolink/voice/endpointer";

const gate = new Endpointer(
  resolveEndpointerConfig(
    { endSilenceMs: 1000, softCutSeconds: 60, maxUtteranceSeconds: 60 },
    audioContext.sampleRate,
  ),
);

// `samples` is a Float32Array at the context's sample rate, from an AudioWorklet
for (const event of gate.push(samples)) {
  if (event.type === "end") stopRecording(event.reason);
  if (event.type === "drop") discardClick();
}
```

- `start` is tentative: a click also starts an utterance, and a `drop` follows
  about `endSilenceMs` later. `end` carries a `reason`: `silence`, `softCut`,
  `hardCut` or `flush`.
- Feed it a continuous stream of samples. The noise floor and every timer count
  samples, so polling an `AnalyserNode` on a timer gives wrong timings.
- The noise floor starts at a fixed value and rises by at most about 2x per
  second. In a loud room the first two seconds can produce an utterance made of
  noise, so keep the gate running for about two seconds before trusting events.
- A signal that never dips (a fan, a steady hum) is absorbed as noise after a
  few seconds. It measures energy, not speech: background talk keeps a turn open
  until a cut.
- `softCutSeconds` (16) ends a turn at the first gap of 320 ms or more once it is
  that long. Raise it, together with `maxUtteranceSeconds`, when you want one
  recording per turn.

## CLI

```bash
neurolink transcribe meeting.wav
neurolink transcribe call.mp3 --term "Acme Pay|acne pay,ack me pay|the payments product" --correct
neurolink transcribe standup.m4a --dictionary terms.json --rewrite-model <fast-chat-model> --transliterate latin
neurolink transcribe talk.wav --word-timestamps --format srt > talk.srt
cat clip.wav | neurolink transcribe - --stream
```

The text output is the transcript, then a dim line with the engine, the
language (`detected` or `unsure`), the audio length, each layer's time and the
steps. `--format json` prints the whole `TranscribeResult` (one event per line
with `--stream`); `--format srt|vtt` builds subtitle cues from the segments, or
from the word timings. `--stream` decodes the file to 16 kHz mono PCM16 (WAV in
process, anything else through ffmpeg) and runs it through
`transcribeStream()`. Credentials are env-only, as for every CLI command. The
full flag table is in the [CLI reference](../cli/commands.md#transcribe).

## Server routes

`createAllRoutes()` / `registerAllRoutes()` mount two routes on every adapter
(Hono, Express, Fastify, Koa); `createTranscribeRoutes(basePath, options)`
mounts them on their own. Neither accepts credentials: engines use the
server's own configuration, and a `credentials` field in a body is ignored.

### `POST /api/agent/transcribe`

JSON body with exactly one audio source:

```json
{
  "audio": "<base64 or data: URL>",
  "format": "wav",
  "provider": "<stt-provider>",
  "language": "auto",
  "dictionary": [{ "term": "Acme Pay", "heardAs": ["acne pay"] }],
  "correction": { "rewrite": { "model": "<fast-chat-model>" } },
  "fallback": { "provider": "<stt-provider>" },
  "diarization": false,
  "wordTimestamps": true
}
```

| Source      | Rules                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `audio`     | Base64, or a `data:audio/...;base64,` URL. Bounded by the adapter's JSON body limit (`bodyParser.jsonLimit`, 10 MB by default). |
| `audioUrl`  | An `http(s)` URL the server downloads through the SSRF guard (private addresses and redirects refused), capped in size.         |
| `audioPath` | A path on the server. **Refused by default**; allowed only inside the directories in `transcribe.allowedAudioRoots`.            |

The response is the `TranscribeResult`, in the adapters' usual
`{ data, metadata }` envelope. Errors use the usual error shape: 400 for an
invalid body or an unsupported provider, language or format, 403 for a refused
`audioPath`, 413 for audio over the limit, 500 for an engine failure.

### `POST /v1/audio/transcriptions` (OpenAI-compatible)

`multipart/form-data`, the way OpenAI's API takes it, so an OpenAI client
pointed at `http://<host>:<port>/v1` works unchanged:

| Field                       | Meaning                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `file`                      | The audio (required). Its name or type sets the container.                                                  |
| `model`                     | `<provider>` or `<provider>/<model>`. OpenAI's own model names and `auto` mean the server's default engine. |
| `language`, `prompt`        | As in the SDK.                                                                                              |
| `response_format`           | `json` (`{ "text" }`, the default), `text` (plain text) or `verbose_json`.                                  |
| `timestamp_granularities[]` | `word` requests word timings.                                                                               |
| `temperature`               | Accepted and ignored.                                                                                       |
| `provider`                  | Extension: the STT provider, overriding `model`.                                                            |
| `diarize`                   | Extension: `true` labels speakers.                                                                          |
| `dictionary`                | Extension: the dictionary as a JSON string.                                                                 |
| `correct`                   | Extension: `true` runs the correction layer.                                                                |
| `fallback`                  | Extension: fallback STT provider.                                                                           |
| `second_opinion`            | Extension: second-opinion STT provider (turns correction on).                                               |

`verbose_json` returns OpenAI's shape — `task`, `text`, `language`, `duration`,
`segments[]` (`id`, `start`, `end`, `text`), `words[]` (`word`, `start`,
`end`) — plus NeuroLink's extras: `raw`, `corrected`, `decisions`, `engine`,
`language_detected`, `steps` and `timings`. Errors use OpenAI's error shape.
The upload is bounded by the adapter's `bodyParser.rawMaxSize` (by default
`bodyParser.maxSize` when that is set, else 64 MB).

Route options (`registerAllRoutes(server, "/api", { transcribe: { ... } })`):

| Option              | Default | Meaning                                                                         |
| ------------------- | ------- | ------------------------------------------------------------------------------- |
| `allowedAudioRoots` | none    | Directories `audioPath` may read from; without it every `audioPath` is refused. |
| `maxAudioBytes`     | 50 MB   | Largest audio accepted from any source.                                         |
| `openaiBasePath`    | `""`    | Prefix of the OpenAI-compatible route.                                          |

### WebSocket `/v1/audio/transcriptions/stream`

The route adapters do not handle WebSocket upgrades, so the streaming endpoint
attaches to the Node HTTP server you own:

```typescript
import http from "node:http";
import { attachTranscribeWebSocket } from "@juspay/neurolink/server";

const server = http.createServer(handler);
const socket = await attachTranscribeWebSocket(server, neurolink, {
  authToken: process.env.TRANSCRIBE_WS_TOKEN, // Authorization: Bearer, or ?token=
});
server.listen(3000);
```

1. The first frame is **text**: a JSON config with the JSON route's fields
   minus the audio, plus `streaming` (for example `{ "language": "auto",
"streaming": { "sampleRate": 16000 } }`).
2. Then **binary** frames of PCM16LE mono audio at that sample rate.
3. A text frame `{ "type": "end" }`, or closing the socket, ends the audio.
   `{ "type": "output", "languages": ["es", "fr"] }` changes the output
   languages from the next utterance on; any other text frame ends the audio.

The server sends one JSON text frame per `TranscribeStreamEvent` and closes
with 1000 when the stream is done; an invalid config gets an `error` event and
close code 1008.

**Sessions over the socket.** A speaker connects to
`/v1/audio/transcriptions/stream?session=<id>&speaker=<name>` and uses the
protocol above. A listener connects to
`/v1/audio/transcriptions/stream/subscribe?session=<id>` (the
`subscribePath` option; `false` turns sessions off) and sends
`{ "type": "subscribe", "languages": ["es"], "speakers": ["alice"] }`, again at
any time to change them. Listeners get the speaker's events tagged with
`speaker`, and only the `output` events of their languages. A session lives
while a speaker or a listener is connected; the same auth token guards both
paths.

### OpenAI Realtime transcription: `/v1/realtime?intent=transcription`

The same live pipeline, behind OpenAI's Realtime transcription protocol, so a
client that already speaks it needs no NeuroLink adapter. With LiveKit Agents
(`livekit-plugins-openai`, tested on 1.3.11):

```python
from livekit.plugins import openai

stt = openai.STT(
    base_url="https://<neurolink-host>/v1",
    api_key="<NEUROLINK_SERVER_API_KEY>",
    model="neurolink-call",      # a profile name; see below
    use_realtime=True,
    detect_language=True,        # without it the plugin pins "en"
)
```

What the client sends:

| Event                                                                                                                | Handling                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session.update` (`session.type: "transcription"`, `session.audio.input`) or the beta `transcription_session.update` | Sets the rate (`format.rate`, default 24000; PCM16 only), the `model` (a profile), `language` and `prompt`. Answered with `session.updated` / `transcription_session.updated`. A running stream keeps the settings it started with. |
| `input_audio_buffer.append`                                                                                          | Base64 PCM16 mono at the session's rate.                                                                                                                                                                                            |
| `input_audio_buffer.commit`                                                                                          | Closes the open utterance. Not needed: an audio gap of 0.7 s (a muted mic) closes it too.                                                                                                                                           |
| `input_audio_buffer.clear`                                                                                           | Acknowledged with `input_audio_buffer.cleared`; audio already sent is kept.                                                                                                                                                         |

What the server sends, per utterance (one conversation item, `item_id`):

1. `input_audio_buffer.speech_started` (`audio_start_ms`).
2. `conversation.item.input_audio_transcription.delta`: the words two passes
   agreed on, as they settle. Clients append deltas, so words still changing
   are never sent and nothing has to be retracted.
3. `input_audio_buffer.speech_stopped` (`audio_end_ms`), then
   `input_audio_buffer.committed` (`previous_item_id`).
4. `conversation.item.input_audio_transcription.completed` (`transcript`): the
   corrected text, or the raw final after `correctionWaitMs`. It also carries
   `neurolink: { engine, language, language_detected, corrected }`.

Items complete strictly in order, because a client keeps one running text: a
later utterance's events are held until the earlier one has completed. An
utterance no engine could read completes with an empty transcript, which
clears the client's interim. Errors are OpenAI-shaped `error` events. NeuroLink
extras that a stock client ignores: `neurolink.final`, `neurolink.corrected`
and `neurolink.output` (output-language renderings).

**Profiles.** A realtime client can send only a model name, a language, a
prompt and turn-detection numbers, so everything else comes from a profile the
operator defines and the client names as its `model`:

```bash
NEUROLINK_STT_REALTIME_PROFILES='{
  "neurolink-call": {
    "provider": "bodhan",
    "model": "indic-transcribe-flex-mixed",
    "fallback": { "provider": "spark", "when": ["empty", "error"] },
    "dictionary": [{ "term": "NeuroLink", "heardAs": ["neuralink"] }],
    "correction": { "transliterate": "latin" },
    "clientLanguage": false
  }
}'
```

`model` is sent to the engine as is. A suffix such as `@en,hi` is read only by
the voice-bench `stt-aux` sidecar; any other server, LiteLLM included, treats
the whole string as a model name and refuses it. When the primary refuses
every pass, the fallback carries the call, and the server logs one error per
stream that names the failed engine.

A profile takes every field of the stream config (provider, model, fallback,
routing, dictionary, correction, output, streaming …) plus:

| Field                 | Default       | Meaning                                                                                                                                 |
| --------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `completed`           | `"corrected"` | `"final"` sends `completed` at once with the raw final (about 0.3 s sooner)                                                             |
| `correctionWaitMs`    | 3000          | Longest wait for the correction before `completed` goes out with the raw final                                                          |
| `clientLanguage`      | `true`        | Whether the client's `language` pins the transcription. Set `false` when clients may send a default such as LiveKit's `"en"`            |
| `clientTurnDetection` | `false`       | Whether `turn_detection.silence_duration_ms` sets the closing pause (minimum 300 ms); NeuroLink's endpointer keeps its 750 ms otherwise |

A `model` that names no profile but a configured STT provider (`bodhan`) uses
that provider; any other name, OpenAI's `gpt-4o-mini-transcribe` included, uses
the profile named `default`, or the server's defaults. The client's `prompt`
becomes correction context where the profile corrects; it is never sent to the
engine, which could echo it. `attachTranscribeWebSocket()` takes
`realtimeProfiles` (merged over the env) and `realtimePath` (`false` turns the
route off). Auth is the server's API key, as `Authorization: Bearer`, `?token=`,
or the `openai-insecure-api-key.<key>` subprotocol OpenAI's browser SDK sends.

### STT evaluation: `POST /v1/evals/stt`

A call can run two STTs on the same audio: the one people see (`primary`) and
one run only to be compared (`shadow`). The sender posts both transcripts here
in batches, and reads back how far apart they were per speaker. The server's
API key guards it like every other route.

```jsonc
POST /v1/evals/stt
{
  "call_id": "c-123", "room": "standup",
  "batch": 3,              // 1, 2, … per call; numbers may skip after a failed send
  "final": false,          // true on the batch sent once the last participant left
  "models": { "primary": "google", "shadow": "neurolink" },
  "segments": [{
    "id": "uuid",          // stable: a resend with the same id replaces it
    "source": "primary",   // or "shadow"
    "model": "google",
    "participant_identity": "alice", "participant_name": "Alice",
    "text": "we ship on friday", "language": "en-US",
    "start_time": 1792000000.0, "end_time": 1792000002.0,  // epoch s, or null
    "received_at": 1792000002.5                             // epoch s
  }]
}
→ 200 { "call_id": "c-123", "batch": 3, "final": false,
        "inserted": 1, "updated": 0, "ignored": 0,
        "segments": { "primary": 41, "shadow": 39 } }
```

A batch may hold up to 5,000 segments, and an empty final batch is valid.
Resends are idempotent: an id already held is replaced and counted as
`updated`. `GET /v1/evals/stt` lists calls, most recent first.
`GET /v1/evals/stt/:callId` returns the per-speaker comparison
(`?segments=true` adds the segments in time order):

| Field                                       | Meaning                                                                                   |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `speakers_compared[].disagreement`          | Word edit distance between the two STTs / the primary's words, on normalized text         |
| `speakers_compared[].phonetic_disagreement` | The same on phonetic word keys, so Devanagari against Latin for the same words agrees     |
| `speakers_compared[].primary` / `.shadow`   | `model`, `segments`, `words`, `languages` reported, `mean_latency_s` (final after speech) |
| `speakers_compared[].method`                | `full`, or `windowed` (5-minute windows) for a speaker over 4,000 words                   |
| `overall`                                   | Both measures summed over every speaker                                                   |

Neither side is ground truth: a disagreement says the STTs differ, not which
one is right. Calls live in memory unless `NEUROLINK_STT_EVAL_DIR` (or the
`evals.dir` route option) names a directory, where each batch is appended to
one JSON-lines file per call and replayed on start. `evals: false` in the
transcribe route options removes the routes.

**Langfuse.** With `NEUROLINK_STT_EVAL_LANGFUSE_PUBLIC_KEY` and
`NEUROLINK_STT_EVAL_LANGFUSE_SECRET_KEY` set (and
`NEUROLINK_STT_EVAL_LANGFUSE_BASE_URL`, default `https://cloud.langfuse.com`),
every accepted batch is also exported to that Langfuse project. These keys are
separate from NeuroLink's own `LANGFUSE_*`, so evaluations get a project of
their own. Only the server's environment sets this: no request field and no
route option can turn it off or send the data elsewhere.

| In Langfuse                                                            | What it holds                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Trace `stt-eval` (session = `call_id`)                                 | `room`, both models, `final`, batch and segment counts                               |
| Event `primary:<speaker>` / `shadow:<speaker>`                         | One per segment: its text as output; source, model, language and timings as metadata |
| Scores `stt_disagreement`, `stt_phonetic_disagreement`                 | The call overall                                                                     |
| Scores `stt_speaker_disagreement`, `stt_speaker_phonetic_disagreement` | One per speaker (named in the comment)                                               |

Ids derive from the call and segment ids, so a resent segment updates its event
and the scores are updated as batches arrive. The export runs in the
background: it never delays or fails the sender's batch, and a failure is only
logged.
