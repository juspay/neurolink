[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliServeRouteGroup

# Type Alias: CliServeRouteGroup

> **CliServeRouteGroup** = `object`

Defined in: [types/cli.ts:1973](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1973)

Minimal route-group shape reflected at runtime by `neurolink serve routes`.
Named with a `CliServe` prefix to disambiguate from the richer RouteGroup
in server.ts (§Rule 9).

## Properties

### prefix

> **prefix**: `string`

Defined in: [types/cli.ts:1974](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1974)

---

### routes

> **routes**: `object`[]

Defined in: [types/cli.ts:1975](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1975)

#### method

> **method**: `string`

#### path

> **path**: `string`

#### description?

> `optional` **description?**: `string`
