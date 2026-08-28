[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliOpenCodeSnapshot

# Type Alias: CliOpenCodeSnapshot

> **CliOpenCodeSnapshot** = `object`

Defined in: [types/proxyClient.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L78)

Snapshot of the user's pre-existing OpenCode `provider.neurolink`.

Persisted to `~/.neurolink/opencode-proxy-snapshot.json`, never inside
`opencode.json` — OpenCode validates against a closed schema and rejects
unknown top-level keys, so an in-file snapshot made the CLI unstartable.

## Properties

### original

> **original**: `unknown`

Defined in: [types/proxyClient.ts:80](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L80)

The user's provider.neurolink before the proxy first touched it.

---

### written?

> `optional` **written?**: `unknown`

Defined in: [types/proxyClient.ts:82](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L82)

What the writer last wrote, so apply() can recognise its own block.
