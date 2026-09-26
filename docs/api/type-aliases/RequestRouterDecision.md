[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestRouterDecision

# Type Alias: RequestRouterDecision

> **RequestRouterDecision** = `object`

The router's decision. Any field that is undefined means "keep whatever the
caller already configured" — returning `{}` is a valid no-op.

## Properties

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### region?

> `optional` **region?**: `string`

---

### reason?

> `optional` **reason?**: `string`

Optional human-readable reason, emitted at debug log level.
