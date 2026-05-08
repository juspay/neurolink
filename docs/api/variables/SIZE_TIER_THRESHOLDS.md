[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SIZE_TIER_THRESHOLDS

# Variable: SIZE_TIER_THRESHOLDS

> `const` **SIZE_TIER_THRESHOLDS**: `object`

Defined in: [types/fileReference.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L262)

## Type Declaration

### TINY_MAX

> `readonly` **TINY_MAX**: `number`

< 10 KB: inline in prompt

### SMALL_MAX

> `readonly` **SMALL_MAX**: `number`

10 KB – 100 KB: full load with truncation

### MEDIUM_MAX

> `readonly` **MEDIUM_MAX**: `number`

100 KB – 5 MB: outline + on-demand

### LARGE_MAX

> `readonly` **LARGE_MAX**: `number`

5 MB – 100 MB: streaming + chunked summarization

### HUGE_MAX

> `readonly` **HUGE_MAX**: `number`

100 MB – 2 GB: reference only
