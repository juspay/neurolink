[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdateState

# Type Alias: UpdateState

> **UpdateState** = `object`

Defined in: [types/proxy.ts:3203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3203)

Persisted state for the proxy auto-update feature.

## Properties

### lastCheckAt

> **lastCheckAt**: `string`

Defined in: [types/proxy.ts:3204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3204)

---

### lastCheckVersion

> **lastCheckVersion**: `string`

Defined in: [types/proxy.ts:3205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3205)

---

### lastCheckAttemptAt?

> `optional` **lastCheckAttemptAt?**: `string`

Defined in: [types/proxy.ts:3207](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3207)

Last attempt is distinct from the last successful registry observation.

---

### lastCheckError?

> `optional` **lastCheckError?**: `string` \| `null`

Defined in: [types/proxy.ts:3208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3208)

---

### suppressedVersions

> **suppressedVersions**: `Record`\<`string`, [`SuppressedVersion`](SuppressedVersion.md)\>

Defined in: [types/proxy.ts:3209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3209)

---

### installedVersion?

> `optional` **installedVersion?**: `string` \| `null`

Defined in: [types/proxy.ts:3218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3218)

Last package version whose stable trampoline was successfully validated.

Optional because `UpdateState` is part of the published type surface and a
required addition would break every downstream object literal — and because
state files written before this field existed legitimately omit it.
`loadUpdateState()` always materializes it, so runtime readers see a value.

---

### lastUpdateAt

> **lastUpdateAt**: `string` \| `null`

Defined in: [types/proxy.ts:3219](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3219)

---

### lastUpdateVersion

> **lastUpdateVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3220)

---

### pendingRestartVersion

> **pendingRestartVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3222](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3222)

Installed by the updater but not yet confirmed as the running version.

---

### deferredUpdate

> **deferredUpdate**: \{ `version`: `string`; `since`: `string`; `updatedAt`: `string`; `reason`: `"waiting_for_quiet"` \| `"draining"` \| `"drain_timeout"` \| `"drain_unavailable"` \| `"activity_unavailable"`; `activeRequests`: `number` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:3224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3224)

Why an available update has not yet reached a safe install/restart boundary.

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `version`: `string`; `stage`: `"check"` \| `"install"` \| `"validation"` \| `"restart"` \| `"health"`; `message`: `string`; \} \| `null`

Defined in: [types/proxy.ts:3237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3237)

Last updater failure, retained until a successful update or replacement.
