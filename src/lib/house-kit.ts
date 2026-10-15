/**
 * The parts every drawing is built from, at their real sizes.
 *
 * Millimetres throughout, and the numbers are the ones a joiner or a builder
 * would recognise: 900mm worktops, 600mm base units, 2.6m floor to floor with
 * thirteen risers, a 1981 x 762 door leaf, a balustrade at 900mm above the
 * pitch line. The drawings stop looking like toys when the parts in them are
 * the right size relative to each other, and that is most of what "production
 * ready" means for an illustration.
 *
 * Modelling rule, because the renderer depends on it: parts touch, they never
 * overlap. A worktop sits on its units, a unit stands against its wall, and a
 * window is drawn onto the face of the wall it is in rather than cut into it.
 */

import {
  type MatId,
  type Mark,
  type Node,
  type Part,
  type Scene,
  type Tags,
  type V3,
  boxPart,
  cylPart,
  flatPart,
  obox,
  polyhedron,
  prismPart,
} from "@/lib/scene3d";

/* ------------------------------------------------------------- wall faces */

/**
 * A wall face the camera can see: the plane `axis = at`, facing +axis.
 *
 * Local coordinates on it are u along the wall (x for a y-face, y for an
 * x-face), v up, and w out of the face towards the camera.
 */
export type WallFace = { axis: "x" | "y"; at: number };

export function onFace(f: WallFace, u: number, v: number, w = 0): V3 {
  return f.axis === "y" ? [u, f.at + w, v] : [f.at + w, u, v];
}

export function faceRect(f: WallFace, u0: number, u1: number, v0: number, v1: number, w = 0): V3[] {
  return [onFace(f, u0, v0, w), onFace(f, u1, v0, w), onFace(f, u1, v1, w), onFace(f, u0, v1, w)];
}

/** A box standing proud of a wall face. */
export function faceBox(f: WallFace, u0: number, u1: number, v0: number, v1: number, w0: number, w1: number, mat: Parameters<typeof boxPart>[2]): Part {
  return boxPart(onFace(f, u0, v0, w0), onFace(f, u1, v1, w1), mat);
}

const mark = (pts: V3[], mat: MatId, stroke = false): Mark => ({ type: "poly", pts, mat, stroke });
const line = (a: V3, b: V3, color: string, w: number, opacity = 0.8): Mark => ({ type: "line", a, b, color, w, opacity });

/** Paint onto a node that is already in the scene. */
export function attach(node: Node, marks: Mark[]) {
  node.parts.push({ faces: [], marks, outline: false });
}

/* ------------------------------------------------------------ openings */

export type WindowOpts = {
  /** Panes across, and whether there is a transom with top lights. */
  lights?: number;
  transom?: boolean;
  frame?: MatId;
  glass?: MatId;
  /** Stone cill and head. Off for openings in render or inside a room. */
  cill?: boolean;
  head?: MatId | false;
  /** Reveal depth shown as shadow inside the opening. */
  reveal?: number;
};

/**
 * A window on a wall face: the reveal's shadow, the frame, the glass and its
 * bars, painted onto the wall; the cill as its own small solid in front.
 *
 * Returns the marks for the wall and the cill as a part, so the caller can put
 * both where they belong in the scene.
 */
export function windowOn(f: WallFace, u0: number, u1: number, v0: number, v1: number, o: WindowOpts = {}) {
  const frame = o.frame ?? "frame";
  const glass = o.glass ?? "glass";
  const lights = o.lights ?? 2;
  const FR = 55;
  const marks: Mark[] = [];
  const parts: Part[] = [];

  if (o.head !== false) {
    marks.push(mark(faceRect(f, u0 - 40, u1 + 40, v1, v1 + 150, 0.5), o.head ?? "stone", true));
  }
  marks.push(mark(faceRect(f, u0, u1, v0, v1, 0.6), frame, true));
  const top = o.transom ? v1 - (v1 - v0) * 0.28 : v1;
  const inner = (u1 - u0 - FR * 2) / lights;
  for (let i = 0; i < lights; i++) {
    const a = u0 + FR + i * inner + (i ? FR / 4 : 0);
    const b = u0 + FR + (i + 1) * inner - (i < lights - 1 ? FR / 4 : 0);
    marks.push(mark(faceRect(f, a, b, v0 + FR, top - FR / 2, 1), glass));
    if (o.transom) marks.push(mark(faceRect(f, a, b, top + FR / 2, v1 - FR, 1), glass));
  }
  /* The reveal throws a shadow across the top and down the left of the frame,
     which is what makes it read as set back into the wall. */
  const R = o.reveal ?? 90;
  marks.push(
    mark([onFace(f, u0, v1, 1.5), onFace(f, u1, v1, 1.5), onFace(f, u1 - R * 0.4, v1 - R, 1.5), onFace(f, u0 + R * 0.7, v1 - R, 1.5)], "shade"),
    mark([onFace(f, u0, v0, 1.5), onFace(f, u0, v1, 1.5), onFace(f, u0 + R * 0.7, v1 - R, 1.5), onFace(f, u0 + R * 0.7, v0, 1.5)], "shade"),
  );
  if (o.cill !== false) {
    parts.push(faceBox(f, u0 - 50, u1 + 50, v0 - 70, v0, 0, 55, "stone"));
  }
  return { marks, parts };
}

/** A front door: frame, leaf with raised panels, glazed top light, furniture. */
export function doorOn(f: WallFace, u0: number, u1: number, v0: number, opts: { leaf?: MatId; fanlight?: boolean } = {}) {
  const W = u1 - u0;
  const H = 2100;
  const marks: Mark[] = [];
  const FR = 60;
  const fan = opts.fanlight ? 380 : 0;
  marks.push(mark(faceRect(f, u0, u1, v0, v0 + H + fan, 0.6), "frame", true));
  const l0 = u0 + FR;
  const l1 = u1 - FR;
  const lz1 = v0 + H - FR / 2;
  marks.push(mark(faceRect(f, l0, l1, v0, lz1, 1), opts.leaf ?? "door", true));
  /* Four panels, two over two, the top pair glazed. */
  const pw = (l1 - l0 - 3 * 110) / 2;
  for (let i = 0; i < 2; i++) {
    const a = l0 + 110 + i * (pw + 110);
    marks.push(mark(faceRect(f, a, a + pw, v0 + 160, v0 + 860, 1.5), "shadeSoft"));
    marks.push(mark(faceRect(f, a, a + pw, v0 + 1080, lz1 - 160, 1.5), "glassDark"));
  }
  marks.push(line(onFace(f, l1 - 90, v0 + 1000, 3), onFace(f, l1 - 90, v0 + 1060, 3), "#e2b04f", 1.6, 1));
  marks.push(line(onFace(f, (l0 + l1) / 2 - 120, v0 + 950, 3), onFace(f, (l0 + l1) / 2 + 120, v0 + 950, 3), "#e2b04f", 1.1, 0.9));
  if (fan) marks.push(mark(faceRect(f, l0, l1, v0 + H + FR / 2, v0 + H + fan - FR, 1), "glass"));
  const R = 110;
  marks.push(
    mark([onFace(f, u0, v0 + H + fan, 2), onFace(f, u1, v0 + H + fan, 2), onFace(f, u1, v0 + H + fan - R, 2), onFace(f, u0 + R * 0.7, v0 + H + fan - R, 2)], "shade"),
    mark([onFace(f, u0, v0, 2), onFace(f, u0, v0 + H + fan, 2), onFace(f, u0 + R * 0.7, v0 + H + fan - R, 2), onFace(f, u0 + R * 0.7, v0, 2)], "shade"),
  );
  void W;
  return marks;
}

/** Folding or sliding glazed doors: slim dark frames, full-height glass. */
export function glazedDoorsOn(f: WallFace, u0: number, u1: number, v0: number, v1: number, leaves: number) {
  const marks: Mark[] = [];
  marks.push(mark(faceRect(f, u0, u1, v0, v1, 0.6), "frameDark", true));
  const FR = 45;
  const each = (u1 - u0 - FR) / leaves;
  for (let i = 0; i < leaves; i++) {
    const a = u0 + FR + i * each;
    marks.push(mark(faceRect(f, a, a + each - FR, v0 + 70, v1 - FR, 1), "glass"));
  }
  const R = 100;
  marks.push(
    mark([onFace(f, u0, v1, 2), onFace(f, u1, v1, 2), onFace(f, u1, v1 - R, 2), onFace(f, u0 + R * 0.7, v1 - R, 2)], "shade"),
  );
  return marks;
}

/* ---------------------------------------------------------------- roofs */

export type GableRoof = {
  /** Wall-plate rectangle and level. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  eaves: number;
  pitch: number;
  /** Ridge runs along this axis. */
  ridge: "x" | "y";
  overhang?: number;
  verge?: number;
  hipped?: boolean;
};

export function ridgeHeight(r: GableRoof) {
  const half = (r.ridge === "y" ? r.x1 - r.x0 : r.y1 - r.y0) / 2;
  return r.eaves + half * Math.tan((r.pitch * Math.PI) / 180);
}

/** The triangle of wall in a gable. It carries on the wall below without a
 *  seam, and its top edges are under the verge, so it draws no lines. */
function gableInfill(p: Part): Part {
  return { ...p, faces: p.faces.map((f) => ({ ...f, edges: false })) };
}

/**
 * A pitched roof as solid slabs: the two slopes (or four, hipped) with real
 * thickness so the eaves and verges show an edge, the ridge, and the gable
 * triangles that fill the ends. One hand-ordered assembly, because its pieces
 * interlock in a way no bounding box can separate.
 *
 * `extras` are painted on top of the slope the camera sees best: solar panels,
 * a chimney, a dormer.
 */
export function pitchedRoof(
  r: GableRoof,
  extras: {
    onNear?: Part[];
    onFar?: Part[];
    afterRidge?: Part[];
    /** A stack that straddles the ridge: the ridge is split at `at` (along
     *  it), the stack painted over the part behind and under the part in
     *  front. */
    ridgeStack?: { at: number; parts: Part[] };
  } = {},
) {
  const OV = r.overhang ?? 300;
  const VG = r.verge ?? 200;
  const T = 160;
  const tan = Math.tan((r.pitch * Math.PI) / 180);
  const cos = Math.cos((r.pitch * Math.PI) / 180);
  const parts: Part[] = [];
  const RZ = ridgeHeight(r);
  const lift = T / cos;

  if (r.ridge === "y") {
    const mx = (r.x0 + r.x1) / 2;
    const ya = r.y0 - (r.hipped ? OV : VG);
    const yb = r.y1 + (r.hipped ? OV : VG);
    const ez = r.eaves - OV * tan;
    const run = mx - r.x0 + OV;
    const slope = (x: number): V3 => [x, 0, 0];
    void slope;
    if (!r.hipped) {
      /* The far slope is split at the gable: the part behind it paints first,
         the verge that oversails it paints after. Then the near slope, ridge,
         whatever sits on the near slope, and the bargeboards in front. */
      const farMain = obox([r.x0 - OV, ya, ez], [0, r.y1 - ya, 0], [run, 0, run * tan], [0, 0, lift], { all: "slate" });
      const farVerge = obox([r.x0 - OV, r.y1, ez], [0, yb - r.y1, 0], [run, 0, run * tan], [0, 0, lift], { all: "slate" });
      const near = obox([r.x1 + OV, ya, ez], [0, yb - ya, 0], [-run, 0, run * tan], [0, 0, lift], { all: "slate" });
      parts.push(farMain, ...(extras.onFar ?? []));
      parts.push(gableInfill(prismPart("y", [[r.x0, r.eaves], [r.x1, r.eaves], [mx, RZ]], r.y1 - 300, r.y1, "brick")));
      parts.push(farVerge, near);
      if (extras.ridgeStack) {
        const at = extras.ridgeStack.at;
        parts.push(boxPart([mx - 130, ya, RZ + lift - 30], [mx + 130, at, RZ + lift + 110], "ridge"));
        parts.push(...extras.ridgeStack.parts);
        parts.push(boxPart([mx - 130, at, RZ + lift - 30], [mx + 130, yb, RZ + lift + 110], "ridge"));
      } else {
        parts.push(boxPart([mx - 130, ya, RZ + lift - 30], [mx + 130, yb, RZ + lift + 110], "ridge"));
      }
      parts.push(...(extras.onNear ?? []), ...(extras.afterRidge ?? []));
      parts.push(
        obox([r.x0 - OV, r.y1 + VG, ez - 40], [0, 30, 0], [run, 0, run * tan], [0, 0, lift + 60], "frame"),
        obox([r.x1 + OV, r.y1 + VG, ez - 40], [0, 30, 0], [-run, 0, run * tan], [0, 0, lift + 60], "frame"),
      );
    } else {
      const top = RZ + lift;
      const e = ez + lift;
      const hy0 = r.y0 - OV + (mx - r.x0 + OV);
      const hy1 = r.y1 + OV - (mx - r.x0 + OV);
      const cy0 = Math.min(hy0, (r.y0 + r.y1) / 2);
      const cy1 = Math.max(hy1, (r.y0 + r.y1) / 2);
      const X0 = r.x0 - OV;
      const X1 = r.x1 + OV;
      const Y0 = r.y0 - OV;
      const Y1 = r.y1 + OV;
      parts.push(boxPart([X0, Y0, e - lift - 60], [X1, Y1, e - lift], "frame"));
      parts.push(
        polyhedron(
          [
            [[X0, Y0, e], [X1, Y0, e], [X1, Y1, e], [X0, Y1, e]],
            [[X0, Y0, e], [X1, Y0, e], [mx, cy0, top]],
            [[X1, Y0, e], [X1, Y1, e], [mx, cy1, top], [mx, cy0, top]],
            [[X1, Y1, e], [X0, Y1, e], [mx, cy1, top]],
            [[X0, Y1, e], [X0, Y0, e], [mx, cy0, top], [mx, cy1, top]],
          ],
          "slate",
        ),
        ...(extras.onFar ?? []),
      );
      if (cy1 > cy0) parts.push(boxPart([mx - 120, cy0, top - 20], [mx + 120, cy1, top + 100], "ridge"));
      parts.push(...(extras.onNear ?? []), ...(extras.afterRidge ?? []));
    }
  } else {
    const my = (r.y0 + r.y1) / 2;
    const xa = r.x0 - (r.hipped ? OV : VG);
    const xb = r.x1 + (r.hipped ? OV : VG);
    const ez = r.eaves - OV * tan;
    const run = my - r.y0 + OV;
    if (!r.hipped) {
      const farMain = obox([xa, r.y0 - OV, ez], [r.x1 - xa, 0, 0], [0, run, run * tan], [0, 0, lift], { all: "slate" });
      const farVerge = obox([r.x1, r.y0 - OV, ez], [xb - r.x1, 0, 0], [0, run, run * tan], [0, 0, lift], { all: "slate" });
      const near = obox([xa, r.y1 + OV, ez], [xb - xa, 0, 0], [0, -run, run * tan], [0, 0, lift], { all: "slate" });
      parts.push(farMain, ...(extras.onFar ?? []));
      parts.push(gableInfill(prismPart("x", [[r.y0, r.eaves], [r.y1, r.eaves], [my, RZ]], r.x1 - 300, r.x1, "brick")));
      parts.push(farVerge, near);
      parts.push(boxPart([xa, my - 130, RZ + lift - 30], [xb, my + 130, RZ + lift + 110], "ridge"));
      parts.push(...(extras.onNear ?? []), ...(extras.afterRidge ?? []));
      parts.push(
        obox([r.x1 + VG, r.y0 - OV, ez - 40], [30, 0, 0], [0, run, run * tan], [0, 0, lift + 60], "frame"),
        obox([r.x1 + VG, r.y1 + OV, ez - 40], [30, 0, 0], [0, -run, run * tan], [0, 0, lift + 60], "frame"),
      );
    } else {
      const top = RZ + lift;
      const e = ez + lift;
      const X0 = r.x0 - OV;
      const X1 = r.x1 + OV;
      const Y0 = r.y0 - OV;
      const Y1 = r.y1 + OV;
      const inset = my - Y0;
      const cx0 = Math.min(X0 + inset, (r.x0 + r.x1) / 2);
      const cx1 = Math.max(X1 - inset, (r.x0 + r.x1) / 2);
      parts.push(boxPart([X0, Y0, e - lift - 60], [X1, Y1, e - lift], "frame"));
      parts.push(
        polyhedron(
          [
            [[X0, Y0, e], [X1, Y0, e], [X1, Y1, e], [X0, Y1, e]],
            [[X0, Y0, e], [X1, Y0, e], [cx1, my, top], [cx0, my, top]],
            [[X1, Y0, e], [X1, Y1, e], [cx1, my, top]],
            [[X1, Y1, e], [X0, Y1, e], [cx0, my, top], [cx1, my, top]],
            [[X0, Y1, e], [X0, Y0, e], [cx0, my, top]],
          ],
          "slate",
        ),
        ...(extras.onFar ?? []),
      );
      if (cx1 > cx0) parts.push(boxPart([cx0, my - 120, top - 20], [cx1, my + 120, top + 100], "ridge"));
      parts.push(...(extras.onNear ?? []), ...(extras.afterRidge ?? []));
    }
  }
  return { parts, ridge: RZ, top: RZ + lift };
}

/** A point on a roof slope, for setting things on it. `u` runs along the
 *  ridge, `s` is the horizontal distance in from the eaves line of the wall,
 *  and `h` is height above the slope's top surface. */
export function onSlope(r: GableRoof, side: "near" | "far", u: number, s: number, h = 0): V3 {
  const tan = Math.tan((r.pitch * Math.PI) / 180);
  const cos = Math.cos((r.pitch * Math.PI) / 180);
  const z = r.eaves + s * tan + 160 / cos + h / cos;
  if (r.ridge === "y") return side === "near" ? [r.x1 - s, u, z] : [r.x0 + s, u, z];
  return side === "near" ? [u, r.y1 - s, z] : [u, r.y0 + s, z];
}

/** A row of solar panels lying on a slope, standing 90mm off the tiles. */
export function solarArray(r: GableRoof, side: "near" | "far", u0: number, u1: number, s0: number, s1: number, cols: number): Part[] {
  const tan = Math.tan((r.pitch * Math.PI) / 180);
  const parts: Part[] = [];
  const each = (u1 - u0) / cols;
  for (let i = 0; i < cols; i++) {
    const a = u0 + i * each + 15;
    const b = u0 + (i + 1) * each - 15;
    const o = onSlope(r, side, a, s0, 90);
    const along: V3 = r.ridge === "y" ? [0, b - a, 0] : [b - a, 0, 0];
    const dir = side === "near" ? -1 : 1;
    const up: V3 =
      r.ridge === "y" ? [dir * (s1 - s0), 0, (s1 - s0) * tan] : [0, dir * (s1 - s0), (s1 - s0) * tan];
    const thick: V3 = [0, 0, 40];
    parts.push(obox(o, along, up, thick, { all: "metal", top: "solar" }));
  }
  return parts;
}

/** A chimney stack rising from a slope, with its lead apron and pots. */
export function chimney(r: GableRoof, side: "near" | "far", u: number, s: number, w = 600, d = 800, above = 1100): Part[] {
  const base = onSlope(r, side, u, s, 0);
  const tan = Math.tan((r.pitch * Math.PI) / 180);
  const lowZ = base[2] - (d / 2) * tan - 200;
  const topZ = base[2] + (d / 2) * tan + above;
  const cx = base[0];
  const cy = base[1];
  const hx = r.ridge === "y" ? d / 2 : w / 2;
  const hy = r.ridge === "y" ? w / 2 : d / 2;
  return [
    boxPart([cx - hx, cy - hy, lowZ], [cx + hx, cy + hy, topZ], "brick"),
    boxPart([cx - hx - 50, cy - hy - 50, topZ], [cx + hx + 50, cy + hy + 50, topZ + 120], "coping"),
    cylPart(cx - hx / 2.2, cy, 95, topZ + 120, topZ + 520, "pot", 10),
    cylPart(cx + hx / 2.2, cy, 95, topZ + 120, topZ + 450, "pot", 10),
  ];
}

/**
 * A chimney stack on a gable wall, rising through the ridge. Built as two
 * halves, one standing on each slope, because the solid above a ridge is not
 * convex. Pass the result as `ridgeStack` to pitchedRoof.
 */
export function ridgeChimney(r: GableRoof, u0: number, u1: number, w = 1200, above = 900) {
  const tan = Math.tan((r.pitch * Math.PI) / 180);
  const cos = Math.cos((r.pitch * Math.PI) / 180);
  const lift = 160 / cos;
  const RZ = ridgeHeight(r) + lift;
  const mx = (r.x0 + r.x1) / 2;
  const top = RZ + above;
  const zAt = (x: number) => RZ - Math.abs(x - mx) * tan - 20;
  const half = (xa: number, xb: number) => {
    const P = (x: number, y: number, z: number): V3 => [x, y, z];
    return polyhedron(
      [
        [P(xa, u0, top), P(xb, u0, top), P(xb, u1, top), P(xa, u1, top)],
        [P(xa, u0, zAt(xa)), P(xb, u0, zAt(xb)), P(xb, u1, zAt(xb)), P(xa, u1, zAt(xa))],
        [P(xa, u0, zAt(xa)), P(xb, u0, zAt(xb)), P(xb, u0, top), P(xa, u0, top)],
        [P(xa, u1, zAt(xa)), P(xb, u1, zAt(xb)), P(xb, u1, top), P(xa, u1, top)],
        [P(xa, u0, zAt(xa)), P(xa, u1, zAt(xa)), P(xa, u1, top), P(xa, u0, top)],
        [P(xb, u0, zAt(xb)), P(xb, u1, zAt(xb)), P(xb, u1, top), P(xb, u0, top)],
      ],
      "brick",
    );
  };
  const x0 = mx - w / 2;
  const x1 = mx + w / 2;
  const cy = (u0 + u1) / 2;
  /* Lead aprons where the stack meets each slope, in front of it. */
  const apron = (xa: number, xb: number) => {
    const z = (x: number) => zAt(x) + 20;
    return polyhedron(
      [
        [[xa, u1, z(xa)], [xb, u1, z(xb)], [xb, u1 + 150, z(xb)], [xa, u1 + 150, z(xa)]],
        [[xa, u1, z(xa) + 25], [xb, u1, z(xb) + 25], [xb, u1 + 150, z(xb) + 25], [xa, u1 + 150, z(xa) + 25]],
        [[xa, u1 + 150, z(xa)], [xb, u1 + 150, z(xb)], [xb, u1 + 150, z(xb) + 25], [xa, u1 + 150, z(xa) + 25]],
        [[xa, u1, z(xa)], [xb, u1, z(xb)], [xb, u1, z(xb) + 25], [xa, u1, z(xa) + 25]],
        [[xa, u1, z(xa)], [xa, u1 + 150, z(xa)], [xa, u1 + 150, z(xa) + 25], [xa, u1, z(xa) + 25]],
        [[xb, u1, z(xb)], [xb, u1 + 150, z(xb)], [xb, u1 + 150, z(xb) + 25], [xb, u1, z(xb) + 25]],
      ],
      "lead",
    );
  };
  return {
    at: u1 + 150,
    parts: [
      half(x0, mx),
      half(mx, x1),
      apron(x0, mx),
      apron(mx, x1),
      boxPart([x0 - 50, u0 - 50, top], [x1 + 50, u1 + 50, top + 120], "coping"),
      cylPart(mx - w / 4, cy, 100, top + 120, top + 560, "pot", 10),
      cylPart(mx + w / 4, cy, 100, top + 120, top + 480, "pot", 10),
    ],
  };
}

/** An eaves gutter with its brackets, and a downpipe to a shoe at the bottom. */
export function gutterAlong(axis: "x" | "y", a0: number, a1: number, at: number, z: number, out: 1 | -1): Part {
  return axis === "x"
    ? boxPart([a0, out > 0 ? at : at - 120, z - 110], [a1, out > 0 ? at + 120 : at, z], "metal")
    : boxPart([out > 0 ? at : at - 120, a0, z - 110], [out > 0 ? at + 120 : at, a1, z], "metal");
}

export function downpipe(x: number, y: number, z0: number, z1: number): Part[] {
  return [
    boxPart([x - 35, y - 35, z0 + 60], [x + 35, y + 35, z1], "metal"),
    boxPart([x - 45, y - 45, z0], [x + 45, y + 70, z0 + 60], "metal"),
  ];
}

/* --------------------------------------------------------------- stairs */

export type StairOpts = {
  /** The stair's footprint across its width. */
  x0: number;
  x1: number;
  /** Where the bottom riser is, and which way the flight climbs along y. */
  yStart: number;
  dir: -1 | 1;
  z0?: number;
  /** Floor to floor. */
  rise: number;
  risers?: number;
  going?: number;
  /** The open side carries the balustrade. */
  open: "x1" | "x0";
  tread?: MatId;
  /** Draw the cut edge of the floor it arrives at. */
  landing?: boolean;
};

/**
 * A straight flight to Approved Document K: thirteen equal risers to the floor
 * above, a 225mm going, a closed string on the open side with a spandrel
 * under it, balusters at under 100mm centres, a handrail 900mm above the
 * pitch line, and newels at the foot and the head.
 *
 * Returns the treads as separate solids and the balustrade as one assembly.
 */
export function stair(s: Scene, o: StairOpts, tags?: Tags) {
  const n = o.risers ?? 13;
  const r = o.rise / n;
  const g = o.going ?? 225;
  const z0 = o.z0 ?? 0;
  const tread = o.tread ?? "oak";
  const steps: Node[] = [];
  /* n - 1 treads; the last riser lands on the floor above. */
  for (let i = 0; i < n - 1; i++) {
    const ya = o.yStart + o.dir * i * g;
    const yb = ya + o.dir * g;
    const top = z0 + (i + 1) * r;
    const node = s.add(
      boxPart([o.x0, Math.min(ya, yb), z0], [o.x1, Math.max(ya, yb), top], {
        top: tread,
        front: "paint",
        back: "paint",
        side: "paint",
      }),
      { tags },
    );
    /* Nosing line, and the shadow under it on the riser. */
    const fy = o.dir < 0 ? Math.max(ya, yb) : Math.min(ya, yb);
    attach(node, [
      line([o.x0, fy, top + 0.5], [o.x1, fy, top + 0.5], "#f1e3c4", 0.9, 0.7),
    ]);
    steps.push(node);
  }
  /* Landing at the top. */
  const yTop = o.yStart + o.dir * (n - 1) * g;
  const landing = o.landing === false ? null : s.add(
    boxPart([o.x0, Math.min(yTop, yTop + o.dir * 900), z0 + o.rise - 220], [o.x1, Math.max(yTop, yTop + o.dir * 900), z0 + o.rise], {
      top: tread,
      all: "paint",
    }),
    { tags },
  );
  if (landing) steps.push(landing);

  /* The balustrade: string, newels, balusters, rail. */
  const xs = o.open === "x1" ? o.x1 + 25 : o.x0 - 70;
  const xe = xs + 45;
  const run = (n - 1) * g;
  const yA = o.yStart;
  const yB = o.yStart + o.dir * run;
  const parts: Part[] = [];
  const pitchAt = (t: number) => z0 + r + (o.rise - r) * t;
  /* String: a 275mm board following the pitch. */
  parts.push(
    obox([xs, yA, z0 + r - 200], [45, 0, 0], [0, yB - yA, o.rise - r], [0, 0, 300], "paint"),
  );
  const newel = (y: number, zb: number, zt: number) => [
    boxPart([xs - 22, y - 45, zb], [xe + 22, y + 45, zt], "oak"),
    boxPart([xs - 32, y - 55, zt], [xe + 32, y + 55, zt + 60], "oakDark"),
  ];
  const balusters: Part[] = [];
  const per = 2;
  for (let i = 0; i < (n - 1) * per; i++) {
    const t = (i + 0.5) / ((n - 1) * per);
    const y = yA + (yB - yA) * t;
    const zb = pitchAt(t) + 70;
    const zt = pitchAt(t) + 900 - 30;
    balusters.push(boxPart([xs + 8, y - 16, zb], [xe - 8, y + 16, zt], "white"));
  }
  /* Far end first. */
  const headNewel = newel(yB, z0 + o.rise - 300, z0 + o.rise + 1000);
  const footNewel = newel(yA, z0, z0 + 1150);
  const farFirst = o.dir < 0 ? [...headNewel, ...balusters, ...footNewel] : [...footNewel, ...[...balusters].reverse(), ...headNewel];
  parts.push(...farFirst);
  parts.push(
    obox([xs - 12, yA, pitchAt(0) + 900 - 30], [69, 0, 0], [0, yB - yA, pitchAt(1) - pitchAt(0)], [0, 0, 60], "oak"),
  );
  const rail = s.add(parts, { tags });
  return { steps, rail, landing, top: yTop };
}

/* ------------------------------------------------------------- kitchens */

export type KitchenRun = {
  /** Along x, standing against a wall face at y = wallY, facing +y. */
  x0: number;
  wallY: number;
  units: { w: number; kind?: "doors" | "drawers" | "sink" | "hob" | "oven" | "door" }[];
  wallUnits?: { x0: number; x1: number }[];
  /** Splashback runs between these. */
  splash?: [number, number];
  /** A window over the sink: its marks go on the wall. */
  z0?: number;
  handles?: MatId;
};

const BASE_H = 870;
const PLINTH = 150;
const DEPTH = 600;
const TOP = 40;

function frontOf(x0: number, x1: number, y: number, z0: number, z1: number, kind: string | undefined, handle: string): Mark[] {
  const f: WallFace = { axis: "y", at: y };
  const m: Mark[] = [];
  const gap = 3;
  const shaker = (a: number, b: number, c: number, d: number) => {
    m.push(mark(faceRect(f, a + 70, b - 70, c + 70, d - 70, 0.6), "shadeSoft"));
  };
  if (kind === "drawers") {
    const h = (z1 - z0) / 3;
    for (let i = 0; i < 3; i++) {
      const c = z0 + i * h + gap;
      const d = z0 + (i + 1) * h - gap;
      m.push(line(onFace(f, x0 + gap, d, 0.8), onFace(f, x1 - gap, d, 0.8), "#0d1220", 1, 0.55));
      m.push(line(onFace(f, (x0 + x1) / 2 - 110, d - 70, 2), onFace(f, (x0 + x1) / 2 + 110, d - 70, 2), handle, 1.4, 1));
      void c;
    }
  } else if (kind === "oven") {
    m.push(mark(faceRect(f, x0 + 30, x1 - 30, z0 + 260, z1 - 40, 0.8), "appliance", true));
    m.push(mark(faceRect(f, x0 + 90, x1 - 90, z0 + 330, z1 - 200, 1.4), "glassDark"));
    m.push(line(onFace(f, x0 + 90, z1 - 120, 2), onFace(f, x1 - 90, z1 - 120, 2), "#a6adb8", 1.4, 1));
    m.push(line(onFace(f, x0 + gap, z0 + 250, 0.8), onFace(f, x1 - gap, z0 + 250, 0.8), "#0d1220", 1, 0.55));
  } else {
    const doors = (x1 - x0) > 700 ? 2 : 1;
    const each = (x1 - x0) / doors;
    for (let i = 0; i < doors; i++) {
      const a = x0 + i * each;
      const b = a + each;
      shaker(a, b, z0, z1);
      if (i) m.push(line(onFace(f, a, z0 + gap, 0.8), onFace(f, a, z1 - gap, 0.8), "#0d1220", 1, 0.55));
      const hx = doors === 2 ? (i ? a + 60 : b - 60) : b - 60;
      m.push(line(onFace(f, hx, z1 - 90, 2), onFace(f, hx, z1 - 260, 2), handle, 1.4, 1));
    }
  }
  return m;
}

/** Base units, worktop, splashback and wall units along a back wall. */
export function kitchenRun(s: Scene, k: KitchenRun, tags?: Tags) {
  const z0 = k.z0 ?? 0;
  const y0 = k.wallY;
  const handle = k.handles === "steelBright" ? "#a6adb8" : "#e2b04f";
  let x = k.x0;
  const out: Node[] = [];
  for (const u of k.units) {
    const x1 = x + u.w;
    /* Plinth set back 70, carcass, door faces. */
    const node = s.add(
      [
        boxPart([x, y0, z0], [x1, y0 + DEPTH - 70, z0 + PLINTH], "unitDark"),
        boxPart([x, y0, z0 + PLINTH], [x1, y0 + DEPTH - 20, z0 + BASE_H], "unit"),
      ],
      { tags },
    );
    attach(node, [
      ...frontOf(x, x1, y0 + DEPTH - 20, z0 + PLINTH, z0 + BASE_H, u.kind, handle),
      line([x, y0 + DEPTH - 20.5, z0 + PLINTH], [x, y0 + DEPTH - 20.5, z0 + BASE_H], "#0d1220", 1.1, 0.7),
    ]);
    out.push(node);
    x = x1;
  }
  const x1 = x;
  const top = s.add(boxPart([k.x0, y0, z0 + BASE_H], [x1, y0 + DEPTH + 20, z0 + BASE_H + TOP], "worktop"), { tags });
  const tz = z0 + BASE_H + TOP + 0.5;
  /* Sink and hob, set into the worktop. */
  let ux = k.x0;
  const fixtures: Mark[] = [];
  const furniture: Part[] = [];
  for (const u of k.units) {
    if (u.kind === "sink") {
      fixtures.push(mark([[ux + 80, y0 + 120, tz], [ux + u.w - 80, y0 + 120, tz], [ux + u.w - 80, y0 + 520, tz], [ux + 80, y0 + 520, tz]], "steelBright", true));
      fixtures.push(mark([[ux + 110, y0 + 150, tz + 0.5], [ux + u.w - 110, y0 + 150, tz + 0.5], [ux + u.w - 110, y0 + 490, tz + 0.5], [ux + 110, y0 + 490, tz + 0.5]], "shade"));
      const cx = ux + u.w / 2;
      furniture.push(
        cylPart(cx, y0 + 70, 25, tz, tz + 300, "steelBright", 8),
        obox([cx - 15, y0 + 70, tz + 270], [30, 0, 0], [0, 190, 0], [0, 0, 30], "steelBright"),
      );
    }
    if (u.kind === "hob") {
      fixtures.push(mark([[ux + 40, y0 + 60, tz], [ux + u.w - 40, y0 + 60, tz], [ux + u.w - 40, y0 + 560, tz], [ux + 40, y0 + 560, tz]], "black", true));
      const rings: [number, number, number][] = [
        [0.3, 0.3, 95], [0.7, 0.3, 75], [0.3, 0.72, 75], [0.7, 0.72, 110],
      ];
      for (const [fu, fv, rr] of rings) {
        const cx = ux + 40 + (u.w - 80) * fu;
        const cy = y0 + 60 + 500 * fv;
        const ring: V3[] = [];
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ring.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, tz + 0.6]);
        }
        fixtures.push(mark(ring, "ring", true));
      }
    }
    ux += u.w;
  }
  attach(top, fixtures);
  if (furniture.length) s.add(furniture, { tags });

  const wallUnits: Node[] = [];
  for (const w of k.wallUnits ?? []) {
    const node = s.add(boxPart([w.x0, y0, z0 + 1450], [w.x1, y0 + 330, z0 + 2170], "unit"), { tags });
    const doors = Math.max(1, Math.round((w.x1 - w.x0) / 500));
    const each = (w.x1 - w.x0) / doors;
    const f: WallFace = { axis: "y", at: y0 + 330 };
    const m: Mark[] = [];
    for (let i = 0; i < doors; i++) {
      const a = w.x0 + i * each;
      m.push(mark(faceRect(f, a + 70, a + each - 70, z0 + 1520, z0 + 2100, 0.6), "shadeSoft"));
      if (i) m.push(line(onFace(f, a, z0 + 1453, 0.8), onFace(f, a, z0 + 2167, 0.8), "#0d1220", 1, 0.55));
      const hx = i % 2 ? a + 60 : a + each - 60;
      m.push(line(onFace(f, hx, z0 + 1520, 2), onFace(f, hx, z0 + 1690, 2), handle, 1.4, 1));
    }
    attach(node, m);
    wallUnits.push(node);
  }
  return { units: out, top, wallUnits, x1 };
}

/** Splashback tiles on the wall between the worktop and the wall units. */
export function splashback(f: WallFace, u0: number, u1: number, z0 = 0): Mark {
  return mark(faceRect(f, u0, u1, z0 + BASE_H + TOP, z0 + 1450, 0.4), "splash");
}

/** A kitchen island: units both sides, a worktop overhanging on the seating
 *  side, and bar stools tucked under it. Seats face -y, towards the run. */
export function island(s: Scene, x0: number, x1: number, y0: number, opts: { seats?: number; z0?: number; receiver?: Node["shadow"] } = {}, tags?: Tags) {
  const z0 = opts.z0 ?? 0;
  const D = 900;
  const OVR = 300;
  const body = s.add(
    [
      boxPart([x0, y0, z0], [x1, y0 + D, z0 + PLINTH], "unitDark"),
      boxPart([x0, y0, z0 + PLINTH], [x1, y0 + D, z0 + BASE_H], { all: "oak", top: "oak" }),
    ],
    { tags, shadow: opts.receiver },
  );
  /* Panelled back on the seating side. */
  const f: WallFace = { axis: "y", at: y0 + D };
  const m: Mark[] = [];
  const panels = Math.max(2, Math.round((x1 - x0) / 600));
  for (let i = 1; i < panels; i++) {
    const x = x0 + ((x1 - x0) * i) / panels;
    m.push(line(onFace(f, x, z0 + PLINTH, 0.8), onFace(f, x, z0 + BASE_H, 0.8), "#5b3d1c", 1, 0.6));
  }
  attach(body, m);
  s.add(boxPart([x0 - 40, y0 - 20, z0 + BASE_H], [x1 + 40, y0 + D + OVR, z0 + BASE_H + TOP], "worktop"), { tags });
  const seats = opts.seats ?? 3;
  const stools: Node[] = [];
  for (let i = 0; i < seats; i++) {
    const cx = x0 + ((x1 - x0) * (i + 0.5)) / seats;
    stools.push(stool(s, cx, y0 + D + OVR + 120, z0, tags, opts.receiver));
  }
  return { body, stools };
}

/** A bar stool: four legs, a foot ring, a 650mm seat. Clear of the worktop
 *  edge it sits beside, because a stool tucked into the worktop's footprint
 *  would intersect it. */
export function stool(s: Scene, cx: number, cy: number, z0 = 0, tags?: Tags, receiver?: Node["shadow"]) {
  const L = 150;
  const legs = ([
    [-1, -1], [1, -1], [-1, 1], [1, 1],
  ] as const).map(([a, b]) => boxPart([cx + a * L - 15, cy + b * L - 15, z0], [cx + a * L + 15, cy + b * L + 15, z0 + 610], "metal"));
  return s.add(
    [
      legs[0], legs[1], legs[2],
      boxPart([cx - L, cy + L - 10, z0 + 260], [cx + L, cy + L + 10, z0 + 290], "metal"),
      legs[3],
      cylPart(cx, cy, 200, z0 + 610, z0 + 660, "leather", 14),
    ],
    { tags, shadow: receiver },
  );
}

/* ------------------------------------------------------------ furniture */

/** A three-seat sofa with its back to the camera's side, facing -y. */
export function sofa(s: Scene, x0: number, y0: number, w = 2100, z0 = 0, tags?: Tags, receiver?: Node["shadow"]) {
  const D = 920;
  const ARM = 180;
  const parts: Part[] = [
    boxPart([x0, y0, z0 + 60], [x0 + ARM, y0 + D, z0 + 620], "fabricDark"),
    boxPart([x0 + ARM, y0 + D - 230, z0 + 60], [x0 + w - ARM, y0 + D, z0 + 820], "fabricDark"),
  ];
  const seats = 3;
  const sw = (w - 2 * ARM) / seats;
  for (let i = 0; i < seats; i++) {
    const a = x0 + ARM + i * sw;
    parts.push(boxPart([a + 5, y0, z0 + 60], [a + sw - 5, y0 + D - 230, z0 + 440], "fabric"));
  }
  for (let i = 0; i < seats; i++) {
    const a = x0 + ARM + i * sw;
    parts.push(obox([a + 15, y0 + D - 230, z0 + 440], [sw - 30, 0, 0], [0, -170, 0], [0, 60, 330], "fabric"));
  }
  parts.push(boxPart([x0 + w - ARM, y0, z0 + 60], [x0 + w, y0 + D, z0 + 620], "fabricDark"));
  return s.add(parts, { tags, shadow: receiver });
}

/** A low table. */
export function coffeeTable(s: Scene, x0: number, y0: number, w = 1100, d = 550, z0 = 0, tags?: Tags, receiver?: Node["shadow"]) {
  return s.add(
    [
      boxPart([x0 + 40, y0 + 40, z0], [x0 + w - 40, y0 + d - 40, z0 + 340], "oakDark"),
      boxPart([x0, y0, z0 + 340], [x0 + w, y0 + d, z0 + 400], "oak"),
    ],
    { tags, shadow: receiver },
  );
}

/** A faceted ball: the leaf mass of a plant, a hedge top or a tree crown. */
export function blob(cx: number, cy: number, cz: number, r: number, mat: MatId = "plant", seg = 8, squash = 0.86): Part {
  const lats = [-90, -48, 0, 48, 90].map((d) => (d * Math.PI) / 180);
  const ring = (lat: number, i: number): V3 => {
    const a = (i / seg) * Math.PI * 2 + Math.PI / seg;
    return [cx + Math.cos(lat) * Math.cos(a) * r, cy + Math.cos(lat) * Math.sin(a) * r, cz + Math.sin(lat) * r * squash];
  };
  const faces: V3[][] = [];
  for (let b = 0; b < lats.length - 1; b++) {
    for (let i = 0; i < seg; i++) {
      const a0 = ring(lats[b], i);
      const a1 = ring(lats[b], i + 1);
      const b0 = ring(lats[b + 1], i);
      const b1 = ring(lats[b + 1], i + 1);
      if (b === 0) faces.push([a0, b1, b0]);
      else if (b === lats.length - 2) faces.push([a0, a1, b0]);
      else faces.push([a0, a1, b1, b0]);
    }
  }
  return { ...polyhedron(faces, mat), soft: true };
}

/** A house plant in a pot: a cluster of leaf masses on a stem. */
export function plant(s: Scene, cx: number, cy: number, z0 = 0, h = 900, tags?: Tags, receiver?: Node["shadow"]) {
  const P = 300;
  const r = Math.max(150, (h - P) * 0.3);
  const masses: [number, number, number, number, MatId][] = [
    [-0.45, -0.3, 0.5, 0.7, "shrubDark"],
    [0.45, -0.25, 0.42, 0.72, "plant"],
    [-0.1, 0.1, 0.72, 0.9, "plant"],
    [-0.4, 0.4, 0.3, 0.62, "shrub"],
    [0.35, 0.45, 0.28, 0.6, "plant"],
  ];
  const leaves = farFirst(masses.map(([dx, dy, dz, k, m]) => blob(cx + dx * r, cy + dy * r, z0 + P + dz * (h - P), r * k, m)));
  return s.add([cylPart(cx, cy, 150, z0, z0 + P, "pot", 10), ...leaves], { tags, shadow: receiver });
}

/** A run of books standing on a shelf, against a wall face. */
export function books(f: WallFace, u0: number, u1: number, z: number, depth: number, maxH: number, seed: number): Part[] {
  const COLS: MatId[] = ["bookGold", "bookRed", "bookBlue", "bookSand", "bookGreen", "bookBrown"];
  const out: Part[] = [];
  let u = u0;
  let i = seed;
  while (u < u1 - 30) {
    const w = 30 + ((i * 7) % 4) * 9;
    const h = maxH * (0.62 + ((i * 11) % 4) / 12);
    if (i % 7 === 6) {
      u += 90;
    } else if (u + w < u1) {
      out.push(faceBox(f, u, u + w, z, z + h, 20, depth - 20 - ((i * 3) % 3) * 15, COLS[i % COLS.length]));
      u += w + 4;
    } else {
      break;
    }
    i++;
  }
  return out;
}

/* ------------------------------------------------------------------ site */

/** A low front boundary wall with piers and copings, broken for a gate. */
export function boundaryWall(s: Scene, y: number, x0: number, x1: number, gaps: [number, number][], tags?: Tags) {
  const H = 750;
  const T = 225;
  const runs: [number, number][] = [];
  let a = x0;
  for (const [g0, g1] of [...gaps].sort((p, q) => p[0] - q[0])) {
    runs.push([a, g0 - 330]);
    a = g1 + 330;
  }
  runs.push([a, x1]);
  for (const [r0, r1] of runs) {
    if (r1 - r0 < 50) continue;
    s.add(
      [
        boxPart([r0, y, 0], [r1, y + T, H], "brick"),
        boxPart([r0 - 0, y - 30, H], [r1, y + T + 30, H + 70], "coping"),
      ],
      { tags },
    );
  }
  for (const [g0, g1] of gaps) {
    for (const px of [g0 - 330, g1]) {
      s.add(
        [
          boxPart([px, y - 50, 0], [px + 330, y + T + 50, H + 250], "brick"),
          boxPart([px - 30, y - 80, H + 250], [px + 360, y + T + 80, H + 330], "coping"),
        ],
        { tags },
      );
    }
  }
}

/** A clipped hedge, as a slightly tapered block. */
export function hedge(s: Scene, x0: number, y0: number, x1: number, y1: number, h: number, tags?: Tags) {
  const inset = 60;
  return s.add(
    polyhedron(
      [
        [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]],
        [[x0 + inset, y0 + inset, h], [x1 - inset, y0 + inset, h], [x1 - inset, y1 - inset, h], [x0 + inset, y1 - inset, h]],
        [[x0, y0, 0], [x1, y0, 0], [x1 - inset, y0 + inset, h], [x0 + inset, y0 + inset, h]],
        [[x1, y0, 0], [x1, y1, 0], [x1 - inset, y1 - inset, h], [x1 - inset, y0 + inset, h]],
        [[x1, y1, 0], [x0, y1, 0], [x0 + inset, y1 - inset, h], [x1 - inset, y1 - inset, h]],
        [[x0, y1, 0], [x0, y0, 0], [x0 + inset, y0 + inset, h], [x0 + inset, y1 - inset, h]],
      ],
      (n) => (n[2] > 0.5 ? "shrub" : "shrubDark"),
    ),
    { tags },
  );
}

/** Sort a cluster of solids that touch or overlap so the far ones paint
 *  first. Good enough for leaf masses, which have no flat faces to get wrong. */
function farFirst(parts: Part[]) {
  const c = (p: Part) => {
    const pts = p.faces.flatMap((f) => f.pts);
    return pts.reduce((t, q) => t + q[0] + q[1] + q[2], 0) / pts.length;
  };
  return [...parts].sort((a, b) => c(a) - c(b));
}

/** A small tree: a trunk, two limbs and a crown of leaf masses. */
export function tree(s: Scene, cx: number, cy: number, h = 4200, tags?: Tags, receiver?: Node["shadow"]) {
  const r = h * 0.2;
  const c = h * 0.66;
  const masses: [number, number, number, number, MatId][] = [
    [-0.9, -0.5, -0.1, 0.85, "shrubDark"],
    [0.7, -0.8, 0.05, 0.9, "shrubDark"],
    [-0.2, 0.1, 0.55, 1.05, "shrub"],
    [0.9, 0.5, -0.2, 0.8, "shrub"],
    [-0.8, 0.8, -0.25, 0.75, "shrub"],
    [0.2, 0.9, 0.3, 0.7, "plant"],
  ];
  const crown = farFirst(masses.map(([dx, dy, dz, k, m]) => blob(cx + dx * r, cy + dy * r, c + dz * r, r * k, m, 9)));
  return s.add([cylPart(cx, cy, 110, 0, c - r * 0.4, "oakDark", 8), ...crown], { tags, shadow: receiver });
}

/** Re-exported so drawings can build ad hoc parts without a second import. */
export { boxPart, cylPart, flatPart, obox, polyhedron, prismPart };
