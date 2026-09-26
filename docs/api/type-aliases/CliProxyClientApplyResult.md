[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientApplyResult

# Type Alias: CliProxyClientApplyResult

> **CliProxyClientApplyResult** = `object`

Outcome of applying one configurator, for per-client CLI reporting.

## Properties

### id

> **id**: `string`

---

### displayName

> **displayName**: `string`

---

### applied

> **applied**: `boolean`

True only when the configurator actually wrote configuration.

---

### note?

> `optional` **note?**: `string`

Set when the write landed but is not yet in effect — see
CliProxyClientConfigurator.postApplyNote. Callers must render this; a
silent note is the failure it exists to prevent.

---

### error?

> `optional` **error?**: `Error`

Present when the configurator threw; the caller decides how loud to be.
