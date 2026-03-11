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
        "The RAG workflow is incredibly simple. We pass files directly to generate() and NeuroLink handles chunking, embedding, and retrieval automatically. What used to take a week of integration work now takes an afternoon.",
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

<div class="section-ecosystem">
  <section
    data-topology-phase="ecosystem"
    class="max-w-[1200px] mx-auto px-4 md:px-6 py-24 md:py-32"
  >
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

    <div class="testimonials-container" use:reveal={{ y: 40, stagger: 0.12 }}>
      {#each testimonials as t, i}
        <div
          class="testimonial-card flex flex-col"
          style="--card-accent: {i === 2
            ? 'var(--color-nl-paprika)'
            : 'var(--color-nl-sky)'}"
        >
          <div class="testimonial-link" aria-hidden="true"></div>
          <div class="testimonial-node" aria-hidden="true"></div>
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
            <p class="text-sm text-ds-text-secondary leading-[1.7]">
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
</div>

<style>
  .testimonials-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .testimonial-card {
    position: relative;
    margin-top: 1rem;
    border: 1px solid var(--color-ds-border);
    border-radius: var(--radius-ds-lg);
    padding: 1.25rem 1.25rem 1.4rem;
    background:
      radial-gradient(
        circle at 50% 0%,
        color-mix(in srgb, var(--card-accent) 12%, transparent) 0%,
        transparent 60%
      ),
      var(--color-ds-surface-2);
    transition:
      transform 0.32s var(--ease-spring),
      border-color 0.25s ease,
      box-shadow 0.25s ease;
  }

  .testimonial-card:hover {
    transform: translateY(-4px);
    border-color: color-mix(
      in srgb,
      var(--card-accent) 58%,
      var(--color-ds-border)
    );
    box-shadow:
      0 14px 34px rgba(0, 0, 0, 0.36),
      0 0 28px color-mix(in srgb, var(--card-accent) 20%, transparent);
  }

  .testimonial-link {
    position: absolute;
    top: -26px;
    left: 50%;
    width: 1.5px;
    height: 26px;
    transform: translateX(-50%);
    background: linear-gradient(
      to bottom,
      transparent,
      color-mix(in srgb, var(--card-accent) 72%, #ffffff 28%)
    );
    opacity: 0.9;
  }

  .testimonial-node {
    position: absolute;
    top: -36px;
    left: 50%;
    width: 11px;
    height: 11px;
    transform: translateX(-50%);
    border-radius: 9999px;
    background: radial-gradient(
      circle,
      #fff 0 33%,
      var(--card-accent) 34% 100%
    );
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--card-accent) 22%, transparent),
      0 0 15px color-mix(in srgb, var(--card-accent) 58%, transparent);
  }

  @media (max-width: 767px) {
    .testimonial-link,
    .testimonial-node {
      display: none;
    }

    .testimonial-card {
      margin-top: 0;
      padding: 1rem;
      background:
        radial-gradient(
          circle at 50% 0%,
          color-mix(in srgb, var(--card-accent) 12%, transparent) 0%,
          transparent 60%
        ),
        rgba(12, 14, 20, 0.92);
    }

    .testimonial-card blockquote p {
      color: var(--color-ds-text-primary);
      opacity: 0.88;
    }

    .testimonials-container {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      gap: 1rem;
      padding: 0 1.5rem;
      scroll-padding-inline: 1.5rem;
    }

    .testimonials-container::-webkit-scrollbar {
      display: none;
    }

    .testimonial-card {
      scroll-snap-align: center;
      flex-shrink: 0;
      width: calc(100vw - 3rem);
      max-width: 340px;
    }
  }
</style>
