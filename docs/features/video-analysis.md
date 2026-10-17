---
title: "Video Analysis"
description: Attach a video to generate() or stream(). Gemini receives the clip itself, audio included, up to a 14 MB inline ceiling; every other provider receives timestamped keyframes, with optional audio transcription.
keywords:
  [
    video-analysis,
    video,
    multimodal,
    gemini,
    native-video,
    keyframes,
    transcription,
    media-processing,
    visual-analysis,
  ]
---

# Video Analysis

Attach a video file to `generate()` or `stream()` and ask about it. What the model receives depends on the provider:

- **Gemini (Google AI Studio and Vertex AI)** receives the clip itself, inline, with its audio track. It sees continuous motion and hears the speech.
- **Every other provider** receives a metadata summary, timestamped keyframes as ordinary images, and any embedded subtitle track. It sees a handful of stills and hears nothing, unless you ask for a transcript with `--transcribe-audio`.

Video analysis suits screen recordings in particular: checking whether a workflow worked, finding the moment a UI went wrong, or comparing two recordings. The prompts in this guide ask for a logical audit of that kind. The audit style comes from your prompt; the SDK imposes no report format.

For the cross-modality overview (images, PDFs, audio, video) see the [Multimodal guide](multimodal.md).

---

## Quick Start

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Describe this video", videoFiles: ["./clip.mp4"] },
  provider: "vertex",
  model: "gemini-2.5-flash",
});

console.log(result.content);
```

`input.videoFiles` and `input.files` are equivalent for video: `videoFiles` is folded into `files` before file detection runs. Each entry is a local path, a `Buffer` or a URL. Only a local path or a `Buffer` can be sent to Gemini as the clip itself; a URL is fetched for keyframes and metadata alone (see [What qualifies a clip](#what-qualifies-a-clip)).

```bash
neurolink generate "Describe this video" --video ./clip.mp4 --provider google-ai
```

---

## How It Works

1. **Detection.** The file type is recognized from the file's leading bytes as well as its extension (MP4 and MOV by their `ftyp` box, AVI by its RIFF header, and so on). Through `generate()`, `stream()` and the CLI a file can be at most 100 MB. On the Gemini providers a larger file is refused with an error-level log line (`File too large: ... (max: 100.00 MB)`, printed even without `--debug`) and the request goes on without it, and without any file listed after it in the same call: the model receives no `## Video File` section at all.
2. **Processing.** `VideoProcessor` reads the duration, resolution, codecs, frame rate and bitrate, extracts timestamped keyframes with ffmpeg, extracts the first embedded subtitle track if there is one, and, only if you ask, transcribes the speech. The summary becomes a `## Video File` section in the prompt text and the keyframes are attached as images, each labelled with the moment it was sampled.
3. **Delivery.** If the provider can take video, the clip itself is added to the request as inline data, in addition to the summary and the keyframes. If it cannot, or the clip does not qualify, the model works from the summary and the keyframes alone.

A video that cannot be processed at all (a corrupt file, say) does not fail the request: the model receives a short placeholder describing the attachment.

---

## Native Delivery to Gemini

Gemini accepts video inline, and takes the audio track with it. Sending the file itself needs no ffmpeg, so on a machine without it Gemini still receives the whole clip. Keyframes and the metadata summary are still attached when they could be produced.

### Which providers

The capability table is `VIDEO_PROVIDER_CONFIGS`, keyed by provider name or alias:

| Provider names                                                                                                                                                                                                  | Delivery       | Inline ceiling | Longest clip | Hears audio |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- | ------------ | ----------- |
| `vertex`, `google-vertex`, `googlevertex`, `google-ai-studio`, `googleaistudio`, `google-ai`, `googleai`, `gemini`                                                                                              | Native, inline | 14 MB          | 3600 s       | yes         |
| `openai`, `azure`, `anthropic`, `bedrock`, `amazon-bedrock`, `mistral`, `litellm`, `openrouter`, `openai-compatible`, `huggingface`, `sagemaker`, `deepseek`, `nvidia-nim`, `lmstudio`, `cerebras`, `sambanova` | Keyframes      | none           | none         | no          |
| `ollama`, `llamacpp`, `llama-cpp`                                                                                                                                                                               | Keyframes      | none           | none         | no          |

Two details matter:

- A Vertex request for a model whose id contains `claude` is routed to the Anthropic SDK, which never sees a video part, so it gets the keyframe row, not the Gemini one.
- A provider that is not in the table keeps the keyframe behavior. The table says nothing about whether such a provider understands the frames; `getVideoProviderConfig()` returns `null` for it, and `supportsNativeVideo()` reads that as `false`.

### What qualifies a clip

All of these must hold, checked per clip:

1. **Source.** The clip must be a local file path or a `Buffer` (or an object with a `buffer`). A URL is fetched for keyframes and the metadata summary only; its bytes are not kept for delivery, so it never goes to Gemini as a clip. This case is not reported as a fallback: no warning is logged and no reason is given, so a URL entry that you expected to be heard simply arrives as keyframes. Download the file first to send it whole.
2. **Container.** Gemini reads these inline: `video/mp4`, `video/mpeg`, `video/mpg`, `video/mov`, `video/quicktime`, `video/avi`, `video/x-msvideo`, `video/x-flv`, `video/webm`, `video/wmv`, `video/x-ms-wmv` and `video/3gpp`. Anything else, MKV for example, falls back to keyframes. There is no transcode step: re-encoding a long recording inside a generation request costs minutes of CPU, for a payload that would usually breach the ceiling anyway.
3. **Size.** The 14 MB ceiling is one budget for the whole request, counted in source bytes, not a per-clip limit. Before a clip ships, its bytes are added to the source bytes of every inline part already in the request, which means images (the keyframes among them), PDFs, audio and any clip accepted earlier. With nothing else attached that is the clip's own size.
4. **Duration.** At most 3600 s. A clip whose duration could not be measured is not refused for it.

Why 14 MB when Gemini documents 20 MB: inline data travels as base64 in a JSON body, which costs 4 bytes per 3, and the 20 MB limit covers the whole request, prompt and system instructions included. 14 MB of source encodes to about 18.7 MB, leaving headroom. 15 MB would encode to exactly 20.0 MB and leave none.

### Falling back to keyframes

A clip that does not qualify is not an error. It is left out of the request, the model works from the summary and keyframes, and a warning names the reason. The one exception is a URL source (see above), which is silent. Warnings are only printed in debug mode (`--debug`, or `NEUROLINK_DEBUG=true` for the SDK), so run with one of those to see it:

```text
Sending keyframes instead of the clip for big.mp4: the clip is 15.0MB, which would bring this request's inline attachments to 15.0MB, over the 14MB inline ceiling shared by the whole request for google-ai-studio.
```

The keyframes already in the request count against the budget, which is why that line speaks of the request's inline attachments. The reasons you can see are:

- `<provider> does not accept video attachments`
- `<mime type> is not a container <provider> reads inline`
- `the clip is X MB, over the 14MB inline ceiling for <provider>`, or, when other inline parts already used part of the budget, `the clip is X MB, which would bring this request's inline attachments to Y MB, over the 14MB inline ceiling shared by the whole request for <provider>`
- `the clip runs N s, over the 3600s ceiling for <provider>`

A fallback loses the clip's audio, because keyframes carry none. If the speech matters, add `--transcribe-audio` (see [Audio transcription](#audio-transcription)) or shorten or compress the clip below the ceiling.

Clips above 14 MB are not uploaded through the Gemini Files API. That is a separate piece of work that has not been done, so the ceiling is a hard edge today.

### Asking before you send

The capability table is exported, so a caller can check a provider and a clip without making a request:

```typescript
import {
  canDeliverVideoNatively,
  estimateVideoTokens,
  getVideoProviderConfig,
  isNativeVideoMimeType,
  supportsNativeVideo,
  VIDEO_PROVIDER_CONFIGS,
} from "@juspay/neurolink";

supportsNativeVideo("google-ai"); // true
supportsNativeVideo("openai"); // false
getVideoProviderConfig("not-a-provider"); // null: not described, not "takes frames"
isNativeVideoMimeType("video/x-matroska"); // false

// Reasons come back as strings you can log verbatim.
canDeliverVideoNatively("google-ai", {
  buffer: Buffer.alloc(20 * 1024 * 1024),
  filename: "big.mp4",
  mimeType: "video/mp4",
});
// { deliver: false, reason: "the clip is 20.0MB, over the 14MB inline ceiling for google-ai" }

// Duration drives the native price; frame count drives the keyframe price.
estimateVideoTokens({ provider: "google-ai", durationSec: 60 }); // 15,600
estimateVideoTokens({ provider: "openai", durationSec: 60, frameCount: 8 }); // 2,000
```

`estimateVideoTokens` prices a native clip at 260 tokens per second, a keyframe at 250 tokens, and a minute of transcribed speech at 400. It is a budgeting estimate, not a quote.

---

## Keyframes

Every other provider, and Gemini when a clip falls back, works from keyframes.

- **Cadence.** Without an explicit `frames`, the interval between frames follows the clip's duration:

  | Clip length  | One frame every |
  | ------------ | --------------- |
  | up to 10 s   | 1 s             |
  | up to 30 s   | 2 s             |
  | up to 2 min  | 3 s             |
  | up to 10 min | 6 s             |
  | up to 30 min | 20 s            |
  | longer       | 60 s            |

  The total is capped at 100 frames; if a tier would produce more, the interval widens so the frames still cover the whole clip. The count does not depend on the provider. The `recommendedFrameCount` in the capability table (16, 8 or 4) is only what `estimateVideoTokens` assumes when you give it no `frameCount`; it does not set how many frames are extracted.

- **Size.** Frames are scaled to fit within 768 by 768 pixels, keeping the aspect ratio and never enlarging, then encoded as JPEG at quality 80 unless you set `quality` or `format`.
- **Timestamps.** Each frame carries the time ffmpeg actually sampled it at, in its image label and in a `## Keyframes` list in the prompt, so "what happens at 0:30?" has an answer.
- **Subtitles.** The first embedded subtitle track is extracted as plain text and added under `## Subtitles / Captions`, up to 10,000 characters. It is included whether or not you transcribe.
- **No ffmpeg, no frames.** Frame extraction shells out to ffmpeg, which comes from the optional `ffmpeg-static` dependency or your `PATH`. Without it a keyframe provider receives the metadata summary and nothing visual, and no error is raised. Native Gemini delivery is unaffected.

---

## CLI Flags and `videoOptions`

The flags are available on `generate`, `stream` and `batch`. `--video` attaches the clip (`input.videoFiles`). The other four flags each map to one field of the `videoOptions` object that `generate()` and `stream()` accept (type `VideoProcessorOptions`).

| CLI flag                  | SDK field                      | Default                               | Meaning                                                                                                                                                                                                    |
| ------------------------- | ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--video <path>`          | `input.videoFiles`             | none                                  | Attach a video; repeatable. `--file <path>` works too, but is not available on `batch`, where it would collide with the prompts-file positional.                                                           |
| `--video-frames <n>`      | `videoOptions.frames`          | chosen from the duration, at most 100 | Keyframe budget. An explicit `n` is spread evenly across the whole clip and clamped to 100; zero, negative or non-numeric values are ignored. It is a ceiling: a clip with sparse frames can return fewer. |
| `--video-quality <1-100>` | `videoOptions.quality`         | 80                                    | Encoder quality for keyframes. Rounded and clamped to 1 to 100.                                                                                                                                            |
| `--video-format <format>` | `videoOptions.format`          | `jpeg`                                | Keyframe encoding: `jpeg` or `png`. On Google AI Studio (`google-ai`) use `jpeg`: its PNG keyframes are currently sent labelled `image/jpeg`. Vertex AI labels PNG correctly.                              |
| `--transcribe-audio`      | `videoOptions.transcribeAudio` | `false`                               | Transcribe the clip's speech and include it as text.                                                                                                                                                       |

`--video-frames` and `--video-quality` deliberately have no CLI default, so an unset flag leaves the choice to the processor. The three keyframe options and the transcript shape what the model reads in the prompt and the attached images. They do not change the clip that goes to Gemini, which is sent as is.

```typescript
const result = await neurolink.generate({
  input: { text: "Describe each scene", files: ["./demo.mp4"] },
  provider: "openai",
  videoOptions: {
    frames: 16, // keyframe budget, clamped to 100
    quality: 90, // 1-100, default 80
    format: "jpeg", // "jpeg" | "png", default "jpeg" (use jpeg on Google AI Studio)
    transcribeAudio: true, // default false
  },
});
```

```bash
neurolink generate "Describe each scene" --video ./demo.mp4 \
  --provider openai --video-frames 16 --video-quality 90 --video-format jpeg
```

---

## Audio Transcription

Gemini hears the audio track of a clip it receives natively, so it does not need a transcript. Transcription is for the others: a recorded standup or a narrated demo reaches a keyframe provider with its entire spoken content missing, and "summarize this meeting" would be answered from a few screenshots. It also helps when a Gemini clip falls back to keyframes.

Set `--transcribe-audio`, or `videoOptions.transcribeAudio: true`. It is off by default because it costs an ffmpeg pass plus a speech-to-text call, and most attached video is silent screen capture. The flag does not look at the provider: on Gemini, with the clip delivered natively, it still spends the ffmpeg pass and the speech-to-text call and adds the transcript to the prompt next to the audio Gemini already hears. Leave it off there.

**What happens.** ffmpeg drops the video stream and writes the audio as mono 16 kHz MP3 (16-bit PCM WAV for an engine that does not read MP3). That goes to the speech-to-text engine, and the result is added to the prompt under `## Spoken Audio (transcribed)`, truncated at 20,000 characters. It is labelled as a machine transcription and kept apart from `## Subtitles / Captions`, so the model can tell the two apart when both exist.

**Which engine.** The one named by `NEUROLINK_STT_PROVIDER`; otherwise the first configured hosted engine in this order: OpenAI-compatible Whisper (`OPENAI_STT_API_KEY` or `OPENAI_API_KEY`), Deepgram, ElevenLabs, Google Speech-to-Text, Azure Speech; otherwise the built-in local engine. Video uses the same engine selection as audio files and `neurolink.transcribe()`. See the [transcribe guide](../features/transcribe.md) for configuration.

**Limits.** The extracted audio must be 25 MB or less. Audio extraction times out after 180 s and one transcription request after 120 s.

**Failure is not fatal.** Transcription is best effort. When it cannot run, the request still succeeds with the keyframes and metadata, and a warning (printed in debug mode, like the delivery warnings above) says why:

```text
[VideoProcessor] No transcript for demo.mp4: the video has no audio track. The model will receive the keyframes and metadata only.
```

The reasons are: no audio track; the transcription backend could not be loaded or is not configured; the audio track could not be extracted, or was empty; the extracted audio is over 25 MB; the engine returned an empty transcript (silence, music); or the request failed. The reason is also available as `transcriptionSkippedReason` on the processed video.

Audio files attached on their own (`.mp3`, `.wav`, `.m4a` and so on) are transcribed automatically, with no flag, whenever an engine is available. See the [Audio Input guide](audio-input.md).

---

## Usage

### CLI Usage

Analyze any video file with a natural language prompt.

```bash
# Basic video analysis
neurolink generate "Analyze the login workflow in this video" \
  --video ./recordings/screen-capture.mp4 \
  --provider vertex \
  --model gemini-2.5-flash
```

### SDK Usage

Integrate video analysis into your TypeScript/JavaScript projects.

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: {
    text: "Dissect the logical progression of this activity",
    files: ["./examples/tutorial.mp4"],
  },
  provider: "vertex",
  model: "gemini-2.5-flash",
});

console.log(result.content);
```

#### Advanced SDK Examples

**Custom Model Configuration**
Fine-tune the analysis by adjusting token limits and temperature.

```typescript
const result = await neurolink.generate({
  input: {
    text: "Perform a detailed audit of the checkout workflow",
    files: ["payment-flow.mov"],
  },
  model: "gemini-2.5-flash",
  maxTokens: 3000,
  temperature: 0.2, // Lower temperature for more consistent logic auditing
  provider: "vertex",
});
```

**Disabling Tool Interference**
By default, the model might try to use available tools. For pure video analysis, you can disable them.

```typescript
const result = await neurolink.generate({
  input: {
    text: "Analyze the video timeline",
    files: ["video.mp4"],
  },
  disableTools: true,
});
```

**A provider without video support, with speech**
Send keyframes and a transcript to a provider that cannot take a clip.

```typescript
const result = await neurolink.generate({
  input: {
    text: "Summarize what was said and what was shown",
    videoFiles: ["./standup.mp4"],
  },
  provider: "openai",
  videoOptions: { frames: 12, transcribeAudio: true },
});
```

---

## Examples

### 1. UI/UX Bug Analysis

Identify why a user is unable to complete a form or where the interface is misleading.

**Prompt**: "Find why the user is getting stuck at the payment step. Look for validation errors or hidden UI elements."

### 2. Silent Failure Detection

Detect cases where an action is taken but the system provides no feedback (no loaders, no success messages).

**Prompt**: "Audit the 'Submit' button click. Is there a visual 'bond' between the click and the next state? Report any lag or missing loading indicators."

### 3. Workflow Validation

Verify if a complex multi-step process follows the intended business logic.

**Prompt**: "Trace the logical progression from 'Item Selection' to 'Checkout'. Does every state change correspond to a user action?"

### 4. Comparison Analysis

Compare two recordings to find discrepancies in behavior.

**Prompt**: "Compare these two clips. The first one is the expected behavior and the second one has a bug. Identify the exact frame or timestamp where the logic deviates."

---

## Command Gallery

Quick CLI recipes for common tasks.

### Debug delivery and fallback decisions

Full technical detail, including whether the clip or keyframes were sent and why:

```bash
neurolink generate "Audit this video" --video bug.mp4 --debug
```

### Use a specific model

```bash
neurolink generate "Analyze logic" --video demo.mov --model gemini-2.5-flash
```

### Force a specific provider

```bash
neurolink generate "Extract patterns" --video test.mp4 --provider vertex
```

### Keyframe provider with more frames and the speech

```bash
neurolink generate "What is said and shown?" --video talk.mp4 \
  --provider openai --video-frames 24 --transcribe-audio
```

---

## Best Practices

- **Prefer Gemini for anything with sound or fast motion.** Only the native path sees what happens between frames and hears the audio.
- **Keep clips under the ceiling.** A recording that is a few megabytes at most travels whole; a longer one falls back to keyframes. Trimming to the relevant stretch, or re-encoding at a lower bitrate, keeps it on the native path. Remember the budget is shared with every other inline attachment in the same request.
- **Frame depth.** On the keyframe path, short videos (under 10 s) get one frame per second and long ones are sampled more sparsely. Set `--video-frames` to spend your frame budget evenly across a clip you care about.
- **Add a transcript only where it helps.** `--transcribe-audio` is for providers that cannot hear the clip. It is not provider-aware, so on Gemini it only adds a redundant transcript and a speech-to-text call.
- **Prompt precision.** Guide the model with specific questions about the activity, and ask for the structure you want (a timeline, an action-reaction table, a verdict) in the prompt.
- **Format.** The analysis is returned as text in `result.content`, making it easy to store, display, or pipe to other tools.
