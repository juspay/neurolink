# Quick Start

Get NeuroLink running in under 2 minutes with this quick start guide.

## 🚀 Prerequisites

- **Node.js 18+**
- **npm/pnpm/yarn** package manager
- **API key** for at least one AI provider (we recommend starting with Google AI Studio - it has a free tier)

## ⚡ 1-Minute Setup

### Option 1: CLI Usage (No Installation)

```bash
# Set up your API key (Google AI Studio has free tier)
export GOOGLE_AI_API_KEY="AIza-your-google-ai-api-key"

# Generate text instantly
npx @juspay/neurolink generate "Hello, AI"
npx @juspay/neurolink gen "Hello, AI"        # Shortest form

# Check provider status
npx @juspay/neurolink status
```

### Option 2: SDK Installation

```bash
# Install for your project
npm install @juspay/neurolink
```

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink();
const result = await neurolink.generate({
  input: { text: "Write a haiku about programming" },
  provider: "google-ai",
});

console.log(result.content);
console.log(`Used: ${result.provider}`);
```

### Write Once, Run Anywhere

NeuroLink's power is in its provider-agnostic design. Write your code once, and NeuroLink automatically uses the best available provider. If your primary provider fails, it seamlessly falls back to another, ensuring your application remains robust.

```typescript
import { NeuroLink } from "@juspay/neurolink";

// No provider specified - NeuroLink handles it!
const neurolink = new NeuroLink();

// This code works with OpenAI, Google, Anthropic, etc. without any changes.
const result = await neurolink.generate({
  input: { text: "Explain quantum computing simply." },
});

console.log(result.content);
console.log(`AI Provider Used: ${result.provider}`);
```

## 🔑 Get API Keys

### Google AI Studio (Free Tier Available)

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new API key
5. Copy and use: `export GOOGLE_AI_API_KEY="AIza-your-key"`

### Other Providers

- **OpenAI**: [platform.openai.com](https://platform.openai.com/)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **LiteLLM**: Access 100+ models through one proxy server (requires setup)
- **Ollama**: Local installation, no API key needed

## ✅ Verify Setup

```bash
# Check all configured providers
npx @juspay/neurolink status

# Test with built-in tools
npx @juspay/neurolink generate "What time is it?" --debug

# Test without tools (pure text generation)
npx @juspay/neurolink generate "Write a poem" --disable-tools
```

## 🎯 Next Steps

1. **[Provider Setup](provider-setup.md)** - Configure multiple AI providers
2. **[CLI Commands](../cli/commands.md)** - Learn all available commands
3. **[SDK Reference](../sdk/api-reference.md)** - Integrate into your applications
4. **[Examples](../examples/basic-usage.md)** - See practical implementations

## 🆘 Need Help?

- **Not working?** Check our [Troubleshooting Guide](../reference/troubleshooting.md)
- **Questions?** See our [FAQ](../reference/faq.md)
- **Issues?** Report on [GitHub](https://github.com/juspay/neurolink/issues)
