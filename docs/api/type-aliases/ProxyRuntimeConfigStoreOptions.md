[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeConfigStoreOptions

# Type Alias: ProxyRuntimeConfigStoreOptions

> **ProxyRuntimeConfigStoreOptions** = `object`

Constructor options for the proxy runtime configuration store.

## Properties

### configPath

> **configPath**: `string`

---

### configRequired

> **configRequired**: `boolean`

---

### envFilePath?

> `optional` **envFilePath?**: `string`

---

### envFileRequired?

> `optional` **envFileRequired?**: `boolean`

---

### baseEnv

> **baseEnv**: `Record`\<`string`, `string` \| `undefined`\>

---

### strategyOverride?

> `optional` **strategyOverride?**: [`ProxyStartStrategy`](ProxyStartStrategy.md)

---

### passthrough

> **passthrough**: `boolean`

---

### watchIntervalMs?

> `optional` **watchIntervalMs?**: `number`

---

### watchDebounceMs?

> `optional` **watchDebounceMs?**: `number`
