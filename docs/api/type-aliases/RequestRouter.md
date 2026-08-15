[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestRouter

# Type Alias: RequestRouter

> **RequestRouter** = (`context`) => [`RequestRouterDecision`](RequestRouterDecision.md) \| `Promise`\<[`RequestRouterDecision`](RequestRouterDecision.md)\>

Defined in: [types/requestRouter.ts:51](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/requestRouter.ts#L51)

A pluggable pre-call router function.

Receives a lightweight context snapshot and returns provider/model/region
overrides. May be async (e.g. to consult a remote config service).

## Parameters

### context

[`RouterInputContext`](RouterInputContext.md)

## Returns

[`RequestRouterDecision`](RequestRouterDecision.md) \| `Promise`\<[`RequestRouterDecision`](RequestRouterDecision.md)\>
