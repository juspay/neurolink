[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SafeDownloadOptions

# Type Alias: SafeDownloadOptions

> **SafeDownloadOptions** = `object`

## Properties

### maxBytes

> **maxBytes**: `number`

Hard cap on response size in bytes. Pass MAX_VIDEO_BYTES/MAX_AUDIO_BYTES/MAX_IMAGE_BYTES from sizeGuard.

---

### label

> **label**: `string`

Human-readable identifier used in error messages (e.g. "HeyGen video").

---

### signal?

> `optional` **signal?**: `AbortSignal`

Optional abort signal for caller-driven cancellation.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Optional HTTP transfer timeout (ms), covering headers and body after URL validation. Default: 60_000.

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Headers for the FIRST request only. Never replayed to a redirect target:
a credential meant for one host must not be handed to the host it
redirects to. Default: none.

---

### maxRedirects?

> `optional` **maxRedirects?**: `number`

How many redirect hops to follow, each re-validated by the SSRF guard and
sent without the caller's headers. Default 0: a 3xx is refused, which is
the server path's behaviour.

---

### allowInsecure?

> `optional` **allowInsecure?**: `boolean`

Accept `http:` as well as `https:`. Default false (HTTPS only).

---

### allowPrivateNetwork?

> `optional` **allowPrivateNetwork?**: `boolean`

Skip the private/loopback/link-local/metadata range check. The connection
is still pinned to the resolved addresses. Default false.

---

### method?

> `optional` **method?**: `"GET"` \| `"HEAD"`

`HEAD` returns the headers with an empty body. Default `GET`.
