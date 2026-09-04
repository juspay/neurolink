[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FactoryEnhancedProvider

# Type Alias: FactoryEnhancedProvider

> **FactoryEnhancedProvider** = [`EnhancedProvider`](EnhancedProvider.md) & `object`

Defined in: [types/generate.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1214)

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
