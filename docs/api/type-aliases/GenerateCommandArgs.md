[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenerateCommandArgs

# Type Alias: GenerateCommandArgs

> **GenerateCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:59](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L59)

Generate command arguments

## Type Declaration

### input?

> `optional` **input?**: `string`

Input text or prompt

### provider?

> `optional` **provider?**: `string`

AI provider to use

### model?

> `optional` **model?**: `string`

Model name

### system?

> `optional` **system?**: `string`

System prompt

### temperature?

> `optional` **temperature?**: `number`

Temperature setting

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens

### analytics?

> `optional` **analytics?**: `boolean`

Enable analytics

### evaluation?

> `optional` **evaluation?**: `boolean`

Enable evaluation

### context?

> `optional` **context?**: `string`

Context data

### disableTools?

> `optional` **disableTools?**: `boolean`

Disable tools

### maxSteps?

> `optional` **maxSteps?**: `number`

Maximum steps for multi-turn

### output?

> `optional` **output?**: `string`

Output file

### thinking?

> `optional` **thinking?**: `boolean`

Enable extended thinking/reasoning

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Token budget for thinking

### thinkingLevel?

> `optional` **thinkingLevel?**: `"minimal"` \| `"low"` \| `"medium"` \| `"high"`

Thinking level for extended reasoning

### region?

> `optional` **region?**: `string`

Vertex AI region

### outputMode?

> `optional` **outputMode?**: `"text"` \| `"video"` \| `"ppt"`

Output mode - 'text' for standard generation, 'video' for video generation, 'ppt' for presentation

### videoOutput?

> `optional` **videoOutput?**: `string`

Path to save generated video file

### videoResolution?

> `optional` **videoResolution?**: `"720p"` \| `"1080p"`

Video output resolution (720p or 1080p)

### videoLength?

> `optional` **videoLength?**: `4` \| `6` \| `8`

Video duration in seconds (4, 6, or 8)

### videoAspectRatio?

> `optional` **videoAspectRatio?**: `"9:16"` \| `"16:9"`

Video aspect ratio (9:16 for portrait, 16:9 for landscape)

### videoAudio?

> `optional` **videoAudio?**: `boolean`

Enable/disable audio generation in video

### pptPages?

> `optional` **pptPages?**: `number`

Number of slides to generate (5-50)

### pptTheme?

> `optional` **pptTheme?**: `"modern"` \| `"corporate"` \| `"creative"` \| `"minimal"` \| `"dark"`

Presentation theme/style

### pptAudience?

> `optional` **pptAudience?**: `"business"` \| `"students"` \| `"technical"` \| `"general"`

Target audience

### pptTone?

> `optional` **pptTone?**: `"professional"` \| `"casual"` \| `"educational"` \| `"persuasive"`

Presentation tone/style

### pptOutput?

> `optional` **pptOutput?**: `string`

Path to save generated PPTX file

### pptAspectRatio?

> `optional` **pptAspectRatio?**: `"16:9"` \| `"4:3"`

PPT aspect ratio

### pptNoImages?

> `optional` **pptNoImages?**: `boolean`

Disable AI image generation for PPT slides

### imageOutput?

> `optional` **imageOutput?**: `string`

Custom path for generated image output
