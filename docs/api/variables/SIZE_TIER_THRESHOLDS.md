[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SIZE_TIER_THRESHOLDS

# Variable: SIZE_TIER_THRESHOLDS

> `const` **SIZE_TIER_THRESHOLDS**: `object`

Defined in: [types/fileReference.ts:262](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/fileReference.ts#L262)

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
