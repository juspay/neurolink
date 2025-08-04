# 🧠 NeuroLink

[![NPM Version](https://img.shields.io/npm/v/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![Downloads](https://img.shields.io/npm/dm/@juspay/neurolink)](https://www.npmjs.com/package/@juspay/neurolink)
[![GitHub Stars](https://img.shields.io/github/stars/juspay/neurolink)](https://github.com/juspay/neurolink/stargazers)
[![License](https://img.shields.io/npm/l/@juspay/neurolink)](https://github.com/juspay/neurolink/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/juspay/neurolink/workflows/CI/badge.svg)](https://github.com/juspay/neurolink/actions)

> Enterprise AI Development Platform with built-in tools, universal provider support, and factory pattern architecture. Production-ready with TypeScript support.

**NeuroLink** is an Enterprise AI Development Platform that unifies 9 major AI providers with intelligent fallback and built-in tool support. Available as both a **programmatic SDK** and **professional CLI tool**. Features 6 core tools working across all providers plus SDK custom tool registration. Extracted from production use at Juspay.

## 🚀 Quick Start

Get started with NeuroLink in under 2 minutes:

=== "CLI Usage"

    ```bash
    # Setup API key (Google AI Studio has free tier)
    export GOOGLE_AI_API_KEY="your-api-key"
    
    # Generate text instantly
    npx @juspay/neurolink generate "Hello, AI"
    npx @juspay/neurolink gen "Hello, AI"        # Shortest form
    
    # Check provider status
    npx @juspay/neurolink status
    ```

=== "SDK Usage"

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

=== "Installation"

    ```bash
    # CLI (no installation required)
    npx @juspay/neurolink generate "Hello"
    
    # SDK for your projects
    npm install @juspay/neurolink
    ```

## ✨ Core Features

<div class="grid cards" markdown>

-   :material-factory: **Factory Pattern Architecture**

    ---

    Unified provider management through BaseProvider inheritance with consistent interfaces across all AI providers.

    [:octicons-arrow-right-24: Learn more](advanced/factory-patterns.md)

-   :material-tools: **Tools-First Design**

    ---

    All providers include built-in tool support without additional configuration. 6 core tools ready to use.

    [:octicons-arrow-right-24: Explore tools](advanced/mcp-integration.md)

-   :material-lightning-bolt: **9 AI Providers**

    ---

    OpenAI, Bedrock, Vertex AI, Google AI Studio, Anthropic, Azure, Hugging Face, Ollama, Mistral AI

    [:octicons-arrow-right-24: Provider setup](getting-started/provider-setup.md)

-   :material-chart-line: **Advanced Analytics**

    ---

    Built-in usage analytics, cost tracking, performance monitoring, and AI response evaluation.

    [:octicons-arrow-right-24: Analytics guide](advanced/analytics.md)

-   :material-cog: **Dynamic Models**

    ---

    Self-updating model configurations, cost optimization, smart model resolution with aliases.

    [:octicons-arrow-right-24: Dynamic models](advanced/dynamic-models.md)

-   :material-console: **Professional CLI**

    ---

    Complete command-line interface with streaming, batch processing, and comprehensive provider management.

    [:octicons-arrow-right-24: CLI guide](cli/index.md)

</div>

## 🛠️ MCP Integration Status

| Component           | Status             | Description                                              |
| ------------------- | ------------------ | -------------------------------------------------------- |
| Built-in Tools      | ✅ **Working**     | 6 core tools fully functional across all providers       |
| SDK Custom Tools    | ✅ **Working**     | Register custom tools programmatically                   |
| External Discovery  | 🔍 **Discovery**   | 58+ MCP servers discovered from AI tools ecosystem       |
| Tool Execution      | ✅ **Working**     | Real-time AI tool calling with built-in tools            |
| **External Tools**  | 🚧 **Development** | Manual config needs one-line fix, activation in progress |
| **CLI Integration** | ✅ **READY**       | **Production-ready with built-in tools**                 |

### Quick MCP Test

```bash
# Test built-in tools (works immediately)
npx @juspay/neurolink generate "What time is it?" --debug

# Disable tools for pure text generation
npx @juspay/neurolink generate "Write a poem" --disable-tools

# Discover available MCP servers
npx @juspay/neurolink mcp discover --format table
```

## 🏗️ Supported Providers & Models

| Provider             | Models                     | Auth Method        | Free Tier | Tool Support |
| -------------------- | -------------------------- | ------------------ | --------- | ------------ |
| **OpenAI**           | GPT-4o, GPT-4o-mini        | API Key            | ❌        | ✅ Full      |
| **Google AI Studio** | Gemini 2.5 Flash/Pro       | API Key            | ✅        | ✅ Full      |
| **Amazon Bedrock**   | Claude 3.5/3.7 Sonnet      | AWS Credentials    | ❌        | ✅ Full*     |
| **Google Vertex AI** | Gemini 2.5 Flash           | Service Account    | ❌        | ✅ Full      |
| **Anthropic**        | Claude 3.5 Sonnet          | API Key            | ❌        | ✅ Full      |
| **Azure OpenAI**     | GPT-4, GPT-3.5             | API Key + Endpoint | ❌        | ✅ Full      |
| **Hugging Face** 🆕  | 100,000+ models            | API Key            | ✅        | ⚠️ Partial   |
| **Ollama** 🆕        | Llama 3.2, Gemma, Mistral  | None (Local)       | ✅        | ⚠️ Partial   |
| **Mistral AI** 🆕    | Tiny, Small, Medium, Large | API Key            | ✅        | ✅ Full      |

**Auto-Selection**: NeuroLink automatically chooses the best available provider based on speed, reliability, and configuration.

## 📚 Documentation Sections

<div class="grid cards" markdown>

-   :material-rocket-launch: **[Getting Started](getting-started/index.md)**

    ---

    Quick setup, installation, and provider configuration guides to get you running in minutes.

-   :material-console-line: **[CLI Guide](cli/index.md)**

    ---

    Complete command reference, examples, and advanced CLI usage patterns.

-   :material-code-braces: **[SDK Reference](sdk/index.md)**

    ---

    API documentation, framework integration, and custom tool development.

-   :material-feature-search: **[Advanced Features](advanced/index.md)**

    ---

    MCP integration, analytics, factory patterns, dynamic models, and streaming.

-   :material-school: **[Examples & Tutorials](examples/index.md)**

    ---

    Practical examples, use cases, and step-by-step tutorials for common scenarios.

-   :material-play-circle: **[Visual Demos](demos/index.md)**

    ---

    Screenshots, videos, and interactive demonstrations of NeuroLink capabilities.

</div>

## 🎯 Latest Updates

!!! success "Phase 3 Complete - Advanced Features & Performance"

    **NeuroLink Phase 3 implementation delivers comprehensive system polish and production-ready performance.**

    - ✅ **Enhanced Evaluation System**: Detailed reasoning explanations in all evaluation responses
    - ✅ **Real Streaming Architecture**: Vercel AI SDK real streaming with comprehensive analytics support
    - ✅ **Performance Optimization**: 68% improvement in provider status checks (16s → 5s via parallel execution)
    - ✅ **Memory Management**: Automatic cleanup for operations >50MB with performance tracking
    - ✅ **Edge Case Handling**: Input validation, timeout warnings, and network resilience
    - ✅ **Scalability Improvements**: Retry logic, circuit breakers, and rate limiting

## 🤝 Contributing

We welcome contributions! NeuroLink features enterprise-grade automation with 72+ commands for development.

```bash
git clone https://github.com/juspay/neurolink
cd neurolink
pnpm install
pnpm setup:complete  # One-command setup with all automation
pnpm test:adaptive   # Intelligent testing
pnpm build:complete  # Full build pipeline
```

[Learn more about contributing →](development/contributing.md)

## 📄 License

MIT © [Juspay Technologies](https://juspay.in)

---

<div class="grid cards" markdown>

-   :material-help-circle: **Need Help?**

    ---

    Check our [troubleshooting guide](reference/troubleshooting.md) or [FAQ](reference/faq.md) for common issues and solutions.

-   :material-chat: **Community**

    ---

    Join our community discussions and get support from other NeuroLink users and maintainers.

-   :material-bug: **Found a Bug?**

    ---

    Report issues on our [GitHub repository](https://github.com/juspay/neurolink/issues) with detailed information.

</div>