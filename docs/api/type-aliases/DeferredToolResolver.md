[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeferredToolResolver

# Type Alias: DeferredToolResolver

> **DeferredToolResolver** = (`name`) => [`Tool`](Tool.md) \| `undefined`

Defined in: [types/toolResolution.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolResolution.ts#L88)

Resolver attached (under a symbol key, invisible to enumeration) to the
hot tool record by `partitionToolsForDiscovery`. Given a deferred tool's
name it hydrates that tool into the record, persists the session pin, and
returns it — `undefined` when the name is not in the deferred catalog.
Native agent loops call it on a dispatch miss so a model that calls a
cataloged tool directly (without `search_tools` first) still succeeds.

## Parameters

### name

`string`

## Returns

[`Tool`](Tool.md) \| `undefined`
