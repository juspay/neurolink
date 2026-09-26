[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkPrimitive

# Type Alias: NetworkPrimitive

> **NetworkPrimitive** = `object`

Base primitive type for all orchestrable components

## Properties

### id

> **id**: `string`

Unique identifier

---

### type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

Type of primitive

---

### name

> **name**: `string`

Human-readable name

---

### description

> **description**: `string`

Description for routing decisions

---

### inputSchema?

> `optional` **inputSchema?**: `z.ZodSchema`

Input schema for validation

---

### outputSchema?

> `optional` **outputSchema?**: `z.ZodSchema`

Output schema for validation
