[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoOutputOptions

# Type Alias: VideoOutputOptions

> **VideoOutputOptions** = `object`

Defined in: [types/multimodal.ts:176](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L176)

Video output configuration options for video generation

Used with `output.video` in GenerateOptions when `output.mode` is "video".
Controls resolution, duration, aspect ratio, and audio settings for generated videos.

## Example

```typescript
const videoOptions: VideoOutputOptions = {
  resolution: "1080p",
  length: 8,
  aspectRatio: "16:9",
  audio: true,
};
```

## Properties

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/multimodal.ts:182](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L182)

Per-call cancellation signal forwarded to provider requests and polling
loops. When aborted, long-running video generation is interrupted and
the handler throws a non-retriable abort error.

---

### provider?

> `optional` **provider?**: [`VideoProviderName`](VideoProviderName.md)

Defined in: [types/multimodal.ts:192](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L192)

Override the video-gen provider. Defaults to `"vertex"` when omitted.

Registered providers are managed via `VideoProcessor.registerHandler`
(see src/lib/utils/videoProcessor.ts). Examples: `"vertex"`, `"kling"`,
`"runway"`, `"replicate"`. An unknown provider throws
`VIDEO_ERROR_CODES.PROVIDER_NOT_SUPPORTED` — there is no implicit
fallback to the LLM provider name.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/multimodal.ts:198](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L198)

Specific model to use within the provider. Provider-specific shape
(e.g. "veo-3.1-generate-001" for vertex; "atonamy/wan-alpha:..." for
replicate).

---

### resolution?

> `optional` **resolution?**: `"720p"` \| `"1080p"`

Defined in: [types/multimodal.ts:200](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L200)

Output resolution - "720p" (1280x720) or "1080p" (1920x1080)

---

### length?

> `optional` **length?**: `4` \| `5` \| `6` \| `8` \| `10` \| `number` & `object`

Defined in: [types/multimodal.ts:207](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L207)

Video duration in seconds. Provider-specific support — Vertex Veo
accepts 4 / 6 / 8 s, Kling and Runway accept 5 / 10 s, Replicate is
model-specific. The type intentionally enumerates the common shipped
values; pass any other positive number for custom Replicate models.

---

### aspectRatio?

> `optional` **aspectRatio?**: `"9:16"` \| `"16:9"` \| `"1:1"`

Defined in: [types/multimodal.ts:209](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L209)

Aspect ratio - "9:16" for portrait, "16:9" for landscape, "1:1" for square

---

### audio?

> `optional` **audio?**: `boolean`

Defined in: [types/multimodal.ts:211](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L211)

Enable audio generation (default: true)

---

### imageUrl?

> `optional` **imageUrl?**: `string`

Defined in: [types/multimodal.ts:218](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L218)

Publicly accessible URL of the input image.
Required by providers that do not accept inline base64 data (e.g. PiAPI Kling).
When provided and the provider requires a URL, this takes precedence over the
`image` Buffer argument passed to `generate()`.

---

### imageInputKey?

> `optional` **imageInputKey?**: `string`

Defined in: [types/multimodal.ts:230](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L230)

Replicate only: the input-schema key the model expects the image under.
Replicate image-to-video models disagree on this — e.g.
`minimax/hailuo-2.3-fast` requires `first_frame_image`,
`wan-video/wan-2.7-i2v` requires `first_frame` — and a model whose
required image key is missing fails the prediction on submit. Setting
this also switches the payload to the modern `duration`/`resolution`
field shape those models expect (instead of the legacy
`num_frames`/`fps`/`aspect_ratio` shape). Omit for models that accept
the default `image` key.

---

### credentials?

> `optional` **credentials?**: [`NeurolinkCredentials`](NeurolinkCredentials.md)

Defined in: [types/multimodal.ts:235](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L235)

Per-call provider credentials. Takes precedence over instance-level
credentials set at construction time, which in turn override env vars.
