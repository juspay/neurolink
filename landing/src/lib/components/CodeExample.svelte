<script lang="ts">
  import { onMount, onDestroy, tick } from "svelte";
  import { activeSection } from "$lib/stores/canvasState";
  import { reveal } from "$lib/actions/reveal";
  import { snippets } from "$lib/data/codeSnippets";

  let sectionEl: HTMLElement;
  let observer: IntersectionObserver;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) activeSection.set("observe");
      },
      { threshold: 0.4 },
    );
    observer.observe(sectionEl);
  });

  onDestroy(() => {
    observer?.disconnect();
  });

  let activeTab = $state(0);

  // Unique ID prefix per instance to avoid collisions when mounted multiple times
  let instanceId = Math.random().toString(36).slice(2, 8);

  async function handleTabKeydown(e: KeyboardEvent) {
    const tabCount = tabs.length;
    let newIndex: number | null = null;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      newIndex = (activeTab + 1) % tabCount;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      newIndex = (activeTab - 1 + tabCount) % tabCount;
    } else if (e.key === "Home") {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      newIndex = tabCount - 1;
    }
    if (newIndex !== null) {
      activeTab = newIndex;
      await tick();
      document.getElementById(`${instanceId}-tab-${newIndex}`)?.focus();
    }
  }

  const tabs = [
    { label: snippets.generate.label, code: snippets.generate.fullCode },
    { label: snippets.stream.label, code: snippets.stream.fullCode },
    { label: snippets.rag.label, code: snippets.rag.fullCode },
    { label: snippets.agents.label, code: snippets.agents.fullCode },
  ];

  const checkItems = [
    "21+ AI providers through one unified API",
    "Voice (TTS, STT, realtime) across 8 providers",
    "Stream responses with built-in tool calling",
    "MCP integration with 58+ external servers",
    "Multimodal support — images, PDFs, 50+ file types",
    "Type-safe SDK with full TypeScript coverage",
  ];
</script>

<div class="section-observe">
  <section
    bind:this={sectionEl}
    data-topology-phase="observe"
    class="max-w-[1200px] mx-auto px-6 py-24 md:py-36 relative"
  >
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <!-- Left: checklist -->
      <div use:reveal={{ y: 40 }} class="relative z-10">
        <p class="label-eyebrow mb-4">05 — DEVELOPER EXPERIENCE</p>
        <h2 class="headline-section font-display text-white drop-shadow-lg">
          Developer-first TypeScript AI SDK experience
        </h2>
        <p
          class="mt-6 text-[var(--color-text-body)] text-lg leading-relaxed max-w-md"
        >
          Get up and running in minutes. NeuroLink's vascular SDK is designed
          for the way you already work — intuitive, typed, and incredibly fast.
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
                stroke="var(--color-signal)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="shrink-0 mt-0.5 drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span
                class="text-white text-[14px] md:text-[15px] font-medium leading-relaxed"
                >{item}</span
              >
            </li>
          {/each}
        </ul>

        <div class="mt-8 md:mt-12 flex flex-wrap gap-4">
          <a
            href="https://docs.neurolink.ink/docs/sdk/api-reference"
            target="_blank"
            rel="noopener noreferrer"
            class="btn-signal inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white rounded-full w-full sm:w-auto"
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
            class="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-[var(--color-text-dim)] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:text-white rounded-full transition-colors duration-200 w-full sm:w-auto"
          >
            CLI Guide
          </a>
        </div>
      </div>

      <!-- Right: code block with tabs -->
      <div use:reveal={{ y: 40, delay: 0.2 }}>
        <div class="glass-panel overflow-hidden">
          <!-- Tab bar -->
          <div
            class="flex border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] overflow-x-auto scrollbar-hide tab-scroll-fade"
            role="tablist"
            tabindex="-1"
            onkeydown={handleTabKeydown}
          >
            {#each tabs as tab, i}
              <button
                class="px-4 md:px-5 py-4 min-h-[48px] text-[13px] md:text-sm font-mono whitespace-nowrap shrink-0 transition-colors duration-200 border-b-2"
                class:text-[var(--color-signal)]={activeTab === i}
                class:border-[var(--color-signal)]={activeTab === i}
                class:text-[var(--color-text-dim)]={activeTab !== i}
                class:border-transparent={activeTab !== i}
                role="tab"
                aria-selected={activeTab === i}
                tabindex={activeTab === i ? 0 : -1}
                id="{instanceId}-tab-{i}"
                aria-controls="{instanceId}-tabpanel"
                onclick={() => (activeTab = i)}
              >
                {tab.label}
              </button>
            {/each}
          </div>

          <!-- Code content -->
          <div
            class="code-content p-4 md:p-8 font-mono text-xs md:text-sm leading-7 overflow-x-auto bg-[#03050a]"
            role="tabpanel"
            id="{instanceId}-tabpanel"
            aria-labelledby="{instanceId}-tab-{activeTab}"
            tabindex="0"
          >
            {#key activeTab}
              <!-- Static content only — safe for {@html} -->
              <pre><code class="text-[var(--color-text-code)]"
                  >{@html tabs[activeTab].code}</code
                ></pre>
            {/key}
          </div>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  :global(.tab-scroll-fade) {
    mask-image: linear-gradient(to right, black calc(100% - 2rem), transparent);
    -webkit-mask-image: linear-gradient(
      to right,
      black calc(100% - 2rem),
      transparent
    );
  }

  @media (max-width: 767px) {
    .code-content pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 0.7rem;
      line-height: 1.5;
    }
  }

  @media (min-width: 768px) {
    :global(.tab-scroll-fade) {
      mask-image: none;
      -webkit-mask-image: none;
    }
  }
</style>
