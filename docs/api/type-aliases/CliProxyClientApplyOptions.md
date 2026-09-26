[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyClientApplyOptions

# Type Alias: CliProxyClientApplyOptions

> **CliProxyClientApplyOptions** = `object`

Options forwarded through `applyAllClients` into a configurator's `apply`.

## Properties

### configPath?

> `optional` **configPath?**: `string`

Absolute path of the proxy routing config this process loaded.
The Grok writer reads `routing.model-mappings` from this file so a
`proxy start --config` catalog matches `/v1/models`. Omit to use
`~/.neurolink/proxy-config.yaml`.
