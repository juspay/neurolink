<script lang="ts">
  import { reveal } from "$lib/actions/reveal";

  const testimonials = [
    {
      quote:
        "NeuroLink lets us switch between OpenAI, Anthropic, and Gemini with a single config change. We went from managing three separate SDKs to one unified interface — deployment time dropped significantly.",
      name: "Engineering Team",
      role: "Juspay — AI Platform",
      initials: "JP",
    },
    {
      quote:
        "The RAG pipeline is incredibly simple. We pass files directly to generate() and NeuroLink handles chunking, embedding, and retrieval automatically. What used to take a week of integration work now takes an afternoon.",
      name: "Backend Engineer",
      role: "Juspay — Developer Experience",
      initials: "BE",
    },
    {
      quote:
        "MCP integration with ToolRouter and RequestBatcher solved our tool sprawl problem. 58+ servers through one registry, with intelligent caching. No other TypeScript SDK offers this level of MCP optimization.",
      name: "Platform Team",
      role: "Juspay — Infrastructure",
      initials: "PT",
    },
  ];
</script>

<section class="max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24">
  <div use:reveal={{ y: 40 }} class="text-center mb-8 md:mb-14">
    <p class="eyebrow text-ds-text-muted mb-4">From the team</p>
    <h2 class="section-headline text-ds-text-primary">
      Built by engineers, for engineers
    </h2>
    <p class="mt-4 text-lg text-ds-text-tertiary max-w-2xl mx-auto">
      NeuroLink powers AI workloads at Juspay. Here's what the teams building
      with it have to say.
    </p>
  </div>

  <div
    class="grid grid-cols-1 md:grid-cols-3 gap-4"
    use:reveal={{ y: 40, stagger: 0.12 }}
  >
    {#each testimonials as t}
      <div
        class="bg-ds-surface-2 border border-ds-border rounded-xl p-5 md:p-6 flex flex-col hover:border-ds-border-hover transition-colors duration-200"
      >
        <!-- Quote -->
        <blockquote class="flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="text-nl-accent/30 mb-3 shrink-0"
          >
            <path
              d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"
            />
          </svg>
          <p class="text-sm text-ds-text-secondary leading-relaxed">
            {t.quote}
          </p>
        </blockquote>

        <!-- Attribution -->
        <div
          class="mt-5 pt-4 border-t border-ds-border-subtle flex items-center gap-3"
        >
          <div
            class="w-9 h-9 rounded-full bg-nl-accent/15 flex items-center justify-center text-xs font-bold text-nl-accent"
          >
            {t.initials}
          </div>
          <div>
            <p class="text-sm font-medium text-ds-text-primary">{t.name}</p>
            <p class="text-xs text-ds-text-muted">{t.role}</p>
          </div>
        </div>
      </div>
    {/each}
  </div>
</section>
