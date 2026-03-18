# Multimodal Images

## Problem

Many AI tasks require visual understanding -- analyzing screenshots, describing photos, comparing diagrams, or extracting text from images. Text-only prompts cannot handle these use cases.

## Solution

Pass images to NeuroLink via the `input.images` array in `generate()` or `stream()`. NeuroLink handles the encoding and provider-specific formatting automatically. Images can be URLs, base64 strings, or Buffers.

## Code

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { readFileSync } from "fs";

async function analyzeImage() {
  const neurolink = new NeuroLink();

  // Option 1: Image from a URL
  const result = await neurolink.generate({
    input: {
      text: "Describe what you see in this image.",
      images: ["https://example.com/photo.jpg"],
    },
    provider: "openai",
    model: "gpt-4o",
  });

  console.log("Description:", result.content);
}

async function analyzeLocalImage() {
  const neurolink = new NeuroLink();

  // Option 2: Image from a local file (Buffer)
  const imageBuffer = readFileSync("./screenshot.png");

  const result = await neurolink.generate({
    input: {
      text: "What does this screenshot show? List the main UI elements.",
      images: [imageBuffer],
    },
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
  });

  console.log("Analysis:", result.content);
}

async function compareImages() {
  const neurolink = new NeuroLink();

  // Option 3: Multiple images in a single request
  const before = readFileSync("./before.png");
  const after = readFileSync("./after.png");

  const result = await neurolink.generate({
    input: {
      text: "Compare these two images. What changed between the first and second?",
      images: [before, after],
    },
    provider: "openai",
    model: "gpt-4o",
  });

  console.log("Differences:", result.content);
}

analyzeImage();
```

## Explanation

### 1. The `input.images` Array

The `images` field accepts an array of image sources. Each element can be:

| Type     | Example                            | When to Use                    |
| -------- | ---------------------------------- | ------------------------------ |
| `string` | `"https://example.com/photo.jpg"`  | Public image URLs              |
| `string` | `"data:image/png;base64,iVBOR..."` | Base64-encoded data URIs       |
| `Buffer` | `readFileSync("./image.png")`      | Local files loaded into memory |

NeuroLink's `MessageBuilder` and `ProviderImageAdapter` handle the conversion to each provider's required format automatically.

### 2. Vision Model Requirements

Not all models support images. You must use a vision-capable model:

| Provider  | Vision Models                                                        |
| --------- | -------------------------------------------------------------------- |
| OpenAI    | `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`                               |
| Anthropic | `claude-sonnet-4-20250514`, `claude-3-5-sonnet-*`, `claude-3-opus-*` |
| Google AI | `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.0-flash`             |
| Vertex AI | `gemini-2.5-flash`, `gemini-2.5-pro`                                 |
| Bedrock   | `anthropic.claude-3-*`, `anthropic.claude-sonnet-4-*`                |

### 3. Multiple Images

Pass multiple images and reference them in your prompt. The model sees them in order:

```typescript
input: {
  text: "The first image is the original design. The second is the implementation. How closely does the implementation match?",
  images: [designMockup, implementationScreenshot],
}
```

### 4. Alt Text for Accessibility

For production applications, provide alt text with the `ImageWithAltText` format:

```typescript
input: {
  text: "Analyze these product photos for our catalog.",
  images: [
    { data: imageBuffer, altText: "Front view of the blue sneaker" },
    { data: "https://example.com/side.jpg", altText: "Side profile showing sole design" },
  ],
}
```

## Variations

### Stream Image Analysis

Stream the response while analyzing an image:

```typescript
async function streamImageAnalysis(imagePath: string, question: string) {
  const neurolink = new NeuroLink();
  const imageBuffer = readFileSync(imagePath);

  const result = await neurolink.stream({
    input: {
      text: question,
      images: [imageBuffer],
    },
    provider: "openai",
    model: "gpt-4o",
  });

  for await (const chunk of result.stream) {
    if ("content" in chunk && chunk.content) {
      process.stdout.write(chunk.content);
    }
  }

  console.log("\n");
}

streamImageAnalysis("./chart.png", "Summarize the trends shown in this chart.");
```

### Extract Text from an Image (OCR)

Use a vision model as an OCR tool:

```typescript
async function extractText(imagePath: string) {
  const neurolink = new NeuroLink();
  const image = readFileSync(imagePath);

  const result = await neurolink.generate({
    input: {
      text: "Extract all visible text from this image. Return it as plain text, preserving the layout as much as possible.",
      images: [image],
    },
    provider: "openai",
    model: "gpt-4o",
    temperature: 0,
  });

  return result.content;
}
```

### Base64 String Input

When you already have a base64-encoded image (e.g., from a database or API):

```typescript
const base64Image = "iVBORw0KGgoAAAANSUhEUg..."; // Base64 data

const result = await neurolink.generate({
  input: {
    text: "What is in this image?",
    images: [`data:image/png;base64,${base64Image}`],
  },
  provider: "google-ai",
  model: "gemini-2.5-flash",
});
```

### Batch Image Classification

Classify multiple images in sequence:

```typescript
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

async function classifyImages(directory: string) {
  const neurolink = new NeuroLink();
  const files = readdirSync(directory).filter((f) =>
    /\.(jpg|jpeg|png|webp)$/i.test(f),
  );

  const results: Array<{ file: string; category: string }> = [];

  for (const file of files) {
    const image = readFileSync(join(directory, file));

    const result = await neurolink.generate({
      input: {
        text: 'Classify this image into exactly one category: "landscape", "portrait", "product", "document", or "other". Respond with only the category name.',
        images: [image],
      },
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0,
      maxTokens: 10,
    });

    results.push({ file, category: result.content.trim().toLowerCase() });
    console.log(`${file}: ${result.content.trim()}`);
  }

  return results;
}
```

## Tips

1. **Use the right model for cost**: `gpt-4o-mini` and `gemini-2.5-flash` are cheaper for simple image tasks. Reserve `gpt-4o` and `claude-sonnet-4-20250514` for complex visual reasoning.
2. **Resize large images**: Very large images consume more tokens. Resize to the minimum resolution needed before sending.
3. **Be specific in your prompt**: Instead of "describe this image", ask "list all the text visible in the top-right corner of this screenshot."
4. **One image or many**: Some tasks work better with a single detailed image; comparison tasks benefit from passing 2-3 images in one request.

## See Also

- [Basic Streaming](/docs/cookbook/basic-streaming)
- [Structured Output with JSON Schema](structured-output.md)
- [Cost Optimization](cost-optimization.md)
- [API Reference](../sdk/api-reference.md)
