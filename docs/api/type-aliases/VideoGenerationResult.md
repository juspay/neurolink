[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoGenerationResult

# Type Alias: VideoGenerationResult

> **VideoGenerationResult** = `object`

Defined in: [types/multimodal.ts:230](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L230)

Result type for generated video content

Returned in `GenerateResult.video` when video generation is successful.
Contains the raw video buffer and associated metadata.

## Example

```typescript
const result = await neurolink.generate({
  input: { text: "Product showcase", images: [imageBuffer] },
  provider: "vertex",
  model: "veo-3.1",
  output: { mode: "video" },
});

if (result.video) {
  writeFileSync("output.mp4", result.video.data);
  console.log(`Duration: ${result.video.metadata?.duration}s`);
}
```

## Properties

### data

> **data**: `Buffer`

Defined in: [types/multimodal.ts:232](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L232)

Raw video data as Buffer

---

### mediaType

> **mediaType**: `"video/mp4"` \| `"video/webm"`

Defined in: [types/multimodal.ts:234](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L234)

Video media type

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/multimodal.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L236)

Video metadata

#### filename?

> `optional` **filename?**: `string`

Original filename if applicable

#### duration?

> `optional` **duration?**: `number`

Video duration in seconds

#### dimensions?

> `optional` **dimensions?**: `object`

Video dimensions

##### dimensions.width

> **width**: `number`

##### dimensions.height

> **height**: `number`

#### frameRate?

> `optional` **frameRate?**: `number`

Frame rate in fps

#### codec?

> `optional` **codec?**: `string`

Video codec used

#### model?

> `optional` **model?**: `string`

Model used for generation

#### provider?

> `optional` **provider?**: `string`

Provider used for generation

#### aspectRatio?

> `optional` **aspectRatio?**: `string`

Aspect ratio of the video

#### audioEnabled?

> `optional` **audioEnabled?**: `boolean`

Whether audio was enabled during generation

#### processingTime?

> `optional` **processingTime?**: `number`

Processing time in milliseconds

#### segmentCount?

> `optional` **segmentCount?**: `number`

Number of main segments in the video

#### transitionCount?

> `optional` **transitionCount?**: `number`

Number of transition clips generated

#### clipDuration?

> `optional` **clipDuration?**: `number`

Duration of each main clip in seconds

#### transitionDurations?

> `optional` **transitionDurations?**: `number`[]

Durations of each transition in seconds (one per transition)

#### segments?

> `optional` **segments?**: `object`[]

Per-segment metadata

#### transitions?

> `optional` **transitions?**: `object`[]

Per-transition metadata
