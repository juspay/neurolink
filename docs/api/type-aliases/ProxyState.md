[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyState

# Type Alias: ProxyState

> **ProxyState** = `object`

Defined in: [types/cli.ts:1018](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1018)

Persisted state for a running proxy instance

## Properties

### pid

> **pid**: `number`

Defined in: [types/cli.ts:1019](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1019)

---

### port

> **port**: `number`

Defined in: [types/cli.ts:1020](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1020)

---

### host

> **host**: `string`

Defined in: [types/cli.ts:1021](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1021)

---

### sharePort?

> `optional` **sharePort?**: `number`

Defined in: [types/cli.ts:1023](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1023)

Gate-only listener port, present only while this node lends capacity.

---

### strategy

> **strategy**: `string`

Defined in: [types/cli.ts:1024](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1024)

---

### startTime

> **startTime**: `string`

Defined in: [types/cli.ts:1025](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1025)

---

### ready?

> `optional` **ready?**: `boolean`

Defined in: [types/cli.ts:1026](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1026)

---

### readyAt?

> `optional` **readyAt?**: `string`

Defined in: [types/cli.ts:1027](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1027)

---

### healthPath?

> `optional` **healthPath?**: `string`

Defined in: [types/cli.ts:1028](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1028)

---

### statusPath?

> `optional` **statusPath?**: `string`

Defined in: [types/cli.ts:1029](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1029)

---

### envFile?

> `optional` **envFile?**: `string`

Defined in: [types/cli.ts:1030](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1030)

---

### fallbackChain?

> `optional` **fallbackChain?**: [`FallbackInfo`](FallbackInfo.md)[]

Defined in: [types/cli.ts:1032](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1032)

Fallback chain from proxy config (persisted at start time)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Defined in: [types/cli.ts:1034](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1034)

Normalized Anthropic account keys allowed for this proxy process.

---

### guardPid?

> `optional` **guardPid?**: `number`

Defined in: [types/cli.ts:1036](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1036)

Optional fail-open guard PID that reverts Claude settings if proxy dies

---

### updaterPid?

> `optional` **updaterPid?**: `number`

Defined in: [types/cli.ts:1038](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1038)

Dedicated updater PID for launchd-managed proxy installations.

---

### supervisorPid?

> `optional` **supervisorPid?**: `number`

Defined in: [types/cli.ts:1040](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1040)

Stable listener supervisor PID when requests are served by socket workers.

---

### managedBy?

> `optional` **managedBy?**: `"launchd"` \| `"manual"`

Defined in: [types/cli.ts:1042](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1042)

How the proxy was launched — "launchd" if installed as service, "manual" otherwise

---

### passthrough?

> `optional` **passthrough?**: `boolean`

Defined in: [types/cli.ts:1044](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1044)

Whether the proxy is running in transparent passthrough mode

---

### configGeneration?

> `optional` **configGeneration?**: `number`

Defined in: [types/cli.ts:1046](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1046)

Active hot-reload configuration generation.

---

### configLoadedAt?

> `optional` **configLoadedAt?**: `string`

Defined in: [types/cli.ts:1048](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1048)

Timestamp when the active configuration generation was loaded.

---

### lastConfigReloadError?

> `optional` **lastConfigReloadError?**: `string`

Defined in: [types/cli.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1050)

Last rejected hot-reload error, when any.

---

### configFile?

> `optional` **configFile?**: `string`

Defined in: [types/cli.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1052)

Absolute path watched for proxy routing configuration changes.
