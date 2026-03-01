<script lang="ts">
  import { onMount } from "svelte";
  import { reveal } from "$lib/actions/reveal";

  const stats = [
    { value: 13, suffix: "+", label: "AI Providers" },
    { value: 100, suffix: "+", label: "Models" },
    { value: 58, suffix: "+", label: "MCP Tools" },
    { value: 50, suffix: "+", label: "File Types" },
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
        delay: i * 0.12,
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
  class="max-w-[1200px] mx-auto px-4 md:px-6 py-12 md:py-16"
>
  <div
    class="grid grid-cols-2 lg:grid-cols-4 gap-4"
    use:reveal={{ y: 40, stagger: 0.12 }}
  >
    {#each stats as stat, i}
      <div class="shine-border-hover group cursor-default">
        <div
          class="bg-ds-surface-2 rounded-xl p-4 md:p-6 text-center hover:-translate-y-1 transition-all duration-300 hover:shadow-card-hover"
        >
          <div
            class="text-2xl sm:text-3xl md:text-4xl font-bold text-nl-accent mb-2"
            style="text-shadow: 0 0 40px rgb(1 111 185 / 30%);"
          >
            <span bind:this={counterEls[i]}>0</span>{stat.suffix}
          </div>
          <div class="text-sm text-ds-text-tertiary font-medium">
            {stat.label}
          </div>
        </div>
      </div>
    {/each}
  </div>
</section>
