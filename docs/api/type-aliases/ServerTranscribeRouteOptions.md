[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerTranscribeRouteOptions

# Type Alias: ServerTranscribeRouteOptions

> **ServerTranscribeRouteOptions** = `object`

Options for `createTranscribeRoutes()`.

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
