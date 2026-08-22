[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenService

# Class: ImageGenService

Defined in: [image-gen/ImageGenService.ts:68](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L68)

Image generation service for AI-powered image creation

Uses NeuroLink SDK to generate images with support for:

- Multiple providers (Vertex AI, OpenAI, etc.)
- Reference images for style guidance
- PDF documents for contextual generation
- Configurable aspect ratios and styles

## Examples

```typescript
const service = new ImageGenService();
const result = await service.generate({
  prompt: "A cute robot playing chess",
});
```

```typescript
const service = new ImageGenService({
  defaultProvider: "openai",
  defaultModel: "dall-e-3",
  timeout: 60000,
});
```

## Constructors

### Constructor

> **new ImageGenService**(`config?`): `ImageGenService`

Defined in: [image-gen/ImageGenService.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L78)

Create a new ImageGenService instance

#### Parameters

##### config?

`Partial`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

Optional configuration overrides

#### Returns

`ImageGenService`

## Methods

### generate()

> **generate**(`options`): `Promise`\<[`ImageGenResult`](../type-aliases/ImageGenResult.md)\>

Defined in: [image-gen/ImageGenService.ts:127](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L127)

Generate an image from a text prompt

#### Parameters

##### options

[`ImageGenOptions`](../type-aliases/ImageGenOptions.md)

Generation options including prompt, style, etc.

#### Returns

`Promise`\<[`ImageGenResult`](../type-aliases/ImageGenResult.md)\>

Promise resolving to generation result

#### Examples

```typescript
const result = await service.generate({
  prompt: "A futuristic cityscape",
});
```

```typescript
const referenceImage = fs.readFileSync("style-reference.jpg");
const result = await service.generate({
  prompt: "A portrait in this style",
  images: [referenceImage],
  aspectRatio: "1:1",
});
```

---

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [image-gen/ImageGenService.ts:344](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L344)

Check if image generation is enabled

#### Returns

`boolean`

---

### getModel()

> **getModel**(): `string`

Defined in: [image-gen/ImageGenService.ts:351](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L351)

Get the default model

#### Returns

`string`

---

### getProvider()

> **getProvider**(): `string`

Defined in: [image-gen/ImageGenService.ts:358](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L358)

Get the default provider

#### Returns

`string`

---

### getConfig()

> **getConfig**(): `Readonly`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

Defined in: [image-gen/ImageGenService.ts:365](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L365)

Get the service configuration

#### Returns

`Readonly`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

---

### getInstanceId()

> **getInstanceId**(): `string`

Defined in: [image-gen/ImageGenService.ts:372](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L372)

Get the service instance ID (for debugging)

#### Returns

`string`

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [image-gen/ImageGenService.ts:381](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L381)

Update service configuration

#### Parameters

##### config

`Partial`\<[`ImageGenConfig`](../type-aliases/ImageGenConfig.md)\>

Partial configuration to merge

#### Returns

`void`

---

### enable()

> **enable**(): `void`

Defined in: [image-gen/ImageGenService.ts:391](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L391)

Enable image generation

#### Returns

`void`

---

### disable()

> **disable**(): `void`

Defined in: [image-gen/ImageGenService.ts:398](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/image-gen/ImageGenService.ts#L398)

Disable image generation

#### Returns

`void`
