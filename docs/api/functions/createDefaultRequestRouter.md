[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createDefaultRequestRouter

# Function: createDefaultRequestRouter()

> **createDefaultRequestRouter**(`config?`): [`RequestRouter`](../type-aliases/RequestRouter.md)

Defined in: [routing/requestRouter.ts:73](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/requestRouter.ts#L73)

Creates a heuristic `RequestRouter` from a `DefaultRequestRouterConfig`.

## Parameters

### config?

[`DefaultRequestRouterConfig`](../type-aliases/DefaultRequestRouterConfig.md)

— optional tier overrides; built-in defaults apply when omitted.

## Returns

[`RequestRouter`](../type-aliases/RequestRouter.md)

a synchronous `RequestRouter` function (satisfies the async signature).
