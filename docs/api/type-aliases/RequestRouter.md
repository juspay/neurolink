[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestRouter

# Type Alias: RequestRouter

> **RequestRouter** = (`context`) => [`RequestRouterDecision`](RequestRouterDecision.md) \| `Promise`\<[`RequestRouterDecision`](RequestRouterDecision.md)\>

Defined in: [types/requestRouter.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/requestRouter.ts#L51)

A pluggable pre-call router function.

Receives a lightweight context snapshot and returns provider/model/region
overrides. May be async (e.g. to consult a remote config service).

## Parameters

### context

[`RouterInputContext`](RouterInputContext.md)

## Returns

[`RequestRouterDecision`](RequestRouterDecision.md) \| `Promise`\<[`RequestRouterDecision`](RequestRouterDecision.md)\>
