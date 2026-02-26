import React from "react";
import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import styles from "./index.module.css";

const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google AI",
  "AWS Bedrock",
  "Azure",
  "Vertex AI",
  "Mistral",
  "Ollama",
  "LiteLLM",
  "HuggingFace",
  "SageMaker",
  "OpenRouter",
];

const QUICK_LINKS = [
  {
    title: "SDK Guide",
    description: "Unified API for 14+ providers",
    href: "/docs/sdk",
    icon: "📦",
  },
  {
    title: "CLI Guide",
    description: "Professional command-line interface",
    href: "/docs/cli",
    icon: "⌨️",
  },
  {
    title: "MCP Tools",
    description: "58+ connectable external tool servers",
    href: "/docs/features/mcp-tools-showcase",
    icon: "🔧",
  },
  {
    title: "Provider Setup",
    description: "Configure any AI provider",
    href: "/docs/getting-started/provider-setup",
    icon: "⚡",
  },
];

const FEATURES = [
  {
    title: "Multimodal",
    description: "50+ file types — images, PDFs, video, audio, code",
    href: "/docs/features/multimodal",
  },
  {
    title: "Streaming",
    description: "4 streaming patterns with backpressure support",
    href: "/docs/advanced/streaming",
  },
  {
    title: "RAG Pipeline",
    description: "10 chunking strategies, hybrid search, reranking",
    href: "/docs/features/rag",
  },
  {
    title: "Workflows",
    description: "Multi-model orchestration with checkpointing",
    href: "/docs/workflows/orchestration",
  },
  {
    title: "Observability",
    description: "9 exporters, Langfuse integration, custom spans",
    href: "/docs/observability/telemetry",
  },
  {
    title: "MCP Integration",
    description: "Connect to 58+ external servers, 4 transports",
    href: "/docs/mcp/overview",
  },
];

const CODE_EXAMPLE = `import { NeuroLink } from "@juspay/neurolink";

const ai = new NeuroLink();

// Generate with any provider
const result = await ai.generate({
  prompt: "Explain quantum computing",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
});

console.log(result.content);`;

const FAQ_ITEMS = [
  {
    question: "What is NeuroLink?",
    answer:
      "NeuroLink is an enterprise AI development platform that provides unified access to 14+ AI providers (OpenAI, Anthropic, Google AI, AWS Bedrock, Azure, and more) through a single TypeScript SDK and professional CLI. It is extracted from production systems at Juspay and battle-tested at enterprise scale.",
  },
  {
    question: "How is NeuroLink different from LangChain or Vercel AI SDK?",
    answer:
      "NeuroLink focuses on provider unification with zero lock-in. Unlike LangChain, it uses a lightweight factory architecture without heavy abstractions. Compared to Vercel AI SDK, NeuroLink adds built-in MCP integration with 58+ tool servers, RAG pipelines, workflow orchestration, multimodal support for 50+ file types, and a full-featured CLI.",
  },
  {
    question: "Is NeuroLink free to use?",
    answer:
      "Yes. NeuroLink is open source and free to use under the MIT license. You only pay for the AI provider API calls you make (e.g., OpenAI, Anthropic). NeuroLink itself adds no additional cost.",
  },
  {
    question: "What AI providers does NeuroLink support?",
    answer:
      "NeuroLink supports 14+ providers including OpenAI, Anthropic, Google AI Studio, Google Vertex AI, AWS Bedrock, Azure OpenAI, Mistral, Ollama, LiteLLM, HuggingFace, SageMaker, OpenRouter, and any OpenAI-compatible endpoint. Switching providers requires changing a single parameter.",
  },
  {
    question: "Does NeuroLink support MCP (Model Context Protocol)?",
    answer:
      "Yes. NeuroLink has full MCP integration with 58+ external tool servers including GitHub, PostgreSQL, Google Drive, Slack, and more. It supports all four transport protocols: stdio for local servers, HTTP/Streamable HTTP for remote servers, SSE, and WebSocket.",
  },
  {
    question: "Can I use NeuroLink in production?",
    answer:
      "Absolutely. NeuroLink is extracted from production systems and includes enterprise features like Redis-backed conversation memory, provider failover, observability with 9 exporters and Langfuse integration, context compaction, and workflow orchestration with checkpointing.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function Home(): React.JSX.Element {
  return (
    <Layout
      title="NeuroLink - Enterprise AI Development Platform"
      description="Universal AI provider support, MCP integration, and professional CLI"
    >
      <Head>
        <script type="application/ld+json">{JSON.stringify(FAQ_JSONLD)}</script>
      </Head>
      <main className={styles.main}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Enterprise AI Development Platform
            </h1>
            <p className={styles.heroSubtitle}>
              One SDK. 14+ Providers. Zero Lock-in.
            </p>
            <div className={styles.codePreview}>
              <div className={styles.codeHeader}>
                <span
                  className={styles.codeDot}
                  style={{ background: "#ff5f57" }}
                />
                <span
                  className={styles.codeDot}
                  style={{ background: "#febc2e" }}
                />
                <span
                  className={styles.codeDot}
                  style={{ background: "#28c840" }}
                />
                <span className={styles.codeFileName}>quickstart.ts</span>
              </div>
              <pre className={styles.codeBlock}>
                <code>{CODE_EXAMPLE}</code>
              </pre>
            </div>
            <div className={styles.heroCtas}>
              <Link className={styles.ctaPrimary} to="/docs/getting-started">
                Get Started
              </Link>
              <Link
                className={styles.ctaSecondary}
                href="https://github.com/juspay/neurolink"
              >
                View on GitHub
              </Link>
            </div>
            <a
              href="https://github.com/juspay/neurolink"
              className={styles.starsBadge}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Star juspay/neurolink on GitHub"
            >
              <img
                src="https://img.shields.io/github/stars/juspay/neurolink?style=social"
                alt="GitHub stars"
                width="100"
                height="20"
                loading="lazy"
              />
            </a>
          </div>
        </section>

        {/* Providers */}
        <section className={styles.providers}>
          <p className={styles.providersLabel}>
            Works with your favorite AI providers
          </p>
          <div className={styles.providerGrid}>
            {PROVIDERS.map((name) => (
              <span key={name} className={styles.providerChip}>
                {name}
              </span>
            ))}
          </div>
        </section>

        {/* Trust Signal */}
        <section className={styles.trustSignal}>
          <p className={styles.trustText}>
            <span className={styles.trustBadge}>Production</span>
            Extracted from production systems at Juspay — powering
            enterprise-scale AI applications
          </p>
        </section>

        {/* Quick Links */}
        <section className={styles.quickLinks}>
          <h2 className={styles.sectionTitle}>Quick Start</h2>
          <div className={styles.cardGrid}>
            {QUICK_LINKS.map((link) => (
              <Link key={link.href} to={link.href} className={styles.quickCard}>
                <span className={styles.quickCardIcon}>{link.icon}</span>
                <h3 className={styles.quickCardTitle}>{link.title}</h3>
                <p className={styles.quickCardDesc}>{link.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Built for Production</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map((f) => (
              <Link key={f.href} to={f.href} className={styles.featureCard}>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.description}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.faq}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  {item.question}
                </summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
