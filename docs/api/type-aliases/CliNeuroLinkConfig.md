[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliNeuroLinkConfig

# Type Alias: CliNeuroLinkConfig

> **CliNeuroLinkConfig** = `object`

Defined in: [types/cli.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1811)

Materialized shape of the CLI config parsed from `~/.neurolink/config.json`.
Matches the output of `ConfigSchema.parse()` defined in
`src/cli/commands/config.ts`. The schema is annotated with
`z.ZodType<CliNeuroLinkConfig>` so drift fails at compile time.

## Properties

### defaultProvider

> **defaultProvider**: [`CliConfigProvider`](CliConfigProvider.md)

Defined in: [types/cli.ts:1812](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1812)

---

### providers

> **providers**: `object`

Defined in: [types/cli.ts:1813](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1813)

#### openai?

> `optional` **openai?**: `object`

##### openai.apiKey?

> `optional` **apiKey?**: `string`

##### openai.model

> **model**: `string`

##### openai.baseURL?

> `optional` **baseURL?**: `string`

#### bedrock?

> `optional` **bedrock?**: `object`

##### bedrock.region?

> `optional` **region?**: `string`

##### bedrock.accessKeyId?

> `optional` **accessKeyId?**: `string`

##### bedrock.secretAccessKey?

> `optional` **secretAccessKey?**: `string`

##### bedrock.sessionToken?

> `optional` **sessionToken?**: `string`

##### bedrock.model

> **model**: `string`

#### vertex?

> `optional` **vertex?**: `object`

##### vertex.projectId?

> `optional` **projectId?**: `string`

##### vertex.location

> **location**: `string`

##### vertex.credentials?

> `optional` **credentials?**: `string`

##### vertex.serviceAccountKey?

> `optional` **serviceAccountKey?**: `string`

##### vertex.clientEmail?

> `optional` **clientEmail?**: `string`

##### vertex.privateKey?

> `optional` **privateKey?**: `string`

##### vertex.model

> **model**: `string`

#### anthropic?

> `optional` **anthropic?**: `object`

##### anthropic.apiKey?

> `optional` **apiKey?**: `string`

##### anthropic.model

> **model**: `string`

#### azure?

> `optional` **azure?**: `object`

##### azure.apiKey?

> `optional` **apiKey?**: `string`

##### azure.endpoint?

> `optional` **endpoint?**: `string`

##### azure.deploymentId?

> `optional` **deploymentId?**: `string`

##### azure.model

> **model**: `string`

#### google-ai?

> `optional` **google-ai?**: `object`

##### google-ai.apiKey?

> `optional` **apiKey?**: `string`

##### google-ai.model

> **model**: `string`

#### huggingface?

> `optional` **huggingface?**: `object`

##### huggingface.apiKey?

> `optional` **apiKey?**: `string`

##### huggingface.model

> **model**: `string`

#### ollama?

> `optional` **ollama?**: `object`

##### ollama.baseUrl

> **baseUrl**: `string`

##### ollama.model

> **model**: `string`

##### ollama.timeout

> **timeout**: `number`

#### mistral?

> `optional` **mistral?**: `object`

##### mistral.apiKey?

> `optional` **apiKey?**: `string`

##### mistral.model

> **model**: `string`

---

### profiles

> **profiles**: `Record`\<`string`, `unknown`\>

Defined in: [types/cli.ts:1843](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1843)

---

### preferences

> **preferences**: `object`

Defined in: [types/cli.ts:1844](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1844)

#### outputFormat

> **outputFormat**: `"text"` \| `"json"` \| `"yaml"`

#### temperature

> **temperature**: `number`

#### maxTokens?

> `optional` **maxTokens?**: `number`

#### enableLogging

> **enableLogging**: `boolean`

#### enableCaching

> **enableCaching**: `boolean`

#### cacheStrategy

> **cacheStrategy**: `"memory"` \| `"file"` \| `"redis"`

#### defaultEvaluationDomain?

> `optional` **defaultEvaluationDomain?**: `string`

#### enableAnalyticsByDefault

> **enableAnalyticsByDefault**: `boolean`

#### enableEvaluationByDefault

> **enableEvaluationByDefault**: `boolean`

---

### domains

> **domains**: `object`

Defined in: [types/cli.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1855)

#### healthcare

> **healthcare**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliHealthcareAnalyticsConfig`](CliHealthcareAnalyticsConfig.md)\>

#### analytics

> **analytics**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliAnalyticsDomainAnalyticsConfig`](CliAnalyticsDomainAnalyticsConfig.md)\>

#### finance

> **finance**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliFinanceAnalyticsConfig`](CliFinanceAnalyticsConfig.md)\>

#### ecommerce

> **ecommerce**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliEcommerceAnalyticsConfig`](CliEcommerceAnalyticsConfig.md)\>
