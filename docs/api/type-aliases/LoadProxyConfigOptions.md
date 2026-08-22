[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoadProxyConfigOptions

# Type Alias: LoadProxyConfigOptions

> **LoadProxyConfigOptions** = `object`

Defined in: [types/proxy.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L499)

Options for loadProxyConfig.

## Properties

### resolveEnv?

> `optional` **resolveEnv?**: `boolean`

Defined in: [types/proxy.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L501)

Resolve environment variables in string values (default: true)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [types/proxy.ts:503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L503)

Custom environment object (defaults to process.env)
