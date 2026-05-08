[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ActionInputs

# Type Alias: ActionInputs

> **ActionInputs** = `object`

Defined in: [types/action.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L75)

Complete action inputs parsed from GitHub Action

## Properties

### prompt

> **prompt**: `string`

Defined in: [types/action.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L77)

---

### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `"auto"`

Defined in: [types/action.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L80)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/action.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L81)

---

### temperature

> **temperature**: `number`

Defined in: [types/action.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L84)

---

### maxTokens

> **maxTokens**: `number`

Defined in: [types/action.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L85)

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/action.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L86)

---

### command

> **command**: `"generate"` \| `"stream"` \| `"batch"`

Defined in: [types/action.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L89)

---

### providerKeys

> **providerKeys**: [`ActionProviderKeys`](ActionProviderKeys.md)

Defined in: [types/action.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L92)

---

### awsConfig

> **awsConfig**: [`ActionAWSConfig`](ActionAWSConfig.md)

Defined in: [types/action.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L95)

---

### googleCloudConfig

> **googleCloudConfig**: [`ActionGoogleCloudConfig`](ActionGoogleCloudConfig.md)

Defined in: [types/action.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L96)

---

### multimodal

> **multimodal**: [`ActionMultimodalInputs`](ActionMultimodalInputs.md)

Defined in: [types/action.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L99)

---

### thinking

> **thinking**: [`ActionThinkingConfig`](ActionThinkingConfig.md)

Defined in: [types/action.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L102)

---

### enableAnalytics

> **enableAnalytics**: `boolean`

Defined in: [types/action.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L105)

---

### enableEvaluation

> **enableEvaluation**: `boolean`

Defined in: [types/action.ts:106](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L106)

---

### outputFormat

> **outputFormat**: `"text"` \| `"json"`

Defined in: [types/action.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L109)

---

### outputFile?

> `optional` **outputFile?**: `string`

Defined in: [types/action.ts:110](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L110)

---

### enableTools

> **enableTools**: `boolean`

Defined in: [types/action.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L113)

---

### mcpConfigPath?

> `optional` **mcpConfigPath?**: `string`

Defined in: [types/action.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L114)

---

### postComment

> **postComment**: `boolean`

Defined in: [types/action.ts:117](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L117)

---

### updateExistingComment

> **updateExistingComment**: `boolean`

Defined in: [types/action.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L118)

---

### commentTag

> **commentTag**: `string`

Defined in: [types/action.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L119)

---

### githubToken?

> `optional` **githubToken?**: `string`

Defined in: [types/action.ts:120](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L120)

---

### timeout

> **timeout**: `number`

Defined in: [types/action.ts:123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L123)

---

### debug

> **debug**: `boolean`

Defined in: [types/action.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L124)

---

### neurolinkVersion

> **neurolinkVersion**: `string`

Defined in: [types/action.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L125)

---

### workingDirectory

> **workingDirectory**: `string`

Defined in: [types/action.ts:126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/action.ts#L126)
