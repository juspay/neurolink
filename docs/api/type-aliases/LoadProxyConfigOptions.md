[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoadProxyConfigOptions

# Type Alias: LoadProxyConfigOptions

> **LoadProxyConfigOptions** = `object`

Defined in: [types/proxy.ts:487](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L487)

Options for loadProxyConfig.

## Properties

### resolveEnv?

> `optional` **resolveEnv?**: `boolean`

Defined in: [types/proxy.ts:489](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L489)

Resolve environment variables in string values (default: true)

---

### env?

> `optional` **env?**: `Record`\<`string`, `string` \| `undefined`\>

Defined in: [types/proxy.ts:491](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L491)

Custom environment object (defaults to process.env)
