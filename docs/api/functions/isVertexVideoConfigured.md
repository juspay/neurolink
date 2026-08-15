[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isVertexVideoConfigured

# Function: isVertexVideoConfigured()

> **isVertexVideoConfigured**(): `boolean`

Defined in: [adapters/video/vertexVideoHandler.ts:101](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/adapters/video/vertexVideoHandler.ts#L101)

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
