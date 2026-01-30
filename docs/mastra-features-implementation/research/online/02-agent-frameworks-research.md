# AI Agent Frameworks Research (2024-2025)

> **Research Date:** January 2026
> **Purpose:** Comprehensive analysis of modern AI agent frameworks and multi-agent patterns for NeuroLink multi-agent implementation
> **Scope:** LangChain, LlamaIndex, AutoGen, CrewAI, Semantic Kernel, OpenAI, Google ADK, Mastra, Vercel AI SDK, and agent communication protocols

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Market Context](#market-context)
3. [Framework Deep Dives](#framework-deep-dives)
   - [LangChain / LangGraph](#1-langchain--langgraph)
   - [LlamaIndex](#2-llamaindex)
   - [Microsoft AutoGen / Agent Framework](#3-microsoft-autogen--agent-framework)
   - [CrewAI](#4-crewai)
   - [Semantic Kernel](#5-semantic-kernel)
   - [OpenAI Assistants / Agents SDK](#6-openai-assistants--agents-sdk)
   - [Google ADK](#7-google-adk-agent-development-kit)
   - [Mastra](#8-mastra)
   - [Vercel AI SDK](#9-vercel-ai-sdk)
   - [Anthropic Agent Patterns](#10-anthropic-agent-patterns)
4. [Agent Communication Protocols](#agent-communication-protocols)
5. [Comparison Tables](#comparison-tables)
6. [Key Design Patterns](#key-design-patterns)
7. [Memory Architectures](#memory-architectures)
8. [Tool Calling Best Practices](#tool-calling-best-practices)
9. [Multi-Agent Best Practices](#multi-agent-best-practices)
10. [Recommendations for NeuroLink](#recommendations-for-neurolink)
11. [Sources](#sources)

---

## Executive Summary

The AI agent framework landscape has matured significantly in 2024-2025, with a 1,445% surge in multi-agent system inquiries (Gartner Q1 2024 to Q2 2025). Key findings:

### Market Trends

- **72% of enterprise AI projects** now involve multi-agent architectures (up from 23% in 2024)
- **Only 2% of organizations** have deployed agentic AI at scale; 61% remain in exploration
- **Average ROI of 171%** reported by companies deploying agentic AI
- **45% faster problem resolution** and **60% more accurate outcomes** with multi-agent vs. single-agent

### Key Insights

1. **Simplicity wins:** Anthropic's research shows the most successful implementations use simple, composable patterns rather than complex frameworks
2. **Graph-based architectures dominate:** LangGraph, LlamaIndex Workflows, and Google ADK all use graph/state machine models
3. **Protocol standardization is happening:** MCP (Anthropic) and A2A (Google) are emerging as complementary standards
4. **Microsoft convergence:** AutoGen and Semantic Kernel merged into Microsoft Agent Framework (October 2025)
5. **TypeScript rising:** Mastra, Vercel AI SDK, and Google ADK TypeScript are gaining traction

---

## Market Context

| Metric                          | 2024  | 2025     | Source             |
| ------------------------------- | ----- | -------- | ------------------ |
| Multi-agent enterprise projects | 23%   | 72%      | Industry surveys   |
| Agentic AI market size          | $5.4B | $7.6B    | Market research    |
| Projected market (2034)         | -     | $196.6B  | Market projections |
| Enterprise ROI                  | -     | 171% avg | Deployment data    |
| Fortune 500 using CrewAI        | -     | 60%      | CrewAI metrics     |

---

## Framework Deep Dives

### 1. LangChain / LangGraph

**Overview:** LangChain is an open-source framework with pre-built agent architectures. LangGraph (launched early 2024) extends it with graph-based agentic workflows for complex scenarios involving loops and cycles.

**Architecture:**

- **Graph-Based Runtime:** Agents modeled as graphs using State, Nodes, and Edges
- **ReAct Pattern:** Alternates reasoning ("thoughts") with acting (invoking tools)
- **Durable Runtime:** Built-in persistence, rewind, checkpointing, human-in-the-loop

**Key Components:**

```
State → Shared data representing application's current snapshot
Nodes → Encode agent logic, receive/return State
Edges → Define next Node based on current State
```

**Agent Architectures Supported:**

1. **ReAct** - Tight integration between reasoning and action (most common)
2. **Self-Ask** - Agent asks itself sub-questions
3. **Plan-and-Execute** - Planner generates steps, executor runs them

**Production Features:**

- OpenTelemetry integration for observability
- LangSmith for debugging and tracing
- Middleware system for extending behavior
- Human-in-the-loop approval flows

**Best For:** Engineering teams building custom, complex workflows who value explicit state handling and broad integration support.

**Limitations:** Learning curve for graph concepts; requires understanding operator overloading syntax.

**URLs:**

- [LangChain Docs](https://docs.langchain.com/)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [ReAct Agent How-To](https://langchain-ai.github.io/langgraph/how-tos/react-agent-from-scratch/)

---

### 2. LlamaIndex

**Overview:** Originally focused on RAG, LlamaIndex has evolved into a comprehensive framework with Workflows (event-based orchestration) and AgentWorkflow for multi-agent systems.

**Architecture:**

- **Workflows:** Event-based system connecting execution steps via emitted events
- **AgentWorkflow:** Coordinates multiple agents with state management and tool access

**Agent Types:**

1. **FunctionAgent** - For models with native function calling (OpenAI, Anthropic)
2. **ReActAgent** - For models without function calling

**Key Patterns:**

- **Distributed Service Architecture:** Each agent as independent microservice
- **Orchestrator Pattern:** Central orchestrator routes to sub-agents
- **Custom Planner:** DIY LLM prompts for execution planning

**2025 Developments:**

- **Agentic Document Workflows (ADW):** Combines document processing, retrieval, structured outputs, and agentic orchestration
- **LlamaAgents:** One-click document agent deployment

**Best For:** Applications primarily searching documents, connecting to databases, or needing sophisticated indexing (100+ data connectors).

**Strengths:** Purpose-built retrieval infrastructure; simple Pythonic abstractions.

**Limitations:** Overkill for agent orchestration beyond retrieval.

**URLs:**

- [LlamaIndex Docs](https://www.llamaindex.ai/docs)
- [Workflows Guide](https://www.llamaindex.ai/workflows)
- [llama-agents Introduction](https://www.llamaindex.ai/blog/introducing-llama-agents-a-powerful-framework-for-building-production-multi-agent-ai-systems)

---

### 3. Microsoft AutoGen / Agent Framework

**Overview:** AutoGen became the leading open-source multi-agent framework after Fall 2023 launch. In October 2025, Microsoft merged AutoGen with Semantic Kernel into the unified **Microsoft Agent Framework**.

**AutoGen v0.4 Architecture:**

- **Actor Model:** Adopted for multi-agent systems
- **Event-Driven:** Asynchronous, robust architecture
- **Three Layers:**
  1. Core API - Message passing, distributed runtime
  2. AgentChat API - Rapid prototyping, common patterns
  3. Extensions API - First/third-party capabilities

**Orchestration Patterns:**
| Pattern | Description |
|---------|-------------|
| Sequential | Step-by-step workflows |
| Concurrent | Agents work in parallel |
| Group Chat | Agents brainstorm collaboratively |
| Handoff | Responsibility moves between agents |
| Magentic | Manager coordinates specialists |

**Microsoft Agent Framework (2025):**

- Merges AutoGen + Semantic Kernel
- Unified orchestrator for .NET and Python
- Workflows for explicit multi-agent control
- State management for long-running/HITL scenarios
- GA target: Q1 2026

**Best For:** Enterprise deployments needing distributed agent networks, .NET integration, and Azure ecosystem.

**URLs:**

- [AutoGen GitHub](https://github.com/microsoft/autogen)
- [Microsoft Agent Framework Overview](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [AutoGen v0.4 Research](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/)

---

### 4. CrewAI

**Overview:** A lean, lightning-fast Python framework built entirely from scratch (independent of LangChain). Uses role-based agent teams mimicking real-world organizations.

**Architecture:**

- **Crews:** Teams of autonomous agents
- **Flows:** Event-driven workflows managing state and execution
- **Role-Based Design:** Manager, Worker, Researcher agents

**Task Execution Models:**

- Sequential processing
- Parallel processing
- Conditional processing
- Hierarchical coordination

**Memory Architecture:**

- ChromaDB vectors for short-term memory
- SQLite for task results
- Entity memory via embeddings

**Enterprise Adoption (2025):**

- $18M Series A funding
- $3.2M revenue by July 2025
- 100,000+ agent executions per day
- 150+ enterprise customers
- 60% of Fortune 500 companies using CrewAI
- 1.4B agentic automations (IBM, PwC, Capgemini, NVIDIA)

**Best For:** Teams wanting quick deployment with human-in-the-loop support without workflow complexity. Fastest path from idea to working multi-agent system.

**Limitations:** Limited ceiling for complex customization. Teams report hitting walls 6-12 months in for non-standard orchestration patterns.

**URLs:**

- [CrewAI GitHub](https://github.com/crewAIInc/crewAI)
- [CrewAI Docs](https://docs.crewai.com/en/introduction)
- [CrewAI Platform](https://www.crewai.com/)

---

### 5. Semantic Kernel

**Overview:** Microsoft's SDK for building AI agents, now merged with AutoGen into Microsoft Agent Framework. Provides a platform for AI agents within the Semantic Kernel ecosystem.

**Architecture:**

- **Agent Thread Abstraction:** Manages conversation state across different agent types
- **Orchestration Patterns:** Concurrent, Sequential, Handoff, Group Chat, Magentic
- **Process Framework:** Event-driven workflows with Dapr/Orleans for distributed applications

**Key Features:**

- Model Context Protocol (MCP) integration
- OpenTelemetry observability
- Azure Monitor integration
- Entra ID authentication
- YAML/JSON declarative agent definitions

**Orchestration Patterns:**

```
Concurrent → Multiple agents work simultaneously
Sequential → Step-by-step execution
Handoff   → Agent-to-agent responsibility transfer
Group Chat → Collaborative multi-agent discussions
Magentic  → Manager coordinates specialists
```

**Best For:** .NET developers building enterprise AI applications with Azure integration.

**URLs:**

- [Semantic Kernel Agent Architecture](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/agent-architecture)
- [Semantic Kernel Framework](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/)
- [Semantic Kernel Blog](https://devblogs.microsoft.com/semantic-kernel/)

---

### 6. OpenAI Assistants / Agents SDK

**Overview:** OpenAI is deprecating the Assistants API in favor of the Responses API (sunset mid-2026). The Agents SDK provides production-ready agent building tools.

**Key Transition:**
| Assistants API | Responses API |
|----------------|---------------|
| Beta since 2023 | Future direction |
| Sunset mid-2026 | Active development |
| Thread-based | More flexible |
| Code Interpreter tool | Built-in tools |

**Agents SDK Features:**

- Code-first workflow logic
- Flexible agent orchestration
- No pre-defined graph requirements

**AgentKit (2025):**

- Visual canvas for composing logic
- Connector Registry for data connections
- ChatKit for embedded chat experiences
- Preview runs, inline eval configuration
- Full versioning

**Multi-Agent Patterns:**

- **Prompt Templates:** Flexible base prompts with policy variables
- **Decentralized Pattern:** Agents on equal footing with handoff capability
- **Orchestrator Pattern:** Central routing with explicit control

**Best Practices:**

- Use Evals for well-structured datasets
- Run trace grading to find workflow failures
- Measure performance with key metrics
- Benchmark against third-party models

**URLs:**

- [OpenAI Agents Cookbook](https://cookbook.openai.com/topic/agents)
- [Assistants Migration Guide](https://platform.openai.com/docs/assistants/migration)
- [AgentKit Introduction](https://openai.com/index/introducing-agentkit/)
- [Building Agents Guide (PDF)](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)

---

### 7. Google ADK (Agent Development Kit)

**Overview:** Flexible, modular framework optimized for Gemini and Google ecosystem, but model-agnostic and deployment-agnostic. Makes agent development feel like software development.

**Core Architecture:**

- **Event-Driven Runtime:** Streams events rather than single responses
- **Ask-Yield Pattern:** Bidirectional communication between Runner and Execution Logic
- **State Management:** Session-based short-term + Memory services for long-term

**Agent Types:**
| Type | Description |
|------|-------------|
| LLM Agents | LlmAgent using LLMs for reasoning, planning, dynamic decisions |
| Workflow Agents | SequentialAgent, ParallelAgent, LoopAgent for deterministic flows |
| Custom Agents | Extend BaseAgent for unique logic |

**Multi-Agent Patterns:**

1. **Sequential Pipeline** - Assembly line, linear, deterministic
2. **Coordinator/Orchestrator** - Central LlmAgent routes to specialists
3. **Hierarchical Delegation** - Parent to child delegation
4. **Peer Delegation** - Agent to agent at same level
5. **Router Agents** - Complex routing through specialized routers

**Key Features:**

- Multi-Agent System Design with hierarchical arrangement
- Rich Tool Ecosystem (FunctionTool, AgentTool, built-ins)
- State and Memory Management (Session-based + Memory services)
- TypeScript support (launched 2025)

**Best For:** Google Cloud integration, teams wanting microservices-like agent architecture.

**URLs:**

- [Google ADK Docs](https://google.github.io/adk-docs/)
- [Multi-Agent Patterns Guide](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [ADK GitHub (Python)](https://github.com/google/adk-python)

---

### 8. Mastra

**Overview:** Purpose-built TypeScript framework from the team behind Gatsby. Designed around established AI patterns with a modern TypeScript stack.

**Core Primitives:**

- Agents, Tools, Workflows
- Memory, RAG components
- Agent networks

**Workflow Architecture:**

- Graph-based state machines
- Composable steps with `createStep`
- Chaining via `.then()`, `.branch()`, `.parallel()`

**Memory Features:**

- Dynamic memory configuration
- Runtime context swapping (user tier, environment, feature flags)
- Environment-aware memory
- Async memory initialization

**Key Differentiators:**

- Built on Vercel AI SDK
- Plain TypeScript definitions
- Automatic streaming, retries, evals
- Type-safe REST layer

**Resources (2025):**

- "Patterns for Building AI Agents" book covering agent design, context engineering, evals, security

**Best For:** TypeScript/JavaScript developers building modern web stack AI applications.

**URLs:**

- [Mastra GitHub](https://github.com/mastra-ai/mastra)
- [Mastra Docs](https://mastra.ai/docs)
- [Patterns Book Announcement](https://mastra.ai/blog/patterns-book)

---

### 9. Vercel AI SDK

**Overview:** Built specifically for the modern web stack. Provides high-level orchestration handling agentic behaviors like tool-calling loops and streaming UI states.

**AI SDK 6 (Latest):**

- **Agent Abstraction:** Define once, use across application
- **Human-in-the-Loop:** `needsApproval` flag for critical actions
- **ToolLoopAgent Class:** Production-ready tool execution loop

**AI SDK 5 - Agentic Control:**

- **`stopWhen`:** Define tool-calling loop termination conditions
- **`prepareStep`:** Control settings for each step
- **Lightweight Agent Class:** Wraps `generateText` and `streamText`

**Workflow Patterns Supported:**

- Chaining
- Routing
- Parallel
- Evaluator-optimizer

**Best Practices:**

- Use if statements, loops, switches as needed
- Refine prompts for quality
- Make tool calls more precise
- Replace model calls with deterministic functions where possible

**Best For:** React/Next.js/Node.js applications needing streaming UI and agentic behaviors.

**URLs:**

- [AI SDK Docs](https://ai-sdk.dev/docs/introduction)
- [AI SDK 6 Blog](https://vercel.com/blog/ai-sdk-6)
- [Agents Overview](https://sdk.vercel.ai/docs/foundations/agents)
- [Building AI Agents Guide](https://vercel.com/kb/guide/how-to-build-ai-agents-with-vercel-and-the-ai-sdk)

---

### 10. Anthropic Agent Patterns

**Overview:** Anthropic's research with dozens of teams building LLM agents consistently shows the most successful implementations use simple, composable patterns.

**Three Core Principles:**

1. **Maintain simplicity** in agent design
2. **Prioritize transparency** by showing planning steps
3. **Carefully craft ACI** (Agent-Computer Interface) through thorough tool documentation

**Composable Patterns:**
| Pattern | Use Case |
|---------|----------|
| Prompt Chaining | Sequential processing steps |
| Routing | Direct requests to appropriate handlers |
| Parallelization | Concurrent processing |
| Orchestrator-Workers | Central coordinator with specialized workers |
| Evaluator-Optimizer | Iterative improvement loops |

**Framework Recommendation:**

> "Frameworks often create extra layers of abstraction that can obscure the underlying prompts and responses, making them harder to debug. Start by using LLM APIs directly: many patterns can be implemented in a few lines of code."

**Agent Feedback Loop:**

```
gather context → take action → verify work → repeat
```

**Claude Agent SDK:**

- Give agents a computer (computer use capability)
- Agents work like humans do
- Initializer agent + Coding agent for long-running tasks

**Agent Skills:**

- Organized folders of instructions, scripts, resources
- Progressive disclosure design principle
- Dynamic loading as needed

**URLs:**

- [Building Effective AI Agents](https://www.anthropic.com/research/building-effective-agents)
- [Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Long-Running Agent Harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic Cookbook - Agents](https://github.com/anthropics/anthropic-cookbook/tree/main/patterns/agents)

---

## Agent Communication Protocols

### Model Context Protocol (MCP)

**Origin:** Created by Anthropic (November 2024), now governed by Linux Foundation (December 2025)

**Purpose:** Open standard for connecting AI applications with external tools, databases, and services. Universal integration layer eliminating ad hoc connectors.

**Architecture:**

```
MCP Host → Application environment
MCP Clients → Agent communication handlers
MCP Servers → Expose tools, resources, prompts
```

**Benefits:**

- Standardized interface for tool access
- Enhanced modularity and interoperability
- Single server can serve multiple agents across frameworks/vendors

---

### Agent-to-Agent (A2A) Protocol

**Origin:** Launched by Google and partners (April 2025), now Linux Foundation project

**Purpose:** Open standard for agent interoperability across vendors, frameworks, and modalities.

**Key Features:**

- **Capability Discovery:** JSON-based Agent Card publishing
- **Task Lifecycle Management:** Instant responses + long-running processes
- **Enterprise Security:** OpenAPI-aligned authentication/authorization

**Adoption:** 50+ technology partners including Microsoft and Salesforce

---

### Other Protocols

| Protocol                           | Origin             | Focus                                 |
| ---------------------------------- | ------------------ | ------------------------------------- |
| ACP (Agent Communication Protocol) | IBM Research/BeeAI | Local environment agent communication |
| ANP (Agent Network Protocol)       | Various            | Decentralized collaboration           |

### MCP vs A2A: Complementary Roles

| Aspect  | MCP                         | A2A                              |
| ------- | --------------------------- | -------------------------------- |
| Focus   | Model-tool interactions     | Agent-to-agent coordination      |
| Scope   | External tools/data         | Cross-system agent collaboration |
| Example | Inventory agent ↔ database | Order agent ↔ supplier agents   |

**Hybrid Approach:** Organizations combining MCP for tool connections and A2A for agent coordination.

**URLs:**

- [MCP vs A2A Guide (Auth0)](https://auth0.com/blog/mcp-vs-a2a/)
- [Agent Interoperability Survey](https://arxiv.org/html/2505.02279v1)
- [A2A Protocol (IBM)](https://www.ibm.com/think/topics/agent2agent-protocol)

---

## Comparison Tables

### Framework Feature Comparison

| Framework           | Language     | Multi-Agent | Graph/State     | Memory  | HITL | MCP Support |
| ------------------- | ------------ | ----------- | --------------- | ------- | ---- | ----------- |
| LangChain/LangGraph | Python, JS   | Yes         | Yes (graphs)    | Yes     | Yes  | Yes         |
| LlamaIndex          | Python, TS   | Yes         | Yes (workflows) | Yes     | Yes  | Yes         |
| AutoGen/MS Agent    | Python, .NET | Yes         | Yes (events)    | Yes     | Yes  | Planned     |
| CrewAI              | Python       | Yes         | Yes (flows)     | Yes     | Yes  | Limited     |
| Semantic Kernel     | .NET, Python | Yes         | Yes             | Yes     | Yes  | Yes         |
| OpenAI Agents       | Python       | Limited     | No              | Limited | Yes  | No          |
| Google ADK          | Python, TS   | Yes         | Yes (events)    | Yes     | Yes  | Via tools   |
| Mastra              | TypeScript   | Yes         | Yes             | Yes     | Yes  | Via SDK     |
| Vercel AI SDK       | TypeScript   | Limited     | No              | Limited | Yes  | Via tools   |

### Orchestration Pattern Support

| Pattern        | LangGraph | LlamaIndex | AutoGen | CrewAI  | Semantic Kernel | Google ADK |
| -------------- | --------- | ---------- | ------- | ------- | --------------- | ---------- |
| Sequential     | Yes       | Yes        | Yes     | Yes     | Yes             | Yes        |
| Parallel       | Yes       | Yes        | Yes     | Yes     | Yes             | Yes        |
| Group Chat     | Yes       | Yes        | Yes     | Yes     | Yes             | Yes        |
| Handoff        | Yes       | Yes        | Yes     | Yes     | Yes             | Yes        |
| Hierarchical   | Yes       | Yes        | Yes     | Yes     | Yes             | Yes        |
| Custom Routing | Yes       | Yes        | Yes     | Limited | Yes             | Yes        |

### Enterprise Readiness

| Framework        | Production Use | Observability | Security   | Cloud Integration | Documentation |
| ---------------- | -------------- | ------------- | ---------- | ----------------- | ------------- |
| LangGraph        | High           | LangSmith     | Good       | Multi-cloud       | Excellent     |
| LlamaIndex       | High           | Good          | Good       | Multi-cloud       | Good          |
| AutoGen/MS Agent | High           | OpenTelemetry | Enterprise | Azure             | Good          |
| CrewAI           | High           | Limited       | Good       | Limited           | Good          |
| Google ADK       | Medium         | Good          | Enterprise | Google Cloud      | Good          |
| Vercel AI SDK    | High           | Good          | Good       | Vercel            | Excellent     |

---

## Key Design Patterns

### 1. ReAct (Reasoning + Acting)

**Description:** LLM alternates between reasoning ("thoughts") and acting (invoking tools), iterating until confident final answer.

**Use When:** Tasks require tool interaction, dynamic adaptation, and unknown solution paths.

```
User Query → Reason → Act → Observe → Reason → Act → ... → Final Answer
```

**Supported By:** LangChain, LlamaIndex, Google ADK, all major frameworks

---

### 2. Plan-and-Execute

**Description:** Separate planning phase from execution phase. Planner generates step-by-step plan; executor runs it.

**Use When:** Complex tasks where sequence of actions needs to be determined upfront.

```
User Query → Planner → [Step 1, Step 2, ...] → Executor → Results
```

---

### 3. Orchestrator-Workers

**Description:** Central coordinator receives tasks, breaks into subtasks, delegates to specialists, aggregates results.

**Implementation:**

```
                    ┌─────────────┐
                    │ Orchestrator│
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  Worker A   │ │  Worker B   │ │  Worker C   │
    │ (Specialist)│ │ (Specialist)│ │ (Specialist)│
    └─────────────┘ └─────────────┘ └─────────────┘
```

---

### 4. Hierarchical

**Description:** Layered structure where high-level agents handle planning, low-level agents manage execution.

**Use When:** Complex organizations with different authority levels and responsibilities.

---

### 5. Scatter-Gather

**Description:** Tasks distributed to multiple agents, results consolidated downstream.

**Use When:** Independent subtasks that can be parallelized.

---

### 6. Pipeline Parallelism

**Description:** Different agents handle sequential stages of a process concurrently.

---

### 7. Human-in-the-Loop

**Description:** Execution pauses at decision points for human review and input.

**Best Practices:**

- Define clear approval gates
- Provide context for decisions
- Allow override/modification
- Log all human interventions

---

## Memory Architectures

### Memory Types

| Type                    | Purpose                      | Implementation                        |
| ----------------------- | ---------------------------- | ------------------------------------- |
| Short-Term Memory (STM) | Immediate context processing | Context window                        |
| Long-Term Memory (LTM)  | Cross-session storage        | Databases, vector embeddings          |
| Episodic Memory         | Past interaction recall      | Event logs, conversation history      |
| Semantic Memory         | Factual knowledge            | Knowledge graphs, embeddings          |
| Procedural Memory       | How-to knowledge             | Skill libraries, function definitions |

### Modern Architectures (2024-2025)

**Token-Level Memory:**

- Stored as explicit, editable units
- Highly transparent
- Good for tasks requiring clear reasoning

**Parametric Memory:**

- Embedded in model weights
- Less transparent but more integrated

**Latent Memory:**

- Compressed representations
- Balance of efficiency and expressiveness

### Key Research Systems

| System                | Focus            | Key Innovation                                |
| --------------------- | ---------------- | --------------------------------------------- |
| Mem0                  | Production LTM   | Scalable long-term memory                     |
| A-MEM                 | Agentic memory   | Note construction, link generation, evolution |
| Titans/MIRAS (Google) | Test-time memory | "Surprise" metrics for dynamic memorization   |

### Implementation Recommendations

1. **Use vector stores** for similarity-based retrieval
2. **Knowledge graphs** for relationship-aware recall
3. **Episodic modules** for experience-based learning
4. **Hierarchical memory graphs** for dependency tracking

---

## Tool Calling Best Practices

### Core Principles

1. **Clear Function Definitions:** Detailed names, parameter descriptions
2. **Strict Mode:** Enable JSON schema validation (OpenAI recommendation)
3. **Function Limits:** Aim for fewer than 20 functions at once
4. **Token Awareness:** Functions count against context limit

### OpenAI Recommendations

```javascript
// Enable strict mode for reliability
const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get weather for a location",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          location: { type: "string" },
        },
        required: ["location"],
        additionalProperties: false, // Required for strict mode
      },
    },
  },
];
```

### Debugging Checklist

| Issue                  | Check                                   |
| ---------------------- | --------------------------------------- |
| Wrong tool selection   | Tool definitions need more clarity      |
| Bad arguments          | Parameter descriptions need improvement |
| Missing context        | Add more guidance to tool definition    |
| Misinterpreted results | Review observation handling logic       |

### Fine-Tuning Consideration

Consider fine-tuning for:

- Large numbers of functions (20+)
- Difficult or domain-specific tasks
- High accuracy requirements

---

## Multi-Agent Best Practices

### Design Principles

1. **Modular Architecture:** Combine specialized agents rather than one "do-everything" agent
2. **Explicit State Handling:** Use graph/state machine models for traceability
3. **Human-in-the-Loop:** Design for hybrid human-agent systems
4. **Progressive Complexity:** Start simple, add sophistication as needed

### UiPath's 10 Best Practices (2025)

1. Build modular systems with specialized agents
2. Start with a single high-value workflow
3. Choose platform aligned with tech stack
4. Build first orchestration with 2-3 agents
5. Measure everything
6. Scale what works
7. Implement human approval gates
8. Use structured reasoning for complex workflows
9. Define clear task decomposition
10. Validate with evaluation datasets

### Anthropic's Guidance

> "Success in the LLM space isn't about building the most sophisticated system. It's about building the right system for your needs. Start with simple prompts, optimize them with comprehensive evaluation, and add multi-step agentic systems only when simpler solutions fall short."

### Enterprise Considerations

| Consideration | Recommendation                                           |
| ------------- | -------------------------------------------------------- |
| Security      | Store API keys in env vars; implement input sanitization |
| Observability | Use OpenTelemetry; implement comprehensive logging       |
| Testing       | Use evaluation datasets, trace logs, regression metrics  |
| Governance    | Define clear authority levels and escalation paths       |

---

## Recommendations for NeuroLink

### Strategic Recommendations

#### 1. Adopt Graph-Based Orchestration

**Rationale:** All major frameworks (LangGraph, LlamaIndex, Google ADK) use graph/state machine models. This provides:

- Traceable, debuggable flows
- Clear state management
- Support for complex patterns (loops, branches, parallelism)

**Implementation:**

```typescript
// Proposed NeuroLink Agent Graph API
const workflow = neurolink.createAgentGraph({
  nodes: {
    planner: PlannerAgent,
    executor: ExecutorAgent,
    validator: ValidatorAgent,
  },
  edges: {
    planner: { next: "executor" },
    executor: {
      success: "validator",
      retry: "executor",
      fail: "planner",
    },
    validator: {
      pass: "end",
      fail: "planner",
    },
  },
});
```

#### 2. Support Multiple Orchestration Patterns

**Priority Patterns:**

1. **Sequential** - Core pattern, simple workflows
2. **Orchestrator-Workers** - Most common enterprise pattern
3. **Parallel/Scatter-Gather** - Performance optimization
4. **Human-in-the-Loop** - Enterprise requirement

#### 3. Implement Composable Agent Primitives

**Based on Anthropic's patterns:**

- Prompt chaining
- Routing
- Parallelization
- Orchestrator-workers
- Evaluator-optimizer

#### 4. Add Memory Layer

**Tiered Memory System:**

```typescript
// Proposed Memory Configuration
const memory = neurolink.createMemory({
  shortTerm: { type: "context-window" },
  longTerm: {
    type: "redis",
    ttl: "30d",
    indexing: "vector",
  },
  episodic: {
    type: "postgres",
    retention: "90d",
  },
});
```

#### 5. Extend MCP Integration for Agent Communication

NeuroLink already supports MCP for tools. Extend to:

- Agent-to-agent communication via MCP
- Tool discovery across agents
- Shared context propagation

#### 6. TypeScript-First Design

Align with:

- Mastra's patterns
- Vercel AI SDK conventions
- Google ADK TypeScript

### Implementation Phases

#### Phase 1: Foundation (Core Agent Abstractions)

- Agent base class with lifecycle hooks
- Tool binding and execution
- Single-agent orchestration
- Memory abstraction layer

#### Phase 2: Multi-Agent (Orchestration Patterns)

- Graph-based workflow engine
- Sequential, parallel, and conditional execution
- Orchestrator-workers pattern
- State management

#### Phase 3: Enterprise (Production Features)

- Human-in-the-loop with approval gates
- Observability (OpenTelemetry integration)
- Advanced memory (vector + episodic)
- A2A protocol support (future)

### API Design Principles

1. **Progressive Disclosure:** Simple things simple, complex things possible
2. **Type Safety:** Full TypeScript types for all agent configurations
3. **Composability:** Small, combinable primitives
4. **Framework Compatibility:** Work with existing NeuroLink providers/tools

### Reference Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        NeuroLink                              │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   Agents    │  │  Workflows  │  │   Memory    │           │
│  │  (Factory)  │  │  (Graphs)   │  │  (Tiered)   │           │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │
│         │                │                │                   │
│  ┌──────▼────────────────▼────────────────▼──────┐           │
│  │              Orchestration Layer               │           │
│  │   (Sequential | Parallel | Coordinator | HITL) │           │
│  └────────────────────────┬──────────────────────┘           │
│                           │                                   │
│  ┌────────────────────────▼──────────────────────┐           │
│  │               Provider Layer                   │           │
│  │  (OpenAI | Anthropic | Gemini | Bedrock | ...) │           │
│  └────────────────────────┬──────────────────────┘           │
│                           │                                   │
│  ┌────────────────────────▼──────────────────────┐           │
│  │                 Tool Layer                     │           │
│  │           (MCP | Built-in | Custom)            │           │
│  └───────────────────────────────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

---

## Sources

### Framework Documentation

- [LangChain Docs](https://docs.langchain.com/)
- [LangGraph GitHub](https://github.com/langchain-ai/langgraph)
- [LlamaIndex Docs](https://www.llamaindex.ai/docs)
- [AutoGen GitHub](https://github.com/microsoft/autogen)
- [Microsoft Agent Framework](https://learn.microsoft.com/en-us/agent-framework/overview/agent-framework-overview)
- [CrewAI Docs](https://docs.crewai.com/en/introduction)
- [Semantic Kernel Agent Framework](https://learn.microsoft.com/en-us/semantic-kernel/frameworks/agent/)
- [OpenAI Agents Cookbook](https://cookbook.openai.com/topic/agents)
- [Google ADK Docs](https://google.github.io/adk-docs/)
- [Mastra Docs](https://mastra.ai/docs)
- [Vercel AI SDK Docs](https://ai-sdk.dev/docs/introduction)

### Research & Best Practices

- [Anthropic: Building Effective AI Agents](https://www.anthropic.com/research/building-effective-agents)
- [Anthropic: Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
- [Anthropic: Long-Running Agent Harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [OpenAI: Practical Guide to Building Agents (PDF)](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)
- [Google: Multi-Agent Patterns in ADK](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)
- [UiPath: Agent Builder Best Practices](https://www.uipath.com/blog/ai/agent-builder-best-practices)

### Communication Protocols

- [MCP vs A2A Guide (Auth0)](https://auth0.com/blog/mcp-vs-a2a/)
- [Agent Interoperability Protocols Survey](https://arxiv.org/html/2505.02279v1)
- [A2A Protocol (IBM)](https://www.ibm.com/think/topics/agent2agent-protocol)
- [MCP vs A2A (TrueFoundry)](https://www.truefoundry.com/blog/mcp-vs-a2a)

### Memory Systems

- [Memory in the Age of AI Agents (arXiv)](https://arxiv.org/abs/2512.13564)
- [AI Agent Memory (IBM)](https://www.ibm.com/think/topics/ai-agent-memory)
- [Mem0: Production-Ready AI Agents](https://arxiv.org/pdf/2504.19413)
- [AWS AgentCore Long-Term Memory](https://aws.amazon.com/blogs/machine-learning/building-smarter-ai-agents-agentcore-long-term-memory-deep-dive/)

### Tool Calling

- [Function Calling Guide (Prompt Engineering Guide)](https://www.promptingguide.ai/agents/function-calling)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Google Gemini Function Calling](https://sparkco.ai/blog/mastering-google-gemini-function-calling-in-2025)

### Industry Analysis

- [AI Agent Framework Landscape 2025 (Medium)](https://medium.com/@hieutrantrung.it/the-ai-agent-framework-landscape-in-2025-what-changed-and-what-matters-3cd9b07ef2c3)
- [Agentic AI Frameworks Enterprise Guide 2025](https://www.spaceo.ai/blog/agentic-ai-frameworks/)
- [Multi-Agent Orchestration 2025-2026](https://www.onabout.ai/p/mastering-multi-agent-orchestration-architectures-patterns-roi-benchmarks-for-2025-2026)
- [Top LLM Frameworks 2026](https://www.secondtalent.com/resources/top-llm-frameworks-for-building-ai-agents/)

---

_Document generated for NeuroLink multi-agent implementation planning. Last updated: January 2026._
