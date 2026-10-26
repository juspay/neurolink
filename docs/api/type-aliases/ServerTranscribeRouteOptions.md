[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerTranscribeRouteOptions

# Type Alias: ServerTranscribeRouteOptions

> **ServerTranscribeRouteOptions** = `object`

## Properties

### allowedAudioRoots?

> `optional` **allowedAudioRoots?**: `string`[]

Directories a request's `audioPath` may point into. Empty or omitted (the
default) refuses every `audioPath`: a server must not read its own disk
on a caller's say-so unless the operator names where.

---

### maxAudioBytes?

> `optional` **maxAudioBytes?**: `number`

Largest audio accepted, decoded, in bytes. Default 50 MB.

---

### openaiBasePath?

> `optional` **openaiBasePath?**: `string`

Prefix of the OpenAI-compatible route. Default `""`, so the route is
`/v1/audio/transcriptions` and an OpenAI client pointed at
`http://host:port/v1` works unchanged.

---

### evals?

> `optional` **evals?**: [`ServerSTTEvalOptions`](ServerSTTEvalOptions.md) \| `false`

The STT evaluation collector, `POST <openaiBasePath>/v1/evals/stt`.
Off by default: it stores every transcript a caller posts and lets any
caller read them back. Pass an options object (`{}` for the defaults) to
mount it, or set `NEUROLINK_STT_EVAL_ENABLED=1`; `false` keeps it off
whatever the environment says.
