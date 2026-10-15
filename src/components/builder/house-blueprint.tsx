import { useMemo } from "react";
import { DETAIL, INK, shade } from "@/lib/iso";
import {
  alongY,
  attach,
  books,
  boxPart,
  chimney,
  coffeeTable,
  cylPart,
  downpipe,
  faceRect,
  glazedDoorsOn,
  gutterAlong,
  island,
  kitchenRun,
  obox,
  pitchedRoof,
  plant,
  polyhedron,
  ridgeHeight,
  sofa,
  stair,
  windowOn,
  type GableRoof,
  type WallFace,
} from "@/lib/house-kit";
import {
  MAT,
  Scene,
  isoUnit,
  renderScene,
  type Item,
  type Mark,
  type Node,
  type Part,
  type Projector,
  type V3,
} from "@/lib/scene3d";
import { PatternDefs } from "@/components/drawing/iso-svg";
import { type House, type ScopeKey } from "./house-config";

/* ===========================================================================
   The house, drawn isometrically from the garden, with the work in scope
   picked out.

   Viewed from the REAR three-quarter, and that is the important decision here.
   Almost everything a homeowner asks about happens at the back: extensions go
   into the garden, bi-folds open onto a patio, loft dormers go on the rear
   slope where they attract less planning attention. An earlier version of this
   drawing looked at the front, which meant the extension had to project towards
   the street and ended up sitting across the front door. Turning the camera
   round fixes the geometry rather than nudging it.

   The hero draws the front elevation of the same kind of house. Front and rear
   are two sheets from one set, so the label in the corner names which is which.

   Modelled in millimetres from the same kit as the hero: the same 900mm
   worktops, thirteen-riser stair and 2.1m doors, so the two drawings agree.

   Everything derives from two pieces of state: what the house is, and what
   needs doing to it. Parts in scope come up in full material colour under a
   gold line; everything else stays a solid dark massing model. Out of scope is
   not a wireframe - SVG has no depth buffer, so a translucent face shows
   whatever is behind it and the building stops reading as solid at all.

   Two kinds of scope. Most highlights something already drawn: the roof you
   have, the windows you have. Extension, loft and groundwork *add* geometry,
   because that work is new building, and watching the house grow is the honest
   way to show it.
   =========================================================================== */

/** Which side of the drawing is showing: the house from the garden, or its
 *  ground floor with the walls cut down to show the rooms. */
export type BlueprintView = "outside" | "inside";

/* The house: street side at y = 0, garden side at y = D. */
const W = 6600;
const D = 8000;
const WALL = 300;
const PITCH = 35;
/** How far an extension projects into the garden. Named because the building
 *  line every ground-level element sets out from depends on it. */
const EXT_D = 3600;
const GARDEN = 7600;
const NEIGHBOUR = 4800;

const EAVES: Record<House["storeys"], number> = { bungalow: 2700, two: 5300 };

/** Height the street wall and the left-hand wall are cut at inside, and the
 *  low cut on the walls nearer the camera. */
const CUT_HIGH = 2650;
const CUT_LOW = 700;

const MASSING = "#182036";

/* Scope is a tag on each solid: one key, or several joined with commas,
   because some work belongs to more than one trade. The extension's bi-folds
   are new building *and* joinery, so they light under either. That overlap is
   the argument the whole page makes, so the drawing should not have to pick
   one. `ambient` marks setting rather than subject: the plot, the garden, the
   rooms themselves. Those keep a muted colour of their own, because they are
   never work and so can never be lit. */
type Scoped = ScopeKey | ScopeKey[];
const sc = (k: Scoped) => ({ scope: Array.isArray(k) ? k.join(",") : k });
const AMB = { ambient: true };

/* ------------------------------------------------------------- outside */

function outside(s: Scene, house: House, on: (k: ScopeKey) => boolean) {
  const H = EAVES[house.storeys];
  const ext = on("extension");
  const loft = on("loft");
  const sideVisible = house.type !== "terraced";
  const BL = ext ? D + EXT_D : D;
  const plotX0 = -NEIGHBOUR - 300;
  const plotX1 = W + NEIGHBOUR + 300;

  /* Plot and lawn, then whatever is laid on them. */
  s.with(AMB, () => {
    s.box([plotX0, -1500, -450], [plotX1, D + EXT_D + GARDEN, 0], { all: "earth", top: "lawn" });
  });
  const ground = { x0: plotX0, y0: -1500, x1: plotX1, y1: D + EXT_D + GARDEN, z: 0 };
  if (on("groundwork")) {
    s.with(sc("groundwork"), () => {
      s.box([200, BL, 0], [W - 200, BL + 2600, 40], { all: "concrete", top: "paving" });
      /* A channel drain along the house, which is most of what groundwork
         actually is. */
      const drain = s.box([400, BL + 60, 40], [W - 400, BL + 200, 46], "metal");
      const m: Mark[] = [];
      for (let x = 450; x < W - 400; x += 90) m.push({ type: "line", a: [x, BL + 70, 46.5], b: [x, BL + 190, 46.5], color: "#6d7686", w: 0.6, opacity: 0.8 });
      attach(drain, m);
    });
  }

  /* Neighbours: the same house, roofed the same way, in massing only. */
  const neighbours: [number, number][] = [];
  if (house.type !== "detached") neighbours.push([-NEIGHBOUR, 0]);
  if (house.type === "terraced") neighbours.push([W, W + NEIGHBOUR]);
  for (const [a, b] of neighbours) {
    s.with({ neighbour: true }, () => {
      s.box([a, 0, 0], [b, D, H], "brick", { shadow: ground });
      const r: GableRoof = { x0: a, x1: b, y0: 0, y1: D, eaves: H, pitch: PITCH, ridge: "x", hipped: house.roof === "hipped", overhang: 300, verge: 200, ends: [a < 0, b > W] };
      s.add(pitchedRoof(r).parts);
    });
  }

  /* The house. */
  const rear: WallFace = { axis: "y", at: D };
  const flank: WallFace = { axis: "x", at: W };
  const body = s.box([0, 0, 0], [W, D, H], "brick", { shadow: ground });
  const rearMarks: Mark[] = [];
  const flankMarks: Mark[] = [];
  const cills: Part[] = [];
  const add = (to: Mark[], w: { marks: Mark[]; parts: Part[] }) => {
    to.push(...w.marks);
    cills.push(...w.parts);
  };
  const upper = H > 4000;
  if (!ext) {
    rearMarks.push(...glazedDoorsOn(rear, 800, 2700, 0, 2100, 2));
    add(rearMarks, windowOn(rear, 3700, 5700, 950, 2100, { lights: 3 }));
  }
  if (upper) {
    add(rearMarks, windowOn(rear, 900, 2300, 3500, 4700, { lights: 2 }));
    add(rearMarks, windowOn(rear, 4300, 5700, 3500, 4700, { lights: 2 }));
  }
  if (sideVisible) {
    add(flankMarks, windowOn(flank, 4600, 5600, 950, 2100, { lights: 1 }));
    if (upper) add(flankMarks, windowOn(flank, 4600, 5400, 3600, 4600, { lights: 1 }));
  }
  /* The openings are their own layer on each wall face, so they can light
     separately from the brickwork round them. */
  s.with(sc("windows"), () => {
    if (rearMarks.length) s.add({ faces: [], marks: rearMarks, outline: false });
    if (flankMarks.length) s.add({ faces: [], marks: flankMarks, outline: false });
    for (const c of cills) s.add(c);
  });
  void body;
  const EH = Math.min(3000, H - 300);

  /* The roof, and a loft dormer on the rear slope when there is one. */
  const roof: GableRoof = {
    x0: 0,
    x1: W,
    y0: 0,
    y1: D,
    eaves: H,
    pitch: PITCH,
    ridge: "x",
    hipped: house.roof === "hipped",
    overhang: 300,
    verge: 200,
    ends: [house.type === "detached", house.type !== "terraced"],
  };
  const tan = Math.tan((PITCH * Math.PI) / 180);
  const cos = Math.cos((PITCH * Math.PI) / 180);
  const lift = 160 / cos;
  const slopeZ = (y: number) => H + (D - y) * tan + lift;
  const stack = chimney(roof, "far", 1200, 1900, 600, 900, 1000);
  const dormer: Part[] = [];
  if (loft) {
    const a = 1500;
    const b = 5100;
    const yf = D - 1300;
    const top = ridgeHeight(roof) + lift - 350;
    const yb = D - (top - H - lift) / tan;
    const zf = slopeZ(yf);
    dormer.push(
      polyhedron(
        [
          [[a, yf, zf], [b, yf, zf], [b, yf, top], [a, yf, top]],
          [[a, yf, top], [b, yf, top], [b, yb, top], [a, yb, top]],
          [[a, yf, zf], [a, yf, top], [a, yb, top]],
          [[b, yf, zf], [b, yf, top], [b, yb, top]],
          [[a, yf, zf], [b, yf, zf], [b, yb, top], [a, yb, top]],
        ],
        (n) => (n[2] > 0.9 ? "membrane" : "render"),
      ),
      boxPart([a - 60, yb, top], [b + 60, yf + 80, top + 160], { all: "frame", top: "membrane" }),
    );
    const w = windowOn({ axis: "y", at: yf }, a + 400, b - 400, zf + 250, top - 180, { lights: 3, cill: false, head: false });
    dormer[0].marks.push(...w.marks);
  }
  s.with(sc("roof"), () => {
    const r = pitchedRoof(roof, { onFar: stack });
    s.add(r.parts);
    const ez = H - 300 * tan + 20;
    s.add(gutterAlong("x", roof.ends?.[0] ? -300 : 0, W + (roof.ends?.[1] ? 300 : 0), D + 300, ez, 1));
    s.add(downpipe(W - 450, D + 360, ext ? EH + 20 : 0, ez - 110));
  });
  if (dormer.length) {
    s.with(sc("loft"), () => {
      s.add(dormer);
    });
  }

  /* The extension, across the full width of the back. */
  if (ext) {
    const ef: WallFace = { axis: "y", at: D + EXT_D };
    const es: WallFace = { axis: "x", at: W };
    s.with(sc("extension"), () => {
      const box = s.box([0, D, 0], [W, D + EXT_D, EH], "brick", { shadow: ground });
      attach(box, [{ type: "poly", pts: faceRect(ef, 450, 4650, 2150, 2300, 0.5), mat: "steel", stroke: true }]);
      const CP = EH + 240;
      s.box([0, D, EH], [W - WALL, D + EXT_D - WALL, EH + 20], "membrane");
      s.box([W - WALL, D, EH], [W, D + EXT_D, CP], "brick");
      s.box([0, D + EXT_D - WALL, EH], [W - WALL, D + EXT_D, CP], "brick");
      s.box([W - WALL - 30, D, CP], [W + 30, D + EXT_D + 30, EH + 300], "coping");
      s.box([0, D + EXT_D - WALL - 30, CP], [W - WALL - 30, D + EXT_D + 30, EH + 300], "coping");
      /* Lantern. */
      const x0 = 1800;
      const x1 = 4400;
      const y0 = D + 900;
      const y1 = D + 2500;
      const up = EH + 270;
      const top = up + 600;
      const my = (y0 + y1) / 2;
      const ins = (y1 - y0) / 2 - 80;
      s.add([
        boxPart([x0, y0, EH + 20], [x1, y1, up], "membrane"),
        polyhedron(
          [
            [[x0, y0, up], [x1, y0, up], [x1, y1, up], [x0, y1, up]],
            [[x0, y0, up], [x1, y0, up], [x1 - ins, my - 80, top], [x0 + ins, my - 80, top]],
            [[x1, y0, up], [x1, y1, up], [x1 - ins, my + 80, top], [x1 - ins, my - 80, top]],
            [[x1, y1, up], [x0, y1, up], [x0 + ins, my + 80, top], [x1 - ins, my + 80, top]],
            [[x0, y1, up], [x0, y0, up], [x0 + ins, my - 80, top], [x0 + ins, my + 80, top]],
            [[x0 + ins, my - 80, top], [x1 - ins, my - 80, top], [x1 - ins, my + 80, top], [x0 + ins, my + 80, top]],
          ],
          (n) => (n[2] > 0.99 ? "frameDark" : "glass"),
        ),
      ]);
      s.add(downpipe(W + 60, D + EXT_D - 300, 0, EH + 150));
    });
    s.with(sc(["extension", "windows"]), () => {
      const m: Mark[] = [...glazedDoorsOn(ef, 600, 4500, 0, 2150, 4)];
      const w = windowOn(ef, 4950, 6000, 950, 2150, { lights: 1 });
      m.push(...w.marks);
      const parts = [...w.parts];
      if (sideVisible) {
        const sw = windowOn(es, D + 900, D + 2700, 950, 2150, { lights: 2 });
        m.push(...sw.marks);
        parts.push(...sw.parts);
      }
      s.add({ faces: [], marks: m, outline: false });
      for (const p of parts) s.add(p);
    });
  }

  /* The garden fence, nearest the camera. Low and knocked back in tone, so it
     frames the garden rather than becoming the subject. */
  s.with(AMB, () => {
    const fy = D + EXT_D + GARDEN - 600;
    const posts: Part[] = [];
    for (let x = plotX0 + 300; x < plotX1 - 200; x += 1830) {
      posts.push(boxPart([x, fy, 0], [x + 100, fy + 100, 1150], "timber"));
    }
    s.add([...posts.slice(0, 1), boxPart([plotX0 + 300, fy + 10, 100], [plotX1 - 300, fy + 30, 1050], "fence"), ...posts.slice(1)]);
  });
}

/* -------------------------------------------------------------- inside */

function inside(s: Scene, on: (k: ScopeKey) => boolean) {
  const ext = on("extension");
  const BACK = ext ? D + EXT_D : D;
  const plaster = { all: "plaster", top: "cut" } as const;
  const low = { all: "brick", top: "cut" } as const;
  const floorRx = { x0: WALL, y0: WALL, x1: W - WALL, y1: BACK - WALL, z: 0 };
  const PART = 3800;

  /* Floor, the street wall and the left-hand wall: the walls the joinery is
     fitted to, so they stay up. */
  s.with(AMB, () => {
    s.box([-600, -600, -450], [W + 600, BACK + 600, -150], { all: "earth", top: "lawn" });
    s.box([0, 0, -150], [W, BACK, 0], { all: "concrete", top: "floor" });
    s.box([0, 0, 0], [W, WALL, CUT_HIGH], plaster);
    s.box([0, WALL, 0], [WALL, D, CUT_HIGH], plaster);
  });
  if (ext) {
    s.with(sc("extension"), () => {
      s.box([0, D, 0], [WALL, BACK, CUT_HIGH], plaster);
    });
  }

  /* Front room: the stair, the chimney breast and the alcove units. */
  s.with(sc("stairs"), () => {
    stair(s, { x0: WALL, x1: WALL + 900, yStart: 3500, dir: -1, rise: CUT_HIGH, open: "x1", landing: false });
  });
  const BR0 = 2700;
  const BR1 = 4100;
  const BD = WALL + 450;
  s.with(AMB, () => {
    const RD = BD - 380;
    const back = s.box([BR0, WALL, 0], [BR1, RD, CUT_HIGH], plaster);
    attach(back, [{ type: "poly", pts: faceRect({ axis: "y", at: RD }, 3050, 3750, 0, 1000, 0.5), mat: "void" }]);
    s.box([BR0, RD, 0], [3050, BD, 1000], "plaster");
    s.box([3750, RD, 0], [BR1, BD, 1000], "plaster");
    s.box([BR0, RD, 1000], [BR1, BD, CUT_HIGH], plaster);
    s.box([BR0 + 50, BD, 0], [BR1 - 50, BD + 450, 40], "hearth");
    const stove = s.add([
      boxPart([3190, RD + 30, 0], [3610, RD + 340, 70], "black"),
      boxPart([3170, RD + 20, 70], [3630, RD + 350, 600], "black"),
      cylPart(3400, RD + 140, 65, 600, 1000, "black", 10),
    ]);
    attach(stove, [{ type: "poly", pts: faceRect({ axis: "y", at: RD + 350 }, 3240, 3560, 190, 420, 1), mat: "fire" }]);
    s.box([BR0 - 40, BD, 1080], [BR1 + 40, BD + 160, 1140], "oak");
  });
  s.with(sc("storage"), () => {
    for (const [a, b] of [
      [1450, BR0],
      [BR1, W - WALL],
    ] as const) {
      const base = s.box([a, WALL, 0], [b, WALL + 400, 850], "paint");
      const f: WallFace = { axis: "y", at: WALL + 400 };
      const n = Math.max(1, Math.round((b - a) / 600));
      const each = (b - a) / n;
      const m: Mark[] = [];
      for (let i = 0; i < n; i++) {
        const d0 = a + i * each;
        m.push({ type: "poly", pts: faceRect(f, d0 + 70, d0 + each - 70, 220, 780, 0.6), mat: "shadeSoft" });
        if (i) m.push({ type: "line", a: [d0, WALL + 400.5, 90], b: [d0, WALL + 400.5, 848], color: "#0d1220", w: 0.8, opacity: 0.6 });
      }
      attach(base, m);
      s.box([a, WALL, 850], [b, WALL + 420, 890], "oak");
      for (const z of [1350, 1800, 2250]) {
        s.box([a, WALL, z], [b, WALL + 300, z + 32], "oak");
        const run = books({ axis: "y", at: WALL }, a + 60, b - 60, z + 32, 280, 330, Math.round(a / 9 + z / 4));
        if (run.length) s.add(run);
      }
    }
  });
  s.with(AMB, () => {
    s.add(boxPart([2200, 1400, 0], [4600, 3200, 8], "rug"), { layer: 2 });
    coffeeTable(s, 2850, 1700, 1100, 550, 8, undefined, floorRx);
    sofa(s, 2350, 2500, 2100, 0, undefined, floorRx);
  });

  /* A wall between two spaces: taken out on a steel when "opening up" is in
     scope, otherwise standing, cut low, with its doorway. */
  const between = (y: number, key: Scoped | null, opened: boolean, door: [number, number]) => {
    const tags = key ? sc(key) : AMB;
    s.with(tags, () => {
      if (opened) {
        s.box([WALL, y, 0], [900, y + WALL, CUT_HIGH], plaster);
        s.box([W - 900, y, 0], [W - WALL, y + WALL, CUT_HIGH], plaster);
        s.box([900, y, 2400], [W - 900, y + WALL, CUT_HIGH], plaster);
        s.box([900, y + 20, 2190], [W - 900, y + WALL - 20, 2400], "steel");
        s.box([900, y, 0], [W - 900, y + WALL, 1], "oakDark");
      } else {
        s.box([WALL, y, 0], [door[0], y + WALL, CUT_LOW], plaster);
        s.box([door[1], y, 0], [W - WALL, y + WALL, CUT_LOW], plaster);
      }
    });
  };
  if (ext) {
    between(PART, null, false, [1400, 2300]);
    between(D - WALL, "opening", on("opening"), [600, 2700]);
  } else {
    between(PART, "opening", on("opening"), [1400, 2300]);
  }

  /* The kitchen: along the left-hand wall of the back room, or of the
     extension when there is one, with an island beside it. */
  const k0 = ext ? D + 250 : PART + WALL + 200;
  s.with(sc("kitchen"), () => {
    alongY(
      s,
      (t) => {
        kitchenRun(t, {
          x0: k0,
          wallY: WALL,
          units: [
            { w: 600, kind: "drawers" },
            { w: 1000, kind: "sink" },
            { w: 600, kind: "hob" },
            { w: 600, kind: "doors" },
          ],
          wallUnits: [
            { x0: k0, x1: k0 + 600 },
            { x0: k0 + 2200, x1: k0 + 2800 },
          ],
        });
        island(t, k0 + 200, k0 + 2400, WALL + 1700, { seats: 3, receiver: { x0: k0 - 200, y0: WALL, x1: k0 + 3400, y1: W - WALL, z: 0 } });
      },
      0,
      0,
    );
  });
  if (ext) {
    s.with(AMB, () => {
      const t0 = { x0: 2800, x1: 4800, y0: 5000, y1: 6000 };
      s.add(
        [
          boxPart([t0.x0 + 60, t0.y0 + 60, 0], [t0.x0 + 130, t0.y0 + 130, 720], "oakDark"),
          boxPart([t0.x1 - 130, t0.y0 + 60, 0], [t0.x1 - 60, t0.y0 + 130, 720], "oakDark"),
          boxPart([t0.x0 + 60, t0.y1 - 130, 0], [t0.x0 + 130, t0.y1 - 60, 720], "oakDark"),
          boxPart([t0.x1 - 130, t0.y1 - 130, 0], [t0.x1 - 60, t0.y1 - 60, 720], "oakDark"),
          boxPart([t0.x0, t0.y0, 720], [t0.x1, t0.y1, 760], "oak"),
        ],
        { shadow: floorRx },
      );
      plant(s, W - 800, PART + 900, 0, 1000, undefined, floorRx);
    });
  }

  /* The walls nearest the camera, cut low: the right-hand side and the
     garden wall, broken for the doors out. */
  s.with(AMB, () => {
    s.box([W - WALL, WALL, 0], [W, D, CUT_LOW], low);
    if (!ext) {
      s.box([WALL, D - WALL, 0], [800, D, CUT_LOW], low);
      s.box([2700, D - WALL, 0], [W - WALL, D, CUT_LOW], low);
    }
  });
  if (ext) {
    s.with(sc("extension"), () => {
      s.box([W - WALL, D, 0], [W, BACK, CUT_LOW], low);
      s.box([WALL, BACK - WALL, 0], [600, BACK, CUT_LOW], low);
      s.box([4500, BACK - WALL, 0], [W - WALL, BACK, CUT_LOW], low);
      s.box([600, BACK - WALL, 0], [4500, BACK, 30], "frameDark");
    });
  }
  void obox;
}

/* -------------------------------------------------------------- render */

function build(house: House, scope: Set<ScopeKey>, view: BlueprintView) {
  const s = new Scene();
  const on = (k: ScopeKey) => scope.has(k);
  if (view === "inside") inside(s, on);
  else outside(s, house, on);
  return s;
}

const litBy = (node: Node, scope: Set<ScopeKey>) => {
  const k = node.tags.scope;
  return typeof k === "string" && k.split(",").some((x) => scope.has(x as ScopeKey));
};

function paint(house: House, scope: Set<ScopeKey>, view: BlueprintView) {
  return renderScene(build(house, scope, view), {
    prefix: `bp-${view}-`,
    edge: 0.5,
    silhouette: 1,
    inkFor: (n) => (litBy(n, scope) ? DETAIL : undefined),
    recolour: (n, mat) => {
      if (litBy(n, scope)) return null;
      const base = MAT[mat];
      if (n.tags.ambient) return { color: shade(base.color, -0.28) };
      if ("alpha" in base) return null;
      return { color: MASSING, pattern: null };
    },
  });
}

/** Model extents, worst case, mapped into the viewBox.
 *
 *  Fixed rather than fitted to the current selection: a drawing that rescales
 *  when you tick a box makes the change hard to read, which is the one thing
 *  this drawing exists to do. A bungalow just sits lower in the frame. */
function frame(view: BlueprintView): Projector {
  const all = new Set<ScopeKey>(["extension", "loft", "groundwork", "opening"]);
  const worst: House = { type: "detached", storeys: "two", roof: "gable" };
  const { items } = paint(worst, all, view);
  const pts = items
    .filter((it) => it.role !== "shadow" && (view === "inside" ? !(it.node.tags.ambient && it.node.min[2] < -200) : !it.node.tags.ambient))
    .flatMap((it) => (it.kind === "poly" ? it.pts : [it.a, it.b]))
    .map(isoUnit);
  const x0 = Math.min(...pts.map((p) => p[0]));
  const x1 = Math.max(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1]));
  const y1 = Math.max(...pts.map((p) => p[1]));
  /* Centred a little high, to clear the title block along the bottom. */
  const box = view === "inside" ? { x0: 60, y0: 40, x1: 840, y1: 610 } : { x0: 90, y0: 50, x1: 810, y1: 590 };
  const k = Math.min((box.x1 - box.x0) / (x1 - x0), (box.y1 - box.y0) / (y1 - y0));
  const ox = (box.x0 + box.x1) / 2 - ((x0 + x1) / 2) * k;
  const oy = (box.y0 + box.y1) / 2 - ((y0 + y1) / 2) * k;
  return (p: V3) => {
    const [u, v] = isoUnit(p);
    return [ox + u * k, oy + v * k];
  };
}

const FRAMES: Partial<Record<BlueprintView, Projector>> = {};

/** A stable key for a painted item, so a face that survives a change of
 *  scope keeps its element and its colour eases rather than snaps. */
function keyOf(it: Item) {
  const pts = it.kind === "poly" ? it.pts : [it.a, it.b];
  return `${it.role}:${pts.map((p) => `${Math.round(p[0])},${Math.round(p[1])},${Math.round(p[2])}`).join(";")}`;
}

export function HouseBlueprint({
  house,
  scope,
  view = "outside",
}: {
  house: House;
  scope: Set<ScopeKey>;
  view?: BlueprintView;
}) {
  const scopeKey = [...scope].sort().join(",");
  const { items, patterns, proj } = useMemo(() => {
    FRAMES[view] ??= frame(view);
    const proj = FRAMES[view] as Projector;
    const set = new Set(scopeKey ? (scopeKey.split(",") as ScopeKey[]) : []);
    return { ...paint(house, set, view), proj };
  }, [house, scopeKey, view]);

  const seen = new Map<string, number>();
  const pt = (p: V3) => {
    const [x, y] = proj(p);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <svg
      viewBox="0 0 900 720"
      className="iso-svg"
      role="img"
      aria-label={
        view === "inside"
          ? "Isometric cutaway of the ground floor, with the selected interior work highlighted."
          : `Isometric drawing of a ${house.type} ${house.storeys === "two" ? "two storey" : "bungalow"}, seen from the garden, with the selected work highlighted.`
      }
    >
      <defs>
        {/* Depth behind the model, so it does not sit flat on the grid. */}
        <radialGradient id="bp-vignette" cx="0.5" cy="0.45" r="0.62">
          <stop offset="0%" stopColor="#1b2440" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0b0b15" stopOpacity="0" />
        </radialGradient>
        <PatternDefs patterns={patterns} proj={proj} />
      </defs>

      <rect width="900" height="720" fill="url(#bp-vignette)" />

      {items.map((it) => {
        const base = keyOf(it);
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        const key = n ? `${base}#${n}` : base;
        if (it.kind === "poly") {
          return (
            <polygon
              key={key}
              points={it.pts.map(pt).join(" ")}
              className="bp-face"
              fill={it.fill}
              fillOpacity={it.fillOpacity}
              stroke={it.stroke ?? "none"}
              strokeWidth={it.sw}
              strokeOpacity={it.so}
              strokeLinejoin="round"
            />
          );
        }
        const [x1, y1] = proj(it.a);
        const [x2, y2] = proj(it.b);
        return (
          <line
            key={key}
            x1={x1.toFixed(1)}
            y1={y1.toFixed(1)}
            x2={x2.toFixed(1)}
            y2={y2.toFixed(1)}
            className="bp-face"
            stroke={it.stroke}
            strokeWidth={it.sw}
            strokeOpacity={it.so}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/**
 * Which way round you are looking, drawn as a plan.
 *
 * A sentence saying "rear elevation" only works on a reader who already thinks
 * in elevations. A plan of the house with the viewer standing in the garden
 * settles it for everyone else, and survives being skim-read.
 */
function OrientationKey() {
  return (
    <svg
      viewBox="0 0 132 118"
      className="w-[92px] shrink-0 sm:w-[124px]"
      role="img"
      aria-label="Plan key: the street is behind the house, the garden is in front, and you are standing in the garden."
    >
      <g
        fontFamily="ui-monospace, monospace"
        textAnchor="middle"
        letterSpacing="1.6"
        fill={INK}
      >
        <text x="66" y="9" fillOpacity="0.6" fontSize="9">
          STREET
        </text>
        <rect
          x="14"
          y="16"
          width="104"
          height="34"
          fill="#161d30"
          stroke={INK}
          strokeOpacity="0.55"
          strokeWidth="1.2"
        />
        <text x="66" y="38" fillOpacity="0.85" fontSize="10">
          HOUSE
        </text>
        <text x="66" y="66" fillOpacity="0.6" fontSize="9">
          GARDEN
        </text>
        <line x1="66" y1="98" x2="66" y2="80" stroke={DETAIL} strokeWidth="2" />
        <polygon points="66,73 59,84 73,84" fill={DETAIL} />
        <text x="66" y="114" fill={DETAIL} fontSize="10">
          YOU ARE HERE
        </text>
      </g>
    </svg>
  );
}

/**
 * The drawing plus its title block.
 *
 * The title block is HTML rather than more SVG on purpose. Inside the drawing
 * it scaled with the viewBox, which on a phone frame meant six-pixel type -
 * exactly where a reader most needs telling which way round they are looking.
 */
export function HouseBlueprintSheet({
  house,
  scope,
  view = "outside",
}: {
  house: House;
  scope: Set<ScopeKey>;
  view?: BlueprintView;
}) {
  return (
    <div className="relative size-full">
      <HouseBlueprint house={house} scope={scope} view={view} />

      {/* Along the bottom, because that band of the drawing is empty whatever
          is selected. At the top it landed across the roof. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between gap-4 p-3 sm:flex sm:p-5">
        <div className="min-w-0">
          <div className="mb-2 h-px w-full bg-gold-400/70" />
          <p className="font-mono text-[11px] leading-tight tracking-[0.2em] text-gold-300 sm:text-sm">
            {view === "inside" ? "GROUND FLOOR" : "REAR ELEVATION"}
          </p>
          <p className="mt-1 font-mono text-[9px] leading-tight tracking-[0.14em] text-navy-200 sm:text-xs">
            {view === "inside"
              ? "WALLS CUT AWAY TO SHOW THE ROOMS"
              : "YOU ARE LOOKING AT THE BACK OF THE HOUSE"}
          </p>
        </div>
        <OrientationKey />
      </div>
    </div>
  );
}
