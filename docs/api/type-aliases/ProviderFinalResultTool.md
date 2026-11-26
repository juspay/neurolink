[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderFinalResultTool

# Type Alias: ProviderFinalResultTool

> **ProviderFinalResultTool** = `object`

The internal structured-output tool and the prompt texts that steer a model to it.

## Properties

### name

> **name**: `string`

---

### description

> **description**: `string`

---

### instructions

> **instructions**: `object`

System-prompt texts; `{tool}` is replaced with the tool name.

#### mustCall

> **mustCall**: `string`

#### callWhenReady

> **callWhenReady**: `string`

#### noLongerAvailable

> **noLongerAvailable**: `string`
