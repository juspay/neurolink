[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyInboundAuthOptions

# Type Alias: ProxyInboundAuthOptions

> **ProxyInboundAuthOptions** = `object`

Inbound authentication for a mounted proxy route group.

`token` is the bearer every caller must present (header
`x-neurolink-inbound-token`, or `Authorization: Bearer <token>`); when
omitted it is read from `NEUROLINK_PROXY_INBOUND_TOKEN`. With neither, the
routes serve any caller that reaches them, and the factory says so loudly
unless `allowUnauthenticated` records that the operator chose that
(loopback-only bind, or an authenticating reverse proxy in front).

## Properties

### token?

> `optional` **token?**: `string`

---

### allowUnauthenticated?

> `optional` **allowUnauthenticated?**: `boolean`
