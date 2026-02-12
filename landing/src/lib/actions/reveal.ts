interface RevealOptions {
  y?: number;
  x?: number;
  scale?: number;
  opacity?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
  stagger?: number;
}

let registered = false;

export function reveal(node: HTMLElement, options: RevealOptions = {}) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { destroy() {} };
  }

  const {
    y = 60,
    x = 0,
    scale = 1,
    opacity = 0,
    duration = 0.8,
    delay = 0,
    ease = "power3.out",
    start = "top 85%",
    stagger,
  } = options;

  let tween: any;

  (async () => {
    const { gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");

    if (!registered) {
      gsap.registerPlugin(ScrollTrigger);
      registered = true;
    }

    const target = stagger ? node.children : node;

    tween = gsap.from(target, {
      y,
      x,
      scale,
      opacity,
      duration,
      delay,
      ease,
      stagger: stagger || 0,
      scrollTrigger: { trigger: node, start, once: true },
    });
  })();

  return {
    destroy() {
      tween?.scrollTrigger?.kill();
      tween?.kill();
    },
  };
}
