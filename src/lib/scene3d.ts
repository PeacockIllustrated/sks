/**
 * A small 3D scene for drawing isometric illustrations as SVG.
 *
 * Every drawing on the site (the hero house, the project builder and the
 * detail sheets) is modelled in real millimetres out of convex solids and
 * rendered through this file. The renderer does what an SVG has no built-in
 * way of doing:
 *
 *   - depth order: SVG has no depth buffer, so document order is depth order.
 *     Solids are sorted with the standard isometric separating-axis test, which
 *     is exact for solids whose bounding boxes do not intersect. That is the
 *     modelling rule everywhere: things touch, they never overlap.
 *   - back-face culling, so a solid only draws the faces the camera can see.
 *   - light: every face is toned from its normal against one sun, so a roof
 *     slope that faces the light is brighter than the one that does not.
 *   - texture: brick coursing, slate courses, floorboards, timber grain and
 *     glazing reflections are SVG patterns laid out in the plane of the face
 *     they sit on, at their real size.
 *   - contact shadows on the surface each object stands on.
 *   - silhouettes: an object's outline is drawn heavier than its inner edges.
 *
 * Axes: x runs along the frontage, y towards the camera, z up. The camera
 * looks down the (-1, -1, -1) direction, so it sees faces whose normals point
 * along +x, +y or +z.
 */

import { shade } from "@/lib/iso";

export type V3 = [number, number, number];
export type V2 = [number, number];

/** Free-form labels a drawing hangs on a solid: the hotspot it answers to,
 *  the scope item that lights it, the layer it belongs to. */
export type Tags = Record<string, string | number | boolean | undefined>;

/* ---------------------------------------------------------------- vectors */

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Towards the camera. */
const VIEW: V3 = [1, 1, 1];

/** Towards the sun: from the left, a little in front, high. Matches the
 *  shading every drawing on the site already used, where the +x flank is the
 *  dark side and the tops are the bright ones. */
const SUN: V3 = norm([-0.5, 0.45, 0.75]);

/** How far a shadow travels per millimetre of height, along x and y. */
const SHADOW_RUN: V2 = [-SUN[0] / SUN[2], -SUN[1] / SUN[2]];

const COS30 = Math.cos(Math.PI / 6);

/** The isometric projection at unit scale, used for sorting. */
export function isoUnit(p: V3): V2 {
  return [(p[0] - p[1]) * COS30, (p[0] + p[1]) * 0.5 - p[2]];
}

/* -------------------------------------------------------------- materials */

export type PatternKind =
  | "brick"
  | "slate"
  | "boards"
  | "grain"
  | "tiles"
  | "paving"
  | "lawn"
  | "glass"
  | "seam"
  | "cladding"
  | "panel"
  | "render";

export type Material = {
  color: string;
  pattern?: PatternKind;
  /** Lighting response. 1 is matte; 0 ignores the light, for glowing things. */
  light?: number;
  /** Fill opacity. */
  alpha?: number;
};

/** Every material on the site. Muted, so the drawings sit on the navy ground
 *  without turning into a paint chart. */
export const MAT = {
  ground: { color: "#1c2133" },
  earth: { color: "#2a2722" },
  lawn: { color: "#3c5244", pattern: "lawn" },
  shrub: { color: "#41604b" },
  shrubDark: { color: "#33503e" },
  paving: { color: "#686873", pattern: "paving" },
  setts: { color: "#57575f", pattern: "paving" },
  gravel: { color: "#6b675e" },
  brick: { color: "#8d5f4a", pattern: "brick" },
  brickDark: { color: "#7a5141", pattern: "brick" },
  render: { color: "#d2cabb", pattern: "render" },
  stone: { color: "#c3bcae" },
  coping: { color: "#b9b2a3" },
  concrete: { color: "#8a8780" },
  slate: { color: "#4a515c", pattern: "slate" },
  ridge: { color: "#3d434d" },
  lead: { color: "#737c88", pattern: "seam" },
  membrane: { color: "#2e333d" },
  zinc: { color: "#5b6370", pattern: "seam" },
  metal: { color: "#2b313d" },
  steel: { color: "#323a4a" },
  frame: { color: "#e6e1d6" },
  frameDark: { color: "#30363f" },
  glass: { color: "#5f87b2", pattern: "glass" },
  glassDark: { color: "#3e5878", pattern: "glass" },
  solar: { color: "#1f2b40", pattern: "panel" },
  door: { color: "#2e4c6e" },
  oak: { color: "#b07c43", pattern: "grain" },
  oakDark: { color: "#94652f", pattern: "grain" },
  floor: { color: "#9b6c39", pattern: "boards" },
  timber: { color: "#a8783e", pattern: "grain" },
  fence: { color: "#5e4732", pattern: "cladding" },
  plaster: { color: "#ddd4c4" },
  plasterCut: { color: "#efe7d8" },
  cut: { color: "#eadfc8", light: 0.4 },
  shade: { color: "#05070d", alpha: 0.32, light: 0 },
  shadeSoft: { color: "#05070d", alpha: 0.16, light: 0 },
  white: { color: "#f1eee8" },
  black: { color: "#16191f" },
  ring: { color: "#3a3f4a", light: 0.3 },
  paint: { color: "#e9e4da" },
  unit: { color: "#435770" },
  unitDark: { color: "#384a61" },
  worktop: { color: "#dcd6ca" },
  splash: { color: "#d4cdbf", pattern: "tiles" },
  appliance: { color: "#2a2f39" },
  steelBright: { color: "#a6adb8" },
  brass: { color: "#e2b04f" },
  fabric: { color: "#5a6b86" },
  fabricDark: { color: "#4b5a72" },
  cushion: { color: "#c8973e" },
  rug: { color: "#4f5b72" },
  leather: { color: "#7a4a33" },
  hearth: { color: "#3a3d45" },
  fire: { color: "#e39a43", light: 0.2 },
  void: { color: "#151a28", light: 0.4 },
  pot: { color: "#9c5b3c" },
  plant: { color: "#4f7a58" },
  bookRed: { color: "#8d3f3f" },
  bookBlue: { color: "#5a78b0" },
  bookGreen: { color: "#3f6a58" },
  bookSand: { color: "#b4ad9f" },
  bookGold: { color: "#c8973e" },
  bookBrown: { color: "#7d5640" },
  car: { color: "#56637a" },
  tyre: { color: "#1a1d24" },
  massing: { color: "#1a2236" },
} satisfies Record<string, Material>;

export type MatId = keyof typeof MAT;

/* ------------------------------------------------------------------ solids */

export type Face = { pts: V3[]; n: V3; mat: MatId; edges?: boolean };

export type Mark =
  | { type: "poly"; pts: V3[]; mat: MatId; n?: V3; stroke?: boolean }
  | {
      type: "line";
      a: V3;
      b: V3;
      color?: string;
      w?: number;
      opacity?: number;
    };

/** One convex piece, or a hand-ordered assembly of them. */
export type Part = {
  faces: Face[];
  marks: Mark[];
  outline: boolean;
  /** Faceted but meant to read as rounded: no inner edges, only the outline. */
  soft?: boolean;
};

export type Node = {
  id: string;
  min: V3;
  max: V3;
  parts: Part[];
  tags: Tags;
  /** Painted before other flat things at the same level. Only breaks ties. */
  layer: number;
  /** Casts a contact shadow onto this rectangle, at the solid's base. */
  shadow?: { x0: number; y0: number; x1: number; y1: number; z?: number; k?: number };
};

function bounds(pts: V3[]): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of pts) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return { min, max };
}

function normalOf(pts: V3[]): V3 {
  /* Newell's method: robust for any planar polygon, convex or not. */
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return norm([nx, ny, nz]);
}

/** A convex polyhedron from its faces. Winding does not matter: each normal is
 *  turned to point away from the centroid. */
export function polyhedron(faces: V3[][], mat: MatId | ((n: V3) => MatId)): Part {
  const all = faces.flat();
  const c = mul(all.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / all.length);
  return {
    faces: faces.map((pts) => {
      let n = normalOf(pts);
      const fc = mul(pts.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / pts.length);
      if (dot(n, sub(fc, c)) < 0) n = mul(n, -1);
      return { pts, n, mat: typeof mat === "function" ? mat(n) : mat };
    }),
    marks: [],
    outline: true,
  };
}

export type BoxMat =
  | MatId
  | { all?: MatId; top?: MatId; front?: MatId; side?: MatId; back?: MatId; left?: MatId; bottom?: MatId };

function pickBoxMat(m: BoxMat, n: V3): MatId {
  if (typeof m === "string") return m;
  const fall = m.all ?? "stone";
  if (n[2] > 0.5) return m.top ?? fall;
  if (n[2] < -0.5) return m.bottom ?? fall;
  if (n[1] > 0.5) return m.front ?? fall;
  if (n[1] < -0.5) return m.back ?? m.front ?? fall;
  if (n[0] > 0.5) return m.side ?? fall;
  return m.left ?? m.side ?? fall;
}

/** An oriented box: origin and three edge vectors. */
export function obox(o: V3, ex: V3, ey: V3, ez: V3, mat: BoxMat): Part {
  const p = (a: number, b: number, c: number) =>
    add(add(add(o, mul(ex, a)), mul(ey, b)), mul(ez, c));
  const v = [
    p(0, 0, 0), p(1, 0, 0), p(1, 1, 0), p(0, 1, 0),
    p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1),
  ];
  return polyhedron(
    [
      [v[0], v[1], v[2], v[3]],
      [v[4], v[5], v[6], v[7]],
      [v[0], v[1], v[5], v[4]],
      [v[3], v[2], v[6], v[7]],
      [v[0], v[3], v[7], v[4]],
      [v[1], v[2], v[6], v[5]],
    ],
    (n) => pickBoxMat(mat, n),
  );
}

/** An axis-aligned box between two corners. */
export function boxPart(a: V3, b: V3, mat: BoxMat): Part {
  const lo: V3 = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])];
  const hi: V3 = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])];
  return obox(lo, [hi[0] - lo[0], 0, 0], [0, hi[1] - lo[1], 0], [0, 0, hi[2] - lo[2]], mat);
}

/** A convex profile extruded along an axis. The profile is in the other two
 *  axes, in order: (y, z) for "x", (x, z) for "y", (x, y) for "z". */
export function prismPart(
  axis: "x" | "y" | "z",
  profile: V2[],
  a0: number,
  a1: number,
  mat: BoxMat,
): Part {
  const lift = (q: V2, a: number): V3 =>
    axis === "x" ? [a, q[0], q[1]] : axis === "y" ? [q[0], a, q[1]] : [q[0], q[1], a];
  const capA = profile.map((q) => lift(q, a0));
  const capB = profile.map((q) => lift(q, a1));
  const sides = profile.map((_, i) => {
    const j = (i + 1) % profile.length;
    return [capA[i], capA[j], capB[j], capB[i]];
  });
  return polyhedron([capA, capB, ...sides], (n) => pickBoxMat(mat, n));
}

/** An upright cylinder, as a polygonal prism. */
export function cylPart(
  cx: number,
  cy: number,
  r: number,
  z0: number,
  z1: number,
  mat: BoxMat,
  seg = 12,
): Part {
  const ring: V2[] = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2 + Math.PI / seg;
    ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const part = prismPart("z", ring, z0, z1, mat);
  /* The facets of a round thing are not edges anyone drew. */
  part.faces.forEach((f) => {
    if (Math.abs(f.n[2]) < 0.5) f.edges = false;
  });
  return part;
}

/** A flat, zero-thickness polygon. Rugs, paving joints, shadows. */
export function flatPart(pts: V3[], mat: MatId, outline = false): Part {
  const n = normalOf(pts);
  const up = dot(n, VIEW) >= 0 ? n : mul(n, -1);
  return { faces: [{ pts, n: up, mat, edges: outline }], marks: [], outline };
}

/* ------------------------------------------------------------------- scene */

let uid = 0;

export class Scene {
  nodes: Node[] = [];
  private ctx: Tags[] = [];

  /** Tags applied to everything added inside `fn`. */
  with<T>(tags: Tags, fn: () => T): T {
    this.ctx.push(tags);
    try {
      return fn();
    } finally {
      this.ctx.pop();
    }
  }

  private tagsNow(extra?: Tags): Tags {
    return Object.assign({}, ...this.ctx, extra);
  }

  /** Add one solid, or a hand-ordered assembly painted in the order given. */
  add(parts: Part | Part[], opts?: { id?: string; tags?: Tags; layer?: number; shadow?: Node["shadow"] }): Node {
    const list = Array.isArray(parts) ? parts : [parts];
    const pts = list.flatMap((p) => [
      ...p.faces.flatMap((f) => f.pts),
      ...p.marks.flatMap((m) => (m.type === "poly" ? m.pts : [m.a, m.b])),
    ]);
    const { min, max } = bounds(pts);
    const node: Node = {
      id: opts?.id ?? `n${uid++}`,
      min,
      max,
      parts: list,
      tags: this.tagsNow(opts?.tags),
      layer: opts?.layer ?? 0,
      shadow: opts?.shadow,
    };
    this.nodes.push(node);
    return node;
  }

  box(a: V3, b: V3, mat: BoxMat, opts?: Parameters<Scene["add"]>[1]) {
    return this.add(boxPart(a, b, mat), opts);
  }

  flat(pts: V3[], mat: MatId, opts?: Parameters<Scene["add"]>[1] & { outline?: boolean }) {
    return this.add(flatPart(pts, mat, opts?.outline), { layer: 1, ...opts });
  }

  /** A flat rectangle at height z. */
  rect(x0: number, y0: number, x1: number, y1: number, z: number, mat: MatId, opts?: Parameters<Scene["flat"]>[2]) {
    return this.flat(
      [
        [x0, y0, z],
        [x1, y0, z],
        [x1, y1, z],
        [x0, y1, z],
      ],
      mat,
      opts,
    );
  }
}

/* -------------------------------------------------------------- sorting */

type Box2 = { x0: number; y0: number; x1: number; y1: number };

function screenBox(n: Node): Box2 {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < 8; i++) {
    const p: V3 = [
      i & 1 ? n.max[0] : n.min[0],
      i & 2 ? n.max[1] : n.min[1],
      i & 4 ? n.max[2] : n.min[2],
    ];
    const [sx, sy] = isoUnit(p);
    if (sx < x0) x0 = sx;
    if (sx > x1) x1 = sx;
    if (sy < y0) y0 = sy;
    if (sy > y1) y1 = sy;
  }
  return { x0, y0, x1, y1 };
}

const EPS = 0.5;

/** True when `a` can be painted before `b` on the strength of a separating
 *  axis: `a` lies wholly on the far side of `b` along x, y or z. */
function behind(a: Node, b: Node) {
  return (
    a.max[0] <= b.min[0] + EPS ||
    a.max[1] <= b.min[1] + EPS ||
    a.max[2] <= b.min[2] + EPS
  );
}

const centre = (n: Node) =>
  (n.min[0] + n.max[0] + n.min[1] + n.max[1] + n.min[2] + n.max[2]) / 2;

/** Back to front. */
export function sortNodes(nodes: Node[]): Node[] {
  const n = nodes.length;
  const boxes = nodes.map(screenBox);
  const after: number[][] = nodes.map(() => []);
  const indeg = new Array<number>(n).fill(0);

  for (let i = 0; i < n; i++) {
    const bi = boxes[i];
    for (let j = i + 1; j < n; j++) {
      const bj = boxes[j];
      if (bi.x1 <= bj.x0 || bj.x1 <= bi.x0 || bi.y1 <= bj.y0 || bj.y1 <= bi.y0) continue;
      const a = nodes[i];
      const b = nodes[j];
      const ab = behind(a, b);
      const ba = behind(b, a);
      let first: number;
      if (ab && !ba) first = i;
      else if (ba && !ab) first = j;
      else if (ab && ba) first = a.layer <= b.layer ? i : j;
      else first = centre(a) <= centre(b) ? i : j;
      const second = first === i ? j : i;
      after[first].push(second);
      indeg[second]++;
    }
  }

  /* Kahn's algorithm, preferring insertion order, and breaking any cycle at the
     farthest node still waiting. */
  const out: Node[] = [];
  const done = new Array<boolean>(n).fill(false);
  const ready: number[] = [];
  for (let i = 0; i < n; i++) if (indeg[i] === 0) ready.push(i);
  while (out.length < n) {
    let pick: number;
    if (ready.length) {
      ready.sort((a, b) => a - b);
      pick = ready.shift() as number;
    } else {
      pick = -1;
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        if (!done[i] && centre(nodes[i]) < best) {
          best = centre(nodes[i]);
          pick = i;
        }
      }
    }
    if (done[pick]) continue;
    done[pick] = true;
    out.push(nodes[pick]);
    for (const k of after[pick]) {
      indeg[k]--;
      if (indeg[k] === 0 && !done[k]) ready.push(k);
    }
  }
  return out;
}

/* ------------------------------------------------------------- rendering */

export type PatternSpec = {
  id: string;
  kind: PatternKind;
  color: string;
  /** In-plane unit vectors the pattern's u and v run along. */
  e1: V3;
  e2: V3;
};

export type Item =
  | {
      kind: "poly";
      pts: V3[];
      fill: string;
      fillOpacity?: number;
      stroke?: string;
      sw?: number;
      so?: number;
      node: Node;
      role: "face" | "mark" | "shadow";
      mat?: MatId;
      tone?: number;
    }
  | {
      kind: "line";
      a: V3;
      b: V3;
      stroke: string;
      sw: number;
      so: number;
      node: Node;
      role: "edge" | "mark";
    };

export type RenderOptions = {
  /** Outline ink. */
  ink?: string;
  /** Width of inner edges and of silhouettes, in output units. */
  edge?: number;
  silhouette?: number;
  /** Swap a material's colour, e.g. to massing grey for unlit work. */
  recolour?: (node: Node, mat: MatId) => { color?: string; pattern?: PatternKind | null; ink?: string; alpha?: number } | null;
  /** Colour of the edges on one node. */
  inkFor?: (node: Node) => string | undefined;
  /** Shadow opacity; 0 turns shadows off. */
  shadow?: number;
  /** Prefix for pattern ids, unique per drawing on a page. */
  prefix?: string;
};

/** Tone a material's colour for a face pointing along `n`. */
export function toneFor(n: V3, light = 1) {
  const ndl = Math.max(0, dot(n, SUN));
  return (-0.32 + 0.55 * ndl) * light;
}

/** In-plane axes for a face: u horizontal along the face, v up it. */
function basisFor(n: V3): { e1: V3; e2: V3 } {
  if (Math.abs(n[2]) > 0.98) return { e1: [1, 0, 0], e2: [0, 1, 0] };
  const e1 = norm(cross([0, 0, 1], n));
  const e2 = norm(cross(n, e1));
  return { e1, e2 };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

function clipRect(poly: V2[], r: Box2): V2[] {
  const edges: [(p: V2) => boolean, (a: V2, b: V2) => V2][] = [
    [(p) => p[0] >= r.x0, (a, b) => [r.x0, a[1] + ((b[1] - a[1]) * (r.x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= r.x1, (a, b) => [r.x1, a[1] + ((b[1] - a[1]) * (r.x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= r.y0, (a, b) => [a[0] + ((b[0] - a[0]) * (r.y0 - a[1])) / (b[1] - a[1]), r.y0]],
    [(p) => p[1] <= r.y1, (a, b) => [a[0] + ((b[0] - a[0]) * (r.y1 - a[1])) / (b[1] - a[1]), r.y1]],
  ];
  let out = poly;
  for (const [inside, cut] of edges) {
    const src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const a = src[i];
      const b = src[(i + 1) % src.length];
      const ia = inside(a);
      const ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) out.push(cut(a, b));
    }
    if (!out.length) break;
  }
  return out;
}

function hull(pts: V2[]): V2[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const crossZ = (o: V2, a: V2, b: V2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: V2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** The contact shadow a node throws onto its receiving rectangle. */
function shadowOf(node: Node): V3[] | null {
  const s = node.shadow;
  if (!s) return null;
  const z0 = s.z ?? node.min[2];
  const proj: V2[] = [];
  for (const part of node.parts) {
    for (const f of part.faces) {
      for (const p of f.pts) {
        const h = Math.max(0, p[2] - z0);
        proj.push([p[0] + SHADOW_RUN[0] * h, p[1] + SHADOW_RUN[1] * h]);
      }
    }
  }
  const poly = clipRect(hull(proj), { x0: s.x0, y0: s.y0, x1: s.x1, y1: s.y1 });
  if (poly.length < 3) return null;
  return poly.map((q) => [q[0], q[1], z0 + 0.5]);
}

const edgeKey = (a: V3, b: V3) => {
  const ka = `${r2(a[0])},${r2(a[1])},${r2(a[2])}`;
  const kb = `${r2(b[0])},${r2(b[1])},${r2(b[2])}`;
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

/**
 * Turn a scene into paint, back to front.
 *
 * Returns the items and the patterns they reference. Projection is left to
 * the caller: the hero tweens its camera, everything else is static.
 */
export function renderScene(scene: Scene, opt: RenderOptions = {}) {
  const ink = opt.ink ?? "#7f9bd4";
  const inner = opt.edge ?? 0.55;
  const sil = opt.silhouette ?? 1.05;
  const shadowAlpha = opt.shadow ?? 0.3;
  const prefix = opt.prefix ?? "s";
  const patterns = new Map<string, PatternSpec>();
  const items: Item[] = [];

  const fillFor = (node: Node, mat: MatId, n: V3) => {
    const base: Material = MAT[mat];
    const over = opt.recolour?.(node, mat);
    const color = over?.color ?? base.color;
    const pattern = over && over.pattern !== undefined ? over.pattern : base.pattern;
    const tone = toneFor(n, base.light ?? 1);
    const toned = shade(color, tone);
    if (!pattern) return { fill: toned, alpha: over?.alpha ?? base.alpha, tone };
    const { e1, e2 } = basisFor(n);
    const key = `${pattern}|${toned}|${e1.map(r2).join(",")}|${e2.map(r2).join(",")}`;
    let spec = patterns.get(key);
    if (!spec) {
      spec = { id: `${prefix}p${patterns.size}`, kind: pattern, color: toned, e1, e2 };
      patterns.set(key, spec);
    }
    return { fill: `url(#${spec.id})`, alpha: over?.alpha ?? base.alpha, tone };
  };

  /* A shadow is a flat thing at its receiver's height, so it goes through the
     sort like any other flat thing. */
  const shadowNodes: Node[] = [];
  if (shadowAlpha > 0) {
    for (const node of scene.nodes) {
      const pts = shadowOf(node);
      if (!pts) continue;
      const { min, max } = bounds(pts);
      shadowNodes.push({
        id: `${node.id}-shadow`,
        min,
        max,
        parts: [{ faces: [{ pts, n: [0, 0, 1], mat: "void" }], marks: [], outline: false }],
        tags: { ...node.tags, shadowOf: node.id, k: node.shadow?.k },
        layer: 5,
      });
    }
  }
  const order = sortNodes([...scene.nodes, ...shadowNodes]);

  for (const node of order) {
    if (node.tags.shadowOf) {
      const f = node.parts[0].faces[0];
      items.push({
        kind: "poly",
        pts: f.pts,
        fill: "#05070d",
        fillOpacity: shadowAlpha * ((node.tags.k as number | undefined) ?? 1),
        node,
        role: "shadow",
      });
      continue;
    }
    const nodeInk = opt.inkFor?.(node) ?? ink;
    for (const part of node.parts) {
      const visible = part.faces.filter((f) => dot(f.n, VIEW) > 1e-6);
      for (const f of visible) {
        const { fill, alpha, tone } = fillFor(node, f.mat, f.n);
        items.push({
          kind: "poly",
          pts: f.pts,
          fill,
          fillOpacity: alpha,
          /* A soft part strokes each facet in its own fill, closing the
             hairline seams between facets without drawing them. */
          stroke: part.soft ? fill : f.edges === false || !part.outline ? undefined : nodeInk,
          sw: part.soft ? 0.5 : inner,
          so: part.soft ? alpha : 0.42,
          node,
          role: "face",
          mat: f.mat,
          tone,
        });
      }
      for (const m of part.marks) {
        if (m.type === "poly") {
          const n = m.n ?? normalOf(m.pts);
          const facing = dot(n, VIEW) >= 0 ? n : mul(n, -1);
          const { fill, alpha } = fillFor(node, m.mat, facing);
          items.push({
            kind: "poly",
            pts: m.pts,
            fill,
            fillOpacity: alpha,
            stroke: m.stroke ? nodeInk : undefined,
            sw: inner,
            so: 0.5,
            node,
            role: "mark",
            mat: m.mat,
          });
        } else {
          items.push({
            kind: "line",
            a: m.a,
            b: m.b,
            stroke: m.color ?? nodeInk,
            sw: m.w ?? inner,
            so: m.opacity ?? 0.6,
            node,
            role: "mark",
          });
        }
      }
      if (part.outline) {
        /* Silhouette: edges with a visible face on one side only. */
        const seen = new Map<string, { a: V3; b: V3; vis: number; all: number; draw: boolean }>();
        for (const f of part.faces) {
          const vis = dot(f.n, VIEW) > 1e-6 ? 1 : 0;
          for (let i = 0; i < f.pts.length; i++) {
            const a = f.pts[i];
            const b = f.pts[(i + 1) % f.pts.length];
            const k = edgeKey(a, b);
            const e = seen.get(k) ?? { a, b, vis: 0, all: 0, draw: true };
            e.vis += vis;
            e.all += 1;
            if (f.edges === false) e.draw = false;
            seen.set(k, e);
          }
        }
        for (const e of seen.values()) {
          if (e.vis === 1 && (e.all === 2 || e.all === 1) && e.draw) {
            items.push({ kind: "line", a: e.a, b: e.b, stroke: nodeInk, sw: sil, so: 0.85, node, role: "edge" });
          }
        }
      }
    }
  }

  return { items, patterns: [...patterns.values()] };
}

/* --------------------------------------------------------------- patterns */

/** Pattern tile size in millimetres, u by v. */
const TILE: Record<PatternKind, V2> = {
  brick: [450, 150],
  slate: [500, 220],
  boards: [2400, 300],
  grain: [600, 400],
  tiles: [300, 150],
  paving: [1200, 1200],
  lawn: [1600, 1600],
  glass: [3200, 3200],
  seam: [450, 1000],
  cladding: [150, 1000],
  panel: [1000, 1700],
  render: [900, 900],
};

/** The SVG inside one pattern tile, in tile millimetres with v running up
 *  the face. Lines are kept fine: at drawing scale a 12mm joint is under half
 *  a pixel, which reads as texture rather than as linework. */
export function patternMarkup(spec: PatternSpec): string {
  const c = spec.color;
  const dk = shade(c, -0.28);
  const lt = shade(c, 0.16);
  const [w, h] = TILE[spec.kind];
  const bg = `<rect width="${w}" height="${h}" fill="${c}"/>`;
  /* Tile space has v up, SVG has y down, so rows are flipped with y = h - v. */
  switch (spec.kind) {
    case "brick": {
      const m = `stroke="${dk}" stroke-width="12" stroke-opacity="0.75"`;
      return (
        bg +
        `<rect x="0" y="0" width="225" height="75" fill="${shade(c, -0.06)}"/>` +
        `<rect x="337" y="75" width="113" height="75" fill="${shade(c, 0.05)}"/>` +
        `<line x1="0" y1="0" x2="${w}" y2="0" ${m}/><line x1="0" y1="75" x2="${w}" y2="75" ${m}/>` +
        `<line x1="225" y1="0" x2="225" y2="75" ${m}/><line x1="0" y1="0" x2="0" y2="75" ${m}/>` +
        `<line x1="112" y1="75" x2="112" y2="150" ${m}/><line x1="337" y1="75" x2="337" y2="150" ${m}/>`
      );
    }
    case "slate": {
      return (
        bg +
        `<rect x="0" y="${h - 34}" width="${w}" height="34" fill="${dk}" fill-opacity="0.55"/>` +
        `<rect x="0" y="${h / 2 - 34}" width="${w}" height="34" fill="${dk}" fill-opacity="0.55"/>` +
        `<line x1="0" y1="${h / 2}" x2="0" y2="${h}" stroke="${dk}" stroke-width="14"/>` +
        `<line x1="250" y1="0" x2="250" y2="${h / 2}" stroke="${dk}" stroke-width="14"/>` +
        `<rect x="40" y="10" width="160" height="40" fill="${lt}" fill-opacity="0.25"/>`
      );
    }
    case "boards": {
      const m = `stroke="${dk}" stroke-width="10" stroke-opacity="0.8"`;
      return (
        bg +
        `<rect x="0" y="150" width="${w}" height="150" fill="${shade(c, -0.05)}"/>` +
        `<line x1="0" y1="0" x2="${w}" y2="0" ${m}/><line x1="0" y1="150" x2="${w}" y2="150" ${m}/>` +
        `<line x1="700" y1="0" x2="700" y2="150" ${m}/><line x1="1900" y1="150" x2="1900" y2="300" ${m}/>` +
        `<path d="M0 60 Q600 40 1200 70 T2400 55" fill="none" stroke="${dk}" stroke-width="5" stroke-opacity="0.35"/>` +
        `<path d="M0 220 Q500 240 1100 210 T2400 230" fill="none" stroke="${dk}" stroke-width="5" stroke-opacity="0.35"/>`
      );
    }
    case "grain": {
      const s = `fill="none" stroke="${dk}" stroke-width="4" stroke-opacity="0.32"`;
      return (
        bg +
        `<path d="M0 60 C150 50 300 80 600 62" ${s}/>` +
        `<path d="M0 170 C200 185 350 150 600 172" ${s}/>` +
        `<path d="M0 290 C120 280 420 310 600 292" ${s}/>` +
        `<path d="M0 360 C250 350 330 372 600 358" ${s}/>`
      );
    }
    case "tiles": {
      const m = `stroke="${dk}" stroke-width="8" stroke-opacity="0.6"`;
      return (
        bg +
        `<line x1="0" y1="0" x2="${w}" y2="0" ${m}/><line x1="0" y1="75" x2="${w}" y2="75" ${m}/>` +
        `<line x1="0" y1="0" x2="0" y2="75" ${m}/><line x1="150" y1="75" x2="150" y2="150" ${m}/>`
      );
    }
    case "paving": {
      const m = `stroke="${dk}" stroke-width="16" stroke-opacity="0.8"`;
      return (
        bg +
        `<rect x="600" y="0" width="600" height="600" fill="${shade(c, 0.05)}"/>` +
        `<rect x="0" y="600" width="600" height="600" fill="${shade(c, -0.04)}"/>` +
        `<line x1="0" y1="0" x2="${w}" y2="0" ${m}/><line x1="0" y1="600" x2="${w}" y2="600" ${m}/>` +
        `<line x1="0" y1="0" x2="0" y2="${h}" ${m}/><line x1="600" y1="0" x2="600" y2="${h}" ${m}/>`
      );
    }
    case "lawn": {
      return (
        bg +
        `<rect x="0" y="0" width="800" height="${h}" fill="${shade(c, 0.07)}"/>` +
        `<path d="M120 300 l20 -60 l20 60 M900 1100 l20 -60 l20 60 M500 800 l16 -50 l16 50" fill="none" stroke="${lt}" stroke-width="10" stroke-opacity="0.35"/>`
      );
    }
    case "glass": {
      return (
        bg +
        `<path d="M0 ${h} L${w * 0.32} 0 L${w * 0.5} 0 L${w * 0.18} ${h} Z" fill="#ffffff" fill-opacity="0.13"/>` +
        `<path d="M${w * 0.58} ${h} L${w * 0.86} 0 L${w * 0.92} 0 L${w * 0.64} ${h} Z" fill="#ffffff" fill-opacity="0.09"/>` +
        `<rect width="${w}" height="${h * 0.35}" fill="#ffffff" fill-opacity="0.05"/>`
      );
    }
    case "seam": {
      return (
        bg +
        `<line x1="0" y1="0" x2="0" y2="${h}" stroke="${lt}" stroke-width="18" stroke-opacity="0.55"/>` +
        `<line x1="14" y1="0" x2="14" y2="${h}" stroke="${dk}" stroke-width="10" stroke-opacity="0.5"/>`
      );
    }
    case "cladding": {
      return (
        bg +
        `<line x1="0" y1="0" x2="0" y2="${h}" stroke="${dk}" stroke-width="14" stroke-opacity="0.8"/>` +
        `<line x1="70" y1="0" x2="70" y2="${h}" stroke="${lt}" stroke-width="5" stroke-opacity="0.25"/>`
      );
    }
    case "panel": {
      return (
        bg +
        `<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#8fa3c4" stroke-width="22" stroke-opacity="0.55"/>` +
        `<path d="M${w / 3} 0 V${h} M${(2 * w) / 3} 0 V${h} M0 ${h / 3} H${w} M0 ${(2 * h) / 3} H${w}" stroke="#8fa3c4" stroke-width="7" stroke-opacity="0.3"/>` +
        `<path d="M0 ${h} L${w * 0.4} 0 L${w * 0.55} 0 L${w * 0.15} ${h} Z" fill="#ffffff" fill-opacity="0.06"/>`
      );
    }
    case "render": {
      return (
        bg +
        `<circle cx="120" cy="200" r="14" fill="${dk}" fill-opacity="0.18"/>` +
        `<circle cx="600" cy="520" r="12" fill="${dk}" fill-opacity="0.15"/>` +
        `<circle cx="380" cy="780" r="10" fill="${lt}" fill-opacity="0.25"/>`
      );
    }
  }
}

export type Projector = (p: V3) => V2;

/** The linear part of a projection, as the image of a direction. */
function linear(proj: Projector, v: V3): V2 {
  const a = proj([0, 0, 0]);
  const b = proj(v);
  return [b[0] - a[0], b[1] - a[1]];
}

/**
 * The patternTransform that lays a pattern in its face's plane.
 *
 * A face's plane projects affinely, so a pattern drawn in face millimetres
 * maps onto it with a single matrix. Tile y runs down and face v runs up,
 * hence the flip on the second column.
 */
export function patternTransform(spec: PatternSpec, proj: Projector): string {
  const o = proj([0, 0, 0]);
  const u = linear(proj, spec.e1);
  const v = linear(proj, spec.e2);
  const f = (x: number) => x.toFixed(5);
  return `matrix(${f(u[0])} ${f(u[1])} ${f(-v[0])} ${f(-v[1])} ${f(o[0])} ${f(o[1])})`;
}

export function patternSize(kind: PatternKind): V2 {
  return TILE[kind];
}

/* ------------------------------------------------------------- framing */

export function projectIso(k: number, ox = 0, oy = 0): Projector {
  return (p) => [ox + (p[0] - p[1]) * COS30 * k, oy + ((p[0] + p[1]) * 0.5 - p[2]) * k];
}

/** Bounds of the painted items, in projected units. */
export function itemBounds(items: Item[], proj: Projector) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const take = (p: V3) => {
    const [x, y] = proj(p);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  for (const it of items) {
    if (it.role === "shadow") continue;
    if (it.kind === "poly") it.pts.forEach(take);
    else {
      take(it.a);
      take(it.b);
    }
  }
  return { x0, y0, x1, y1 };
}

export function pointsAttr(pts: V3[], proj: Projector) {
  return pts
    .map((p) => {
      const [x, y] = proj(p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
