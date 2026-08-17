# Multimodal Capabilities

The NeuroLink SDK supports rich multimodal interactions, allowing you to pass images, files, and text to supported models.

## Custom Content Ordering

By default, the simple API will order the text before any attached images. This is convenient for many prompts, but it is not always the right sequence for multimodal tasks such as OCR, visual search, or side-by-side comparison.

When you need a different order, construct a custom content array. The SDK preserves the exact array order you provide, so the model receives the content in the same sequence you define.

Example: image-first ordering

```typescript
import { NeuroLink } from "neurolink";

const sdk = new NeuroLink();

const response = await sdk.generate({
  messages: [
    {
      role: "user",
      content: [
        { type: "image", image: "https://example.com/receipt.jpg" },
        { type: "text", text: "Extract the total amount from this receipt." },
      ],
    },
  ],
  provider: "google-ai",
});
```

This keeps the image first and the instruction second, which is useful when the model should interpret the visual input before following the text prompt. The same pattern also works for image-first or custom multi-part prompts that mix text and media in any order you need.

> The simple API is still backward compatible, but when ordering matters, the custom `messages[].content` array is the explicit and flexible option.
