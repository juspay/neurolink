[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FactoryEnhancedProvider

# Type Alias: FactoryEnhancedProvider

> **FactoryEnhancedProvider** = [`EnhancedProvider`](EnhancedProvider.md) & `object`

Defined in: [types/generate.ts:790](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/generate.ts#L790)

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
