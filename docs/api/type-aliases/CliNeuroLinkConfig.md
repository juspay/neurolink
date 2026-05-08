[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliNeuroLinkConfig

# Type Alias: CliNeuroLinkConfig

> **CliNeuroLinkConfig** = `object`

Defined in: [types/cli.ts:1691](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1691)

Materialized shape of the CLI config parsed from `~/.neurolink/config.json`.
Matches the output of `ConfigSchema.parse()` defined in
`src/cli/commands/config.ts`. The schema is annotated with
`z.ZodType<CliNeuroLinkConfig>` so drift fails at compile time.

## Properties

### defaultProvider

> **defaultProvider**: [`CliConfigProvider`](CliConfigProvider.md)

Defined in: [types/cli.ts:1692](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1692)

---

### providers

> **providers**: `object`

Defined in: [types/cli.ts:1693](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1693)

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

Defined in: [types/cli.ts:1723](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1723)

---

### preferences

> **preferences**: `object`

Defined in: [types/cli.ts:1724](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1724)

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

Defined in: [types/cli.ts:1735](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1735)

#### healthcare

> **healthcare**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliHealthcareAnalyticsConfig`](CliHealthcareAnalyticsConfig.md)\>

#### analytics

> **analytics**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliAnalyticsDomainAnalyticsConfig`](CliAnalyticsDomainAnalyticsConfig.md)\>

#### finance

> **finance**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliFinanceAnalyticsConfig`](CliFinanceAnalyticsConfig.md)\>

#### ecommerce

> **ecommerce**: [`CliDomainConfig`](CliDomainConfig.md)\<[`CliEcommerceAnalyticsConfig`](CliEcommerceAnalyticsConfig.md)\>
