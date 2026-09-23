[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdateCheckResult

# Type Alias: UpdateCheckResult

> **UpdateCheckResult** = `object` & \{ `checkSucceeded`: `true`; `checkError?`: `never`; \} \| \{ `checkSucceeded`: `false`; `checkError`: `string`; `updateAvailable`: `false`; \}

Defined in: [types/proxy.ts:3033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3033)

Outcome of a proxy auto-update version check against npm.

## Type Declaration

### currentVersion

> **currentVersion**: `string`

### latestVersion

> **latestVersion**: `string`

### updateAvailable

> **updateAvailable**: `boolean`
