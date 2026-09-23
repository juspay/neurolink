[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdateState

# Type Alias: UpdateState

> **UpdateState** = `object`

Defined in: [types/proxy.ts:3053](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3053)

Persisted state for the proxy auto-update feature.

## Properties

### lastCheckAt

> **lastCheckAt**: `string`

Defined in: [types/proxy.ts:3054](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3054)

---

### lastCheckVersion

> **lastCheckVersion**: `string`

Defined in: [types/proxy.ts:3055](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3055)

---

### lastCheckAttemptAt?

> `optional` **lastCheckAttemptAt?**: `string`

Defined in: [types/proxy.ts:3057](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3057)

Last attempt is distinct from the last successful registry observation.

---

### lastCheckError?

> `optional` **lastCheckError?**: `string` \| `null`

Defined in: [types/proxy.ts:3058](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3058)

---

### suppressedVersions

> **suppressedVersions**: `Record`\<`string`, [`SuppressedVersion`](SuppressedVersion.md)\>

Defined in: [types/proxy.ts:3059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3059)

---

### installedVersion?

> `optional` **installedVersion?**: `string` \| `null`

Defined in: [types/proxy.ts:3068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3068)

Last package version whose stable trampoline was successfully validated.

Optional because `UpdateState` is part of the published type surface and a
required addition would break every downstream object literal — and because
state files written before this field existed legitimately omit it.
`loadUpdateState()` always materializes it, so runtime readers see a value.

---

### lastUpdateAt

> **lastUpdateAt**: `string` \| `null`

Defined in: [types/proxy.ts:3069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3069)

---

### lastUpdateVersion

> **lastUpdateVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3070)

---

### pendingRestartVersion

> **pendingRestartVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3072)

Installed by the updater but not yet confirmed as the running version.

---

### deferredUpdate

> **deferredUpdate**: \{ `version`: `string`; `since`: `string`; `updatedAt`: `string`; `reason`: `"waiting_for_quiet"` \| `"draining"` \| `"drain_timeout"` \| `"drain_unavailable"` \| `"activity_unavailable"`; `activeRequests`: `number` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:3074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3074)

Why an available update has not yet reached a safe install/restart boundary.

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `version`: `string`; `stage`: `"check"` \| `"install"` \| `"validation"` \| `"restart"` \| `"health"`; `message`: `string`; \} \| `null`

Defined in: [types/proxy.ts:3087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3087)

Last updater failure, retained until a successful update or replacement.
