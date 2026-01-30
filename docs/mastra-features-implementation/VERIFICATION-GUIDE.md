# Mastra Features Implementation Verification Guide

## 1. Overview

### Purpose

This guide enables an agent to systematically verify all 10 Mastra feature implementations in NeuroLink. The verification process ensures each feature:

1. Matches its implementation plan
2. Follows Mastra architectural patterns
3. Adheres to NeuroLink coding standards
4. Has comprehensive tests that pass
5. Passes TypeScript type checking

### Reference Paths

| Resource                        | Path                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Mastra Reference Repository** | `/Users/sachinsharma/Developer/temp/ai-coder/mastra`                                                                    |
| **NeuroLink Main Repository**   | `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink`                                                           |
| **Implementation Plans**        | `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/docs/mastra-features-implementation/implementation-plans/` |
| **Pattern Documents**           | `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/docs/mastra-features-implementation/patterns/`             |

### Verification Strategy

**IMPORTANT:** Use skills and sub-agents extensively to parallelize verification work.

1. **Launch parallel sub-agents** - One sub-agent per feature (10 total)
2. **Use specialized skills** - Load appropriate skills for code review, testing, and debugging
3. **Gather context first** - Read implementation plans and Mastra reference code before reviewing
4. **Run verification commands** - Type checks and tests in each worktree
5. **Generate structured reports** - Use the template at the end of this document

---

## 2. Worktree Reference Table

All feature implementations exist in separate git worktrees for isolation:

| #   | Branch Name                      | Worktree Path                                                                      | Purpose                          |
| --- | -------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------- |
| 0   | `release`                        | `/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink`                      | Main release branch              |
| 1   | `feat/gateway-provider-system`   | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/gateway-provider-system`   | Gateway provider system          |
| 2   | `feat/workflow-system`           | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/workflow-system`           | Advanced workflow system         |
| 3   | `feat/three-layer-memory`        | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/three-layer-memory`        | Three-layer memory system        |
| 4   | `feat/vector-store-integration`  | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/vector-store-integration`  | Vector store integrations        |
| 5   | `feat/io-processors`             | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/io-processors`             | Input/Output processors          |
| 6   | `feat/evaluation-scoring-system` | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/evaluation-scoring-system` | Evaluation & scoring system      |
| 7   | `feat/multi-agent-networks`      | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/multi-agent-networks`      | Multi-agent networks             |
| 8   | `feat/voice-speech-integration`  | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/voice-speech-integration`  | Voice & speech integration       |
| 9   | `feat/observability-otel`        | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/observability-otel`        | Observability with OpenTelemetry |
| 10  | `feat/server-adapters`           | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/server-adapters`           | Server framework adapters        |

### Pre-existing Worktrees (Not Part of Mastra Features)

| Branch Name                          | Worktree Path                                                                          | Purpose                         |
| ------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------- |
| `feat/claude-subscription-support`   | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/claude-subscription-support`   | Claude subscription feature     |
| `feat/improve-documentation-styling` | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/improve-documentation-styling` | Documentation improvements      |
| `feat/remove-ai-sdk-google`          | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/remove-ai-sdk-google`          | Remove AI SDK Google dependency |
| `feat/testing-framework`             | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/testing-framework`             | Testing framework updates       |

---

## 3. Implementation Plans Reference

Each feature has a detailed implementation plan that should be the source of truth:

| Feature                 | Implementation Plan Path                                           |
| ----------------------- | ------------------------------------------------------------------ |
| Gateway Provider System | `implementation-plans/01-gateway-provider-implementation-plan.md`  |
| Workflow System         | `implementation-plans/02-workflow-system-implementation-plan.md`   |
| Memory System           | `implementation-plans/03-memory-system-implementation-plan.md`     |
| Vector Stores           | `implementation-plans/04-vector-stores-implementation-plan.md`     |
| I/O Processors          | `implementation-plans/05-processors-implementation-plan.md`        |
| Evaluation System       | `implementation-plans/06-evaluation-system-implementation-plan.md` |
| Multi-Agent Networks    | `implementation-plans/07-multi-agent-implementation-plan.md`       |
| Voice Integration       | `implementation-plans/08-voice-integration-implementation-plan.md` |
| Observability           | `implementation-plans/09-observability-implementation-plan.md`     |
| Server Adapters         | `implementation-plans/10-server-adapters-implementation-plan.md`   |

---

## 4. Pattern Documents Reference

These pattern documents define NeuroLink's coding standards. All implementations must follow these patterns:

| Pattern Document                 | Path                                              | Applicable Features          |
| -------------------------------- | ------------------------------------------------- | ---------------------------- |
| Documentation Patterns           | `patterns/01-documentation-patterns.md`           | All                          |
| Type System Patterns             | `patterns/02-type-system-patterns.md`             | All                          |
| Testing Patterns                 | `patterns/03-testing-patterns.md`                 | All                          |
| Provider Implementation Patterns | `patterns/04-provider-implementation-patterns.md` | Gateway, Voice               |
| CLI Patterns                     | `patterns/05-cli-patterns.md`                     | All with CLI commands        |
| Error Handling Patterns          | `patterns/06-error-handling-patterns.md`          | All                          |
| Configuration Patterns           | `patterns/07-configuration-patterns.md`           | All                          |
| MCP Patterns                     | `patterns/08-mcp-patterns.md`                     | Multi-Agent, Server Adapters |
| Memory Patterns                  | `patterns/09-memory-patterns.md`                  | Memory, Vector Stores        |
| Build & Release Patterns         | `patterns/10-build-release-patterns.md`           | All                          |

---

## 5. Feature Verification Sections

---

### Feature 1: Gateway Provider System

#### Basic Information

| Attribute               | Value                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/gateway-provider-system` |
| **Branch Name**         | `feat/gateway-provider-system`                                                   |
| **Implementation Plan** | `implementation-plans/01-gateway-provider-implementation-plan.md`                |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/
├── llm/                          # LLM abstraction layer
├── agent/                        # Agent implementation with gateway patterns
└── mastra/                       # Main Mastra class with provider management
```

#### Source Files to Verify

```
src/lib/
├── gateway/                      # NEW: Gateway provider implementation
│   ├── index.ts                 # Main gateway exports
│   ├── gatewayProvider.ts       # Gateway provider class
│   ├── types.ts                 # Gateway types
│   └── adapters/                # Provider-specific adapters
├── factories/
│   └── providerRegistry.ts      # Updated for gateway support
└── types/
    └── gateway.ts               # Gateway type definitions
```

#### Test Files Location

```
test/
├── gateway/                      # Gateway-specific tests
│   ├── gateway.test.ts
│   └── adapters.test.ts
└── integration/
    └── gateway-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Gateway provider exists with all main components
- [ ] **Architecture:** Follows factory pattern from NeuroLink
- [ ] **Types:** All gateway types are properly defined
- [ ] **Error handling:** Uses ErrorFactory pattern
- [ ] **Logging:** Proper logging integration
- [ ] **Tests:** Unit and integration tests exist and pass
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Implementation matches plan
- [ ] **Mastra alignment:** Follows Mastra gateway patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/gateway-provider-system
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 2: Advanced Workflow System

#### Basic Information

| Attribute               | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/workflow-system` |
| **Branch Name**         | `feat/workflow-system`                                                   |
| **Implementation Plan** | `implementation-plans/02-workflow-system-implementation-plan.md`         |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/workflows/
├── index.ts                      # Workflow exports
├── workflow.ts                   # Main workflow class
├── step.ts                       # Step definitions
├── context.ts                    # Workflow context
├── types.ts                      # Workflow types
└── vNext/                        # Next-gen workflow features
    ├── step-builder.ts
    └── workflow-builder.ts
```

Also reference:

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/workflows/inngest/
├── src/                          # Inngest workflow integration
```

#### Source Files to Verify

```
src/lib/
├── workflows/                    # NEW: Workflow system
│   ├── index.ts                 # Workflow exports
│   ├── workflow.ts              # Workflow class
│   ├── step.ts                  # Step implementation
│   ├── context.ts               # Workflow context
│   ├── types.ts                 # Workflow types
│   ├── builders/                # Step and workflow builders
│   └── execution/               # Workflow execution engine
└── types/
    └── workflows.ts             # Workflow type definitions
```

#### Test Files Location

```
test/
├── workflows/
│   ├── workflow.test.ts
│   ├── step.test.ts
│   └── execution.test.ts
└── integration/
    └── workflow-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Workflow system with steps, context, and execution
- [ ] **Step types:** Supports serial, parallel, conditional steps
- [ ] **Error recovery:** Retry logic and error handling
- [ ] **State management:** Proper workflow state tracking
- [ ] **Builders:** Step and workflow builder patterns
- [ ] **Tests:** Comprehensive workflow tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra workflow patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/workflow-system
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 3: Three-Layer Memory System

#### Basic Information

| Attribute               | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/three-layer-memory` |
| **Branch Name**         | `feat/three-layer-memory`                                                   |
| **Implementation Plan** | `implementation-plans/03-memory-system-implementation-plan.md`              |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/memory/src/
├── index.ts                      # Memory implementation (53K+ lines)
└── tools/                        # Memory tools

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/memory/
├── index.ts                      # Core memory types and interfaces
├── types.ts                      # Memory type definitions
└── utils.ts                      # Memory utilities
```

#### Source Files to Verify

```
src/lib/
├── memory/                       # ENHANCED: Three-layer memory
│   ├── index.ts                 # Memory exports
│   ├── memoryManager.ts         # Memory manager class
│   ├── layers/
│   │   ├── shortTerm.ts         # Short-term memory (session)
│   │   ├── longTerm.ts          # Long-term memory (persistent)
│   │   └── semantic.ts          # Semantic memory (vector-based)
│   ├── stores/
│   │   ├── inMemory.ts          # In-memory store
│   │   └── redis.ts             # Redis store
│   └── types.ts                 # Memory types
└── types/
    └── memory.ts                # Memory type definitions
```

#### Test Files Location

```
test/
├── memory/
│   ├── memoryManager.test.ts
│   ├── shortTerm.test.ts
│   ├── longTerm.test.ts
│   └── semantic.test.ts
└── integration/
    └── memory-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Three memory layers implemented
- [ ] **Short-term:** Session-scoped conversation memory
- [ ] **Long-term:** Persistent memory with configurable stores
- [ ] **Semantic:** Vector-based memory with embeddings
- [ ] **Store abstraction:** Pluggable storage backends
- [ ] **Thread safety:** Concurrent access handling
- [ ] **Tests:** Layer-specific and integration tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra memory patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/three-layer-memory
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 4: Vector Store Integrations

#### Basic Information

| Attribute               | Value                                                                             |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/vector-store-integration` |
| **Branch Name**         | `feat/vector-store-integration`                                                   |
| **Implementation Plan** | `implementation-plans/04-vector-stores-implementation-plan.md`                    |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/stores/
├── pg/                           # PostgreSQL with pgvector
├── pinecone/                     # Pinecone vector store
├── qdrant/                       # Qdrant vector store
├── chroma/                       # ChromaDB
├── mongodb/                      # MongoDB Atlas Vector
├── elasticsearch/                # Elasticsearch
├── opensearch/                   # OpenSearch
├── lance/                        # LanceDB
├── upstash/                      # Upstash Vector
├── libsql/                       # LibSQL/Turso
├── astra/                        # DataStax Astra
├── cloudflare/                   # Cloudflare Vectorize
├── convex/                       # Convex
├── couchbase/                    # Couchbase
├── dynamodb/                     # DynamoDB
├── clickhouse/                   # ClickHouse
├── duckdb/                       # DuckDB
└── mssql/                        # MSSQL

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/vector/
├── index.ts                      # Vector store base interface
└── types.ts                      # Vector types
```

#### Source Files to Verify

```
src/lib/
├── vectorStores/                 # NEW: Vector store integrations
│   ├── index.ts                 # Vector store exports
│   ├── base.ts                  # Base vector store class
│   ├── types.ts                 # Vector store types
│   ├── pinecone.ts              # Pinecone integration
│   ├── qdrant.ts                # Qdrant integration
│   ├── pgvector.ts              # PostgreSQL pgvector
│   ├── chroma.ts                # ChromaDB integration
│   └── factory.ts               # Vector store factory
└── types/
    └── vectorStores.ts          # Vector store type definitions
```

#### Test Files Location

```
test/
├── vectorStores/
│   ├── base.test.ts
│   ├── pinecone.test.ts
│   ├── qdrant.test.ts
│   └── pgvector.test.ts
└── integration/
    └── vector-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Multiple vector stores implemented
- [ ] **Base interface:** Common interface for all stores
- [ ] **Factory pattern:** Vector store factory for creation
- [ ] **Operations:** CRUD, search, batch operations
- [ ] **Embeddings:** Integration with embedding providers
- [ ] **Metadata filtering:** Advanced query support
- [ ] **Tests:** Store-specific tests with mocks
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra vector patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/vector-store-integration
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 5: I/O Processors

#### Basic Information

| Attribute               | Value                                                                  |
| ----------------------- | ---------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/io-processors` |
| **Branch Name**         | `feat/io-processors`                                                   |
| **Implementation Plan** | `implementation-plans/05-processors-implementation-plan.md`            |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/processors/
├── index.ts                      # Processor exports
├── input/                        # Input processors
│   ├── base.ts
│   └── transformers/
├── output/                       # Output processors
│   ├── base.ts
│   └── transformers/
└── types.ts                      # Processor types

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/rag/src/
├── document/                     # Document processing
│   ├── index.ts
│   ├── chunking/                # Chunking strategies
│   └── loaders/                 # Document loaders
└── utils/                        # RAG utilities
```

#### Source Files to Verify

```
src/lib/
├── processors/                   # NEW: I/O processor system
│   ├── index.ts                 # Processor exports
│   ├── input/
│   │   ├── base.ts              # Base input processor
│   │   ├── text.ts              # Text processor
│   │   ├── json.ts              # JSON processor
│   │   └── document.ts          # Document processor
│   ├── output/
│   │   ├── base.ts              # Base output processor
│   │   ├── json.ts              # JSON output processor
│   │   └── structured.ts        # Structured output
│   ├── pipeline.ts              # Processor pipeline
│   └── types.ts                 # Processor types
└── types/
    └── processors.ts            # Processor type definitions
```

#### Test Files Location

```
test/
├── processors/
│   ├── input.test.ts
│   ├── output.test.ts
│   └── pipeline.test.ts
└── integration/
    └── processor-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Input and output processors implemented
- [ ] **Pipeline:** Processor pipeline with chaining
- [ ] **Built-in processors:** Text, JSON, document processors
- [ ] **Custom processors:** Extension point for custom processors
- [ ] **Streaming:** Stream-compatible processing
- [ ] **Error handling:** Graceful error handling in pipeline
- [ ] **Tests:** Processor and pipeline tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra processor patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/io-processors
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 6: Evaluation & Scoring System

#### Basic Information

| Attribute               | Value                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/evaluation-scoring-system` |
| **Branch Name**         | `feat/evaluation-scoring-system`                                                   |
| **Implementation Plan** | `implementation-plans/06-evaluation-system-implementation-plan.md`                 |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/evals/src/
├── index.ts                      # Evals exports
├── constants.ts                  # Eval constants
└── scorers/                      # Scoring implementations
    ├── index.ts
    └── [scorer-files].ts

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/evals/
├── index.ts                      # Core evals
├── types.ts                      # Eval types
└── metrics/                      # Eval metrics
```

#### Source Files to Verify

```
src/lib/
├── evals/                        # NEW: Evaluation system
│   ├── index.ts                 # Eval exports
│   ├── evaluator.ts             # Main evaluator class
│   ├── scorers/
│   │   ├── base.ts              # Base scorer
│   │   ├── accuracy.ts          # Accuracy scorer
│   │   ├── relevance.ts         # Relevance scorer
│   │   ├── faithfulness.ts      # Faithfulness scorer
│   │   └── toxicity.ts          # Toxicity scorer
│   ├── metrics/
│   │   ├── index.ts             # Metrics exports
│   │   └── aggregators.ts       # Metric aggregation
│   ├── types.ts                 # Eval types
│   └── runner.ts                # Eval runner
└── types/
    └── evals.ts                 # Eval type definitions
```

#### Test Files Location

```
test/
├── evals/
│   ├── evaluator.test.ts
│   ├── scorers/
│   │   ├── accuracy.test.ts
│   │   └── relevance.test.ts
│   └── runner.test.ts
└── integration/
    └── eval-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Evaluation system with multiple scorers
- [ ] **Scorers:** Built-in scorers (accuracy, relevance, etc.)
- [ ] **Custom scorers:** Extension point for custom scorers
- [ ] **Metrics:** Aggregation and reporting
- [ ] **Runner:** Batch evaluation execution
- [ ] **LLM-as-judge:** Support for LLM-based scoring
- [ ] **Tests:** Scorer and runner tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra eval patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/evaluation-scoring-system
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 7: Multi-Agent Networks

#### Basic Information

| Attribute               | Value                                                                         |
| ----------------------- | ----------------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/multi-agent-networks` |
| **Branch Name**         | `feat/multi-agent-networks`                                                   |
| **Implementation Plan** | `implementation-plans/07-multi-agent-implementation-plan.md`                  |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/agent/
├── index.ts                      # Agent exports
├── agent.ts                      # Main agent class
├── types.ts                      # Agent types
└── tool-loop/                    # Tool execution loop

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/a2a/
├── index.ts                      # Agent-to-agent communication
└── types.ts                      # A2A types

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/loop/
├── index.ts                      # Agent loop
└── types.ts                      # Loop types
```

#### Source Files to Verify

```
src/lib/
├── agents/                       # NEW: Multi-agent system
│   ├── index.ts                 # Agent exports
│   ├── agent.ts                 # Agent class
│   ├── network.ts               # Agent network
│   ├── orchestrator.ts          # Network orchestrator
│   ├── communication/
│   │   ├── channel.ts           # Communication channels
│   │   └── protocol.ts          # Message protocol
│   ├── patterns/
│   │   ├── supervisor.ts        # Supervisor pattern
│   │   ├── hierarchical.ts      # Hierarchical pattern
│   │   └── collaborative.ts     # Collaborative pattern
│   └── types.ts                 # Agent types
└── types/
    └── agents.ts                # Agent type definitions
```

#### Test Files Location

```
test/
├── agents/
│   ├── agent.test.ts
│   ├── network.test.ts
│   ├── orchestrator.test.ts
│   └── patterns/
│       ├── supervisor.test.ts
│       └── hierarchical.test.ts
└── integration/
    └── multi-agent-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Multi-agent network system
- [ ] **Agent class:** Individual agent implementation
- [ ] **Network:** Agent network with routing
- [ ] **Orchestrator:** Network coordination
- [ ] **Communication:** Inter-agent messaging
- [ ] **Patterns:** Supervisor, hierarchical, collaborative
- [ ] **Tests:** Agent and network tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra agent patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/multi-agent-networks
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 8: Voice & Speech Integration

#### Basic Information

| Attribute               | Value                                                                             |
| ----------------------- | --------------------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/voice-speech-integration` |
| **Branch Name**         | `feat/voice-speech-integration`                                                   |
| **Implementation Plan** | `implementation-plans/08-voice-integration-implementation-plan.md`                |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/voice/
├── openai/                       # OpenAI voice
│   └── src/
├── deepgram/                     # Deepgram
│   └── src/
├── elevenlabs/                   # ElevenLabs
│   └── src/
├── azure/                        # Azure Speech
│   └── src/
├── google/                       # Google Cloud Speech
│   └── src/
├── cloudflare/                   # Cloudflare Workers AI
│   └── src/
├── gladia/                       # Gladia
│   └── src/
├── murf/                         # Murf
│   └── src/
├── playai/                       # PlayAI
│   └── src/
├── speechify/                    # Speechify
│   └── src/
├── sarvam/                       # Sarvam AI
│   └── src/
├── google-gemini-live-api/       # Gemini Live API
│   └── src/
└── openai-realtime-api/          # OpenAI Realtime API
    └── src/

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/voice/
├── index.ts                      # Voice exports
└── types.ts                      # Voice types
```

#### Source Files to Verify

```
src/lib/
├── voice/                        # NEW: Voice integration
│   ├── index.ts                 # Voice exports
│   ├── base.ts                  # Base voice provider
│   ├── types.ts                 # Voice types
│   ├── providers/
│   │   ├── openai.ts            # OpenAI voice
│   │   ├── deepgram.ts          # Deepgram
│   │   ├── elevenlabs.ts        # ElevenLabs
│   │   └── azure.ts             # Azure Speech
│   ├── stt/                     # Speech-to-text
│   │   ├── base.ts
│   │   └── providers/
│   ├── tts/                     # Text-to-speech
│   │   ├── base.ts
│   │   └── providers/
│   └── realtime/                # Real-time voice
│       ├── session.ts
│       └── handlers.ts
└── types/
    └── voice.ts                 # Voice type definitions
```

#### Test Files Location

```
test/
├── voice/
│   ├── stt.test.ts
│   ├── tts.test.ts
│   ├── realtime.test.ts
│   └── providers/
│       ├── openai.test.ts
│       └── deepgram.test.ts
└── integration/
    └── voice-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Voice provider system
- [ ] **STT:** Speech-to-text implementation
- [ ] **TTS:** Text-to-speech implementation
- [ ] **Real-time:** Real-time voice sessions
- [ ] **Providers:** Multiple voice providers
- [ ] **Streaming:** Audio streaming support
- [ ] **Tests:** Provider and integration tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra voice patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/voice-speech-integration
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 9: Observability with OpenTelemetry

#### Basic Information

| Attribute               | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/observability-otel` |
| **Branch Name**         | `feat/observability-otel`                                                   |
| **Implementation Plan** | `implementation-plans/09-observability-implementation-plan.md`              |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/observability/
├── otel-bridge/                  # OpenTelemetry bridge
│   └── src/
├── otel-exporter/                # OTel exporter
│   └── src/
├── langfuse/                     # Langfuse integration
│   └── src/
├── langsmith/                    # LangSmith integration
│   └── src/
├── datadog/                      # Datadog integration
│   └── src/
├── braintrust/                   # Braintrust integration
│   └── src/
├── arize/                        # Arize integration
│   └── src/
├── laminar/                      # Laminar integration
│   └── src/
├── posthog/                      # PostHog integration
│   └── src/
├── sentry/                       # Sentry integration
│   └── src/
└── mastra/                       # Mastra telemetry
    └── src/

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/observability/
├── index.ts                      # Observability exports
└── types.ts                      # Observability types
```

#### Source Files to Verify

```
src/lib/
├── observability/                # NEW: Observability system
│   ├── index.ts                 # Observability exports
│   ├── tracer.ts                # Tracer implementation
│   ├── metrics.ts               # Metrics collection
│   ├── exporter.ts              # Telemetry exporter
│   ├── providers/
│   │   ├── otel.ts              # OpenTelemetry provider
│   │   ├── langfuse.ts          # Langfuse integration
│   │   └── datadog.ts           # Datadog integration
│   ├── spans/
│   │   ├── llm.ts               # LLM spans
│   │   └── tool.ts              # Tool spans
│   └── types.ts                 # Observability types
└── types/
    └── observability.ts         # Observability type definitions
```

#### Test Files Location

```
test/
├── observability/
│   ├── tracer.test.ts
│   ├── metrics.test.ts
│   └── providers/
│       ├── otel.test.ts
│       └── langfuse.test.ts
└── integration/
    └── observability-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** OpenTelemetry-based observability
- [ ] **Tracer:** Span creation and propagation
- [ ] **Metrics:** Token usage, latency, error rates
- [ ] **Exporters:** Multiple export destinations
- [ ] **LLM spans:** AI-specific span attributes
- [ ] **Semantic conventions:** GenAI semantic conventions
- [ ] **Tests:** Tracer and exporter tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra observability patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/observability-otel
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

### Feature 10: Server Framework Adapters

#### Basic Information

| Attribute               | Value                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| **Worktree Path**       | `/Users/sachinsharma/Developer/temp/neurolink-fork/feat/server-adapters` |
| **Branch Name**         | `feat/server-adapters`                                                   |
| **Implementation Plan** | `implementation-plans/10-server-adapters-implementation-plan.md`         |

#### Mastra Reference Files

```
/Users/sachinsharma/Developer/temp/ai-coder/mastra/server-adapters/
├── express/                      # Express adapter
│   └── src/
├── fastify/                      # Fastify adapter
│   └── src/
├── hono/                         # Hono adapter
│   └── src/
└── koa/                          # Koa adapter
    └── src/

/Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/server/src/
├── index.ts                      # Server exports
└── [server-implementation]
```

#### Source Files to Verify

```
src/lib/
├── server/                       # NEW: Server adapters
│   ├── index.ts                 # Server exports
│   ├── base.ts                  # Base adapter class
│   ├── types.ts                 # Server types
│   ├── adapters/
│   │   ├── express.ts           # Express adapter
│   │   ├── fastify.ts           # Fastify adapter
│   │   ├── hono.ts              # Hono adapter
│   │   └── koa.ts               # Koa adapter
│   ├── routes/
│   │   ├── generate.ts          # Generate endpoint
│   │   ├── stream.ts            # Stream endpoint
│   │   └── tools.ts             # Tools endpoint
│   └── middleware/
│       ├── auth.ts              # Auth middleware
│       └── logging.ts           # Logging middleware
└── types/
    └── server.ts                # Server type definitions
```

#### Test Files Location

```
test/
├── server/
│   ├── base.test.ts
│   ├── adapters/
│   │   ├── express.test.ts
│   │   └── fastify.test.ts
│   └── routes/
│       └── generate.test.ts
└── integration/
    └── server-integration.test.ts
```

#### Verification Checklist

- [ ] **High-level:** Server adapter system
- [ ] **Adapters:** Express, Fastify, Hono, Koa adapters
- [ ] **Routes:** Standard API routes
- [ ] **Middleware:** Auth and logging middleware
- [ ] **Streaming:** Streaming response support
- [ ] **Error handling:** Proper error responses
- [ ] **Tests:** Adapter and route tests
- [ ] **Type check:** `pnpm run check` passes
- [ ] **Docs alignment:** Matches implementation plan
- [ ] **Mastra alignment:** Follows Mastra server patterns

#### Commands to Run

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/server-adapters
pnpm install
pnpm run check
pnpm test
pnpm run build
```

---

## 6. Sub-Agent Instructions

### Launching Parallel Sub-Agents

To verify all 10 features efficiently, launch parallel sub-agents:

```
For each feature (1-10):
  1. Create a sub-agent with the feature name
  2. Provide the sub-agent with:
     - This verification guide
     - The specific feature section (5.1-5.10)
     - Access to the worktree path
     - Access to the Mastra reference repository
  3. Sub-agent executes verification steps
  4. Sub-agent returns structured report
```

### Sub-Agent Verification Steps

Each sub-agent should follow these steps:

#### Step 1: Read Context (5 minutes)

1. Read the implementation plan document for the feature
2. Read the relevant Mastra reference code
3. Read relevant pattern documents
4. Understand the expected implementation

#### Step 2: Review Implementation (10 minutes)

1. Navigate to the worktree path
2. List all source files in the feature directory
3. Read main implementation files
4. Compare against implementation plan
5. Note any discrepancies

#### Step 3: Run Type Checks (2 minutes)

```bash
cd [worktree-path]
pnpm install
pnpm run check
```

- Capture any type errors
- Document all type issues

#### Step 4: Run Tests (5 minutes)

```bash
cd [worktree-path]
pnpm test
```

- Capture test results
- Note failures and their causes
- Check test coverage if available

#### Step 5: Compare Against Patterns (5 minutes)

1. Check error handling against `patterns/06-error-handling-patterns.md`
2. Check types against `patterns/02-type-system-patterns.md`
3. Check testing against `patterns/03-testing-patterns.md`
4. Note any pattern violations

#### Step 6: Generate Report (3 minutes)

Use the template in Section 7 to generate a structured report.

### Parallel Execution Strategy

```
Batch 1 (Parallel):
  - Sub-agent 1: Gateway Provider System
  - Sub-agent 2: Workflow System
  - Sub-agent 3: Memory System
  - Sub-agent 4: Vector Stores
  - Sub-agent 5: I/O Processors

Batch 2 (Parallel):
  - Sub-agent 6: Evaluation System
  - Sub-agent 7: Multi-Agent Networks
  - Sub-agent 8: Voice Integration
  - Sub-agent 9: Observability
  - Sub-agent 10: Server Adapters

After all sub-agents complete:
  - Consolidate reports
  - Generate summary
```

---

## 7. Report Templates

### Per-Feature Report Template

```markdown
# Feature Verification Report: [FEATURE NAME]

## Summary

| Metric                  | Status                  |
| ----------------------- | ----------------------- |
| Implementation Complete | YES/NO/PARTIAL          |
| Type Check              | PASS/FAIL               |
| Tests                   | PASS/FAIL (X/Y passing) |
| Plan Alignment          | FULL/PARTIAL/NONE       |
| Mastra Alignment        | FULL/PARTIAL/NONE       |

## What Was Implemented

- [List of implemented components]

## What Matches the Plan

- [List of components matching plan]

## Discrepancies Found

### Discrepancy 1: [Title]

- **Expected:** [What was expected]
- **Actual:** [What was found]
- **Impact:** [High/Medium/Low]
- **Suggested Fix:** [How to fix]
- **File(s) Affected:** [File paths]

### Discrepancy 2: [Title]

...

## Type Check Results
```

[Output of pnpm run check]

```

## Test Results
```

[Output of pnpm test]

```
- Tests Passing: X
- Tests Failing: Y
- Tests Skipped: Z

## Pattern Violations
- [ ] Error Handling: [Details]
- [ ] Type Safety: [Details]
- [ ] Testing: [Details]
- [ ] Logging: [Details]

## Recommendations
1. [Priority 1 fix]
2. [Priority 2 fix]
3. [Priority 3 fix]

## Files Reviewed
- `src/lib/[feature]/file1.ts`
- `src/lib/[feature]/file2.ts`
- `test/[feature]/test1.test.ts`
```

### Summary Consolidation Template

```markdown
# Mastra Features Verification Summary

## Overall Status

| Feature             | Implementation   | Type Check | Tests | Plan Match   | Priority |
| ------------------- | ---------------- | ---------- | ----- | ------------ | -------- |
| 1. Gateway Provider | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 2. Workflow System  | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 3. Memory System    | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 4. Vector Stores    | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 5. I/O Processors   | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 6. Evaluation       | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 7. Multi-Agent      | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 8. Voice            | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 9. Observability    | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |
| 10. Server Adapters | COMPLETE/PARTIAL | PASS/FAIL  | X/Y   | FULL/PARTIAL | P1/P2/P3 |

## Critical Issues (Must Fix)

1. [Issue description with feature and file]
2. [Issue description with feature and file]

## Major Issues (Should Fix)

1. [Issue description with feature and file]
2. [Issue description with feature and file]

## Minor Issues (Nice to Fix)

1. [Issue description with feature and file]
2. [Issue description with feature and file]

## Next Steps

1. [Prioritized action item]
2. [Prioritized action item]
3. [Prioritized action item]
```

---

## Appendix A: Quick Reference Commands

### Verify All Worktrees Exist

```bash
# Check all worktrees
git worktree list

# Verify each feature worktree
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/gateway-provider-system
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/workflow-system
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/three-layer-memory
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/vector-store-integration
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/io-processors
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/evaluation-scoring-system
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/multi-agent-networks
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/voice-speech-integration
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/observability-otel
ls -la /Users/sachinsharma/Developer/temp/neurolink-fork/feat/server-adapters
```

### Run All Checks on a Worktree

```bash
cd [worktree-path]
pnpm install
pnpm run check
pnpm test
pnpm run build
pnpm run lint
```

### Compare with Mastra Reference

```bash
# List Mastra reference for a component
ls -la /Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/[component]/

# View Mastra reference file
cat /Users/sachinsharma/Developer/temp/ai-coder/mastra/packages/core/src/[component]/index.ts
```

---

## Appendix B: Useful Skills to Load

When verifying implementations, load these skills as needed:

| Skill                            | Use Case                                         |
| -------------------------------- | ------------------------------------------------ |
| `Requesting Code Review`         | Dispatch code reviewer for implementation review |
| `Systematic Debugging`           | When tests fail or type errors occur             |
| `Verification Before Completion` | Before marking verification complete             |
| `Root Cause Tracing`             | When finding the source of discrepancies         |
| `Dispatching Parallel Agents`    | When launching multiple sub-agents               |
| `Defense-in-Depth Validation`    | When checking error handling patterns            |

---

## Appendix C: Implementation Plan Quick Links

All implementation plans are in:
`/Users/sachinsharma/Developer/temp/neurolink-fork/neurolink/docs/mastra-features-implementation/implementation-plans/`

| #   | Feature          | File                                          |
| --- | ---------------- | --------------------------------------------- |
| 01  | Gateway Provider | `01-gateway-provider-implementation-plan.md`  |
| 02  | Workflow System  | `02-workflow-system-implementation-plan.md`   |
| 03  | Memory System    | `03-memory-system-implementation-plan.md`     |
| 04  | Vector Stores    | `04-vector-stores-implementation-plan.md`     |
| 05  | I/O Processors   | `05-processors-implementation-plan.md`        |
| 06  | Evaluation       | `06-evaluation-system-implementation-plan.md` |
| 07  | Multi-Agent      | `07-multi-agent-implementation-plan.md`       |
| 08  | Voice            | `08-voice-integration-implementation-plan.md` |
| 09  | Observability    | `09-observability-implementation-plan.md`     |
| 10  | Server Adapters  | `10-server-adapters-implementation-plan.md`   |
