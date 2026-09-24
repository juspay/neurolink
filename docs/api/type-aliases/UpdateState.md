[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UpdateState

# Type Alias: UpdateState

> **UpdateState** = `object`

Defined in: [types/proxy.ts:3076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3076)

Persisted state for the proxy auto-update feature.

## Properties

### lastCheckAt

> **lastCheckAt**: `string`

Defined in: [types/proxy.ts:3077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3077)

---

### lastCheckVersion

> **lastCheckVersion**: `string`

Defined in: [types/proxy.ts:3078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3078)

---

### lastCheckAttemptAt?

> `optional` **lastCheckAttemptAt?**: `string`

Defined in: [types/proxy.ts:3080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3080)

Last attempt is distinct from the last successful registry observation.

---

### lastCheckError?

> `optional` **lastCheckError?**: `string` \| `null`

Defined in: [types/proxy.ts:3081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3081)

---

### suppressedVersions

> **suppressedVersions**: `Record`\<`string`, [`SuppressedVersion`](SuppressedVersion.md)\>

Defined in: [types/proxy.ts:3082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3082)

---

### installedVersion?

> `optional` **installedVersion?**: `string` \| `null`

Defined in: [types/proxy.ts:3091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3091)

Last package version whose stable trampoline was successfully validated.

Optional because `UpdateState` is part of the published type surface and a
required addition would break every downstream object literal — and because
state files written before this field existed legitimately omit it.
`loadUpdateState()` always materializes it, so runtime readers see a value.

---

### lastUpdateAt

> **lastUpdateAt**: `string` \| `null`

Defined in: [types/proxy.ts:3092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3092)

---

### lastUpdateVersion

> **lastUpdateVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3093)

---

### pendingRestartVersion

> **pendingRestartVersion**: `string` \| `null`

Defined in: [types/proxy.ts:3095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3095)

Installed by the updater but not yet confirmed as the running version.

---

### deferredUpdate

> **deferredUpdate**: \{ `version`: `string`; `since`: `string`; `updatedAt`: `string`; `reason`: `"waiting_for_quiet"` \| `"draining"` \| `"drain_timeout"` \| `"drain_unavailable"` \| `"activity_unavailable"`; `activeRequests`: `number` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:3097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3097)

Why an available update has not yet reached a safe install/restart boundary.

---

### lastFailure

> **lastFailure**: \{ `at`: `string`; `version`: `string`; `stage`: `"check"` \| `"install"` \| `"validation"` \| `"restart"` \| `"health"`; `message`: `string`; \} \| `null`

Defined in: [types/proxy.ts:3110](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3110)

Last updater failure, retained until a successful update or replacement.
