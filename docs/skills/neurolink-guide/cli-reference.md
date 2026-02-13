# NeuroLink CLI Reference

Complete reference for the NeuroLink command-line interface.

## Installation

```bash
# Global installation
npm install -g @juspay/neurolink

# Or use with npx
npx @juspay/neurolink generate "Hello"

# Or from project
pnpm run cli generate "Hello"
```

## Core Commands

### generate

Generate content with AI.

```bash
neurolink generate <prompt>
neurolink gen <prompt>  # Alias
```

**Options:**

```
--provider, -p     Provider (auto, openai, anthropic, vertex, etc.)
--model, -m        Model name
--temperature, -t  Temperature 0.0-2.0 (default: 0.7)
--maxTokens        Max tokens (default: 1000)
--system, -s       System prompt
--format, -f       Output format (text, json, table)
--output, -o       Save to file
--timeout          Timeout in seconds (default: 120)
--debug, -v        Debug mode
--quiet, -q        Suppress output
```

**Examples:**

```bash
neurolink generate "Explain quantum computing"

neurolink generate "Write code" \
  --provider openai \
  --model gpt-4o \
  --temperature 0.3

neurolink generate "Summarize" \
  --system "Be concise" \
  --maxTokens 200 \
  --output summary.txt
```

### stream

Stream generation output in real-time.

```bash
neurolink stream <prompt>
```

Same options as `generate`.

```bash
neurolink stream "Write a story" --temperature 0.8
```

### loop

Interactive REPL session with memory.

```bash
neurolink loop
```

**Options:**

```
--enable-conversation-memory  Enable memory (default: true)
--max-sessions               Max sessions to keep (default: 50)
--resume, -r                 Resume conversation by ID
--new, -n                    Force new conversation
--list-conversations, -l     List and exit
```

**Examples:**

```bash
neurolink loop                    # Interactive session
neurolink loop --new              # New conversation
neurolink loop --resume conv-123  # Resume
neurolink loop --list             # List conversations
```

**Loop Commands:**

```
help              Show commands
exit, quit, :q    Exit
set <key> <val>   Set variable (provider, model, temperature)
get <key>         Get variable
history           Show conversation
clear             Clear session
//                Escape to stream mode
```

### batch

Process multiple prompts from file.

```bash
neurolink batch <file>
```

```bash
# prompts.txt - one prompt per line
neurolink batch prompts.txt --provider openai
```

## Multimodal Options

```
--image, -i         Image file(s)
--pdf               PDF file(s)
--csv, -c           CSV file(s)
--video             Video file(s)
--file              Auto-detect file type
```

**Video options:**

```
--video-frames      Frames to extract (default: 8)
--video-quality     Quality 0-100 (default: 85)
--video-format      jpeg or png (default: jpeg)
--transcribe-audio  Transcribe audio
```

**Examples:**

```bash
# Image analysis
neurolink generate "Describe" --image photo.jpg

# Multiple images
neurolink generate "Compare" --image a.png --image b.png

# PDF summary
neurolink generate "Summarize" --pdf report.pdf

# CSV analysis
neurolink generate "Analyze trends" --csv data.csv

# Auto-detect
neurolink generate "Explain" --file doc.pdf --file data.json

# Video
neurolink generate "Describe" --video clip.mp4 --video-frames 12
```

## RAG Options

```
--rag-files          Files to index
--rag-strategy       Chunking strategy
--rag-chunk-size     Chunk size (default: 1000)
--rag-chunk-overlap  Overlap (default: 200)
--rag-top-k          Results to retrieve (default: 5)
```

**Examples:**

```bash
neurolink generate "What features exist?" \
  --rag-files ./docs/features.md

neurolink generate "Explain setup" \
  --rag-files ./docs/setup.md \
  --rag-strategy markdown \
  --rag-chunk-size 512 \
  --rag-top-k 10
```

## Extended Thinking

```
--thinking          Enable extended thinking
--thinking-budget   Token budget (default: 10000)
--thinking-level    Level: minimal, low, medium, high
```

```bash
neurolink generate "Complex problem" \
  --thinking \
  --thinking-budget 20000

neurolink generate "Reason through this" \
  --provider vertex \
  --model gemini-3-flash \
  --thinking-level high
```

## Text-to-Speech

```
--tts             Enable TTS
--tts-voice       Voice name
--tts-format      mp3, wav, ogg, opus
--tts-speed       Speed 0.25-4.0
--tts-quality     standard or hd
--tts-output      Output file
--tts-play        Auto-play audio
```

```bash
neurolink generate "Hello world" \
  --tts \
  --tts-voice en-US-Neural2-C \
  --tts-output greeting.mp3 \
  --tts-play
```

## Video Generation

```
--output-mode       text or video
--video-output      Output file path
--video-resolution  720p or 1080p
--video-length      4, 6, or 8 seconds
--video-aspect-ratio 9:16 or 16:9
--video-audio       Enable audio (default: true)
```

```bash
neurolink generate "Mountain landscape" \
  --output-mode video \
  --video-output landscape.mp4 \
  --video-resolution 1080p \
  --video-length 8
```

## Provider Commands

### setup

Configure AI providers.

```bash
neurolink setup [provider]
neurolink s [provider]
```

```bash
neurolink setup             # Interactive wizard
neurolink setup openai      # Setup OpenAI
neurolink setup --list      # List providers
neurolink setup --status    # Check all providers
neurolink setup openai --check  # Verify config
```

### status

Check provider status.

```bash
neurolink status
neurolink provider status
```

## Model Commands

```bash
neurolink models list              # List all models
neurolink models search "gpt"      # Search models
neurolink models info gpt-4o       # Model details
neurolink models compare gpt-4o claude-3-5-sonnet
neurolink models recommend         # Get recommendations
```

## MCP Commands

```bash
neurolink mcp list           # List MCP servers
neurolink mcp status         # Check status
neurolink mcp add <server>   # Add server
neurolink mcp remove <id>    # Remove server
neurolink mcp test <id>      # Test connectivity
```

```bash
# Discover available tools
neurolink discover
```

## Server Commands

### serve

Start HTTP API server.

```bash
neurolink serve
```

**Options:**

```
--port, -p       Port (default: 3000)
--host           Host (default: localhost)
--framework      hono, express, fastify, koa
--base-path      API path (default: /api)
--cors           Enable CORS
--rate-limit     Enable rate limiting
--watch          Watch for changes
--swagger        Enable Swagger docs
```

```bash
neurolink serve --port 4000 --cors --rate-limit

neurolink serve --framework express --swagger

neurolink serve status   # Check status
neurolink serve stop     # Stop server
```

## Memory Commands

```bash
neurolink memory stats              # Usage statistics
neurolink memory history conv-123   # Show history
neurolink memory clear              # Clear all
neurolink memory clear conv-123     # Clear specific
```

## Configuration Commands

```bash
neurolink config init      # Setup wizard
neurolink config show      # Display config
neurolink config validate  # Validate
neurolink config reset     # Reset defaults
neurolink config export    # Export config
```

## Ollama Commands

```bash
neurolink ollama list-models    # List installed
neurolink ollama pull llama3    # Download model
neurolink ollama remove llama3  # Remove model
neurolink ollama status         # Check service
neurolink ollama start          # Start service
neurolink ollama stop           # Stop service
neurolink ollama setup          # Interactive setup
```

## SageMaker Commands

```bash
neurolink sagemaker status              # Check config
neurolink sagemaker test <endpoint>     # Test endpoint
neurolink sagemaker list-endpoints      # List endpoints
neurolink sagemaker configure           # Setup
```

## RAG Commands

```bash
neurolink rag chunk <file>    # Chunk document
neurolink rag index <file>    # Index for retrieval
neurolink rag query "search"  # Query indexed docs
neurolink rag list            # List indexed docs
```

## Global Options

Available on all commands:

```
-h, --help       Show help
-V, --version    Show version
--no-color       Disable colors
--config-file    Custom config path
--quiet, -q      Suppress output
--debug, -v      Debug mode
--dry-run        Test without API calls
```

## Environment Variables

```bash
# Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
VERTEX_PROJECT_ID=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AZURE_OPENAI_API_KEY=...
MISTRAL_API_KEY=...

# NeuroLink
NEUROLINK_DEFAULT_PROVIDER=openai
NEUROLINK_DEFAULT_MODEL=gpt-4o
NEUROLINK_TOOL_CACHE_DURATION=20000
```

## Shell Completion

```bash
# Bash
neurolink completion bash >> ~/.bashrc

# Zsh
neurolink completion zsh >> ~/.zshrc
```

## Quick Reference

| Action         | Command                                 |
| -------------- | --------------------------------------- |
| Generate       | `neurolink gen "prompt"`                |
| Stream         | `neurolink stream "prompt"`             |
| Interactive    | `neurolink loop`                        |
| With image     | `neurolink gen "describe" -i image.jpg` |
| With RAG       | `neurolink gen "q" --rag-files doc.md`  |
| Setup provider | `neurolink setup openai`                |
| Start server   | `neurolink serve`                       |
| Check status   | `neurolink status`                      |

## Next Steps

- SDK quickstart - Programmatic usage
- Providers - Provider configuration
- Advanced features - HITL, workflows
