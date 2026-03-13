<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { activeSection } from "$lib/stores/canvasState";
  import { reveal } from "$lib/actions/reveal";

  let sectionEl: HTMLElement;
  let observer: IntersectionObserver;

  onMount(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) activeSection.set("cta");
      },
      { threshold: 0.4 },
    );
    observer.observe(sectionEl);
  });

  onDestroy(() => {
    observer?.disconnect();
  });
</script>

<section
  bind:this={sectionEl}
  data-topology-phase="cta"
  class="section-cta relative overflow-hidden"
>
  <!-- Subtle glow background -->
  <div class="absolute inset-0 pointer-events-none z-0">
    <div
      class="absolute inset-0"
      style="background: radial-gradient(ellipse at 50% 60%, rgba(0, 210, 255, 0.07) 0%, transparent 65%);"
    ></div>
  </div>

  <div
    class="relative z-10 max-w-[1200px] mx-auto px-4 md:px-6 py-24 md:py-36"
    use:reveal={{ y: 40 }}
  >
    <div
      class="glass-panel text-center max-w-[800px] mx-auto px-5 py-8 md:p-12 drop-shadow-2xl"
    >
      <h2
        class="headline-section font-display text-transparent bg-clip-text bg-gradient-to-r from-white to-[var(--color-signal)] mb-4 sm:mb-6"
      >
        Ready to build the nervous system?
      </h2>
      <p
        class="text-[var(--color-text-body)] text-lg leading-relaxed max-w-lg mx-auto mb-6 sm:mb-10"
      >
        Stop juggling SDKs. Start building with a single, production-ready
        vascular layer that perfectly routes all streams and tool calls.
      </p>

      <div
        class="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6"
      >
        <a
          href="https://docs.neurolink.ink/docs/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          class="btn-signal inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[48px] text-sm font-semibold tracking-wide rounded-full text-white w-full sm:w-auto"
        >
          Get Started
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
          href="https://github.com/juspay/neurolink"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-2 px-8 py-4 min-h-[48px] text-sm font-medium text-[var(--color-text-dim)] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] hover:text-white rounded-full transition-all duration-300 w-full sm:w-auto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
          View on GitHub
        </a>
      </div>
    </div>
  </div>
</section>
