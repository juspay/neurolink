[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyState

# Type Alias: ProxyState

> **ProxyState** = `object`

Defined in: [types/cli.ts:1048](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1048)

Persisted state for a running proxy instance

## Properties

### pid

> **pid**: `number`

Defined in: [types/cli.ts:1049](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1049)

---

### port

> **port**: `number`

Defined in: [types/cli.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1050)

---

### host

> **host**: `string`

Defined in: [types/cli.ts:1051](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1051)

---

### sharePort?

> `optional` **sharePort?**: `number`

Defined in: [types/cli.ts:1053](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1053)

Gate-only listener port, present only while this node lends capacity.

---

### strategy

> **strategy**: `string`

Defined in: [types/cli.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1054)

---

### startTime

> **startTime**: `string`

Defined in: [types/cli.ts:1055](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1055)

---

### ready?

> `optional` **ready?**: `boolean`

Defined in: [types/cli.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1056)

---

### readyAt?

> `optional` **readyAt?**: `string`

Defined in: [types/cli.ts:1057](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1057)

---

### healthPath?

> `optional` **healthPath?**: `string`

Defined in: [types/cli.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1058)

---

### statusPath?

> `optional` **statusPath?**: `string`

Defined in: [types/cli.ts:1059](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1059)

---

### envFile?

> `optional` **envFile?**: `string`

Defined in: [types/cli.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1060)

---

### fallbackChain?

> `optional` **fallbackChain?**: [`FallbackInfo`](FallbackInfo.md)[]

Defined in: [types/cli.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1062)

Fallback chain from proxy config (persisted at start time)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Defined in: [types/cli.ts:1064](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1064)

Normalized Anthropic account keys allowed for this proxy process.

---

### guardPid?

> `optional` **guardPid?**: `number`

Defined in: [types/cli.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1066)

Optional fail-open guard PID that reverts Claude settings if proxy dies

---

### updaterPid?

> `optional` **updaterPid?**: `number`

Defined in: [types/cli.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1068)

Dedicated updater PID for launchd-managed proxy installations.

---

### supervisorPid?

> `optional` **supervisorPid?**: `number`

Defined in: [types/cli.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1070)

Stable listener supervisor PID when requests are served by socket workers.

---

### managedBy?

> `optional` **managedBy?**: `"launchd"` \| `"manual"`

Defined in: [types/cli.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1072)

How the proxy was launched — "launchd" if installed as service, "manual" otherwise

---

### passthrough?

> `optional` **passthrough?**: `boolean`

Defined in: [types/cli.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1074)

Whether the proxy is running in transparent passthrough mode

---

### configGeneration?

> `optional` **configGeneration?**: `number`

Defined in: [types/cli.ts:1076](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1076)

Active hot-reload configuration generation.

---

### configLoadedAt?

> `optional` **configLoadedAt?**: `string`

Defined in: [types/cli.ts:1078](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1078)

Timestamp when the active configuration generation was loaded.

---

### lastConfigReloadError?

> `optional` **lastConfigReloadError?**: `string`

Defined in: [types/cli.ts:1080](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1080)

Last rejected hot-reload error, when any.

---

### configFile?

> `optional` **configFile?**: `string`

Defined in: [types/cli.ts:1082](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1082)

Absolute path watched for proxy routing configuration changes.
