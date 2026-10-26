[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitConfig

# Type Alias: RateLimitConfig

> **RateLimitConfig** = `object`

Rate limiting configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable rate limiting (default: true)

---

### windowMs?

> `optional` **windowMs?**: `number`

Time window in milliseconds (default: 15 minutes)

---

### maxRequests?

> `optional` **maxRequests?**: `number`

Maximum requests per window (default: 100)

---

### message?

> `optional` **message?**: `string`

Custom error message

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Skip rate limiting for certain paths. An entry matches the path itself and
everything under it at a segment boundary: `/api/health` matches
`/api/health` and `/api/health/live`, never `/api/healthz`.

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Custom key generator function. Without one, requests are counted per
client address: the TCP peer, or, with `trustProxy`, the client address a
trusted reverse proxy reports in `X-Forwarded-For`.

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`

---

### trustProxy?

> `optional` **trustProxy?**: `boolean`

Read the client address from `X-Forwarded-For` (default: `false`). Off,
the header is ignored and every request is counted against the TCP peer,
so a client cannot pick its own bucket by sending the header. Turn it on
only behind a reverse proxy that overwrites or appends to the header.

---

### trustedProxies?

> `optional` **trustedProxies?**: `string`[]

Addresses of the reverse proxies in front of this server, consulted with
`trustProxy`. Hops listed here are skipped from the right of
`X-Forwarded-For`, so the key is the last hop no trusted proxy added, i.e.
the client the outermost trusted proxy saw. Empty (the default) takes the
rightmost entry, the one the nearest proxy appended.
