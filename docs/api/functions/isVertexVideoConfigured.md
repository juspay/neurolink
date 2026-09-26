[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isVertexVideoConfigured

# Function: isVertexVideoConfigured()

> **isVertexVideoConfigured**(): `boolean`

Check if Vertex AI is configured for video generation

## Returns

`boolean`

True if Google Cloud credentials are available

## Example

```typescript
if (!isVertexVideoConfigured()) {
  console.error(
    "Set GOOGLE_APPLICATION_CREDENTIALS to enable video generation",
  );
}
```
