[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isVertexVideoConfigured

# Function: isVertexVideoConfigured()

> **isVertexVideoConfigured**(): `boolean`

Defined in: [adapters/video/vertexVideoHandler.ts:101](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/vertexVideoHandler.ts#L101)

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
