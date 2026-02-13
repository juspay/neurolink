<script lang="ts">
  import { reveal } from "$lib/actions/reveal";
  import { snippets } from "$lib/data/codeSnippets";

  let activeTab = $state(0);

  const tabs = [
    { label: snippets.generate.label, code: snippets.generate.fullCode },
    { label: snippets.stream.label, code: snippets.stream.fullCode },
    { label: snippets.rag.label, code: snippets.rag.fullCode },
    { label: snippets.agents.label, code: snippets.agents.fullCode },
  ];

  const checkItems = [
    "13+ AI providers through one unified API",
    "Stream responses with built-in tool calling",
    "MCP integration with 58+ external servers",
    "Multimodal support — images, PDFs, 50+ file types",
    "Type-safe SDK with full TypeScript coverage",
  ];
</script>

<section class="max-w-[1200px] mx-auto px-6 py-24">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
    <!-- Left: checklist -->
    <div use:reveal={{ y: 40 }}>
      <p class="eyebrow text-ds-text-muted mb-4">05 — Developer experience</p>
      <h2 class="section-headline text-ds-text-primary">
        Developer-First Experience
      </h2>
      <p class="mt-4 text-ds-text-tertiary text-lg leading-relaxed max-w-md">
        Get up and running in minutes. NeuroLink's SDK is designed for the way
        you already work — intuitive, typed, and production-ready.
      </p>

      <ul class="mt-8 space-y-4" use:reveal={{ y: 20, stagger: 0.1 }}>
        {#each checkItems as item}
          <li class="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-nl-success shrink-0 mt-0.5"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span class="text-ds-text-secondary text-sm leading-relaxed"
              >{item}</span
            >
          </li>
        {/each}
      </ul>

      <div class="mt-10 flex flex-wrap gap-3">
        <a
          href="https://docs.neurolink.ink/docs/sdk/api-reference"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-nl-accent hover:bg-nl-accent-dark rounded-ds-full transition-colors duration-200"
        >
          SDK Reference
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </a>
        <a
          href="https://docs.neurolink.ink/docs/cli/commands"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-ds-text-tertiary border border-ds-border hover:border-ds-border-hover hover:text-ds-text-primary rounded-ds-full transition-colors duration-200"
        >
          CLI Guide
        </a>
      </div>
    </div>

    <!-- Right: code block with tabs -->
    <div use:reveal={{ y: 40, delay: 0.2 }}>
      <div
        class="bg-ds-surface-1 border border-ds-border rounded-xl overflow-hidden"
      >
        <!-- Tab bar -->
        <div
          class="flex border-b border-ds-border bg-ds-surface-2 overflow-x-auto scrollbar-hide tab-scroll-fade"
          role="tablist"
        >
          {#each tabs as tab, i}
            <button
              class="px-3 md:px-4 py-3 text-xs md:text-sm font-mono whitespace-nowrap shrink-0 transition-colors duration-200 border-b-2"
              class:text-nl-accent={activeTab === i}
              class:border-nl-accent={activeTab === i}
              class:text-ds-text-muted={activeTab !== i}
              class:border-transparent={activeTab !== i}
              role="tab"
              aria-selected={activeTab === i}
              id="code-tab-{i}"
              aria-controls="code-tabpanel"
              onclick={() => (activeTab = i)}
            >
              {tab.label}
            </button>
          {/each}
        </div>

        <!-- Code content -->
        <div
          class="p-4 md:p-6 font-mono text-xs md:text-sm leading-6 md:leading-7 overflow-x-auto"
          role="tabpanel"
          id="code-tabpanel"
          aria-labelledby="code-tab-{activeTab}"
        >
          {#key activeTab}
            <!-- Static content only — safe for {@html} -->
            <pre><code>{@html tabs[activeTab].code}</code></pre>
          {/key}
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  :global(.tab-scroll-fade) {
    mask-image: linear-gradient(to right, black calc(100% - 2rem), transparent);
    -webkit-mask-image: linear-gradient(
      to right,
      black calc(100% - 2rem),
      transparent
    );
  }

  @media (min-width: 768px) {
    :global(.tab-scroll-fade) {
      mask-image: none;
      -webkit-mask-image: none;
    }
  }
</style>
