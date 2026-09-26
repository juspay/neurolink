[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoOutputOptions

# Type Alias: VideoOutputOptions

> **VideoOutputOptions** = `object`

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

Per-call cancellation signal forwarded to provider requests and polling
loops. When aborted, long-running video generation is interrupted and
the handler throws a non-retriable abort error.

---

### provider?

> `optional` **provider?**: [`VideoProviderName`](VideoProviderName.md)

Override the video-gen provider. Defaults to `"vertex"` when omitted.

Registered providers are managed via `VideoProcessor.registerHandler`
(see src/lib/utils/videoProcessor.ts). Examples: `"vertex"`, `"kling"`,
`"runway"`, `"replicate"`. An unknown provider throws
`VIDEO_ERROR_CODES.PROVIDER_NOT_SUPPORTED` — there is no implicit
fallback to the LLM provider name.

---

### model?

> `optional` **model?**: `string`

Specific model to use within the provider. Provider-specific shape
(e.g. "veo-3.1-generate-001" for vertex; "atonamy/wan-alpha:..." for
replicate).

---

### resolution?

> `optional` **resolution?**: `"720p"` \| `"1080p"`

Output resolution - "720p" (1280x720) or "1080p" (1920x1080)

---

### length?

> `optional` **length?**: `4` \| `5` \| `6` \| `8` \| `10` \| `number` & `object`

Video duration in seconds. Provider-specific support — Vertex Veo
accepts 4 / 6 / 8 s, Kling and Runway accept 5 / 10 s, Replicate is
model-specific. The type intentionally enumerates the common shipped
values; pass any other positive number for custom Replicate models.

---

### aspectRatio?

> `optional` **aspectRatio?**: `"9:16"` \| `"16:9"` \| `"1:1"`

Aspect ratio - "9:16" for portrait, "16:9" for landscape, "1:1" for square

---

### audio?

> `optional` **audio?**: `boolean`

Enable audio generation (default: true)

---

### imageUrl?

> `optional` **imageUrl?**: `string`

Publicly accessible URL of the input image.
Required by providers that do not accept inline base64 data (e.g. PiAPI Kling).
When provided and the provider requires a URL, this takes precedence over the
`image` Buffer argument passed to `generate()`.

---

### imageInputKey?

> `optional` **imageInputKey?**: `string`

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

Per-call provider credentials. Takes precedence over instance-level
credentials set at construction time, which in turn override env vars.
