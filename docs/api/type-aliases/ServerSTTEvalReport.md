[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerSTTEvalReport

# Type Alias: ServerSTTEvalReport

> **ServerSTTEvalReport** = [`ServerSTTEvalCallSummary`](ServerSTTEvalCallSummary.md) & `object`

`GET /v1/evals/stt/:callId`.

## Type Declaration

### overall

> **overall**: `object`

Over every speaker: summed edit distances / summed primary words.

#### overall.disagreement

> **disagreement**: `number` \| `null`

#### overall.phonetic_disagreement

> **phonetic_disagreement**: `number` \| `null`

### speakers_compared

> **speakers_compared**: [`ServerSTTEvalComparison`](ServerSTTEvalComparison.md)[]

### segment_list?

> `optional` **segment_list?**: [`ServerSTTEvalSegment`](ServerSTTEvalSegment.md)[]

Present with `?segments=true`, ordered by time.
