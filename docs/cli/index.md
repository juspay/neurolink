# CLI Guide

The NeuroLink CLI provides a professional command-line interface for AI text generation, provider management, and workflow automation.

## 🎯 Overview

The CLI is designed for:

- **Developers** who want to integrate AI into scripts and workflows
- **Content creators** who need quick AI text generation
- **System administrators** who manage AI provider configurations
- **Researchers** who experiment with different AI models and providers

## 🚀 Quick Reference

=== "Basic Commands"

    ```bash
    # Text generation (primary commands)
    neurolink generate "Your prompt here"
    neurolink gen "Your prompt"           # Short form

    # Real-time streaming
    neurolink stream "Tell me a story"

    # Provider management
    neurolink status                      # Check all providers
    neurolink provider status --verbose  # Detailed diagnostics
    ```

=== "Advanced Usage"

    ```bash
    # With analytics and evaluation
    neurolink generate "Write code" --enable-analytics --enable-evaluation

    # Custom provider and model
    neurolink gen "Explain AI" --provider openai --model gpt-4

    # Batch processing
    echo -e "Prompt 1\nPrompt 2" | neurolink batch prompts.txt

    # Output to file
    neurolink generate "Documentation" --output result.md
    ```

=== "MCP Tools"

    ```bash
    # Built-in tools (working)
    neurolink generate "What time is it?" --debug

    # Disable tools
    neurolink generate "Pure text" --disable-tools

    # MCP server management
    neurolink mcp discover
    neurolink mcp list
    neurolink mcp install <server>
    ```

## 📚 Documentation Sections

<div class="grid cards" markdown>

- :material-book-open: **[Commands Reference](commands.md)**

  ***

  Complete reference for all CLI commands, options, and parameters with detailed explanations.

- :material-code-block-tags: **[Examples](examples.md)**

  ***

  Practical examples and common usage patterns for different scenarios and workflows.

- :material-rocket: **[Advanced Usage](advanced.md)**

  ***

  Advanced features like batch processing, streaming, analytics, and custom configurations.

</div>

## 🔧 Installation

The CLI requires no installation for basic usage:

```bash
# Direct usage (recommended)
npx @juspay/neurolink generate "Hello, AI"

# Global installation (optional)
npm install -g @juspay/neurolink
neurolink generate "Hello, AI"
```

## ⚙️ Configuration

The CLI automatically loads configuration from:

1. **Environment variables** (`.env` file)
2. **Command-line options**
3. **Auto-detection** of available providers

```bash
# Create .env file
echo 'OPENAI_API_KEY="sk-your-key"' > .env
echo 'GOOGLE_AI_API_KEY="AIza-your-key"' >> .env

# Test configuration
neurolink status
```

## 🎮 Interactive Features

The CLI includes several interactive and automation features:

!!! tip "Auto-Provider Selection"

    NeuroLink automatically selects the best available provider based on configuration and performance.

!!! example "Built-in Tools"

    All commands include 6 built-in tools by default: time, file operations, math calculations, and more.

!!! note "Streaming Support"

    Real-time streaming displays results as they're generated, perfect for long-form content.

## 🔗 Integration

The CLI works seamlessly with:

- **Shell scripts** and automation
- **CI/CD pipelines** for automated content generation
- **Git hooks** for documentation updates
- **Cron jobs** for scheduled AI tasks

## 🆘 Getting Help

```bash
# General help
neurolink --help

# Command-specific help
neurolink generate --help
neurolink mcp --help

# Check provider status
neurolink status --verbose
```

For troubleshooting, see our [Troubleshooting Guide](../reference/troubleshooting.md) or [FAQ](../reference/faq.md).
