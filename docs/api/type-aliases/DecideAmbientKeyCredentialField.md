[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideAmbientKeyCredentialField

# Type Alias: DecideAmbientKeyCredentialField

> **DecideAmbientKeyCredentialField** = `object`

One credentials field a [DecideAmbientKeyGuard](DecideAmbientKeyGuard.md) reads: `credentials[key][field]`.

## Properties

### key

> **key**: `string`

The `NeurolinkCredentials` key of the slice, such as `openai`.

---

### field

> **field**: `"baseURL"`

The field in that slice. Only `baseURL` is read today.
