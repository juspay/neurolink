[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ActionInputs

# Type Alias: ActionInputs

> **ActionInputs** = `object`

Complete action inputs parsed from GitHub Action

## Properties

### prompt

> **prompt**: `string`

---

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `"auto"`

---

### model?

> `optional` **model?**: `string`

---

### temperature

> **temperature**: `number`

---

### maxTokens

> **maxTokens**: `number`

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

---

### command

> **command**: `"generate"` \| `"stream"` \| `"batch"`

---

### providerKeys

> **providerKeys**: [`ActionProviderKeys`](ActionProviderKeys.md)

---

### awsConfig

> **awsConfig**: [`ActionAWSConfig`](ActionAWSConfig.md)

---

### googleCloudConfig

> **googleCloudConfig**: [`ActionGoogleCloudConfig`](ActionGoogleCloudConfig.md)

---

### multimodal

> **multimodal**: [`ActionMultimodalInputs`](ActionMultimodalInputs.md)

---

### thinking

> **thinking**: [`ActionThinkingConfig`](ActionThinkingConfig.md)

---

### enableAnalytics

> **enableAnalytics**: `boolean`

---

### enableEvaluation

> **enableEvaluation**: `boolean`

---

### outputFormat

> **outputFormat**: `"text"` \| `"json"`

---

### outputFile?

> `optional` **outputFile?**: `string`

---

### enableTools

> **enableTools**: `boolean`

---

### mcpConfigPath?

> `optional` **mcpConfigPath?**: `string`

---

### postComment

> **postComment**: `boolean`

---

### updateExistingComment

> **updateExistingComment**: `boolean`

---

### commentTag

> **commentTag**: `string`

---

### githubToken?

> `optional` **githubToken?**: `string`

---

### timeout

> **timeout**: `number`

---

### debug

> **debug**: `boolean`

---

### neurolinkVersion

> **neurolinkVersion**: `string`

---

### workingDirectory

> **workingDirectory**: `string`
