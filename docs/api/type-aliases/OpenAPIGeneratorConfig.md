[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAPIGeneratorConfig

# Type Alias: OpenAPIGeneratorConfig

> **OpenAPIGeneratorConfig** = `object`

Configuration passed to the OpenAPI spec generator.

## Properties

### info?

> `optional` **info?**: `object`

#### title?

> `optional` **title?**: `string`

#### version?

> `optional` **version?**: `string`

#### description?

> `optional` **description?**: `string`

---

### servers?

> `optional` **servers?**: `object`[]

#### url

> **url**: `string`

#### description?

> `optional` **description?**: `string`

---

### includeSecurity?

> `optional` **includeSecurity?**: `boolean`

---

### basePath?

> `optional` **basePath?**: `string`

---

### additionalTags?

> `optional` **additionalTags?**: `object`[]

#### name

> **name**: `string`

#### description

> **description**: `string`

---

### customSchemas?

> `optional` **customSchemas?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

---

### routes?

> `optional` **routes?**: [`RouteDefinition`](RouteDefinition.md)[]
