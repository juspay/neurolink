<script lang="ts">
  import { onMount } from "svelte";
  import { reveal } from "$lib/actions/reveal";
  import { snippets } from "$lib/data/codeSnippets";

  let activeIndex = $state(0);
  let sectionEl: HTMLElement;

  const useCases = [
    {
      title: snippets.generate.label,
      description: snippets.generate.description,
      code: snippets.generate.shortCode,
    },
    {
      title: snippets.stream.label,
      description: snippets.stream.description,
      code: snippets.stream.shortCode,
    },
    {
      title: snippets.rag.label,
      description: snippets.rag.description,
      code: snippets.rag.shortCode,
    },
    {
      title: snippets.agents.label,
      description: snippets.agents.description,
      code: snippets.agents.shortCode,
    },
  ];

  onMount(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!sectionEl) return;

    const blocks = sectionEl.querySelectorAll("[data-sticky-block]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-sticky-block"));
            activeIndex = idx;
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 },
    );

    blocks.forEach((block) => observer.observe(block));

    return () => observer.disconnect();
  });
</script>

<section
  bind:this={sectionEl}
  class="max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-24"
>
  <div use:reveal={{ y: 40 }} class="mb-8 md:mb-14">
    <p class="eyebrow text-ds-text-muted mb-4">03 — How it works</p>
    <h2 class="section-headline text-ds-text-primary">
      Four lines to production
    </h2>
    <p class="mt-4 text-lg text-ds-text-tertiary max-w-2xl">
      From simple generation to multi-agent orchestration — the same SDK scales
      with you.
    </p>
  </div>

  <!-- Mobile: interleaved description + code pairs -->
  <div class="lg:hidden space-y-10">
    {#each useCases as useCase, i}
      <div use:reveal={{ y: 40 }}>
        <span class="eyebrow text-nl-accent">0{i + 1}</span>
        <h3
          class="text-2xl font-semibold text-ds-text-primary mt-3 tracking-tight"
        >
          {useCase.title}
        </h3>
        <p class="mt-3 text-ds-text-tertiary leading-relaxed">
          {useCase.description}
        </p>

        <div
          class="mt-5 bg-ds-surface-1 border border-ds-border rounded-xl overflow-hidden"
        >
          <div class="flex items-center border-b border-ds-border px-4 py-2">
            <span class="text-xs font-mono text-nl-accent">{useCase.title}</span
            >
          </div>
          <div class="p-4 font-mono text-xs leading-6 overflow-x-auto">
            <pre><code>{@html useCase.code}</code></pre>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <!-- Desktop: sticky parallax layout -->
  <div class="hidden lg:grid lg:grid-cols-2 gap-12">
    <!-- Left: scrolling content blocks -->
    <div class="space-y-[40vh] pb-[20vh]">
      {#each useCases as useCase, i}
        <div
          data-sticky-block={i}
          class="min-h-[40vh] flex items-center"
          use:reveal={{ y: 40 }}
        >
          <div>
            <span class="eyebrow text-nl-accent">0{i + 1}</span>
            <h3
              class="text-2xl font-semibold text-ds-text-primary mt-3 tracking-tight"
            >
              {useCase.title}
            </h3>
            <p class="mt-3 text-ds-text-tertiary leading-relaxed">
              {useCase.description}
            </p>
          </div>
        </div>
      {/each}
    </div>

    <!-- Right: sticky code block -->
    <div>
      <div class="sticky top-[25vh]">
        <div
          class="bg-ds-surface-1 border border-ds-border rounded-xl overflow-hidden"
        >
          <!-- Tab bar -->
          <div
            class="flex border-b border-ds-border"
            role="tablist"
            tabindex="0"
            onkeydown={(e) => {
              if (e.key === "ArrowRight") {
                activeIndex = (activeIndex + 1) % useCases.length;
              } else if (e.key === "ArrowLeft") {
                activeIndex =
                  (activeIndex - 1 + useCases.length) % useCases.length;
              }
            }}
          >
            {#each useCases as uc, i}
              <button
                class="px-4 py-3 text-xs font-mono transition-colors duration-200 border-b-2"
                class:text-nl-accent={activeIndex === i}
                class:border-nl-accent={activeIndex === i}
                class:text-ds-text-muted={activeIndex !== i}
                class:border-transparent={activeIndex !== i}
                role="tab"
                aria-selected={activeIndex === i}
                tabindex={activeIndex === i ? 0 : -1}
                id="sticky-tab-{i}"
                aria-controls="sticky-tabpanel"
                onclick={() => (activeIndex = i)}
              >
                {uc.title}
              </button>
            {/each}
          </div>

          <!-- Code content -->
          <div
            class="p-6 font-mono text-sm leading-7 min-h-[240px]"
            role="tabpanel"
            id="sticky-tabpanel"
            aria-labelledby="sticky-tab-{activeIndex}"
          >
            {#each useCases as uc, i}
              {#if activeIndex === i}
                <pre><code>{@html uc.code}</code></pre>
              {/if}
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
