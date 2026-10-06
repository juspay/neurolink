[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTProviderDescriptor

# Type Alias: STTProviderDescriptor

> **STTProviderDescriptor** = `object`

Metadata for one STT provider — the single source of truth for its name,
aliases, credentials, env vars and capabilities. Order in the list is
precedence for the default provider, exactly as with decision providers.

## Properties

### name

> **name**: `string`

---

### aliases?

> `optional` **aliases?**: readonly `string`[]

---

### label

> **label**: `string`

---

### credentialsKey

> **credentialsKey**: keyof [`STTCredentials`](STTCredentials.md)

---

### envVars

> **envVars**: readonly `string`[]

Env vars that configure it; the first present one makes it "configured".

---

### baseUrlEnv?

> `optional` **baseUrlEnv?**: `string`

---

### defaultModel?

> `optional` **defaultModel?**: `string`

---

### capabilities

> **capabilities**: [`STTProviderCapabilities`](STTProviderCapabilities.md)
