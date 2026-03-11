<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { generateNeuronDendrites } from "$lib/lsystem.js";
  import {
    activeSection,
    scrollProgress,
    scrollVelocity,
    canvasConfig,
    type SectionId,
  } from "$lib/stores/canvasState.js";

  type Phase = SectionId;

  type Neuron = {
    id: string;
    seed: number;
    xFrac: number;
    pageFrac: number;
    side: "left" | "right";
    phase: Phase;
    label?: string;
    color?: string;
  };

  type AxonSig = {
    kind: "axon";
    neuronIdx: number;
    t: number;
    speed: number;
    color: string;
    direction: "to-cord" | "from-cord";
  };

  type SpinalSig = {
    kind: "spinal";
    py: number;
    direction: 1 | -1;
    speed: number;
    color: string;
    trailDist: number;
    distTraveled: number;
    maxDist: number;
    spawnedAxon: boolean;
  };

  type Signal = AxonSig | SpinalSig;

  type AmbientCell = {
    ox: number;
    oy: number;
    x: number;
    y: number;
    ph: number;
    spd: number;
    r: number;
    op: number;
  };

  type PeripheralNode = {
    xFrac: number;
    pageFrac: number;
    z: number;
    color: string;
    cluster: "spine" | "left" | "right" | "top" | "bottom";
  };

  type PeripheralEdge = {
    a: number;
    b: number;
    color: string;
    strength: "core" | "branch" | "cross";
    bend: number;
  };

  type MeshSpark = {
    edgeIdx: number;
    t: number;
    speed: number;
    length: number;
    color: string;
  };

  let mouseX = $state(-9999);
  let mouseY = $state(-9999);
  let reduced = $state(false);
  let isMobile = false; // determined once at mount

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raf: number;
  let sectionObserverTimer: ReturnType<typeof setTimeout>;
  let W = 0;
  let H = 0;
  let DPR = 1;

  let scrollY = 0;
  let prevScrollY = 0;
  let pageHeight = 3000;
  let smoothedVelocity = 0;
  let spineBiasX = 0;

  let neurons: Neuron[] = [];
  let signals: Signal[] = [];
  let ambient: AmbientCell[] = [];
  let peripheralNodes: PeripheralNode[] = [];
  let peripheralEdges: PeripheralEdge[] = [];
  let meshSparks: MeshSpark[] = [];
  let sectionObservers: IntersectionObserver[] = [];
  let onMouseMove: ((e: MouseEvent) => void) | null = null;
  let onVisChange: (() => void) | null = null;
  let mouseNX = 0;
  let mouseNY = 0;

  let phaseCenters: Record<Phase, number> = {
    hero: 0.06,
    streams: 0.22,
    flow: 0.36,
    connectors: 0.5,
    observe: 0.66,
    ecosystem: 0.8,
    cta: 0.93,
  };

  const C = {
    flow: "#0190e0",
    sky: "#a8d8ff",
    signal: "#e8f4ff",
    warm: "#ff9505",
    rust: "#ec4e20",
    cyan: "#4deeea",
    violet: "#f038ff",
    green: "#74ee15",
    amber: "#ffe66d",
    red: "#ff6b6b",
    dim: "rgba(168, 216, 255, 0.20)",
  };

  const PHASES: Phase[] = [
    "hero",
    "streams",
    "flow",
    "connectors",
    "observe",
    "ecosystem",
    "cta",
  ];

  const LEFT_X = [0.055, 0.08, 0.105, 0.07, 0.095, 0.065];
  const RIGHT_X = [0.945, 0.92, 0.895, 0.93, 0.905, 0.935];

  const STREAM_ROWS: Array<{
    phaseOffset: number;
    left?: string;
    right?: string;
    leftColor?: string;
    rightColor?: string;
  }> = [
    { phaseOffset: -0.065, left: "TOKENS", leftColor: C.signal },
    { phaseOffset: -0.035, right: "TOOLS", rightColor: C.cyan },
    { phaseOffset: -0.005, left: "MEMORY", leftColor: C.green },
    { phaseOffset: 0.025, right: "KNOWLEDGE", rightColor: C.amber },
    { phaseOffset: 0.055, left: "VOICE", leftColor: C.violet },
    { phaseOffset: 0.085, right: "REASONING", rightColor: C.red },
  ];

  const FLOW_ROWS: Array<{
    phaseOffset: number;
    left?: string;
    right?: string;
  }> = [
    { phaseOffset: -0.05, left: "CONTEXT" },
    { phaseOffset: -0.022, right: "BUDGET" },
    { phaseOffset: 0.006, left: "DISPATCH" },
    { phaseOffset: 0.034, right: "STREAM" },
    { phaseOffset: 0.062, left: "MCP" },
    { phaseOffset: 0.09, right: "OBSERVE" },
  ];

  const MESH_SPARK_COLORS = [C.signal, C.sky, C.cyan, C.amber, C.violet];

  function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  function createRng(seed: number): () => number {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function projectDepthPoint(x: number, y: number, z: number) {
    const fov = 760;
    const camZ = 420;
    const px = mouseNX * (z / 260) * 34;
    const py = mouseNY * (z / 260) * 24;
    const scale = fov / (fov + camZ - z);
    const cx = W / 2;
    const cy = H / 2;
    return {
      sx: cx + (x - cx + px) * scale,
      sy: cy + (y - cy + py) * scale,
      scale,
      depth: clamp((z + 260) / 520, 0, 1),
    };
  }

  function meshControlPoint(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    bend: number,
  ) {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const nx = by - ay;
    const ny = -(bx - ax);
    const nl = Math.hypot(nx, ny) || 1;
    const bendMag = Math.min(68, Math.hypot(bx - ax, by - ay) * 0.28);
    return {
      x: mx + (nx / nl) * bend * bendMag,
      y: my + (ny / nl) * bend * bendMag,
    };
  }

  function evalQuadraticPoint(
    ax: number,
    ay: number,
    cx: number,
    cy: number,
    bx: number,
    by: number,
    t: number,
  ) {
    const mt = 1 - t;
    return {
      x: mt * mt * ax + 2 * mt * t * cx + t * t * bx,
      y: mt * mt * ay + 2 * mt * t * cy + t * t * by,
    };
  }

  function spinalCordX(py: number): number {
    const cfg = get(canvasConfig);
    const amplitude =
      (reduced ? 16 : 34) * clamp(cfg.spinalActivity ?? 1, 0.8, 1.8);
    return W / 2 + spineBiasX + Math.sin((py / 700) * Math.PI * 2) * amplitude;
  }

  function axonAttachPageY(n: Neuron): number {
    return n.pageFrac * pageHeight + Math.sin(n.seed * 0.17) * 24;
  }

  function depthFog(x: number, y: number): number {
    const dx = Math.abs(x / W - 0.5) * 2;
    const dy = Math.abs(y / H - 0.5) * 2;
    return 1 - Math.min(1, Math.max(dx, dy)) * 0.42;
  }

  function proximity(x: number, y: number): number {
    const dx = x - mouseX;
    const dy = y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 140 ? 1 + (1 - dist / 140) * 1.6 : 1;
  }

  function resolveSectionCenters(): Record<Phase, number> {
    const defaults: Record<Phase, number> = {
      hero: 0.06,
      streams: 0.22,
      flow: 0.36,
      connectors: 0.5,
      observe: 0.66,
      ecosystem: 0.8,
      cta: 0.93,
    };

    const accum = new Map<Phase, { sum: number; count: number }>();

    document
      .querySelectorAll<HTMLElement>("[data-topology-phase]")
      .forEach((el) => {
        const phase = el.dataset.topologyPhase as Phase | undefined;
        if (!phase || !PHASES.includes(phase)) return;
        const rect = el.getBoundingClientRect();
        const centerY = scrollY + rect.top + rect.height / 2;
        const frac = centerY / Math.max(pageHeight, 1);
        const prev = accum.get(phase);
        if (prev)
          accum.set(phase, { sum: prev.sum + frac, count: prev.count + 1 });
        else accum.set(phase, { sum: frac, count: 1 });
      });

    for (const phase of PHASES) {
      const v = accum.get(phase);
      if (v && v.count > 0)
        defaults[phase] = clamp(v.sum / v.count, 0.04, 0.96);
    }

    defaults.streams = clamp(defaults.streams, defaults.hero + 0.08, 0.4);
    defaults.flow = clamp(defaults.flow, defaults.streams + 0.08, 0.55);
    defaults.connectors = clamp(defaults.connectors, defaults.flow + 0.08, 0.7);
    defaults.observe = clamp(
      defaults.observe,
      defaults.connectors + 0.08,
      0.82,
    );
    defaults.ecosystem = clamp(
      defaults.ecosystem,
      defaults.observe + 0.06,
      0.9,
    );
    defaults.cta = clamp(defaults.cta, defaults.ecosystem + 0.05, 0.97);

    return defaults;
  }

  function phaseColor(phase: Phase): string {
    const cfg = get(canvasConfig);
    switch (phase) {
      case "streams":
        return C.signal;
      case "connectors":
        return C.warm;
      case "cta":
        return C.signal;
      default:
        // NOTE: fallback reads canvasConfig which is keyed off the current
        // activeSection, not the neuron's own phase. Acceptable because the
        // explicit cases above cover all section-specific phases; this default
        // only fires for phases whose color is intentionally ambient.
        return cfg.dominantColor ?? C.flow;
    }
  }

  function buildNeuronLayout() {
    phaseCenters = resolveSectionCenters();

    const rows: Array<{
      frac: number;
      phase: Phase;
      leftLabel?: string;
      rightLabel?: string;
      leftColor?: string;
      rightColor?: string;
    }> = [];

    const pushRow = (
      frac: number,
      phase: Phase,
      leftLabel?: string,
      rightLabel?: string,
      leftColor?: string,
      rightColor?: string,
    ) => {
      rows.push({
        frac: clamp(frac, 0.035, 0.97),
        phase,
        leftLabel,
        rightLabel,
        leftColor,
        rightColor,
      });
    };

    pushRow(phaseCenters.hero - 0.02, "hero", "BRAIN", undefined, C.flow);
    pushRow(phaseCenters.hero + 0.03, "hero");

    pushRow((phaseCenters.hero + phaseCenters.streams) / 2, "streams");

    for (const row of STREAM_ROWS) {
      pushRow(
        phaseCenters.streams + row.phaseOffset,
        "streams",
        row.left,
        row.right,
        row.leftColor,
        row.rightColor,
      );
    }

    pushRow((phaseCenters.streams + phaseCenters.flow) / 2, "flow");

    for (const row of FLOW_ROWS) {
      pushRow(phaseCenters.flow + row.phaseOffset, "flow", row.left, row.right);
    }

    pushRow((phaseCenters.flow + phaseCenters.connectors) / 2, "connectors");
    pushRow(
      phaseCenters.connectors - 0.02,
      "connectors",
      "AUTOMATIC",
      undefined,
      C.warm,
    );
    pushRow(
      phaseCenters.connectors + 0.02,
      "connectors",
      undefined,
      "TARA",
      undefined,
      C.warm,
    );
    pushRow(
      phaseCenters.connectors + 0.06,
      "connectors",
      "YAMA",
      undefined,
      C.rust,
    );

    pushRow(
      (phaseCenters.connectors + phaseCenters.observe) / 2,
      "observe",
      "SDK",
      "TRACE",
    );
    pushRow(phaseCenters.observe + 0.02, "observe");

    pushRow(
      (phaseCenters.observe + phaseCenters.ecosystem) / 2,
      "ecosystem",
      "NETWORK",
      undefined,
    );
    pushRow(phaseCenters.ecosystem + 0.04, "ecosystem");

    pushRow((phaseCenters.ecosystem + phaseCenters.cta) / 2, "cta");
    pushRow(phaseCenters.cta - 0.015, "cta", "CONNECT", undefined, C.signal);

    rows.sort((a, b) => a.frac - b.frac);

    const next: Neuron[] = [];
    let id = 0;

    rows.forEach((row, rowIdx) => {
      const leftX = LEFT_X[rowIdx % LEFT_X.length];
      const rightX = RIGHT_X[rowIdx % RIGHT_X.length];
      const color = phaseColor(row.phase);
      const rowOffset = Math.sin((rowIdx + 1) * 2.13) * 0.022;

      next.push({
        id: `n-${id++}`,
        seed: 1200 + rowIdx * 73,
        xFrac: leftX,
        pageFrac: clamp(row.frac + rowOffset, 0.03, 0.98),
        side: "left",
        phase: row.phase,
        label: row.leftLabel,
        color: row.leftColor ?? color,
      });

      next.push({
        id: `n-${id++}`,
        seed: 2200 + rowIdx * 79,
        xFrac: rightX,
        pageFrac: clamp(row.frac - rowOffset * 1.05, 0.03, 0.98),
        side: "right",
        phase: row.phase,
        label: row.rightLabel,
        color: row.rightColor ?? color,
      });
    });

    neurons = next;
  }

  function buildPeripheralMesh() {
    const rand = createRng(
      Math.floor(W * 11 + H * 17 + pageHeight * 0.19 + neurons.length * 43),
    );
    const nodes: PeripheralNode[] = [];
    const edges: PeripheralEdge[] = [];
    const edgeSet = new Set<string>();
    const spineIdx: number[] = [];
    const leftIdx: number[] = [];
    const rightIdx: number[] = [];
    const topIdx: number[] = [];
    const bottomIdx: number[] = [];
    const leftColors = [C.cyan, C.green, C.violet];
    const rightColors = [C.amber, C.red, C.signal];

    const addNode = (node: PeripheralNode): number => {
      const idx = nodes.length;
      nodes.push(node);
      return idx;
    };

    const addEdge = (
      a: number,
      b: number,
      color: string,
      strength: PeripheralEdge["strength"],
      bend: number,
    ) => {
      if (a === b || a < 0 || b < 0 || a >= nodes.length || b >= nodes.length)
        return;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push({ a, b, color, strength, bend });
    };

    const baseRows = clamp(Math.round(pageHeight / 235), 24, 56);
    const rows = isMobile ? Math.floor(baseRows * 0.3) : baseRows;
    for (let i = 0; i < rows; i++) {
      const t = rows > 1 ? i / (rows - 1) : 0;
      const yFrac = clamp(
        lerp(0.03, 0.97, t) + (rand() - 0.5) * 0.012,
        0.02,
        0.98,
      );

      const spineColor = i % 6 === 0 ? C.signal : i % 2 === 0 ? C.sky : C.flow;
      spineIdx.push(
        addNode({
          xFrac: clamp(0.5 + (rand() - 0.5) * 0.24, 0.34, 0.66),
          pageFrac: yFrac,
          z: -70 + rand() * 140,
          color: spineColor,
          cluster: "spine",
        }),
      );

      const leftColor = leftColors[i % leftColors.length];
      const rightColor = rightColors[i % rightColors.length];
      leftIdx.push(
        addNode({
          xFrac: clamp(0.07 + rand() * 0.35, 0.05, 0.46),
          pageFrac: clamp(yFrac + (rand() - 0.5) * 0.03, 0.02, 0.98),
          z: -220 + rand() * 440,
          color: leftColor,
          cluster: "left",
        }),
      );
      rightIdx.push(
        addNode({
          xFrac: clamp(0.58 + rand() * 0.35, 0.54, 0.95),
          pageFrac: clamp(yFrac + (rand() - 0.5) * 0.03, 0.02, 0.98),
          z: -220 + rand() * 440,
          color: rightColor,
          cluster: "right",
        }),
      );

      if (i % 2 === 0) {
        leftIdx.push(
          addNode({
            xFrac: clamp(0.2 + rand() * 0.23, 0.16, 0.48),
            pageFrac: clamp(yFrac + (rand() - 0.5) * 0.038, 0.02, 0.98),
            z: -170 + rand() * 340,
            color: i % 4 === 0 ? C.sky : leftColor,
            cluster: "left",
          }),
        );
        rightIdx.push(
          addNode({
            xFrac: clamp(0.57 + rand() * 0.23, 0.52, 0.84),
            pageFrac: clamp(yFrac + (rand() - 0.5) * 0.038, 0.02, 0.98),
            z: -170 + rand() * 340,
            color: i % 4 === 0 ? C.sky : rightColor,
            cluster: "right",
          }),
        );
      }
    }

    const baseCapNodes = clamp(Math.round(W / 130), 9, 18);
    const capNodes = isMobile ? Math.floor(baseCapNodes * 0.3) : baseCapNodes;
    for (let i = 0; i < capNodes; i++) {
      const t = capNodes > 1 ? i / (capNodes - 1) : 0;
      topIdx.push(
        addNode({
          xFrac: clamp(
            lerp(0.04, 0.96, t) + (rand() - 0.5) * 0.035,
            0.02,
            0.98,
          ),
          pageFrac: clamp(0.018 + rand() * 0.07, 0.01, 0.11),
          z: -210 + rand() * 360,
          color: i % 2 === 0 ? C.signal : C.violet,
          cluster: "top",
        }),
      );
      bottomIdx.push(
        addNode({
          xFrac: clamp(
            lerp(0.04, 0.96, t) + (rand() - 0.5) * 0.035,
            0.02,
            0.98,
          ),
          pageFrac: clamp(0.91 + rand() * 0.07, 0.88, 0.99),
          z: -210 + rand() * 360,
          color: i % 2 === 0 ? C.amber : C.red,
          cluster: "bottom",
        }),
      );
    }

    const linkChain = (
      arr: number[],
      color: string,
      strength: PeripheralEdge["strength"],
      bendRange: number,
    ) => {
      for (let i = 1; i < arr.length; i++) {
        addEdge(
          arr[i - 1],
          arr[i],
          color,
          strength,
          (rand() - 0.5) * bendRange,
        );
      }
    };

    for (let i = 1; i < spineIdx.length; i++) {
      if (rand() < 0.32) {
        addEdge(
          spineIdx[i - 1],
          spineIdx[i],
          C.flow,
          "cross",
          (rand() - 0.5) * 0.35,
        );
      }
    }
    linkChain(leftIdx, C.cyan, "branch", 0.52);
    linkChain(rightIdx, C.amber, "branch", 0.52);
    linkChain(topIdx, C.signal, "cross", 0.25);
    linkChain(bottomIdx, C.rust, "cross", 0.25);

    const nearestSpine = (targetFrac: number): number => {
      let best = spineIdx[0] ?? -1;
      let bestDist = Infinity;
      for (const idx of spineIdx) {
        const d = Math.abs(nodes[idx].pageFrac - targetFrac);
        if (d < bestDist) {
          bestDist = d;
          best = idx;
        }
      }
      return best;
    };

    const spineOrder = new Map<number, number>();
    spineIdx.forEach((idx, i) => {
      spineOrder.set(idx, i);
    });

    const attachToSpine = (
      arr: number[],
      colorA: string,
      colorB: string,
      strength: PeripheralEdge["strength"],
      bendRange: number,
    ) => {
      for (const idx of arr) {
        const s = nearestSpine(nodes[idx].pageFrac);
        if (s < 0) continue;
        addEdge(idx, s, colorA, strength, (rand() - 0.5) * bendRange);
        const pos = spineOrder.get(s) ?? -1;
        if (pos > 0 && rand() < 0.42) {
          addEdge(
            idx,
            spineIdx[pos - 1],
            colorB,
            "cross",
            (rand() - 0.5) * 0.3,
          );
        }
        if (pos >= 0 && pos < spineIdx.length - 1 && rand() < 0.42) {
          addEdge(
            idx,
            spineIdx[pos + 1],
            colorB,
            "cross",
            (rand() - 0.5) * 0.3,
          );
        }
      }
    };

    attachToSpine(leftIdx, C.cyan, C.sky, "branch", 0.6);
    attachToSpine(rightIdx, C.amber, C.signal, "branch", 0.6);
    attachToSpine(topIdx, C.signal, C.sky, "cross", 0.45);
    attachToSpine(bottomIdx, C.rust, C.amber, "cross", 0.45);

    for (let i = 0; i < nodes.length; i++) {
      const src = nodes[i];
      const candidates = nodes
        .map((n, j) => ({
          j,
          d: Math.hypot(
            (n.xFrac - src.xFrac) * 1.05,
            (n.pageFrac - src.pageFrac) * 2.2,
          ),
        }))
        .filter(({ j, d }) => j !== i && d > 0.05 && d < 0.24)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2);

      for (const c of candidates) {
        if (rand() < 0.58) {
          const edgeColor = src.cluster === "right" ? C.amber : src.color;
          addEdge(i, c.j, edgeColor, "cross", (rand() - 0.5) * 0.28);
        }
      }
    }

    peripheralNodes = nodes;
    peripheralEdges = edges;
    meshSparks = [];
  }

  function initAmbient() {
    const count = reduced ? 10 : 28;
    ambient = Array.from({ length: count }, () => ({
      ox: Math.random() * W,
      oy: Math.random() * H,
      x: 0,
      y: 0,
      ph: Math.random() * Math.PI * 2,
      spd: 0.2 + Math.random() * 0.45,
      r: 0.5 + Math.random() * 1.6,
      op: 0.02 + Math.random() * 0.06,
    }));
  }

  function resize() {
    isMobile = window.innerWidth < 768;
    TARGET_INTERVAL = isMobile ? 1000 / 20 : 1000 / 30;
    DPR = reduced
      ? 1
      : isMobile
        ? Math.min(window.devicePixelRatio || 1, 1.5)
        : window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    pageHeight = Math.max(document.documentElement.scrollHeight, 3000);
    buildNeuronLayout();
    buildPeripheralMesh();
    preGenerateDendrites();
    initAmbient();
  }

  function preGenerateDendrites() {
    if (isMobile) return; // skip L-system pre-generation on mobile
    for (const n of neurons) {
      for (let iter = 2; iter <= 5; iter++) {
        generateNeuronDendrites({
          originX: 0,
          originY: 0,
          seed: n.seed,
          scale: 0.72,
          iterations: iter,
        });
      }
    }
  }

  // NOTE: This observer is the canonical source for activeSection.
  // Hero.svelte and CTA.svelte also write to activeSection — consider removing those redundant observers.
  function setupSectionObservers() {
    sectionObservers.forEach((io) => {
      io.disconnect();
    });
    sectionObservers = [];

    const phaseByElement = new Map<Element, Phase>();
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) return;

        const winner = visible.reduce((best, entry) =>
          entry.intersectionRatio > best.intersectionRatio ? entry : best,
        );
        activeSection.set(phaseByElement.get(winner.target) ?? "hero");
      },
      { threshold: [0.32, 0.5, 0.68] },
    );

    document
      .querySelectorAll<HTMLElement>("[data-topology-phase]")
      .forEach((el) => {
        const phase = (el.dataset.topologyPhase ?? "hero") as Phase;
        if (!PHASES.includes(phase)) return;
        phaseByElement.set(el, phase);
        io.observe(el);
      });

    sectionObservers.push(io);
  }

  function drawPeripheralMesh(sy: number) {
    if (peripheralNodes.length === 0 || peripheralEdges.length === 0) return;
    const section = get(activeSection) as Phase;

    const projected = peripheralNodes.map((node) => {
      const pageY = node.pageFrac * pageHeight;
      const vy = pageY - sy;
      if (vy < -260 || vy > H + 260) return null;
      const depthPt = projectDepthPoint(node.xFrac * W, vy, node.z);
      return {
        node,
        pageY,
        ...depthPt,
      };
    });

    const visibleEdges: Array<{
      idx: number;
      edge: PeripheralEdge;
      a: NonNullable<(typeof projected)[number]>;
      b: NonNullable<(typeof projected)[number]>;
      cpX: number;
      cpY: number;
      midDepth: number;
      midX: number;
      midY: number;
    }> = [];

    for (let i = 0; i < peripheralEdges.length; i++) {
      const edge = peripheralEdges[i];
      const a = projected[edge.a];
      const b = projected[edge.b];
      if (!a || !b) continue;
      const cp = meshControlPoint(a.sx, a.sy, b.sx, b.sy, edge.bend);
      visibleEdges.push({
        idx: i,
        edge,
        a,
        b,
        cpX: cp.x,
        cpY: cp.y,
        midDepth: (a.depth + b.depth) / 2,
        midX: (a.sx + b.sx) / 2,
        midY: (a.sy + b.sy) / 2,
      });
    }

    visibleEdges.sort((e1, e2) => e1.midDepth - e2.midDepth);

    const sectionBoost =
      section === "connectors" || section === "streams"
        ? 1.16
        : section === "hero" || section === "flow" || section === "observe"
          ? 0.92
          : 1;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    for (const edge of visibleEdges) {
      const fog = depthFog(edge.midX, edge.midY);
      const yDistFromCenter = Math.abs(edge.midY - H * 0.5) / (H * 0.5);
      const readability =
        section === "hero" || section === "flow" || section === "observe"
          ? clamp(0.42 + yDistFromCenter * 0.95, 0.42, 1)
          : 1;

      let strokeW = 1;
      let alpha = 0.12;
      let glowW = 2.4;
      let glowAlpha = 0.04;

      if (edge.edge.strength === "core") {
        strokeW = 1.55;
        alpha = 0.22;
        glowW = 5.8;
        glowAlpha = 0.085;
      } else if (edge.edge.strength === "branch") {
        strokeW = 1.08;
        alpha = 0.15;
        glowW = 3.6;
        glowAlpha = 0.055;
      }

      const depthMul = lerp(0.28, 1.08, edge.midDepth);
      const finalAlpha = alpha * depthMul * fog * readability * sectionBoost;
      const finalGlowAlpha =
        glowAlpha * depthMul * fog * readability * sectionBoost;
      const finalWidth = strokeW * lerp(0.72, 1.24, edge.midDepth);

      if (!reduced) {
        ctx.beginPath();
        ctx.moveTo(edge.a.sx, edge.a.sy);
        ctx.quadraticCurveTo(edge.cpX, edge.cpY, edge.b.sx, edge.b.sy);
        ctx.strokeStyle = edge.edge.color;
        ctx.lineWidth = glowW * lerp(0.68, 1.22, edge.midDepth);
        ctx.globalAlpha = finalGlowAlpha;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(edge.a.sx, edge.a.sy);
      ctx.quadraticCurveTo(edge.cpX, edge.cpY, edge.b.sx, edge.b.sy);
      ctx.strokeStyle = edge.edge.color;
      ctx.lineWidth = finalWidth;
      ctx.globalAlpha = finalAlpha;
      ctx.stroke();
    }

    const visibleNodes = projected
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => a.depth - b.depth);

    for (const p of visibleNodes) {
      const yDistFromCenter = Math.abs(p.sy - H * 0.5) / (H * 0.5);
      const readability =
        section === "hero" || section === "flow" || section === "observe"
          ? clamp(0.52 + yDistFromCenter * 0.82, 0.52, 1)
          : 1;
      const baseR =
        p.node.cluster === "spine"
          ? reduced
            ? 2.2
            : 2.8
          : reduced
            ? 1.6
            : 2.1;
      const r = baseR * lerp(0.62, 1.25, p.depth) * clamp(p.scale, 0.78, 1.24);
      const nodeAlpha = lerp(0.22, 0.72, p.depth) * readability;

      // Glow: simple larger circle instead of expensive radial gradient
      if (!reduced) {
        const glowR = r * (p.node.cluster === "spine" ? 2.4 : 1.8);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = p.node.color;
        ctx.globalAlpha = nodeAlpha * 0.12;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = p.node.color;
      ctx.globalAlpha = nodeAlpha;
      ctx.fill();
    }

    const sparkTarget = reduced ? 7 : 18;
    if (
      meshSparks.length < sparkTarget &&
      visibleEdges.length > 0 &&
      Math.random() < 0.25
    ) {
      const pick =
        visibleEdges[Math.floor(Math.random() * visibleEdges.length)];
      meshSparks.push({
        edgeIdx: pick.idx,
        t: 0,
        speed: 0.006 + Math.random() * 0.012,
        length: 0.08 + Math.random() * 0.14,
        color:
          MESH_SPARK_COLORS[
            Math.floor(Math.random() * MESH_SPARK_COLORS.length)
          ],
      });
    }

    const visibleByIdx = new Map<number, (typeof visibleEdges)[number]>();
    for (const ve of visibleEdges) visibleByIdx.set(ve.idx, ve);

    const nextSparks: MeshSpark[] = [];
    for (const spark of meshSparks) {
      spark.t += spark.speed * (1 + clamp(smoothedVelocity, 0, 26) * 0.006);
      if (spark.t >= 1.14) continue;
      const edge = visibleByIdx.get(spark.edgeIdx);
      if (!edge) {
        nextSparks.push(spark);
        continue;
      }

      const headT = clamp(spark.t, 0, 1);
      const tailT = clamp(headT - spark.length, 0, 1);
      const steps = 9;
      const depthMul = lerp(0.5, 1.1, edge.midDepth);

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = lerp(tailT, headT, i / steps);
        const pt = evalQuadraticPoint(
          edge.a.sx,
          edge.a.sy,
          edge.cpX,
          edge.cpY,
          edge.b.sx,
          edge.b.sy,
          t,
        );
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = spark.color;
      ctx.lineWidth = 1.6 * depthMul;
      ctx.globalAlpha = 0.54 * depthMul;
      ctx.stroke();

      const head = evalQuadraticPoint(
        edge.a.sx,
        edge.a.sy,
        edge.cpX,
        edge.cpY,
        edge.b.sx,
        edge.b.sy,
        headT,
      );
      ctx.beginPath();
      ctx.arc(head.x, head.y, 2.1 * depthMul, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.92;
      ctx.fill();

      nextSparks.push(spark);
    }
    meshSparks = nextSparks;

    ctx.restore();
  }

  function drawAxons(sy: number) {
    const cfg = get(canvasConfig);

    for (const n of neurons) {
      const pageY = n.pageFrac * pageHeight;
      const vy = pageY - sy;
      if (vy < -260 || vy > H + 260) continue;

      const x = n.xFrac * W;
      const attachPageY = axonAttachPageY(n);
      const attachVY = attachPageY - sy;
      const cordX = spinalCordX(attachPageY);
      const cpX = lerp(x, cordX, 0.52);
      const cpY = lerp(vy, attachVY, 0.5) + (n.side === "left" ? -30 : 30);

      const p = proximity(x, vy);
      const baseColor = n.color ?? cfg.dominantColor ?? C.flow;
      const centerLane = Math.abs(vy - H / 2) < H * 0.28 ? 0.35 : 1;

      ctx.beginPath();
      ctx.moveTo(x, vy);
      ctx.quadraticCurveTo(cpX, cpY, cordX, attachVY);
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 0.95;
      ctx.globalAlpha = 0.08 * p * centerLane;
      ctx.lineCap = "round";
      ctx.stroke();

      if (!reduced) {
        ctx.beginPath();
        ctx.moveTo(x, vy);
        ctx.quadraticCurveTo(cpX, cpY, cordX, attachVY);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3.4;
        ctx.globalAlpha = 0.012 * p * centerLane;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, vy, reduced ? 2.7 : 4.2, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x, vy, 0, x, vy, reduced ? 10 : 16);
      grad.addColorStop(0, baseColor);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.75;
      ctx.fill();

      if (n.label) {
        ctx.font = "600 10px 'JetBrains Mono', monospace";
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = 0.72;
        ctx.textAlign = n.side === "left" ? "right" : "left";
        ctx.fillText(n.label, x + (n.side === "left" ? -14 : 14), vy + 3);
      }
    }
  }

  function drawDendrites(sy: number) {
    const cfg = get(canvasConfig);

    for (const n of neurons) {
      const pageY = n.pageFrac * pageHeight;
      const vy = pageY - sy;
      if (vy < -420 || vy > H + 420) continue;

      const x = n.xFrac * W;
      const distFromCenter = Math.abs(vy - H / 2);
      const growthT = Math.max(0, 1 - distFromCenter / (H * 0.7));
      const iterMax = reduced ? 3 : 5;
      const iterations = Math.round(lerp(2, iterMax, growthT));

      const branches = generateNeuronDendrites({
        originX: 0,
        originY: 0,
        seed: n.seed,
        scale: 0.72,
        iterations,
      });

      const rotAngle = n.side === "left" ? -Math.PI / 2 : Math.PI / 2;
      const c = n.color ?? cfg.dominantColor ?? C.flow;
      const localAlpha = clamp((cfg.branchGrowth ?? 3) / 5, 0.55, 1);

      ctx.save();
      ctx.beginPath();
      if (n.side === "left") ctx.rect(0, 0, W * 0.3, H);
      else ctx.rect(W * 0.7, 0, W * 0.3, H);
      ctx.clip();

      ctx.translate(x, vy);
      ctx.rotate(rotAngle);

      for (const b of branches) {
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.strokeStyle = c;
        ctx.lineWidth = Math.max(0.35, b.thickness * 2.7);
        ctx.lineCap = "round";
        ctx.globalAlpha = b.opacity * 0.34 * growthT * localAlpha;
        ctx.stroke();

        if (!reduced && b.isAxon) {
          ctx.globalAlpha = b.opacity * 0.14 * growthT * localAlpha;
          ctx.lineWidth = b.thickness * 5.2;
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  function drawGatewayClusters(sy: number) {
    const providerY = (phaseCenters.hero - 0.03) * pageHeight;
    const providerVY = providerY - sy;
    const providerFracs = [0.16, 0.29, 0.42, 0.58, 0.71, 0.84];
    const providerLabels = [
      "anthropic",
      "openai",
      "gemini",
      "bedrock",
      "mistral",
      "···",
    ];

    if (providerVY > -160 && providerVY < H + 100) {
      const sx = spinalCordX(providerY);
      for (let i = 0; i < providerFracs.length; i++) {
        const ex = providerFracs[i] * W;
        const ey = providerVY - (38 + Math.sin(i * 1.6) * 12);
        const cpx = lerp(sx, ex, 0.45);
        const cpy = providerVY - 36;

        ctx.beginPath();
        ctx.moveTo(sx, providerVY);
        ctx.quadraticCurveTo(cpx, cpy, ex, ey);
        ctx.strokeStyle = C.sky;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = C.signal;
        ctx.globalAlpha = 0.65;
        ctx.fill();

        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = C.sky;
        ctx.globalAlpha = 0.68;
        ctx.fillText(providerLabels[i], ex, ey - 10);
      }
    }

    const connectorY = (phaseCenters.connectors + 0.065) * pageHeight;
    const connectorVY = connectorY - sy;
    const connectorFracs = [0.24, 0.5, 0.76];
    const connectorLabels = ["automatic", "tara", "yama"];
    const connectorColors = [C.warm, C.warm, C.rust];

    if (connectorVY > -120 && connectorVY < H + 180) {
      const sx = spinalCordX(connectorY);
      for (let i = 0; i < connectorFracs.length; i++) {
        const ex = connectorFracs[i] * W;
        const ey = connectorVY + (36 + Math.cos(i * 1.7) * 10);
        const cpx = lerp(sx, ex, 0.48);
        const cpy = connectorVY + 30;
        const color = connectorColors[i];

        ctx.beginPath();
        ctx.moveTo(sx, connectorVY);
        ctx.quadraticCurveTo(cpx, cpy, ex, ey);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.globalAlpha = 0.34;
        ctx.stroke();

        if (!reduced) {
          ctx.beginPath();
          ctx.moveTo(sx, connectorVY);
          ctx.quadraticCurveTo(cpx, cpy, ex, ey);
          ctx.strokeStyle = color;
          ctx.lineWidth = 4.2;
          ctx.globalAlpha = 0.08;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.72;
        ctx.fill();

        ctx.font = "600 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.78;
        ctx.fillText(connectorLabels[i], ex, ey + 16);
      }
    }
  }

  function evalAxonBezier(
    neuronIdx: number,
    actualT: number,
  ): {
    x: number;
    pageY: number;
  } {
    const n = neurons[neuronIdx];
    const somaX = n.xFrac * W;
    const somaPageY = n.pageFrac * pageHeight;
    const attachPageY = axonAttachPageY(n);
    const cordX = spinalCordX(attachPageY);
    const cpX = (somaX + cordX) / 2;
    const cpPageY =
      lerp(somaPageY, attachPageY, 0.5) + (n.side === "left" ? -30 : 30);
    const t = actualT;

    return {
      x: (1 - t) * (1 - t) * somaX + 2 * (1 - t) * t * cpX + t * t * cordX,
      pageY:
        (1 - t) * (1 - t) * somaPageY +
        2 * (1 - t) * t * cpPageY +
        t * t * attachPageY,
    };
  }

  function spawnAxonSig(neuronIdx: number, direction: "to-cord" | "from-cord") {
    if (
      signals.some(
        (s) =>
          s.kind === "axon" &&
          s.neuronIdx === neuronIdx &&
          s.direction === direction,
      )
    ) {
      return;
    }

    const n = neurons[neuronIdx];
    const cfg = get(canvasConfig);
    signals.push({
      kind: "axon",
      neuronIdx,
      t: 0,
      speed: 0.006 + Math.random() * 0.008,
      color: n.color ?? cfg.dominantColor ?? C.signal,
      direction,
    });
  }

  function spawnSpinalSig(startPY?: number) {
    const cfg = get(canvasConfig);
    const py = startPY ?? 0.08 * pageHeight + Math.random() * 0.84 * pageHeight;
    const direction = (Math.random() < 0.5 ? 1 : -1) as 1 | -1;

    signals.push({
      kind: "spinal",
      py,
      direction,
      speed: 0.95 + Math.random() * 1.6,
      color: cfg.dominantColor ?? C.signal,
      trailDist: 15 + Math.random() * 18,
      distTraveled: 0,
      maxDist: (0.08 + Math.random() * 0.14) * pageHeight,
      spawnedAxon: false,
    });
  }

  function renderAxonSig(sig: AxonSig, sy: number) {
    const n = neurons[sig.neuronIdx];
    if (!n) return;

    const somaVY = n.pageFrac * pageHeight - sy;
    if (somaVY < -300 || somaVY > H + 300) return;

    const actualT = sig.direction === "to-cord" ? sig.t : 1 - sig.t;
    const head = evalAxonBezier(sig.neuronIdx, actualT);
    const headVY = head.pageY - sy;
    if (headVY < -60 || headVY > H + 60) return;

    if (!reduced && sig.t > 0.05) {
      const trailActualT =
        sig.direction === "to-cord"
          ? Math.max(0, actualT - 0.09)
          : Math.min(1, actualT + 0.09);

      const steps = 8;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = trailActualT + (actualT - trailActualT) * (i / steps);
        const pt = evalAxonBezier(sig.neuronIdx, t);
        if (i === 0) ctx.moveTo(pt.x, pt.pageY - sy);
        else ctx.lineTo(pt.x, pt.pageY - sy);
      }
      ctx.strokeStyle = sig.color;
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.45;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(head.x, headVY, 3.1, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.95;
    ctx.fill();
  }

  function renderSpinalSig(sig: SpinalSig, sy: number) {
    const vy = sig.py - sy;
    if (vy < -60 || vy > H + 60) return;

    const x = spinalCordX(sig.py);

    if (!reduced) {
      const trailPY = sig.py - sig.direction * sig.trailDist;
      const steps = 11;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const py = trailPY + (sig.py - trailPY) * t;
        const vx = spinalCordX(py);
        const y = py - sy;
        if (i === 0) ctx.moveTo(vx, y);
        else ctx.lineTo(vx, y);
      }
      ctx.strokeStyle = sig.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.42;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, vy, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.92;
    ctx.fill();
  }

  function renderSignals(sy: number) {
    const cfg = get(canvasConfig);
    const maxSig = reduced ? 5 : Math.round((cfg.signalDensity ?? 10) * 0.9);
    const spawnChance = reduced ? 0.012 : 0.05;

    if (signals.length < maxSig && Math.random() < spawnChance) {
      const candidates = neurons
        .map((n, i) => ({ idx: i, vy: n.pageFrac * pageHeight - sy }))
        .filter(({ vy }) => vy > -380 && vy < H + 380);

      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        const direction = Math.random() < 0.72 ? "to-cord" : "from-cord";
        spawnAxonSig(pick.idx, direction);
      }
    }

    const speedMul =
      (cfg.particleSpeed ?? 1) * (1 + clamp(smoothedVelocity, 0, 28) * 0.004);

    for (const sig of signals) {
      if (sig.kind !== "axon") continue;
      sig.t = Math.min(1, sig.t + sig.speed * speedMul);
    }

    const axonSignals = signals.filter(
      (s): s is AxonSig => s.kind === "axon" && s.t < 1,
    );
    signals = axonSignals;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    for (const sig of axonSignals) {
      renderAxonSig(sig, sy);
    }

    ctx.restore();
  }

  function drawAmbient(sy: number) {
    const speedFactor = reduced ? 0.3 : 1;

    for (const a of ambient) {
      a.ph += 0.003 * a.spd * speedFactor;
      a.x = a.ox + Math.sin(a.ph) * 25;
      a.y = a.oy + Math.cos(a.ph * 0.8) * 18;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = C.sky;
      ctx.globalAlpha = a.op * depthFog(a.x, a.y + sy * 0.08);
      ctx.fill();
    }
  }

  function drawLegibilityVeil() {
    const section = get(activeSection) as Phase;
    if (section === "connectors" || section === "streams") return;
    ctx.save();
    ctx.globalAlpha = 1;

    const masks: Array<{
      x: number;
      y: number;
      rx: number;
      ry: number;
      alpha: number;
    }> = [];

    if (section === "hero") {
      masks.push({ x: 0.5, y: 0.44, rx: 0.34, ry: 0.22, alpha: 0.22 });
      masks.push({ x: 0.5, y: 0.6, rx: 0.26, ry: 0.14, alpha: 0.16 });
    } else if (section === "flow" || section === "observe") {
      masks.push({ x: 0.5, y: 0.47, rx: 0.31, ry: 0.18, alpha: 0.16 });
    } else if (section === "ecosystem" || section === "cta") {
      masks.push({ x: 0.5, y: 0.42, rx: 0.3, ry: 0.17, alpha: 0.14 });
    } else {
      masks.push({ x: 0.5, y: 0.46, rx: 0.28, ry: 0.16, alpha: 0.12 });
    }

    for (const m of masks) {
      const cx = m.x * W;
      const cy = m.y * H;
      const rx = m.rx * W;
      const ry = m.ry * H;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      g.addColorStop(0, `rgba(9, 12, 18, ${m.alpha})`);
      g.addColorStop(0.62, `rgba(9, 12, 18, ${m.alpha * 0.36})`);
      g.addColorStop(1, "rgba(9, 12, 18, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    }

    ctx.restore();
  }

  let lastFrameTime = 0;
  let TARGET_INTERVAL = 1000 / 30; // cap at 30fps for performance; 20fps on mobile (set in onMount)
  let isPageVisible = true;

  /** Simplified mobile renderer: spinal cord line + signal dots + center glow only. */
  function drawMobile(sy: number, time: number) {
    // Central spinal cord gradient line
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    const topPY = sy - 40;
    const botPY = sy + H + 40;
    const steps = 48;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const py = topPY + (botPY - topPY) * t;
      const x = spinalCordX(py);
      const vy = py - sy;
      if (i === 0) ctx.moveTo(x, vy);
      else ctx.lineTo(x, vy);
    }
    ctx.strokeStyle = C.flow;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = 0.32;
    ctx.stroke();

    // Glow line (wider, lower opacity)
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const py = topPY + (botPY - topPY) * t;
      const x = spinalCordX(py);
      const vy = py - sy;
      if (i === 0) ctx.moveTo(x, vy);
      else ctx.lineTo(x, vy);
    }
    ctx.strokeStyle = C.flow;
    ctx.lineWidth = 8;
    ctx.globalAlpha = 0.06;
    ctx.stroke();

    // Signal dots traveling along the spinal cord
    const maxMobileSigs = 4;
    if (signals.length < maxMobileSigs && Math.random() < 0.03) {
      spawnSpinalSig();
    }

    const speedMul = 1 + clamp(smoothedVelocity, 0, 28) * 0.004;
    const nextSigs: Signal[] = [];
    for (const sig of signals) {
      if (sig.kind !== "spinal") continue;
      sig.py += sig.direction * sig.speed * speedMul;
      sig.distTraveled += sig.speed * speedMul;
      if (sig.distTraveled > sig.maxDist) continue;
      if (sig.py < 0 || sig.py > pageHeight) continue;

      const vy = sig.py - sy;
      if (vy >= -20 && vy <= H + 20) {
        const x = spinalCordX(sig.py);
        ctx.beginPath();
        ctx.arc(x, vy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.9;
        ctx.fill();

        // Dot glow
        ctx.beginPath();
        ctx.arc(x, vy, 7, 0, Math.PI * 2);
        ctx.fillStyle = sig.color;
        ctx.globalAlpha = 0.18;
        ctx.fill();
      }
      nextSigs.push(sig);
    }
    signals = nextSigs;

    // Subtle radial glow at center
    const cx = W / 2;
    const cy = H / 2;
    const glowR = Math.min(W, H) * 0.35;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    glow.addColorStop(0, "rgba(1, 144, 224, 0.06)");
    glow.addColorStop(0.5, "rgba(1, 144, 224, 0.02)");
    glow.addColorStop(1, "rgba(1, 144, 224, 0)");
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);

    ctx.restore();
  }

  function render(time: number) {
    const delta = time - lastFrameTime;
    if (delta < TARGET_INTERVAL) {
      raf = requestAnimationFrame(render);
      return;
    }
    lastFrameTime = time - (delta % TARGET_INTERVAL);

    scrollY = window.scrollY;
    pageHeight = Math.max(document.documentElement.scrollHeight, 3000);
    const section = get(activeSection) as Phase;
    const heroBiasTarget = W >= 1024 && section === "hero" ? W * 0.05 : 0;
    spineBiasX = lerp(spineBiasX, heroBiasTarget, 0.08);
    const targetMouseX =
      mouseX < -9000 ? 0 : (mouseX / Math.max(W, 1) - 0.5) * 2;
    const targetMouseY =
      mouseY < -9000 ? 0 : (mouseY / Math.max(H, 1) - 0.5) * 2;
    mouseNX = lerp(mouseNX, targetMouseX, 0.06);
    mouseNY = lerp(mouseNY, targetMouseY, 0.06);

    const rawVel = Math.abs(scrollY - prevScrollY);
    smoothedVelocity = lerp(smoothedVelocity, rawVel, 0.13);
    prevScrollY = scrollY;

    scrollVelocity.set(smoothedVelocity);
    if (pageHeight > H) scrollProgress.set(scrollY / (pageHeight - H));

    if (Math.abs(pageHeight - lastKnownHeight) > 160) {
      lastKnownHeight = pageHeight;
      buildNeuronLayout();
      buildPeripheralMesh();
      preGenerateDendrites();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(4, 8, 14, 0.17)";
    ctx.fillRect(0, 0, W, H);

    if (isMobile) {
      drawMobile(scrollY, time);
      drawLegibilityVeil();
      raf = requestAnimationFrame(render);
      return;
    }

    drawPeripheralMesh(scrollY);
    drawGatewayClusters(scrollY);
    drawAxons(scrollY);
    drawDendrites(scrollY);
    drawAmbient(scrollY);
    renderSignals(scrollY);
    drawLegibilityVeil();

    let near = false;
    for (const n of neurons) {
      const vy = n.pageFrac * pageHeight - scrollY;
      if (vy < -150 || vy > H + 150) continue;
      const x = n.xFrac * W;
      if (proximity(x, vy) > 1.1) {
        near = true;
        break;
      }
    }
    document.body.dataset.cursorNear = near ? "true" : "false";

    raf = requestAnimationFrame(render);
  }

  let lastKnownHeight = 0;

  onMount(() => {
    ctx = canvas.getContext("2d")!;
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    isMobile = window.innerWidth < 768;
    if (isMobile) TARGET_INTERVAL = 1000 / 20; // 20fps on mobile
    scrollY = window.scrollY;
    prevScrollY = scrollY;

    resize();
    window.addEventListener("resize", resize);
    onMouseMove = (e: MouseEvent) => {
      if (isMobile) return; // skip mouse tracking on mobile
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", onMouseMove);

    onVisChange = () => {
      isPageVisible = !document.hidden;
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        lastFrameTime = 0;
        raf = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisChange);

    sectionObserverTimer = setTimeout(setupSectionObservers, 120);

    lastKnownHeight = pageHeight;
    if (signals.length === 0) {
      if (isMobile) {
        // Seed a few spinal signals for the simplified mobile renderer
        for (let i = 0; i < 3; i++) spawnSpinalSig();
      } else {
        const burst = reduced ? 3 : 8;
        for (let i = 0; i < burst; i++) {
          const idx = Math.floor(Math.random() * Math.max(neurons.length, 1));
          if (neurons[idx]) {
            spawnAxonSig(idx, Math.random() < 0.72 ? "to-cord" : "from-cord");
          }
        }
      }
    }

    raf = requestAnimationFrame(render);
  });

  onDestroy(() => {
    if (typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(raf);
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", resize);
      if (onMouseMove) window.removeEventListener("mousemove", onMouseMove);
    }
    if (onVisChange)
      document.removeEventListener("visibilitychange", onVisChange);
    clearTimeout(sectionObserverTimer);
    sectionObservers.forEach((io) => {
      io.disconnect();
    });
    document.body.dataset.cursorNear = "false";
  });
</script>

<canvas
  bind:this={canvas}
  class="fixed inset-0 pointer-events-none"
  style="z-index:-2; will-change: contents;"
  aria-hidden="true"
></canvas>
<div
  class="fixed inset-0 pointer-events-none"
  style="z-index:-1; background: radial-gradient(ellipse 92% 74% at 50% 50%, transparent 0%, rgba(16, 20, 26, 0.86) 100%);"
></div>
