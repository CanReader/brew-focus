/**
 * Tiny dependency-free 2D force simulation.
 *
 * Optimised for the small graphs Brew Focus deals in (~20 projects or
 * ~100 tasks). O(n²) repulsion is fine at that scale; Barnes–Hut would be
 * overkill.
 */

export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Mass-like radius — used for repulsion strength. */
  r: number;
  /** When set, the node is pinned and forces don't move it. */
  fixed?: boolean;
  /** Optional grouping (e.g. milestone id) — used for cluster attraction. */
  group?: string;
}

export interface SimEdge {
  source: string;
  target: string;
  /** Target spring length. */
  length?: number;
}

export interface SimOptions {
  /** Strength of pairwise repulsion (Coulomb-like). */
  repulsion?: number;
  /** Spring constant for edges. */
  springK?: number;
  /** Default spring length. */
  springLength?: number;
  /** Soft pull toward (cx, cy). */
  centerStrength?: number;
  cx?: number;
  cy?: number;
  /** Velocity damping per tick. */
  damping?: number;
  /** Cluster attraction (same `group`) strength. */
  clusterStrength?: number;
  /** Decay applied to the global alpha each tick; sim freezes at alpha < 0.01. */
  alphaDecay?: number;
}

export interface Sim {
  nodes: SimNode[];
  edges: SimEdge[];
  alpha: number;
  step: () => boolean; // returns true while still simmering
  reheat: (alpha?: number) => void;
}

const DEFAULTS: Required<SimOptions> = {
  repulsion: 6000,
  springK: 0.06,
  springLength: 110,
  centerStrength: 0.012,
  cx: 0,
  cy: 0,
  damping: 0.82,
  clusterStrength: 0.018,
  alphaDecay: 0.04,
};

export function createSim(nodes: SimNode[], edges: SimEdge[], opts: SimOptions = {}): Sim {
  const o = { ...DEFAULTS, ...opts };
  let alpha = 1;

  const step = () => {
    if (alpha < 0.01) return false;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const fx = new Float32Array(nodes.length);
    const fy = new Float32Array(nodes.length);

    // Repulsion (O(n²)).
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + 0.01;
        const dist = Math.sqrt(distSq);
        const force = (o.repulsion * (a.r + b.r) / 80) / distSq;
        const ux = dx / dist;
        const uy = dy / dist;
        fx[i] -= force * ux;
        fy[i] -= force * uy;
        fx[j] += force * ux;
        fy[j] += force * uy;
      }
    }

    // Springs along edges.
    for (const e of edges) {
      const a = byId.get(e.source);
      const b = byId.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = e.length ?? o.springLength;
      const delta = (dist - target) * o.springK;
      const ux = dx / dist;
      const uy = dy / dist;
      const ai = nodes.indexOf(a);
      const bi = nodes.indexOf(b);
      fx[ai] += delta * ux;
      fy[ai] += delta * uy;
      fx[bi] -= delta * ux;
      fy[bi] -= delta * uy;
    }

    // Cluster attraction: same `group` softly attracts.
    const groups = new Map<string, { sx: number; sy: number; n: number }>();
    for (const n of nodes) {
      if (!n.group) continue;
      const g = groups.get(n.group) ?? { sx: 0, sy: 0, n: 0 };
      g.sx += n.x; g.sy += n.y; g.n += 1;
      groups.set(n.group, g);
    }
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (!n.group) continue;
      const g = groups.get(n.group)!;
      if (g.n < 2) continue;
      const cx = g.sx / g.n;
      const cy = g.sy / g.n;
      fx[i] += (cx - n.x) * o.clusterStrength;
      fy[i] += (cy - n.y) * o.clusterStrength;
    }

    // Soft pull toward center.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      fx[i] += (o.cx - n.x) * o.centerStrength;
      fy[i] += (o.cy - n.y) * o.centerStrength;
    }

    // Integrate.
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.fixed) {
        n.vx = 0; n.vy = 0;
        continue;
      }
      n.vx = (n.vx + fx[i] * alpha) * o.damping;
      n.vy = (n.vy + fy[i] * alpha) * o.damping;
      n.x += n.vx;
      n.y += n.vy;
    }

    alpha = Math.max(0, alpha - o.alphaDecay);
    return alpha >= 0.01;
  };

  return {
    nodes,
    edges,
    get alpha() { return alpha; },
    step,
    reheat: (a = 1) => { alpha = a; },
  };
}

/** Random initial layout in a circle of `radius`. */
export function seedCircular(nodes: SimNode[], radius = 240) {
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    nodes[i].x = Math.cos(a) * radius;
    nodes[i].y = Math.sin(a) * radius;
  }
}
