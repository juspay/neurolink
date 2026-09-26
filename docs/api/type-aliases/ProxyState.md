[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyState

# Type Alias: ProxyState

> **ProxyState** = `object`

Persisted state for a running proxy instance

## Properties

### pid

> **pid**: `number`

---

### port

> **port**: `number`

---

### host

> **host**: `string`

---

### sharePort?

> `optional` **sharePort?**: `number`

Gate-only listener port, present only while this node lends capacity.

---

### strategy

> **strategy**: `string`

---

### startTime

> **startTime**: `string`

---

### ready?

> `optional` **ready?**: `boolean`

---

### readyAt?

> `optional` **readyAt?**: `string`

---

### healthPath?

> `optional` **healthPath?**: `string`

---

### statusPath?

> `optional` **statusPath?**: `string`

---

### envFile?

> `optional` **envFile?**: `string`

---

### fallbackChain?

> `optional` **fallbackChain?**: [`FallbackInfo`](FallbackInfo.md)[]

Fallback chain from proxy config (persisted at start time)

---

### accountAllowlist?

> `optional` **accountAllowlist?**: `string`[]

Normalized Anthropic account keys allowed for this proxy process.

---

### guardPid?

> `optional` **guardPid?**: `number`

Optional fail-open guard PID that reverts Claude settings if proxy dies

---

### updaterPid?

> `optional` **updaterPid?**: `number`

Dedicated updater PID for launchd-managed proxy installations.

---

### supervisorPid?

> `optional` **supervisorPid?**: `number`

Stable listener supervisor PID when requests are served by socket workers.

---

### managedBy?

> `optional` **managedBy?**: `"launchd"` \| `"manual"`

How the proxy was launched — "launchd" if installed as service, "manual" otherwise

---

### passthrough?

> `optional` **passthrough?**: `boolean`

Whether the proxy is running in transparent passthrough mode

---

### configGeneration?

> `optional` **configGeneration?**: `number`

Active hot-reload configuration generation.

---

### configLoadedAt?

> `optional` **configLoadedAt?**: `string`

Timestamp when the active configuration generation was loaded.

---

### lastConfigReloadError?

> `optional` **lastConfigReloadError?**: `string`

Last rejected hot-reload error, when any.

---

### configFile?

> `optional` **configFile?**: `string`

Absolute path watched for proxy routing configuration changes.
