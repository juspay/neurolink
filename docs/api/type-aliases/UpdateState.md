[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdateState

# Type Alias: UpdateState

> **UpdateState** = `object`

Defined in: [types/proxy.ts:3143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3143)

Persisted state for the proxy auto-update feature.

## Properties

### lastCheckAt

> **lastCheckAt**: `string`

Defined in: [types/proxy.ts:3144](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3144)

---

### lastCheckVersion

> **lastCheckVersion**: `string`

Defined in: [types/proxy.ts:3145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3145)

---

### lastCheckAttemptAt?

> `optional` **lastCheckAttemptAt?**: `string`

Defined in: [types/proxy.ts:3147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3147)

Last attempt is distinct from the last successful registry observation.

---

### lastCheckError?

> `optional` **lastCheckError?**: `string` \| `null`

Defined in: [types/proxy.ts:3148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3148)

---

### suppressedVersions

> **suppressedVersions**: `Record`\<`string`, [`SuppressedVersion`](SuppressedVersion.md)\>

Defined in: [types/proxy.ts:3149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3149)

---

### installedVersion?

> `optional` **installedVersion?**: `string` \| `null`

Defined in: [types/proxy.ts:3158](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3158)

Last package version whose stable trampoline was successfully validated.

Optional because `UpdateState` is part of the published type surface and a
required addition would break every downstream object literal — and because
state files written before this field existed legitimately omit it.
`loadUpdateState()` always materializes it, so runtime readers see a value.

---

### lastUpdateAt

> **lastUpdateAt**: `string` \| `null`

Defined in: [types/proxy.ts:3159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3159)

---

### lastUpdateVersion

> **lastUpdateVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3160)

---

### pendingRestartVersion

> **pendingRestartVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3162)

Installed by the updater but not yet confirmed as the running version.

---

### deferredUpdate

> **deferredUpdate**: \{ `version`: `string`; `since`: `string`; `updatedAt`: `string`; `reason`: `"waiting_for_quiet"` \| `"draining"` \| `"drain_timeout"` \| `"drain_unavailable"` \| `"activity_unavailable"`; `activeRequests`: `number` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:3164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3164)

Why an available update has not yet reached a safe install/restart boundary.

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `version`: `string`; `stage`: `"check"` \| `"install"` \| `"validation"` \| `"restart"` \| `"health"`; `message`: `string`; \} \| `null`

Defined in: [types/proxy.ts:3177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3177)

Last updater failure, retained until a successful update or replacement.
