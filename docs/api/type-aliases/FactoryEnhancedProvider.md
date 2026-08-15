[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FactoryEnhancedProvider

# Type Alias: FactoryEnhancedProvider

> **FactoryEnhancedProvider** = [`EnhancedProvider`](EnhancedProvider.md) & `object`

Defined in: [types/generate.ts:1162](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/generate.ts#L1162)

Factory-enhanced provider type
Supports domain configuration and streaming optimizations

## Type Declaration

### generateWithFactory()

> **generateWithFactory**(`options`): `Promise`\<[`GenerateResult`](GenerateResult.md)\>

#### Parameters

##### options

[`UnifiedGenerationOptions`](UnifiedGenerationOptions.md)

#### Returns

`Promise`\<[`GenerateResult`](GenerateResult.md)\>

### getDomainSupport()

> **getDomainSupport**(): `string`[]

#### Returns

`string`[]

### getStreamingCapabilities()

> **getStreamingCapabilities**(): `object`

#### Returns

`object`

##### supportsStreaming

> **supportsStreaming**: `boolean`

##### maxChunkSize

> **maxChunkSize**: `number`

##### bufferOptimizations

> **bufferOptimizations**: `boolean`
