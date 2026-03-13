<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { activeSection } from "$lib/stores/canvasState";

  let sectionEl: HTMLElement;
  let observer: IntersectionObserver;
  let isMobile = $state(false);
  let expandedStream = $state(-1);
  let resizeTimer: ReturnType<typeof setTimeout>;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) activeSection.set("streams");
      },
      { threshold: 0.4 },
    );
    observer.observe(sectionEl);

    isMobile = window.innerWidth < 768;

    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        isMobile = window.innerWidth < 768;
      }, 150);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  onDestroy(() => {
    observer?.disconnect();
    clearTimeout(resizeTimer);
  });

  const STREAMS = [
    {
      label: "TOKENS",
      items: [
        "anthropic",
        "openai",
        "gemini",
        "bedrock",
        "mistral",
        "vertex",
        "azure",
        "ollama",
        "litellm",
        "hugging face",
        "sagemaker",
        "···",
      ],
    },
    {
      label: "TOOLS",
      items: [
        "github",
        "postgres",
        "slack",
        "google drive",
        "jira",
        "filesystem",
        "web search",
        "notion",
        "linear",
        "stripe",
        "58+ servers",
        "···",
      ],
    },
    {
      label: "MEMORY",
      items: [
        "conversation",
        "semantic recall",
        "working memory",
        "redis",
        "vector index",
        "context window",
        "compaction",
        "summarization",
        "···",
      ],
    },
    {
      label: "KNOWLEDGE",
      items: [
        "pdf",
        "markdown",
        "xlsx",
        "docx",
        "csv",
        "html",
        "mp4",
        "zip",
        "svg",
        "json",
        "50+ formats",
        "···",
      ],
    },
    {
      label: "VOICE",
      items: [
        "text to speech",
        "real-time audio",
        "google tts",
        "stream in",
        "stream out",
        "multimodal",
        "···",
      ],
    },
    {
      label: "REASONING",
      items: [
        "workflows",
        "chains",
        "multi-agent",
        "hitl",
        "checkpointing",
        "reflections",
        "evals",
        "···",
      ],
    },
  ];
</script>

<section
  bind:this={sectionEl}
  data-topology-phase="streams"
  class="section-streams py-24 md:py-36"
>
  <!-- Section header -->
  <div class="max-w-[960px] mx-auto px-6 mb-16">
    <p class="label-eyebrow mb-4">STREAMS</p>
    <h2 class="headline-section font-display">
      Thirteen sources.<br />One stream.
    </h2>
    <p class="body-text max-w-lg mt-5">
      Every type of AI intelligence flows through the same stream layer. Pick
      your sources. Shape the signal. Deliver to any organ.
    </p>
  </div>

  {#if isMobile}
    <!-- Mobile: accordion layout -->
    <div class="stream-accordion">
      {#each STREAMS as stream, i}
        <button
          class="stream-accordion-row"
          class:stream-accordion-row--open={expandedStream === i}
          onclick={() => (expandedStream = expandedStream === i ? -1 : i)}
          type="button"
          aria-expanded={expandedStream === i}
        >
          <div class="stream-accordion-header">
            <span class="stream-accordion-label">{stream.label}</span>
            <span class="stream-accordion-count"
              >{stream.items.filter((x) => x !== "···").length}</span
            >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0 text-[var(--color-nl-sky)] transition-transform duration-300"
              class:rotate-180={expandedStream === i}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </button>
        {#if expandedStream === i}
          <div class="stream-accordion-body">
            <div class="stream-chips">
              {#each stream.items.filter((x) => x !== "···") as item}
                <span class="stream-chip">{item}</span>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <!-- Desktop: 6 stream marquee rows -->
    <div>
      {#each STREAMS as stream, i}
        <div class="stream-row">
          <span class="stream-label">{stream.label}</span>
          <div
            class="stream-track"
            style="--dir: {i % 2 === 0 ? 'normal' : 'reverse'}"
          >
            <div class="stream-inner">
              {#each [...stream.items, ...stream.items] as item}
                <span class="stream-item">{item}</span>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .stream-row {
    display: flex;
    align-items: center;
    gap: 2rem;
    padding: 1.25rem 0;
    border-top: 1px solid rgba(0, 240, 255, 0.1);
    background: linear-gradient(
      90deg,
      transparent,
      rgba(0, 240, 255, 0.02) 50%,
      transparent
    );
    overflow: hidden;
  }

  .stream-row:last-child {
    border-bottom: 1px solid rgba(0, 240, 255, 0.1);
  }

  .stream-label {
    flex-shrink: 0;
    width: 8rem;
    padding-left: 2rem;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.25em;
    color: var(--color-nl-accent-lighter);
    text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
    text-transform: uppercase;
  }

  @media (max-width: 375px) {
    .stream-label {
      width: 5rem;
      padding-left: 1rem;
      font-size: 0.55rem;
    }
  }

  .stream-track {
    flex: 1;
    overflow: hidden;
    mask-image: linear-gradient(
      to right,
      transparent,
      black 10%,
      black 90%,
      transparent
    );
  }

  .stream-inner {
    display: flex;
    gap: 3.5rem;
    white-space: nowrap;
    animation: marquee 35s linear infinite;
    animation-direction: var(--dir, normal);
  }

  .stream-item {
    font-size: 0.85rem;
    font-weight: 400;
    color: var(--color-text-body);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  /* Mobile accordion styles */
  .stream-accordion {
    max-width: 960px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .stream-accordion-row {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    border-top: 1px solid rgba(0, 240, 255, 0.1);
    padding: 0;
    cursor: pointer;
  }

  .stream-accordion-row:last-of-type {
    border-bottom: 1px solid rgba(0, 240, 255, 0.1);
  }

  .stream-accordion-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 0;
  }

  .stream-accordion-label {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: var(--color-nl-accent-lighter);
    text-transform: uppercase;
    flex: 1;
  }

  .stream-accordion-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.65rem;
    color: var(--color-text-dim);
    background: rgba(0, 240, 255, 0.08);
    padding: 2px 8px;
    border-radius: 9999px;
    letter-spacing: 0.05em;
  }

  .stream-accordion-body {
    padding: 0 0 1rem;
  }

  .stream-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .stream-chip {
    font-size: 0.8rem;
    color: var(--color-text-body);
    background: rgba(0, 240, 255, 0.06);
    border: 1px solid rgba(0, 240, 255, 0.12);
    padding: 0.375rem 0.75rem;
    border-radius: 9999px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
</style>
