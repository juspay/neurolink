[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SchemaConversionContext

# Type Alias: SchemaConversionContext

> **SchemaConversionContext** = `object`

State threaded through one JSON-Schema-to-Zod conversion.

## Properties

### root

> **root**: [`SchemaConversionNode`](SchemaConversionNode.md)

The document root, for resolving local `$ref`s.

---

### refStack

> **refStack**: `Set`\<`string`\>

`$ref` targets on the current path, so a self-referential schema terminates.

---

### onRegexDrop

> **onRegexDrop**: (`drop`) => `void`

Called for each `pattern` the converter refused to compile.

#### Parameters

##### drop

[`SchemaRegexDrop`](SchemaRegexDrop.md)

#### Returns

`void`
