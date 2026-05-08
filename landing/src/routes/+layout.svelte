<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import Navbar from "$lib/components/Navbar.svelte";

  const { children } = $props();

  onMount(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lenis: any;
    let gsapRef: any;
    let onTick: any;
    let destroyed = false;

    (async () => {
      const { default: Lenis } = await import("lenis");
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");

      if (destroyed) return;

      gsapRef = gsap;
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });

      const isDesktop = window.innerWidth >= 1024;

      if (isDesktop) {
        lenis = new Lenis({ lerp: 0.1, duration: 1.2 });
        lenis.on("scroll", ScrollTrigger.update);
        onTick = (time: number) => lenis?.raf(time * 1000);
        gsap.ticker.add(onTick);
        gsap.ticker.lagSmoothing(0);
      }
    })();

    return () => {
      destroyed = true;
      lenis?.destroy();
      if (gsapRef && onTick) gsapRef.ticker.remove(onTick);
    };
  });
</script>

<svelte:head>
  <title
    >NeuroLink — The Complete TypeScript AI SDK | 21+ Providers, Voice, RAG,
    MCP, Agents</title
  >
  <meta
    name="description"
    content="Unified TypeScript SDK for 21+ AI providers. Ships with voice (TTS/STT/realtime), RAG, MCP, agents, workflows, and 50+ file types. MIT open source."
  />
  <link rel="canonical" href="https://neurolink.ink/" />
  <link rel="alternate" hreflang="en" href="https://neurolink.ink/" />
  <link rel="alternate" hreflang="x-default" href="https://neurolink.ink/" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://neurolink.ink/" />
  <meta
    property="og:title"
    content="NeuroLink — The Complete TypeScript AI SDK"
  />
  <meta
    property="og:description"
    content="Unified TypeScript SDK for 21+ AI providers. Ships with voice (TTS/STT/realtime), RAG, MCP, agents, workflows, and 50+ file types. MIT open source."
  />
  <meta property="og:image" content="https://neurolink.ink/api/og?type=home" />
  <meta property="og:site_name" content="NeuroLink" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta
    name="twitter:title"
    content="NeuroLink — The Complete TypeScript AI SDK"
  />
  <meta
    name="twitter:description"
    content="Unified TypeScript SDK for 21+ AI providers. Ships with voice (TTS/STT/realtime), RAG, MCP, agents, workflows, and 50+ file types. MIT open source."
  />
  <meta name="twitter:image" content="https://neurolink.ink/api/og?type=home" />
  <meta name="twitter:site" content="@jaborhey" />
  <meta name="twitter:creator" content="@jaborhey" />

  <!-- JSON-LD Structured Data -->
  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Juspay Technologies",
        url: "https://juspay.io",
        logo: "https://neurolink.ink/icons/brain.svg",
        sameAs: ["https://github.com/juspay/neurolink"],
      },
      {
        "@type": "SoftwareApplication",
        name: "NeuroLink SDK",
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Cross-platform",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        description:
          "Unified TypeScript SDK for 21+ AI providers. Ships with voice (TTS/STT/realtime), RAG, MCP, agents, workflows, and 50+ file types.",
        url: "https://neurolink.ink/",
        downloadUrl: "https://www.npmjs.com/package/@juspay/neurolink",
        license: "https://opensource.org/licenses/MIT",
        programmingLanguage: "TypeScript",
        author: {
          "@type": "Organization",
          name: "Juspay Technologies",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is NeuroLink?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink is an open-source TypeScript AI SDK that provides unified access to 21+ AI providers (OpenAI, Anthropic, Google, AWS Bedrock, Azure, Mistral, DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, and more) through a single consistent API. It ships with voice (TTS/STT/realtime), RAG, MCP integration, multi-agent workflows, and 50+ file type support.",
            },
          },
          {
            "@type": "Question",
            name: "Is NeuroLink free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. NeuroLink is fully open source under the MIT license and free to use in both personal and commercial projects. You only pay for the AI provider API calls (OpenAI, Anthropic, etc.) you make through it.",
            },
          },
          {
            "@type": "Question",
            name: "How does NeuroLink compare to LangChain or Vercel AI SDK?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink is a single TypeScript package that includes providers, RAG (10 chunking strategies, 22 vector stores), MCP integration, multi-agent workflows, voice (TTS/STT/realtime), and observability. LangChain requires multiple packages and is Python-first. Vercel AI SDK focuses on provider abstraction but lacks native RAG, agents, and voice support.",
            },
          },
          {
            "@type": "Question",
            name: "What AI providers does NeuroLink support?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink supports 21+ providers including OpenAI, Anthropic Claude, Google AI Studio, Google Vertex AI, AWS Bedrock, Azure OpenAI, Mistral, LiteLLM (100+ models via proxy), Ollama, Hugging Face, AWS SageMaker, OpenRouter, DeepSeek, NVIDIA NIM (400+ catalog models), LM Studio (local), llama.cpp (local GGUF), and any OpenAI-compatible endpoint. Voice: OpenAI TTS, ElevenLabs, Google TTS, Azure TTS, Whisper, Deepgram, Azure STT, Google STT.",
            },
          },
          {
            "@type": "Question",
            name: "Where did NeuroLink come from?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink was extracted from production systems at Juspay, a fintech company processing enterprise-scale transactions. It's battle-tested infrastructure, not a weekend project. The SDK represents 193K+ lines of TypeScript across 447 source files with comprehensive test coverage.",
            },
          },
          {
            "@type": "Question",
            name: "What is MCP and how does NeuroLink use it?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "MCP (Model Context Protocol) is an open standard for connecting AI models to external tools and data sources. NeuroLink integrates with 58+ MCP servers (GitHub, Slack, databases, file systems) across 4 transport types (stdio, HTTP, SSE, WebSocket). It also includes unique MCP enhancements like ToolRouter, ToolCache, and RequestBatcher that no competitor offers.",
            },
          },
          {
            "@type": "Question",
            name: "Can I use NeuroLink with local/self-hosted models?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. NeuroLink supports Ollama for local model inference — run Llama, Mistral, CodeLlama, and other open-source models entirely on your machine with zero API costs. It also supports LiteLLM proxy (100+ models), vLLM, LocalAI, and any OpenAI-compatible endpoint for self-hosted deployments.",
            },
          },
          {
            "@type": "Question",
            name: "Does NeuroLink support RAG (Retrieval-Augmented Generation)?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. NeuroLink includes a complete RAG pipeline with 10 chunking strategies (character, recursive, sentence, token, markdown, HTML, JSON, LaTeX, semantic, semantic-markdown), 22 vector store adapters, hybrid search combining BM25 lexical search with vector similarity, and 5 reranker types. Pass files directly to generate() and NeuroLink handles chunking, embedding, and retrieval automatically.",
            },
          },
          {
            "@type": "Question",
            name: "What file types can NeuroLink process?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink supports 50+ file types as multimodal inputs: images (JPEG, PNG, GIF, WebP, HEIC), documents (PDF, DOCX, XLSX, PPTX, RTF, ODT), data files (CSV, JSON, YAML, XML), markup (HTML, SVG, Markdown), source code (50+ languages including TypeScript, Python, Go, Rust, Java), media (MP4, MP3, WAV, AVI), and archives (ZIP, TAR, GZ). All processed automatically through the ProcessorRegistry.",
            },
          },
          {
            "@type": "Question",
            name: "How does NeuroLink handle streaming?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink supports 4 streaming patterns with 24 event types: real-time text streaming, tool call streaming, structured output streaming, and image generation streaming. All patterns include backpressure control, error recovery, and work consistently across all 21+ providers through a unified stream() API.",
            },
          },
          {
            "@type": "Question",
            name: "Can NeuroLink build multi-agent systems?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. NeuroLink supports 3 agent topologies: hub-spoke (coordinator delegates to specialists), mesh (peer-to-peer collaboration), and pipeline (sequential processing). The AgentNetwork orchestrator manages agent lifecycle, message routing, and shared context. Agents can use MCP tools, RAG, and memory independently.",
            },
          },
          {
            "@type": "Question",
            name: "What observability and monitoring does NeuroLink provide?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink integrates with Langfuse for LLM-specific observability (token tracking, cost analysis, trace visualization) and OpenTelemetry for distributed tracing. It includes 14 evaluation scorers, external TracerProvider support for existing OTEL setups, and context management via setLangfuseContext() for userId, sessionId, and custom metadata.",
            },
          },
          {
            "@type": "Question",
            name: "Does NeuroLink have a CLI?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. The NeuroLink CLI mirrors the full SDK API. Core commands include: neurolink generate (text generation), neurolink stream (streaming), neurolink loop (interactive REPL session with persistent memory), neurolink setup (provider configuration), neurolink status (health checks), and neurolink mcp list (MCP tool discovery). Install via npm install -g @juspay/neurolink or use npx for ad-hoc usage.",
            },
          },
          {
            "@type": "Question",
            name: "How does NeuroLink handle context window limits?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "NeuroLink includes a 4-stage context compaction pipeline that runs automatically: (1) tool output pruning — replaces old tool results with placeholders, (2) file read deduplication — keeps only the latest read of each file, (3) LLM summarization — structured 9-section summaries with iterative merging, and (4) sliding window truncation. The BudgetChecker triggers auto-compaction when context usage exceeds 80%.",
            },
          },
          {
            "@type": "Question",
            name: "Is NeuroLink production-ready?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. NeuroLink was extracted from production systems at Juspay processing enterprise-scale workloads. It includes Redis-backed conversation memory, provider failover with automatic retry, middleware for guardrails and content filtering, Human-in-the-Loop (HITL) approval workflows for dangerous operations, and comprehensive error handling with typed errors via ErrorFactory.",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: "https://neurolink.ink/",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Documentation",
            item: "https://docs.neurolink.ink/docs/getting-started",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: "SDK Reference",
            item: "https://docs.neurolink.ink/docs/sdk/api-reference",
          },
        ],
      },
    ],
  })}</script>`}
</svelte:head>

<Navbar />
<main class="pt-16">
  {@render children()}
</main>
