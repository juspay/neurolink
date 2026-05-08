<script lang="ts">
  import { onMount } from "svelte";

  const stats = [
    { value: 21, suffix: "+", label: "Stream Sources" },
    { value: 100, suffix: "+", label: "Active Neurons" },
    { value: 58, suffix: "+", label: "Synapse Tools" },
    { value: 50, suffix: "+", label: "Knowledge Formats" },
  ];

  let sectionEl: HTMLElement;
  let counterEls: HTMLElement[] = [];
  let hasAnimated = false;
  let tweens: any[] = [];
  let destroyed = false;

  onMount(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      counterEls.forEach((el, i) => {
        if (el) el.textContent = stats[i].value.toString();
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            hasAnimated = true;
            animateCounters();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );

    if (sectionEl) observer.observe(sectionEl);

    return () => {
      destroyed = true;
      observer.disconnect();
      tweens.forEach((tw) => {
        tw.kill();
      });
    };
  });

  async function animateCounters() {
    const { gsap } = await import("gsap");
    if (destroyed) return;
    counterEls.forEach((el, i) => {
      if (!el) return;
      const target = stats[i].value;
      const obj = { val: 0 };
      const tw = gsap.to(obj, {
        val: target,
        duration: 2,
        delay: i * 0.15,
        ease: "power2.out",
        onUpdate() {
          el.textContent = Math.round(obj.val).toString();
        },
      });
      tweens.push(tw);
    });
  }
</script>

<section
  bind:this={sectionEl}
  class="stats-strip max-w-[1200px] mx-auto px-4 md:px-6 py-14 md:py-20"
>
  <div class="stats-row">
    {#each stats as stat, i}
      <div class="stat-item">
        <div class="stat-number font-display">
          <span bind:this={counterEls[i]}>0</span><span class="stat-suffix"
            >{stat.suffix}</span
          >
        </div>
        <div class="stat-label">{stat.label}</div>
      </div>
      {#if i < stats.length - 1}
        <div class="stat-divider" aria-hidden="true"></div>
      {/if}
    {/each}
  </div>
</section>

<style>
  .stats-strip {
    border-top: 1px solid rgba(0, 210, 255, 0.08);
    border-bottom: 1px solid rgba(0, 210, 255, 0.08);
  }

  .stats-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat-item {
    flex: 1;
    min-width: 70px;
    text-align: center;
  }

  .stat-number {
    font-size: clamp(2rem, 5vw, 4.5rem);
    line-height: 1;
    color: #ffffff;
    letter-spacing: -0.03em;
    margin-bottom: 0.5rem;
  }

  .stat-suffix {
    font-size: 0.55em;
    color: var(--color-nl-sky);
    vertical-align: super;
    line-height: 0;
  }

  .stat-label {
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.625rem;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(160, 174, 192, 0.5);
  }

  .stat-divider {
    width: 1px;
    height: 3rem;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(0, 210, 255, 0.2),
      transparent
    );
    flex-shrink: 0;
  }

  @media (max-width: 639px) {
    .stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem 1rem;
      justify-items: center;
    }
    .stat-divider {
      display: none;
    }
    .stat-item {
      min-width: unset;
    }
    .stat-label {
      font-size: 0.5625rem;
      letter-spacing: 0.15em;
    }
    .stat-item:nth-child(1 of .stat-item),
    .stat-item:nth-child(2 of .stat-item) {
      padding-bottom: 1.25rem;
      border-bottom: 1px solid rgba(0, 210, 255, 0.08);
    }
  }
</style>
