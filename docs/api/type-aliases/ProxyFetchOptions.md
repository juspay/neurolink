[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyFetchOptions

# Type Alias: ProxyFetchOptions

> **ProxyFetchOptions** = `object`

Options for `createProxyFetch`.

## Properties

### strict?

> `optional` **strict?**: `boolean`

`true`: a request whose proxy attempt fails (the proxy is unreachable or
refuses it, its URL is unparsable, or it is a SOCKS URL, which is not
supported) fails with that error instead of being retried over a direct
connection. Omitted: `NEUROLINK_PROXY_STRICT` decides, and with that unset
the request falls back to a direct connection, as it always has.
