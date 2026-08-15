[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isStandardRecord

# Function: isStandardRecord()

> **isStandardRecord**(`value`): `value is StandardRecord`

Defined in: [types/aliases.ts:466](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/aliases.ts#L466)

Type guard for checking if value is a StandardRecord

## Parameters

### value

`unknown`

Value to check

## Returns

`value is StandardRecord`

True if value is a non-null object (but not an array)

## Example

```typescript
if (isStandardRecord(data)) {
  // TypeScript now knows data is Record<string, unknown>
  console.log(data.someProperty);
}
```
