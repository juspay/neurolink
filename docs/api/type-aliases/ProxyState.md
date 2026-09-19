[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyState

# Type Alias: ProxyState

> **ProxyState** = `object`

Defined in: [types/cli.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1040)

Persisted state for a running proxy instance

## Properties

### pid

> **pid**: `number`

Defined in: [types/cli.ts:1041](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1041)

---

### port

> **port**: `number`

Defined in: [types/cli.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1042)

---

### host

> **host**: `string`

Defined in: [types/cli.ts:1043](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1043)

---

### sharePort?

> `optional` **sharePort?**: `number`

Defined in: [types/cli.ts:1045](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1045)

Gate-only listener port, present only while this node lends capacity.

---

### strategy

> **strategy**: `string`

Defined in: [types/cli.ts:1046](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1046)

---

### startTime

> **startTime**: `string`

Defined in: [types/cli.ts:1047](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1047)

---

### ready?

> `optional` **ready?**: `boolean`

Defined in: [types/cli.ts:1048](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1048)

---

### readyAt?

> `optional` **readyAt?**: `string`

Defined in: [types/cli.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1049)

---

### healthPath?

> `optional` **healthPath?**: `string`

Defined in: [types/cli.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1050)

---

### statusPath?

> `optional` **statusPath?**: `string`

Defined in: [types/cli.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1051)

---

### envFile?

> `optional` **envFile?**: `string`

Defined in: [types/cli.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1052)

---

### fallbackChain?

> `optional` **fallbackChain?**: [`FallbackInfo`](FallbackInfo.md)[]

Defined in: [types/cli.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1054)

Fallback chain from proxy config (persisted at start time)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Defined in: [types/cli.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1056)

Normalized Anthropic account keys allowed for this proxy process.

---

### guardPid?

> `optional` **guardPid?**: `number`

Defined in: [types/cli.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1058)

Optional fail-open guard PID that reverts Claude settings if proxy dies

---

### updaterPid?

> `optional` **updaterPid?**: `number`

Defined in: [types/cli.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1060)

Dedicated updater PID for launchd-managed proxy installations.

---

### supervisorPid?

> `optional` **supervisorPid?**: `number`

Defined in: [types/cli.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1062)

Stable listener supervisor PID when requests are served by socket workers.

---

### managedBy?

> `optional` **managedBy?**: `"launchd"` \| `"manual"`

Defined in: [types/cli.ts:1064](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1064)

How the proxy was launched — "launchd" if installed as service, "manual" otherwise

---

### passthrough?

> `optional` **passthrough?**: `boolean`

Defined in: [types/cli.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1066)

Whether the proxy is running in transparent passthrough mode

---

### configGeneration?

> `optional` **configGeneration?**: `number`

Defined in: [types/cli.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1068)

Active hot-reload configuration generation.

---

### configLoadedAt?

> `optional` **configLoadedAt?**: `string`

Defined in: [types/cli.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1070)

Timestamp when the active configuration generation was loaded.

---

### lastConfigReloadError?

> `optional` **lastConfigReloadError?**: `string`

Defined in: [types/cli.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1072)

Last rejected hot-reload error, when any.

---

### configFile?

> `optional` **configFile?**: `string`

Defined in: [types/cli.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1074)

Absolute path watched for proxy routing configuration changes.
