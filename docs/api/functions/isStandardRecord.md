[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isStandardRecord

# Function: isStandardRecord()

> **isStandardRecord**(`value`): `value is StandardRecord`

Defined in: [types/aliases.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/aliases.ts#L466)

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
