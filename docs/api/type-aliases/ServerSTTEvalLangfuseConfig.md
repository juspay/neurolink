[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalLangfuseConfig

# Type Alias: ServerSTTEvalLangfuseConfig

> **ServerSTTEvalLangfuseConfig** = `object`

Where the STT evaluation collector exports to Langfuse. Read only from the
server's environment (`NEUROLINK_STT_EVAL_LANGFUSE_*`): neither a request
nor a route option can redirect evaluation data.

## Properties

### publicKey

> **publicKey**: `string`

---

### secretKey

> **secretKey**: `string`

---

### baseUrl

> **baseUrl**: `string`

Default `https://cloud.langfuse.com`.

---

### environment?

> `optional` **environment?**: `string`
