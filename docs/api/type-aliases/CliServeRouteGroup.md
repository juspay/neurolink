[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliServeRouteGroup

# Type Alias: CliServeRouteGroup

> **CliServeRouteGroup** = `object`

Minimal route-group shape reflected at runtime by `neurolink serve routes`.
Named with a `CliServe` prefix to disambiguate from the richer RouteGroup
in server.ts (§Rule 9).

## Properties

### prefix

> **prefix**: `string`

---

### routes

> **routes**: `object`[]

#### method

> **method**: `string`

#### path

> **path**: `string`

#### description?

> `optional` **description?**: `string`
