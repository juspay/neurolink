[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildModelCatalog

# Function: buildModelCatalog()

> **buildModelCatalog**(`config?`): [`ClassifierRouterPoolMember`](../type-aliases/ClassifierRouterPoolMember.md)[]

Defined in: [routing/modelCatalog.ts:249](https://github.com/juspay/neurolink/blob/release/src/lib/routing/modelCatalog.ts#L249)

Build catalogue pool members from the registry.

Returns `[]` when the catalogue is disabled or nothing is reachable, which
leaves the declared pool as the only source — the pre-catalogue behaviour.

## Parameters

### config?

[`ClassifierCatalogConfig`](../type-aliases/ClassifierCatalogConfig.md)

## Returns

[`ClassifierRouterPoolMember`](../type-aliases/ClassifierRouterPoolMember.md)[]
