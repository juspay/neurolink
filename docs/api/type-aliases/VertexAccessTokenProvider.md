[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexAccessTokenProvider

# Type Alias: VertexAccessTokenProvider

> **VertexAccessTokenProvider** = () => `Promise`\<`string` \| `null` \| `undefined`\>

Defined in: [types/providers.ts:2615](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2615)

Supplies the bearer token for a Vertex publisher call.

Exists so a test can stand in for the Google credential lookup: gaxios
resolves its transport to node-fetch rather than `globalThis.fetch`, so a
test that swaps the global cannot intercept the token exchange.

## Returns

`Promise`\<`string` \| `null` \| `undefined`\>
