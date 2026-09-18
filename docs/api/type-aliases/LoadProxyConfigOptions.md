[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoadProxyConfigOptions

# Type Alias: LoadProxyConfigOptions

> **LoadProxyConfigOptions** = `object`

Defined in: [types/proxy.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L506)

Options for loadProxyConfig.

## Properties

### resolveEnv?

> `optional` **resolveEnv?**: `boolean`

Defined in: [types/proxy.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L508)

Resolve environment variables in string values (default: true)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [types/proxy.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L510)

Custom environment object (defaults to process.env)
