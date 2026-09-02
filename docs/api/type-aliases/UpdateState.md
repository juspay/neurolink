[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdateState

# Type Alias: UpdateState

> **UpdateState** = `object`

Defined in: [types/proxy.ts:2513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2513)

Persisted state for the proxy auto-update feature.

## Properties

### lastCheckAt

> **lastCheckAt**: `string`

Defined in: [types/proxy.ts:2514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2514)

---

### lastCheckVersion

> **lastCheckVersion**: `string`

Defined in: [types/proxy.ts:2515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2515)

---

### suppressedVersions

> **suppressedVersions**: `Record`\<`string`, [`SuppressedVersion`](SuppressedVersion.md)\>

Defined in: [types/proxy.ts:2516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2516)

---

### installedVersion?

> `optional` **installedVersion?**: `string` \| `null`

Defined in: [types/proxy.ts:2525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2525)

Last package version whose stable trampoline was successfully validated.

Optional because `UpdateState` is part of the published type surface and a
required addition would break every downstream object literal — and because
state files written before this field existed legitimately omit it.
`loadUpdateState()` always materializes it, so runtime readers see a value.

---

### lastUpdateAt

> **lastUpdateAt**: `string` \| `null`

Defined in: [types/proxy.ts:2526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2526)

---

### lastUpdateVersion

> **lastUpdateVersion**: `string` \| `null`

Defined in: [types/proxy.ts:2527](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2527)

---

### pendingRestartVersion

> **pendingRestartVersion**: `string` \| `null`

Defined in: [types/proxy.ts:2529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2529)

Installed by the updater but not yet confirmed as the running version.

---

### deferredUpdate

> **deferredUpdate**: \{ `version`: `string`; `since`: `string`; `updatedAt`: `string`; `reason`: `"waiting_for_quiet"` \| `"draining"` \| `"drain_timeout"` \| `"drain_unavailable"` \| `"activity_unavailable"`; `activeRequests`: `number` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:2531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2531)

Why an available update has not yet reached a safe install/restart boundary.

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `version`: `string`; `stage`: `"check"` \| `"install"` \| `"validation"` \| `"restart"` \| `"health"`; `message`: `string`; \} \| `null`

Defined in: [types/proxy.ts:2544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2544)

Last updater failure, retained until a successful update or replacement.
