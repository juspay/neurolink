<script lang="ts">
  import { reveal } from "$lib/actions/reveal";

  const brands = [
    "OpenAI",
    "Anthropic",
    "Google",
    "AWS",
    "Azure",
    "Mistral",
    "Hugging Face",
    "Docker",
    "PostgreSQL",
  ];
</script>

<section
  class="py-8 md:py-12 border-y border-ds-border-subtle overflow-hidden"
  use:reveal={{ y: 30 }}
>
  <p class="text-center eyebrow text-ds-text-muted mb-8">
    Trusted by developers using
  </p>

  <div
    class="relative marquee-container"
    style="mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);"
  >
    <!-- Scrolling track -->
    <div class="flex marquee-track animate-marquee w-max">
      {#each { length: 2 } as _}
        {#each brands as brand, i}
          <span
            class="text-ds-text-muted text-base md:text-lg font-semibold px-4 md:px-8 shrink-0 select-none hover:text-ds-text-secondary transition-colors duration-200"
          >
            {brand}
          </span>
          {#if i < brands.length - 1}
            <span class="text-ds-border shrink-0 select-none" aria-hidden="true"
              >&middot;</span
            >
          {/if}
        {/each}
        <span
          class="text-ds-border shrink-0 select-none px-4"
          aria-hidden="true">&middot;</span
        >
      {/each}
    </div>
  </div>
</section>
