[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoadProxyConfigOptions

# Type Alias: LoadProxyConfigOptions

> **LoadProxyConfigOptions** = `object`

Defined in: [types/proxy.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L500)

Options for loadProxyConfig.

## Properties

### resolveEnv?

> `optional` **resolveEnv?**: `boolean`

Defined in: [types/proxy.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L502)

Resolve environment variables in string values (default: true)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [types/proxy.ts:504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L504)

Custom environment object (defaults to process.env)
