[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoadProxyConfigOptions

# Type Alias: LoadProxyConfigOptions

> **LoadProxyConfigOptions** = `object`

Defined in: [types/proxy.ts:537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L537)

Options for loadProxyConfig.

## Properties

### resolveEnv?

> `optional` **resolveEnv?**: `boolean`

Defined in: [types/proxy.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L539)

Resolve environment variables in string values (default: true)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [types/proxy.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L541)

Custom environment object (defaults to process.env)
