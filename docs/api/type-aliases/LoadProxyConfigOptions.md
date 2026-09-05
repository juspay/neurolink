[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoadProxyConfigOptions

# Type Alias: LoadProxyConfigOptions

> **LoadProxyConfigOptions** = `object`

Defined in: [types/proxy.ts:505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L505)

Options for loadProxyConfig.

## Properties

### resolveEnv?

> `optional` **resolveEnv?**: `boolean`

Defined in: [types/proxy.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L507)

Resolve environment variables in string values (default: true)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [types/proxy.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L509)

Custom environment object (defaults to process.env)
