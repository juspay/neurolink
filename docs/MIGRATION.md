# NeuroLink Migration Guide

This guide helps you migrate between major versions of NeuroLink and adapt to deprecated features.

## Table of Contents

- [v8.x to v9.0.0](#v8x-to-v900)
  - [ProviderMultimodalPayload Deprecation](#providermultimodalpayload-deprecation)

---

## v8.x to v9.0.0

### ProviderMultimodalPayload Deprecation

**Status**: Deprecated in v8.4.0, to be removed in v9.0.0

#### Background

The `ProviderMultimodalPayload` type was created as a generic type for provider-specific multimodal payloads. However, in practice:

- No provider implementations actively use this type
- Providers use their own SDK-specific types for better type safety
- The generic `[key: string]: unknown` index signature defeats TypeScript's type safety benefits
- It creates confusion about which types to use

#### Migration Path

Replace `ProviderMultimodalPayload` with provider-specific SDK types for better type safety and IDE support.

#### Before (Deprecated)

```typescript
import type { ProviderMultimodalPayload } from '@juspay/neurolink';

// ❌ Generic type with weak typing
const payload: ProviderMultimodalPayload = {
  provider: 'openai',
  model: 'gpt-4o',
  messages: [...],
  // Any key allowed - no type safety!
};
```

#### After (Recommended)

**For OpenAI:**

```typescript
import type { ChatCompletionMessageParam } from 'openai';

// ✅ Strong typing with IDE support
const messages: ChatCompletionMessageParam[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'What is in this image?' },
      {
        type: 'image_url',
        image_url: { url: 'data:image/jpeg;base64,...' }
      }
    ]
  }
];
```

**For Anthropic:**

```typescript
import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk';

// ✅ Anthropic-specific types
const messages: MessageParam[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this image' },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: '...'
        }
      }
    ]
  }
];
```

**For Google AI Studio (Gemini):**

```typescript
import type { Content, Part } from '@google/generative-ai';

// ✅ Google AI Studio types
const contents: Content[] = [
  {
    role: 'user',
    parts: [
      { text: 'Describe this image' },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: '...'
        }
      }
    ]
  }
];
```

**For Google Vertex AI:**

```typescript
import type { Content, Part } from '@google-cloud/vertexai';

// ✅ Vertex AI types (similar to Google AI Studio)
const contents: Content[] = [
  {
    role: 'user',
    parts: [
      { text: 'What is shown in this PDF?' },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: '...'
        }
      }
    ]
  }
];
```

**For AWS Bedrock:**

```typescript
import type { 
  Message, 
  ContentBlock,
  ImageBlock 
} from '@aws-sdk/client-bedrock-runtime';

// ✅ Bedrock-specific types
const messages: Message[] = [
  {
    role: 'user',
    content: [
      { text: 'Analyze this image' },
      {
        image: {
          format: 'jpeg',
          source: {
            bytes: Buffer.from('...')
          }
        }
      } as ImageBlock
    ]
  }
];
```

**For Azure OpenAI:**

```typescript
// Azure OpenAI uses the same types as OpenAI
import type { ChatCompletionMessageParam } from 'openai';

const messages: ChatCompletionMessageParam[] = [
  {
    role: 'user',
    content: 'Your message'
  }
];
```

**For Mistral AI:**

```typescript
// Mistral via Vercel AI SDK
import type { CoreMessage } from 'ai';

const messages: CoreMessage[] = [
  {
    role: 'user',
    content: [
      { type: 'text', text: 'Your prompt' },
      {
        type: 'image',
        image: Buffer.from('...')
      }
    ]
  }
];
```

**For Ollama:**

```typescript
import type { Message } from 'ollama-ai-provider';

const messages: Message[] = [
  {
    role: 'user',
    content: 'Your message',
    images: ['base64-encoded-image']
  }
];
```

**For Hugging Face:**

```typescript
import type { TextGenerationInput } from '@huggingface/inference';

const input: TextGenerationInput = {
  inputs: 'Your prompt',
  // Hugging Face models typically accept text only
  // For multimodal models, check specific model documentation
};
```

#### For Internal NeuroLink Usage

If you're working within NeuroLink or building extensions, use these internal types:

```typescript
import type {
  ChatMessage,
  MessageContent,
  MultimodalChatMessage
} from '@juspay/neurolink';

// For standard messages
const message: ChatMessage = {
  role: 'user',
  content: 'Your message'
};

// For multimodal messages
const multimodalMessage: MultimodalChatMessage = {
  role: 'user',
  content: [
    { type: 'text', text: 'Describe this' },
    { type: 'image', data: buffer, mediaType: 'image/jpeg' }
  ]
};
```

#### Migration Checklist

- [ ] Identify all usages of `ProviderMultimodalPayload` in your codebase
- [ ] Determine which provider(s) you're using
- [ ] Install the appropriate provider SDK types (if not already installed)
- [ ] Replace `ProviderMultimodalPayload` with provider-specific types
- [ ] Update imports to use provider SDKs
- [ ] Test your code to ensure types are correct
- [ ] Remove any unused `ProviderMultimodalPayload` imports

#### Benefits of Migration

1. **Better Type Safety**: Provider-specific types catch errors at compile time
2. **IDE Support**: Get autocomplete and inline documentation for provider APIs
3. **Reduced Confusion**: Clear which types to use for each provider
4. **Future-Proof**: Aligns with provider SDK updates and new features
5. **Performance**: No runtime overhead from generic type checking

#### Timeline

- **v8.4.0** (December 2025): Type deprecated with migration guide
- **v8.x** (December 2025 - Q1 2026): Grace period for migration
- **v9.0.0** (Q2 2026): Type removed completely

#### Need Help?

If you have questions about this migration:

1. Check the [NeuroLink documentation](https://juspay.github.io/neurolink)
2. Review provider-specific examples in `examples/` directory
3. Open an issue on [GitHub](https://github.com/juspay/neurolink/issues)
4. Join our community discussions

---

## Previous Migrations

### Factory Pattern Migration (v7.x to v8.0.0)

See [FACTORY-PATTERN-MIGRATION.md](./FACTORY-PATTERN-MIGRATION.md) for details on the unified factory pattern architecture introduced in v8.0.0.

---

## Contributing to This Guide

If you find issues or have suggestions for improving this migration guide, please:

1. Open a pull request with your proposed changes
2. Include clear examples and explanations
3. Test the migration steps with real code

This ensures the guide remains helpful for all NeuroLink users.
