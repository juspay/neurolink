[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdateState

# Type Alias: UpdateState

> **UpdateState** = `object`

Defined in: [types/proxy.ts:2491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2491)

Persisted state for the proxy auto-update feature.

## Properties

### lastCheckAt

> **lastCheckAt**: `string`

Defined in: [types/proxy.ts:2492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2492)

---

### lastCheckVersion

> **lastCheckVersion**: `string`

Defined in: [types/proxy.ts:2493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2493)

---

### suppressedVersions

> **suppressedVersions**: `Record`\<`string`, [`SuppressedVersion`](SuppressedVersion.md)\>

Defined in: [types/proxy.ts:2494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2494)

---

### installedVersion?

> `optional` **installedVersion?**: `string` \| `null`

Defined in: [types/proxy.ts:2503](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2503)

Last package version whose stable trampoline was successfully validated.

Optional because `UpdateState` is part of the published type surface and a
required addition would break every downstream object literal — and because
state files written before this field existed legitimately omit it.
`loadUpdateState()` always materializes it, so runtime readers see a value.

---

### lastUpdateAt

> **lastUpdateAt**: `string` \| `null`

Defined in: [types/proxy.ts:2504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2504)

---

### lastUpdateVersion

> **lastUpdateVersion**: `string` \| `null`

Defined in: [types/proxy.ts:2505](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2505)

---

### pendingRestartVersion

> **pendingRestartVersion**: `string` \| `null`

Defined in: [types/proxy.ts:2507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2507)

Installed by the updater but not yet confirmed as the running version.

---

### deferredUpdate

> **deferredUpdate**: \{ `version`: `string`; `since`: `string`; `updatedAt`: `string`; `reason`: `"waiting_for_quiet"` \| `"draining"` \| `"drain_timeout"` \| `"drain_unavailable"` \| `"activity_unavailable"`; `activeRequests`: `number` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:2509](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2509)

Why an available update has not yet reached a safe install/restart boundary.

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `version`: `string`; `stage`: `"check"` \| `"install"` \| `"validation"` \| `"restart"` \| `"health"`; `message`: `string`; \} \| `null`

Defined in: [types/proxy.ts:2522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2522)

Last updater failure, retained until a successful update or replacement.
