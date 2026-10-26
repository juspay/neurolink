[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyStartArgs

# Type Alias: ProxyStartArgs

> **ProxyStartArgs** = `object`

Arguments accepted by `neurolink proxy start`

## Properties

### port?

> `optional` **port?**: `number`

---

### sharePort?

> `optional` **sharePort?**: `number`

Gate-only listener port. Defaults to `port + 1`.

---

### host?

> `optional` **host?**: `string`

---

### strategy?

> `optional` **strategy?**: `string`

---

### healthInterval?

> `optional` **healthInterval?**: `number`

---

### quiet?

> `optional` **quiet?**: `boolean`

---

### debug?

> `optional` **debug?**: `boolean`

---

### config?

> `optional` **config?**: `string`

---

### envFile?

> `optional` **envFile?**: `string`

---

### passthrough?

> `optional` **passthrough?**: `boolean`

---

### dev?

> `optional` **dev?**: `boolean`

---

### inboundToken?

> `optional` **inboundToken?**: `string`

Bearer every inbound caller must present; also `NEUROLINK_PROXY_INBOUND_TOKEN`.

---

### allowUnauthenticated?

> `optional` **allowUnauthenticated?**: `boolean`

Operator's explicit choice to bind off-loopback with no inbound auth.
