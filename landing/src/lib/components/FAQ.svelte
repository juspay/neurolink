<script lang="ts">
  import { reveal } from "$lib/actions/reveal";

  const faqs = [
    {
      question: "What is NeuroLink?",
      answer:
        "NeuroLink is an open-source TypeScript AI SDK that provides unified access to 13+ AI providers (OpenAI, Anthropic, Google, AWS Bedrock, Azure, Mistral, and more) through a single consistent API. It includes RAG processing, MCP integration, multi-agent workflows, voice support, and handles 50+ file types — all in one npm package.",
    },
    {
      question: "Is NeuroLink free to use?",
      answer:
        "Yes. NeuroLink is fully open source under the MIT license and free to use in both personal and commercial projects. There are no usage fees, no vendor lock-in, and no premium tiers. You only pay for the AI provider API calls (OpenAI, Anthropic, etc.) you make through it.",
    },
    {
      question: "How does NeuroLink compare to LangChain or Vercel AI SDK?",
      answer:
        "NeuroLink is a single TypeScript package that includes providers, RAG (9 chunking strategies, 22 vector stores), MCP integration with 58+ servers, multi-agent workflows, voice processing, and observability. LangChain requires multiple packages (LangChain + LangGraph + LangSmith) and is Python-first. Vercel AI SDK focuses on provider abstraction but lacks native RAG, agents, voice, and workflow support.",
    },
    {
      question: "What AI providers does NeuroLink support?",
      answer:
        "NeuroLink supports 13+ providers including OpenAI, Anthropic Claude, Google AI Studio (Gemini), Google Vertex AI, AWS Bedrock, Azure OpenAI, Mistral, LiteLLM (100+ models via proxy), Ollama (local models), Hugging Face, AWS SageMaker, OpenRouter, and any OpenAI-compatible endpoint. Switch providers with a single config change — no code modifications needed.",
    },
    {
      question: "Where did NeuroLink come from?",
      answer:
        "NeuroLink was extracted from production systems at Juspay, a fintech company processing enterprise-scale transactions. It's battle-tested infrastructure, not a weekend project. The SDK represents 193K+ lines of TypeScript across 447 source files with comprehensive test coverage.",
    },
    {
      question: "What is MCP and how does NeuroLink use it?",
      answer:
        "MCP (Model Context Protocol) is an open standard for connecting AI models to external tools and data sources. NeuroLink integrates with 58+ MCP servers (GitHub, Slack, databases, file systems) across 4 transport types (stdio, HTTP, SSE, WebSocket). It also includes unique MCP enhancements like ToolRouter, ToolCache, and RequestBatcher that no competitor offers.",
    },
    {
      question: "Can I use NeuroLink with local/self-hosted models?",
      answer:
        "Yes. NeuroLink supports Ollama for local model inference — run Llama, Mistral, CodeLlama, and other open-source models entirely on your machine with zero API costs. It also supports LiteLLM proxy (100+ models), vLLM, LocalAI, and any OpenAI-compatible endpoint for self-hosted deployments.",
    },
    {
      question: "Does NeuroLink support RAG (Retrieval-Augmented Generation)?",
      answer:
        "Yes. NeuroLink includes a complete RAG pipeline with 9 chunking strategies (character, recursive, sentence, token, markdown, HTML, JSON, LaTeX, semantic), 22 vector store adapters, hybrid search combining BM25 lexical search with vector similarity, and 5 reranker types. Pass files directly to generate() and NeuroLink handles chunking, embedding, and retrieval automatically.",
    },
    {
      question: "What file types can NeuroLink process?",
      answer:
        "NeuroLink supports 50+ file types as multimodal inputs: images (JPEG, PNG, GIF, WebP, HEIC), documents (PDF, DOCX, XLSX, PPTX, RTF, ODT), data files (CSV, JSON, YAML, XML), markup (HTML, SVG, Markdown), source code (50+ languages including TypeScript, Python, Go, Rust, Java), media (MP4, MP3, WAV, AVI), and archives (ZIP, TAR, GZ). All processed automatically through the ProcessorRegistry.",
    },
    {
      question: "How does NeuroLink handle streaming?",
      answer:
        "NeuroLink supports 4 streaming patterns with 24 event types: real-time text streaming, tool call streaming, structured output streaming, and image generation streaming. All patterns include backpressure control, error recovery, and work consistently across all 13+ providers through a unified stream() API.",
    },
    {
      question: "Can NeuroLink build multi-agent systems?",
      answer:
        "Yes. NeuroLink supports 3 agent topologies: hub-spoke (coordinator delegates to specialists), mesh (peer-to-peer collaboration), and pipeline (sequential processing). The AgentNetwork orchestrator manages agent lifecycle, message routing, and shared context. Agents can use MCP tools, RAG, and memory independently.",
    },
    {
      question: "What observability and monitoring does NeuroLink provide?",
      answer:
        "NeuroLink integrates with Langfuse for LLM-specific observability (token tracking, cost analysis, trace visualization) and OpenTelemetry for distributed tracing. It includes 14 evaluation scorers, external TracerProvider support for existing OTEL setups, and context management via setLangfuseContext() for userId, sessionId, and custom metadata.",
    },
    {
      question: "Does NeuroLink have a CLI?",
      answer:
        "Yes. The NeuroLink CLI mirrors the full SDK API. Core commands include: neurolink generate (text generation), neurolink stream (streaming), neurolink loop (interactive REPL session with persistent memory), neurolink setup (provider configuration), neurolink status (health checks), and neurolink mcp list (MCP tool discovery). Install via npm install -g @juspay/neurolink or use npx for ad-hoc usage.",
    },
    {
      question: "How does NeuroLink handle context window limits?",
      answer:
        "NeuroLink includes a 4-stage context compaction pipeline that runs automatically: (1) tool output pruning — replaces old tool results with placeholders, (2) file read deduplication — keeps only the latest read of each file, (3) LLM summarization — structured 9-section summaries with iterative merging, and (4) sliding window truncation. The BudgetChecker triggers auto-compaction when context usage exceeds 80%.",
    },
    {
      question: "Is NeuroLink production-ready?",
      answer:
        "Yes. NeuroLink was extracted from production systems at Juspay processing enterprise-scale workloads. It includes Redis-backed conversation memory, provider failover with automatic retry, middleware for guardrails and content filtering, Human-in-the-Loop (HITL) approval workflows for dangerous operations, and comprehensive error handling with typed errors via ErrorFactory.",
    },
  ];

  let openIndex = $state(-1);

  function toggle(i: number) {
    openIndex = openIndex === i ? -1 : i;
  }
</script>

<section class="max-w-[800px] mx-auto px-4 md:px-6 py-16 md:py-24">
  <div use:reveal={{ y: 40 }} class="text-center mb-8 md:mb-14">
    <p class="eyebrow text-ds-text-muted mb-4">FAQ</p>
    <h2 class="section-headline text-ds-text-primary">
      Frequently asked questions
    </h2>
  </div>

  <div class="space-y-2" use:reveal={{ y: 30, stagger: 0.06 }}>
    {#each faqs as faq, i}
      <div class="border border-ds-border rounded-xl overflow-hidden">
        <button
          onclick={() => toggle(i)}
          class="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ds-surface-2 transition-colors duration-150"
          aria-expanded={openIndex === i}
        >
          <span class="text-sm font-medium text-ds-text-primary pr-4">
            {faq.question}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0 text-ds-text-muted transition-transform duration-200"
            class:rotate-180={openIndex === i}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {#if openIndex === i}
          <div class="px-5 pb-4">
            <p class="text-sm text-ds-text-tertiary leading-relaxed">
              {faq.answer}
            </p>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</section>
