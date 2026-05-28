export type LBranch = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  depth: number;
  opacity: number;
  isAxon: boolean;
};

export type LSystemOptions = {
  originX: number;
  originY: number;
  seed: number;
  iterations?: number;
  scale?: number;
  axiom?: string;
  rules?: Record<string, string>;
  angle?: number;
};

export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateLSystem(
  axiom: string,
  rules: Record<string, string>,
  iterations: number,
): string {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = "";
    for (const ch of current) {
      next += rules[ch] ?? ch;
    }
    current = next;
  }
  return current;
}

export function branchesToLines(
  lsystem: string,
  startX: number,
  startY: number,
  stepLen: number,
  angle: number,
): LBranch[] {
  const branches: LBranch[] = [];
  const rad = (angle * Math.PI) / 180;

  let x = startX;
  let y = startY;
  let dir = -Math.PI / 2; // pointing straight up
  let depth = 0;

  const stack: { x: number; y: number; dir: number; depth: number }[] = [];

  for (const ch of lsystem) {
    switch (ch) {
      case "F": {
        const nx = x + Math.cos(dir) * stepLen;
        const ny = y + Math.sin(dir) * stepLen;
        branches.push({
          x1: x,
          y1: y,
          x2: nx,
          y2: ny,
          thickness: 1 / Math.pow(1.6, depth),
          depth,
          opacity: Math.max(0.08, 1 - depth * 0.15),
          isAxon: depth < 2,
        });
        x = nx;
        y = ny;
        break;
      }
      case "+":
        dir += rad;
        break;
      case "-":
        dir -= rad;
        break;
      case "[":
        stack.push({ x, y, dir, depth });
        depth++;
        break;
      case "]": {
        const state = stack.pop();
        if (state) {
          x = state.x;
          y = state.y;
          dir = state.dir;
          depth = state.depth;
        }
        break;
      }
      // X and other symbols are ignored
    }
  }

  return branches;
}

export type NeuronPath = {
  points: { x: number; y: number }[];
  length: number; // precomputed arc length
};

export const cachedDendrites = new Map<string, LBranch[]>();
export const cachedPaths = new Map<string, NeuronPath[]>();

/**
 * Walk the L-System turtle and extract every root-to-leaf path as a
 * sequence of {x,y} points in the neuron's LOCAL coordinate space
 * (soma at originX, originY).  On each `]`, the branch from root to
 * that leaf tip is emitted; the final current-path is also emitted.
 * Returns the 20 longest paths, cached.
 */
export function buildNeuronPaths(options: LSystemOptions): NeuronPath[] {
  const {
    seed,
    originX,
    originY,
    scale = 1.0,
    iterations: rawIterations = 5,
    axiom = "X",
    rules = { X: "F[-X][+X]FX", F: "FF" },
    angle = 25,
  } = options;
  const iterations = Math.min(rawIterations, 6);
  const key = `paths-${seed}-${originX}-${originY}-${scale}-${iterations}`;

  const cached = cachedPaths.get(key);
  if (cached) return cached;

  const rng = mulberry32(seed);
  const angleVariation = (rng() - 0.5) * 10;
  const finalAngle = angle + angleVariation;
  const rad = (finalAngle * Math.PI) / 180;
  const stepLen = 40 * scale;

  const lstr = generateLSystem(axiom, rules, iterations);

  let x = originX,
    y = originY,
    dir = -Math.PI / 2;
  const turtleStack: { x: number; y: number; dir: number }[] = [];
  const pathStack: { x: number; y: number }[][] = [];
  let currentPath: { x: number; y: number }[] = [{ x, y }];
  const rawPaths: { x: number; y: number }[][] = [];

  for (const ch of lstr) {
    switch (ch) {
      case "F": {
        x = x + Math.cos(dir) * stepLen;
        y = y + Math.sin(dir) * stepLen;
        currentPath.push({ x, y });
        break;
      }
      case "+":
        dir += rad;
        break;
      case "-":
        dir -= rad;
        break;
      case "[":
        turtleStack.push({ x, y, dir });
        pathStack.push(currentPath.slice());
        break;
      case "]": {
        // currentPath is a complete root-to-leaf path — emit it
        if (currentPath.length >= 3) rawPaths.push(currentPath);
        const state = turtleStack.pop();
        if (state) {
          x = state.x;
          y = state.y;
          dir = state.dir;
        }
        currentPath = pathStack.pop() ?? [{ x, y }];
        break;
      }
    }
  }
  if (currentPath.length >= 3) rawPaths.push(currentPath);

  // Compute arc length for each path, keep the 20 longest
  const paths: NeuronPath[] = rawPaths
    .map((pts) => {
      let len = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
      }
      return { points: pts, length: len };
    })
    .sort((a, b) => b.length - a.length)
    .slice(0, 20);

  cachedPaths.set(key, paths);
  return paths;
}

export function generateNeuronDendrites(options: LSystemOptions): LBranch[] {
  const {
    seed,
    originX,
    originY,
    scale = 1.0,
    iterations: rawIterations = 5,
    axiom = "X",
    rules = { X: "F[-X][+X]FX", F: "FF" },
    angle = 25,
  } = options;
  const iterations = Math.min(rawIterations, 6);
  const key = `${seed}-${originX}-${originY}-${scale}-${iterations}`;

  const cached = cachedDendrites.get(key);
  if (cached) return cached;

  const rng = mulberry32(seed);
  const angleVariation = (rng() - 0.5) * 10; // +/-5 degrees
  const baseAngle = angle + angleVariation;
  const stepLen = 40 * scale;

  const lstr = generateLSystem(axiom, rules, iterations);
  const branches = branchesToLines(lstr, originX, originY, stepLen, baseAngle);

  cachedDendrites.set(key, branches);
  return branches;
}
