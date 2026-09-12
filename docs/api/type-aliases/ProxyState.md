[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyState

# Type Alias: ProxyState

> **ProxyState** = `object`

Defined in: [types/cli.ts:1025](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1025)

Persisted state for a running proxy instance

## Properties

### pid

> **pid**: `number`

Defined in: [types/cli.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1026)

---

### port

> **port**: `number`

Defined in: [types/cli.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1027)

---

### host

> **host**: `string`

Defined in: [types/cli.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1028)

---

### sharePort?

> `optional` **sharePort?**: `number`

Defined in: [types/cli.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1030)

Gate-only listener port, present only while this node lends capacity.

---

### strategy

> **strategy**: `string`

Defined in: [types/cli.ts:1031](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1031)

---

### startTime

> **startTime**: `string`

Defined in: [types/cli.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1032)

---

### ready?

> `optional` **ready?**: `boolean`

Defined in: [types/cli.ts:1033](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1033)

---

### readyAt?

> `optional` **readyAt?**: `string`

Defined in: [types/cli.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1034)

---

### healthPath?

> `optional` **healthPath?**: `string`

Defined in: [types/cli.ts:1035](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1035)

---

### statusPath?

> `optional` **statusPath?**: `string`

Defined in: [types/cli.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1036)

---

### envFile?

> `optional` **envFile?**: `string`

Defined in: [types/cli.ts:1037](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1037)

---

### fallbackChain?

> `optional` **fallbackChain?**: [`FallbackInfo`](FallbackInfo.md)[]

Defined in: [types/cli.ts:1039](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1039)

Fallback chain from proxy config (persisted at start time)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Defined in: [types/cli.ts:1041](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1041)

Normalized Anthropic account keys allowed for this proxy process.

---

### guardPid?

> `optional` **guardPid?**: `number`

Defined in: [types/cli.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1043)

Optional fail-open guard PID that reverts Claude settings if proxy dies

---

### updaterPid?

> `optional` **updaterPid?**: `number`

Defined in: [types/cli.ts:1045](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1045)

Dedicated updater PID for launchd-managed proxy installations.

---

### supervisorPid?

> `optional` **supervisorPid?**: `number`

Defined in: [types/cli.ts:1047](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1047)

Stable listener supervisor PID when requests are served by socket workers.

---

### managedBy?

> `optional` **managedBy?**: `"launchd"` \| `"manual"`

Defined in: [types/cli.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1049)

How the proxy was launched — "launchd" if installed as service, "manual" otherwise

---

### passthrough?

> `optional` **passthrough?**: `boolean`

Defined in: [types/cli.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1051)

Whether the proxy is running in transparent passthrough mode

---

### configGeneration?

> `optional` **configGeneration?**: `number`

Defined in: [types/cli.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1053)

Active hot-reload configuration generation.

---

### configLoadedAt?

> `optional` **configLoadedAt?**: `string`

Defined in: [types/cli.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1055)

Timestamp when the active configuration generation was loaded.

---

### lastConfigReloadError?

> `optional` **lastConfigReloadError?**: `string`

Defined in: [types/cli.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1057)

Last rejected hot-reload error, when any.

---

### configFile?

> `optional` **configFile?**: `string`

Defined in: [types/cli.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1059)

Absolute path watched for proxy routing configuration changes.
