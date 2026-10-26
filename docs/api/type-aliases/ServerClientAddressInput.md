[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerClientAddressInput

# Type Alias: ServerClientAddressInput

> **ServerClientAddressInput** = `object`

What `resolveClientAddress()` needs to name the client of a request.

## Properties

### remoteAddress

> **remoteAddress**: `string` \| `undefined`

The TCP peer, as the runtime reports it.

---

### forwardedFor

> **forwardedFor**: `string` \| `undefined`

The request's `X-Forwarded-For` header, if any.

---

### trustProxy

> **trustProxy**: `boolean`

Consult `forwardedFor` at all.

---

### trustedProxies

> **trustedProxies**: readonly `string`[]

Reverse proxies whose hops are skipped from the right of `forwardedFor`.
