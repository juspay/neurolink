[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Schema

# Type Alias: Schema\<OBJECT\>

> **Schema**\<`OBJECT`\> = `object`

## Type Parameters

### OBJECT

`OBJECT` = `unknown`

## Properties

### \_type

> `readonly` **\_type**: `OBJECT`

---

### jsonSchema

> `readonly` **jsonSchema**: `JSONSchema7`

---

### validate?

> `readonly` `optional` **validate?**: (`value`) => `SchemaValidationResult`\<`OBJECT`\> \| `PromiseLike`\<`SchemaValidationResult`\<`OBJECT`\>\>

#### Parameters

##### value

`unknown`

#### Returns

`SchemaValidationResult`\<`OBJECT`\> \| `PromiseLike`\<`SchemaValidationResult`\<`OBJECT`\>\>
