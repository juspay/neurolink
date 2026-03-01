<script lang="ts">
  import { reveal } from "$lib/actions/reveal";
</script>

<section class="relative overflow-hidden">
  <!-- Gradient mesh background -->
  <div class="absolute inset-0 pointer-events-none">
    <div
      class="absolute inset-0"
      style="background: radial-gradient(ellipse at 30% 50%, rgba(1, 111, 185, 0.1) 0%, transparent 60%), radial-gradient(ellipse at 70% 40%, rgba(255, 149, 5, 0.06) 0%, transparent 50%);"
    ></div>
  </div>

  <div
    class="relative max-w-[1200px] mx-auto px-4 md:px-6 py-16 md:py-32"
    use:reveal={{ y: 40 }}
  >
    <div class="text-center max-w-[700px] mx-auto">
      <h2 class="section-headline text-ds-text-primary">
        Start building AI apps with NeuroLink SDK
      </h2>
      <p
        class="mt-4 text-ds-text-tertiary text-lg leading-relaxed max-w-md mx-auto"
      >
        Stop juggling SDKs. Start building with a single, production-ready
        interface to every major AI model.
      </p>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          href="https://docs.neurolink.ink/docs/getting-started"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-nl-accent hover:bg-nl-accent-dark rounded-ds-full transition-colors duration-200 shadow-glow-blue"
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
          class="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-ds-text-tertiary border border-ds-border hover:border-ds-border-hover hover:text-ds-text-primary rounded-ds-full transition-colors duration-200"
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
