<script lang="ts">
  import {
    Layers,
    Wrench,
    Activity,
    ShieldCheck,
    FileImage,
    Database,
  } from "lucide-svelte";
  import { reveal } from "$lib/actions/reveal";

  const features = [
    {
      icon: Layers,
      iconColor: "#016fb9",
      iconBg: "rgb(1 111 185 / 12%)",
      title: "13 AI Providers",
      description:
        "OpenAI, Anthropic, Google, AWS Bedrock, Azure, Mistral, LiteLLM, and more through one unified API.",
    },
    {
      icon: Wrench,
      iconColor: "#ff9505",
      iconBg: "rgb(255 149 5 / 12%)",
      title: "58+ MCP Tools",
      description:
        "Connect to GitHub, Slack, databases, file systems, and 50+ external servers via the Model Context Protocol.",
    },
    {
      icon: Activity,
      iconColor: "#22c55e",
      iconBg: "rgb(34 197 94 / 12%)",
      title: "Streaming & Real-time",
      description:
        "First-class streaming with backpressure control, 24 event types, and real-time voice processing.",
    },
    {
      icon: ShieldCheck,
      iconColor: "#a855f7",
      iconBg: "rgb(168 85 247 / 12%)",
      title: "Enterprise Security",
      description:
        "Production-grade auth providers, rate limiting, telemetry, Redis memory, and Langfuse observability.",
    },
    {
      icon: FileImage,
      iconColor: "#ec4899",
      iconBg: "rgb(236 72 153 / 12%)",
      title: "Multimodal Support",
      description:
        "Process images, PDFs, CSV, Excel, Word, code files, and 50+ formats natively in your prompts.",
    },
    {
      icon: Database,
      iconColor: "#06b6d4",
      iconBg: "rgb(6 182 212 / 12%)",
      title: "Three-Layer Memory",
      description:
        "Conversation history, semantic vector recall, and persistent working memory with 22 vector store adapters.",
    },
  ];
</script>

<section class="max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24">
  <div use:reveal={{ y: 40 }} class="mb-8 md:mb-14">
    <p class="eyebrow text-ds-text-muted mb-4">02 — Capabilities</p>
    <h2 class="section-headline text-ds-text-primary">
      Everything you need to ship AI
    </h2>
    <p class="mt-4 text-lg text-ds-text-tertiary max-w-2xl">
      A complete platform for building production AI applications — from simple
      chat to multi-agent systems.
    </p>
  </div>

  <div
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    use:reveal={{ y: 40, stagger: 0.12 }}
  >
    {#each features as feature}
      <div
        class="group bg-ds-surface-2 border border-ds-border rounded-xl p-5 md:p-6 hover:-translate-y-1 hover:border-ds-border-hover hover:shadow-card-hover transition-all duration-300 cursor-default"
      >
        <!-- Icon -->
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
          style:background={feature.iconBg}
        >
          <feature.icon size={20} color={feature.iconColor} strokeWidth={2} />
        </div>

        <h3 class="text-base font-semibold text-ds-text-primary mb-2">
          {feature.title}
        </h3>
        <p class="text-sm text-ds-text-tertiary leading-relaxed">
          {feature.description}
        </p>
      </div>
    {/each}
  </div>
</section>
