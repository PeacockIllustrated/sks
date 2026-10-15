import { DETAIL } from "@/lib/iso";
import {
  attach,
  books,
  boxPart,
  chimney,
  coffeeTable,
  cylPart,
  downpipe,
  faceBox,
  faceRect,
  glazedDoorsOn,
  gutterAlong,
  island,
  kitchenRun,
  obox,
  pitchedRoof,
  plant,
  polyhedron,
  sofa,
  splashback,
  stair,
  stool,
  windowOn,
  type GableRoof,
  type WallFace,
} from "@/lib/house-kit";
import {
  Scene,
  projectIso,
  renderScene,
  type Mark,
  type Node,
  type Tags,
  type V3,
} from "@/lib/scene3d";
import type { DivisionSlug, FeatureDrawing } from "@/lib/site";
import { IsoItems, PatternDefs, fitViewBox } from "@/components/drawing/iso-svg";

/* ===========================================================================
   The detail sheets.

   One isometric detail per division for the division pages, and one per piece
   of interior work for the cards that list them. Each is a small model built
   in real millimetres from the same kit as the hero and the project builder,
   so a stair here has the same thirteen risers as the stair in the hero's
   cutaway, and a kitchen has the same 900mm worktop.

   Static and server-rendered: they cost no JavaScript.

   The part of each detail its division is named for is outlined in gold.
   =========================================================================== */

type Detail = {
  caption: string;
  alt: string;
  build: (s: Scene) => void;
};

const KEY: Tags = { key: true };

/** Scale of a detail sheet: output units per millimetre. */
const K = 0.1;

/** A room corner: floor, back wall along x and a side wall along y, both cut
 *  at the top so they read as walls in a drawing rather than as boxes. */
function roomCorner(
  s: Scene,
  o: { x0: number; x1: number; y0: number; y1: number; h?: number; side?: boolean; skirting?: [number, number][]; sideSkirting?: [number, number][] },
) {
  const H = o.h ?? 2600;
  const T = 150;
  const floor = s.box([o.x0 - (o.side === false ? 0 : T), o.y0 - T, -140], [o.x1, o.y1, 0], { all: "cut", top: "floor" });
  const back = s.box([o.x0 - (o.side === false ? 0 : T), o.y0 - T, 0], [o.x1, o.y0, H], { all: "plaster", top: "cut" });
  const side = o.side === false ? null : s.box([o.x0 - T, o.y0, 0], [o.x0, o.y1, H], { all: "plaster", top: "cut" });
  for (const [a, b] of o.skirting ?? [[o.x0, o.x1]]) {
    s.box([a, o.y0, 0], [b, o.y0 + 18, 145], "paint");
  }
  if (side) {
    for (const [a, b] of o.sideSkirting ?? [[o.y0 + 18, o.y1]]) {
      s.box([o.x0, a, 0], [o.x0 + 18, b, 145], "paint");
    }
  }
  return { floor, back, side, H };
}

/* ---------------------------------------------------------------- stair */

function stairDetail(): Detail {
  return {
    caption: "Staircase",
    alt: "Isometric detail of a straight timber staircase rising along a wall to the floor above, with a closed string, white balusters, oak newels and an oak handrail.",
    build: (s) => {
      roomCorner(s, { x0: 0, x1: 2400, y0: -400, y1: 3700, h: 3200, skirting: [[1000, 2400]], sideSkirting: [[3400, 3700]] });
      s.with(KEY, () => {
        stair(s, { x0: 0, x1: 900, yStart: 3300, dir: -1, rise: 2650, open: "x1", landing: false });
      });
      /* The floor it arrives at, cut back to show the flight. */
      const LY = 525;
      s.box([0, -400, 2650 - 250], [2400, LY, 2650], { all: "cut", top: "floor" });
      /* The guarding round the stairwell, at 900 above the landing. */
      const guard = [boxPart([990, LY - 60, 2650], [2400, LY - 20, 2700], "oak")];
      for (let x = 1060; x < 2400; x += 110) guard.push(boxPart([x, LY - 56, 2700], [x + 32, LY - 24, 3500], "paint"));
      guard.push(boxPart([990, LY - 70, 3500], [2400, LY - 10, 3560], "oak"));
      s.add([boxPart([900, LY - 80, 2650], [990, LY, 3640], "oak"), ...guard]);
      plant(s, 1600, 3150, 0, 950, undefined, { x0: 0, y0: -400, x1: 2400, y1: 3700 });
    },
  };
}

/* -------------------------------------------------------------- kitchen */

function kitchenDetail(): Detail {
  return {
    caption: "Fitted kitchen",
    alt: "Isometric detail of a fitted kitchen: base units with a sink under the window, a hob under its extractor, wall cabinets, a tiled splashback, and an oak island with three stools.",
    build: (s) => {
      const room = { x0: 0, x1: 4300, y0: 0, y1: 4000 };
      const { back } = roomCorner(s, { ...room, skirting: [[3400, 4300]], sideSkirting: [[620, 4000]] });
      const wall: WallFace = { axis: "y", at: 0 };
      const win = windowOn(wall, 650, 1550, 1100, 2250, { lights: 2, cill: false, head: false, reveal: 120 });
      attach(back, [splashback(wall, 0, 3400), ...win.marks]);
      s.add(faceBox(wall, 620, 1580, 1060, 1100, 0, 180, "oak"));
      s.with(KEY, () => {
        kitchenRun(s, {
          x0: 0,
          wallY: 0,
          units: [{ w: 600, kind: "drawers" }, { w: 1000, kind: "sink" }, { w: 600, kind: "door" }, { w: 600, kind: "hob" }, { w: 600, kind: "doors" }],
          wallUnits: [{ x0: 2800, x1: 3400 }],
        });
        /* Chimney hood over the hob. */
        s.add(
          [
            obox([2230, 0, 1650], [540, 0, 0], [0, 480, 0], [0, 0, 120], "steelBright"),
            boxPart([2400, 0, 1770], [2600, 250, 2600], "steelBright"),
          ],
        );
        island(s, 900, 3100, 1750, { seats: 3, receiver: { x0: 0, y0: 0, x1: 4300, y1: 4000 } });
      });
      plant(s, 3900, 3500, 0, 1100, undefined, { x0: 0, y0: 0, x1: 4300, y1: 4000 });
    },
  };
}

/* ---------------------------------------------- joinery: alcove units */

function unitDetail(): Detail {
  return {
    caption: "Detail 02 / alcove units and shelving",
    alt: "Isometric detail of fitted alcove joinery either side of a chimney breast: oak-topped cupboards below, one door standing open, and shelving filled with books above, with a stove in the fireplace.",
    build: (s) => {
      const room = { x0: 0, x1: 4000, y0: 0, y1: 2800 };
      const BR0 = 1350;
      const BR1 = 2650;
      const BD = 420;
      roomCorner(s, { ...room, skirting: [], sideSkirting: [[BD, 2800]] });
      /* Chimney breast, built round its fireplace recess so the stove sits
         in the opening rather than inside solid brick. */
      const R0 = 1650;
      const R1 = 2350;
      const RH = 1000;
      const RD = BD - 380;
      const back = s.box([BR0, 0, 0], [BR1, RD, 2600], { all: "plaster", top: "cut" });
      s.add(boxPart([R0, RD, 0], [R1, BD, 2], "hearth"), { layer: 1 });
      s.box([BR0, RD, 0], [R0, BD, RH], "plaster");
      s.box([R1, RD, 0], [BR1, BD, RH], "plaster");
      s.box([BR0, RD, RH], [BR1, BD, 2600], { all: "plaster", top: "cut" });
      attach(back, [
        { type: "poly", pts: faceRect({ axis: "y", at: RD }, R0, R1, 0, RH, 0.5), mat: "void" },
      ]);
      s.box([1400, BD, 0], [2600, BD + 450, 40], "hearth");
      s.add(
        [
          boxPart([1790, RD + 40, 2], [2210, RD + 340, 70], "black"),
          boxPart([1770, RD + 30, 70], [2230, RD + 350, 600], "black"),
          cylPart(2000, RD + 140, 65, 600, RH, "black", 10),
        ],
        { id: "stove" },
      );
      const stoveNode = s.nodes[s.nodes.length - 1];
      attach(stoveNode, [
        { type: "poly", pts: faceRect({ axis: "y", at: RD + 350 }, 1830, 2170, 160, 520, 1), mat: "void" },
        { type: "poly", pts: faceRect({ axis: "y", at: RD + 350 }, 1860, 2140, 190, 400, 1.5), mat: "fire" },
      ]);
      s.box([BR0 - 40, BD, 1080], [BR1 + 40, BD + 160, 1140], "oak");

      s.with(KEY, () => {
        for (const [a, b] of [
          [0, BR0],
          [BR1, 4000],
        ] as const) {
          /* Cupboards to dado height, an oak top, then three shelves. */
          const base = s.box([a + 18, 0, 0], [b, BD - 20, 850], { all: "paint" });
          const f: WallFace = { axis: "y", at: BD - 20 };
          const marks: Mark[] = [];
          const mid = (a + b) / 2;
          for (const [d0, d1] of [
            [a + 40, mid - 3],
            [mid + 3, b - 20],
          ] as const) {
            marks.push({ type: "poly", pts: faceRect(f, d0 + 70, d1 - 70, 220, 780, 0.6), mat: "shadeSoft" });
          }
          marks.push({ type: "line", a: [mid, BD - 19.5, 80], b: [mid, BD - 19.5, 845], color: "#0d1220", w: 0.9, opacity: 0.6 });
          marks.push({ type: "poly", pts: faceRect(f, a + 18, b, 0, 90, 0.6), mat: "shadeSoft" });
          if (a === 0) {
            marks.push({ type: "line", a: [mid - 60, BD - 18, 560], b: [mid - 60, BD - 18, 700], color: "#e2b04f", w: 1.6, opacity: 1 });
            marks.push({ type: "line", a: [mid + 60, BD - 18, 560], b: [mid + 60, BD - 18, 700], color: "#e2b04f", w: 1.6, opacity: 1 });
          } else {
            marks.push({ type: "line", a: [mid - 60, BD - 18, 560], b: [mid - 60, BD - 18, 700], color: "#e2b04f", w: 1.6, opacity: 1 });
            /* The right-hand door stands open: the bay behind it, and a shelf. */
            marks.push({ type: "poly", pts: faceRect(f, mid + 3, b - 20, 90, 845, 0.8), mat: "void" });
            marks.push({ type: "line", a: [mid + 3, BD - 18.5, 470], b: [b - 20, BD - 18.5, 470], color: "#e9e4da", w: 1.6, opacity: 0.9 });
          }
          attach(base, marks);
          s.box([a + 18, 0, 850], [b, BD, 890], "oak");
          for (const z of [1350, 1800, 2250]) {
            const shelf = s.box([a + 18, 0, z], [b, 300, z + 32], "oak");
            void shelf;
            const run = books({ axis: "y", at: 0 }, a + 80, b - 60, z + 32, 280, 330, Math.round(a / 7 + z / 3));
            if (run.length) s.add(run);
          }
          if (a !== 0) {
            const th = (68 * Math.PI) / 180;
            const W = b - 20 - (mid + 3);
            const hx = b - 20;
            const dir: V3 = [-Math.cos(th) * W, Math.sin(th) * W, 0];
            const tn: V3 = [Math.sin(th) * 20, Math.cos(th) * 20, 0];
            s.add(obox([hx + 2, BD - 20 + 2, 92], dir, tn, [0, 0, 752], "paint"));
            const leaf = s.nodes[s.nodes.length - 1];
            const P = (t: number, z: number): V3 => [hx + 2 + dir[0] * t + tn[0], BD - 18 + dir[1] * t + tn[1], z];
            attach(leaf, [
              { type: "poly", pts: [P(0.14, 200), P(0.86, 200), P(0.86, 740), P(0.14, 740)], mat: "shadeSoft" },
              { type: "line", a: P(0.9, 470), b: P(0.9, 610), color: "#e2b04f", w: 1.6, opacity: 1 },
            ]);
          }
        }
      });
      s.add([boxPart([1250, 1250, 0], [2750, 2450, 8], "rug")], { layer: 2 });
    },
  };
}

/* ----------------------------------------------------------------- door */

function doorDetail(): Detail {
  return {
    caption: "Doors and second fix",
    alt: "Isometric detail of a four-panel internal door standing open in its lining, with moulded architrave, skirting and a light switch beside it.",
    build: (s) => {
      const T = 115;
      const room = { x0: 0, x1: 3600, y0: 0, y1: 2600 };
      s.box([-T, -T, -140], [3600, 2600, 0], { all: "cut", top: "floor" });
      s.box([-T, 0, 0], [0, 2600, 2600], { all: "plaster", top: "cut" });
      /* The wall the door is in, built around a 838 x 2040 structural opening. */
      const O0 = 1300;
      const O1 = 2138;
      const OH = 2040;
      s.box([-T, -T, 0], [O0, 0, 2600], { all: "plaster", top: "cut" });
      s.box([O1, -T, 0], [3600, 0, 2600], { all: "plaster", top: "cut" });
      s.box([O0, -T, OH], [O1, 0, 2600], { all: "plaster", top: "cut" });
      /* What is through it: the hall beyond. */
      s.rect(O0 + 32, -T - 400, O1 - 32, -T, 0, "floor");
      s.flat(
        [
          [O0 + 32, -T - 400, 0],
          [O1 - 32, -T - 400, 0],
          [O1 - 32, -T - 400, OH],
          [O0 + 32, -T - 400, OH],
        ],
        "void",
      );
      s.with(KEY, () => {
        s.box([O0, -T, 0], [O0 + 32, 0, OH], "paint");
        s.box([O1 - 32, -T, 0], [O1, 0, OH], "paint");
        s.box([O0 + 32, -T, OH - 32], [O1 - 32, 0, OH], "paint");
        /* Architrave, 70mm torus, mitred at the head. */
        s.box([O0 - 70, 0, 0], [O0 + 6, 20, OH + 6], "paint");
        s.box([O1 - 6, 0, 0], [O1 + 70, 20, OH + 6], "paint");
        s.box([O0 - 70, 0, OH + 6], [O1 + 70, 20, OH + 76], "paint");
        s.box([0, 0, 0], [O0 - 70, 18, 168], "paint");
        s.box([O1 + 70, 0, 0], [3600, 18, 168], "paint");
        s.box([0, 18, 0], [18, 2600, 168], "paint");
        /* The leaf: 762 x 1981 x 35, hung on the left, open 72 degrees into
           the room. */
        const th = (72 * Math.PI) / 180;
        const hinge: V3 = [O0 + 34, 4, 10];
        const dir: V3 = [Math.cos(th) * 762, Math.sin(th) * 762, 0];
        const tn: V3 = [Math.sin(th) * 35, -Math.cos(th) * 35, 0];
        const leafNode = s.add(obox(hinge, dir, tn, [0, 0, 1981], "paint"));
        const P = (t: number, z: number): V3 => [hinge[0] + dir[0] * t + tn[0] * 1.02, hinge[1] + dir[1] * t + tn[1] * 1.02, z];
        const panels: Mark[] = [];
        for (const [t0, t1] of [
          [0.16, 0.46],
          [0.54, 0.84],
        ] as const) {
          panels.push({ type: "poly", pts: [P(t0, 170), P(t1, 170), P(t1, 880), P(t0, 880)], mat: "shadeSoft", stroke: true });
          panels.push({ type: "poly", pts: [P(t0, 1070), P(t1, 1070), P(t1, 1830), P(t0, 1830)], mat: "shadeSoft", stroke: true });
        }
        panels.push({ type: "line", a: P(0.9, 1000), b: P(0.9, 1000.1), color: "#e2b04f", w: 3, opacity: 1 });
        panels.push({ type: "line", a: P(0.9, 1000), b: P(0.78, 1000), color: "#e2b04f", w: 1.6, opacity: 1 });
        attach(leafNode, panels);
      });
      /* Switch plate, at 1050 to centre, 150 off the architrave. */
      s.add(faceBox({ axis: "y", at: 0 }, O1 + 220, O1 + 306, 1007, 1093, 0, 8, "white"));
      void room;
    },
  };
}

/* -------------------------------------------------------------- opening */

function openingDetail(): Detail {
  return {
    caption: "Opening up",
    alt: "Isometric detail of a load-bearing wall taken out between two rooms: a steel beam on concrete padstones carried by brick piers, with the floor running through where the wall was.",
    build: (s) => {
      const T = 215;
      const W = 5200;
      const Y = 0;
      s.box([-T, -2400, -140], [W, 2600, 0], { all: "cut", top: "floor" });
      s.box([-T, -2400, 0], [0, 2600, 2700], { all: "plaster", top: "cut" });
      /* Piers, padstones, the beam, and the masonry it carries. */
      const P0 = 650;
      const P1 = W - 650;
      s.box([0, Y - T, 0], [P0, Y, 2250], { all: "plaster", top: "cut" });
      s.box([P1, Y - T, 0], [W, Y, 2250], { all: "plaster", top: "cut" });
      s.box([0, Y - T, 2250], [P0 - 300, Y, 2400], { all: "plaster", top: "cut" });
      s.box([P1 + 300, Y - T, 2250], [W, Y, 2400], { all: "plaster", top: "cut" });
      s.with(KEY, () => {
        s.box([P0 - 300, Y - T, 2250], [P0, Y, 2400], "concrete");
        s.box([P1, Y - T, 2250], [P1 + 300, Y, 2400], "concrete");
        /* A 203 x 133 UB: flanges and web. */
        const cy = Y - T / 2;
        s.add([
          boxPart([P0 - 300, cy - 66, 2400], [P1 + 300, cy + 66, 2414], "steel"),
          boxPart([P0 - 300, cy - 4, 2414], [P1 + 300, cy + 4, 2589], "steel"),
          boxPart([P0 - 300, cy - 66, 2589], [P1 + 300, cy + 66, 2603], "steel"),
        ]);
      });
      s.box([0, Y - T, 2603], [W, Y, 2700], { all: "brick", top: "cut" });
      /* Where the wall was: a strip of new boards, laid the other way. */
      s.rect(P0, Y - T, P1, Y, 0.6, "oakDark", { layer: 2 });
      /* The two rooms it now makes one. */
      const rx = { x0: -T, y0: -2400, x1: W, y1: 2600 };
      sofa(s, 1400, 1300, 2200, 0, undefined, rx);
      coffeeTable(s, 1950, 300, 1100, 550, 0, undefined, rx);
      s.add(boxPart([1100, 100, 0], [3900, 2300, 8], "rug"), { layer: 2 });
      /* Dining table and chairs beyond. */
      s.add(
        [
          boxPart([1700, -1700, 0], [1770, -1630, 720], "oakDark"),
          boxPart([3330, -1700, 0], [3400, -1630, 720], "oakDark"),
          boxPart([1700, -870, 0], [1770, -800, 720], "oakDark"),
          boxPart([3330, -870, 0], [3400, -800, 720], "oakDark"),
          boxPart([1650, -1750, 720], [3450, -750, 760], "oak"),
        ],
        { shadow: rx },
      );
      for (const x of [2000, 2900]) {
        s.add(
          [
            boxPart([x, -2250, 0], [x + 450, -1800, 450], "oakDark"),
            boxPart([x, -2250, 450], [x + 450, -2200, 900], "oakDark"),
          ],
          { shadow: rx },
        );
      }
      plant(s, 4700, 2100, 0, 1100, undefined, rx);
    },
  };
}

/* ------------------------------------------------------------ extension */

function extensionDetail(): Detail {
  return {
    caption: "Extension",
    alt: "Isometric detail of a single-storey rear extension across the back of a brick house: bi-fold doors onto a patio, a side window, a flat roof with a parapet and a roof lantern.",
    build: (s) => {
      const W = 5600;
      const HD = 3200;
      const E = 3600;
      const EH = 3000;
      s.box([-600, -HD - 600, -300], [W + 2600, E + 3200, 0], { all: "earth", top: "lawn" });
      /* The house: back wall, first-floor windows, eaves, gutter, roof. */
      const house = s.box([0, -HD, 0], [W, 0, 5300], "brick");
      const hf: WallFace = { axis: "y", at: 0 };
      const hs: WallFace = { axis: "x", at: W };
      const w1 = windowOn(hf, 700, 1900, 3600, 4800, { lights: 2 });
      const w2 = windowOn(hf, 3500, 4500, 3600, 4800, { lights: 2 });
      const w3 = windowOn(hs, -2300, -1500, 3700, 4700, { lights: 1 });
      attach(house, [...w1.marks, ...w2.marks, ...w3.marks]);
      for (const p of [...w1.parts, ...w2.parts, ...w3.parts]) s.add(p);
      const roof: GableRoof = { x0: 0, x1: W, y0: -HD, y1: 0, eaves: 5300, pitch: 38, ridge: "x" };
      const r = pitchedRoof(roof);
      s.add(r.parts);
      s.add(gutterAlong("x", -200, W + 200, 300, 5300 - 60, 1));

      s.with(KEY, () => {
        const ext = s.box([0, 0, 0], [W, E, EH], "brick");
        const ef: WallFace = { axis: "y", at: E };
        const es: WallFace = { axis: "x", at: W };
        const sw = windowOn(es, 900, 2300, 1000, 2300, { lights: 2 });
        attach(ext, [...glazedDoorsOn(ef, 500, 4300, 150, 2350, 4), ...windowOn(ef, 4600, 5200, 1000, 2350, { lights: 1, cill: false }).marks, ...sw.marks, { type: "poly", pts: faceRect(ef, 400, 4400, 2350, 2500, 0.5), mat: "steel", stroke: true }]);
        for (const p of sw.parts) s.add(p);
        s.add(faceBox(ef, 4550, 5250, 930, 1000, 0, 55, "stone"));
        /* Parapet, coping, and the deck inside it. */
        s.add([
          boxPart([0, 0, EH], [W, E, EH + 10], "membrane"),
        ]);
        s.box([-30, E - 225, EH], [W + 30, E + 30, EH + 300], { all: "brick", top: "coping" });
        s.box([W - 225, 0, EH], [W + 30, E - 225, EH + 300], { all: "brick", top: "coping" });
        /* A hipped glass lantern on its upstand. */
        const lx0 = 1700;
        const lx1 = 3900;
        const ly0 = 900;
        const ly1 = 2300;
        const lz = EH + 10;
        s.add([
          boxPart([lx0, ly0, lz], [lx1, ly1, lz + 250], "membrane"),
          polyhedron(
            [
              [[lx0, ly0, lz + 250], [lx1, ly0, lz + 250], [lx1, ly1, lz + 250], [lx0, ly1, lz + 250]],
              [[lx0, ly0, lz + 250], [lx1, ly0, lz + 250], [lx1 - 500, (ly0 + ly1) / 2, lz + 900], [lx0 + 500, (ly0 + ly1) / 2, lz + 900]],
              [[lx1, ly0, lz + 250], [lx1, ly1, lz + 250], [lx1 - 500, (ly0 + ly1) / 2, lz + 900]],
              [[lx1, ly1, lz + 250], [lx0, ly1, lz + 250], [lx0 + 500, (ly0 + ly1) / 2, lz + 900], [lx1 - 500, (ly0 + ly1) / 2, lz + 900]],
              [[lx0, ly1, lz + 250], [lx0, ly0, lz + 250], [lx0 + 500, (ly0 + ly1) / 2, lz + 900]],
            ],
            "glass",
          ),
        ]);
      });
      s.add(downpipe(W + 60, E - 400, 0, EH + 150));
      /* Patio, out to the lawn. */
      s.box([0, E, 0], [W, E + 2600, 40], { all: "concrete", top: "paving" });
      const rx = { x0: 0, y0: E, x1: W, y1: E + 2600, z: 40 };
      s.add(
        [
          boxPart([3600, E + 900, 40], [3670, E + 970, 760], "metal"),
          boxPart([4530, E + 900, 40], [4600, E + 970, 760], "metal"),
          boxPart([3600, E + 1630, 40], [3670, E + 1700, 760], "metal"),
          boxPart([4530, E + 1630, 40], [4600, E + 1700, 760], "metal"),
          boxPart([3560, E + 860, 760], [4640, E + 1740, 790], "oak"),
        ],
        { shadow: rx },
      );
      plant(s, 900, E + 2100, 40, 1100, undefined, rx);
    },
  };
}

/* -------------------------------------------------- construction detail */

function constructionDetail(): Detail {
  return {
    caption: "Detail 01 / footing, cavity wall and lintel",
    alt: "Isometric section of a cavity wall going up from its footing: concrete strip footing in the trench, blockwork to damp course, then a brick outer leaf, insulated cavity and block inner leaf, with a steel lintel over a window opening.",
    build: (s) => {
      const W = 3600;
      const D = 3000;
      const G = 0;
      const FB = -1000;
      /* Ground, cut in section. The strip footing runs under both walls in
         a 600 trench; outside the corner the ground is dug out to footing
         level so the foundation shows, with the spoil cut back square. */
      const FW = 151;
      s.box([-400, -400, FB - 260], [W + 1400, D + 1400, FB - 100], "earth");
      s.box([-400, -400, FB - 100], [W - FW - 300, D - FW - 300, G], { all: "earth", top: "gravel" });
      s.box([-400, D + FW - 2, FB - 100], [600, D + 1400, G], { all: "earth", top: "lawn" });
      s.box([W + FW - 2, -400, FB - 100], [W + 1400, 600, G], { all: "earth", top: "lawn" });
      s.with(KEY, () => {
        /* Strip footing, 600 x 225, then trench blocks up to damp course. */
        s.box([-400, D - FW - 300, FB - 100], [W + FW - 2, D + FW - 2, FB + 125], "concrete");
        s.box([W - FW - 300, -400, FB - 100], [W + FW - 2, D - FW - 300, FB + 125], "concrete");
      });
      s.box([-400, D - 300, FB + 125], [W, D, G + 150], { all: "concrete" });
      s.box([W - 300, -400, FB + 125], [W, D - 300, G + 150], { all: "concrete" });
      /* Above DPC, the three layers, each laid to its own lift. */
      const L0 = G + 150;
      const outerTop = 2400;
      const innerTop = 2475;
      const insTop = 2250;
      const O0 = 1000;
      const O1 = 2200;
      const SILL = 900;
      const HEAD = 2100;
      const outer = (a: V3, b: V3) => s.box(a, b, { all: "brick", top: "brick" });
      /* Front run, outer leaf, round the opening. */
      outer([-400, D - 102, L0], [O0, D, outerTop]);
      outer([O1, D - 102, L0], [W - 102, D, outerTop]);
      outer([O0, D - 102, L0], [O1, D, SILL]);
      outer([W - 102, -400, L0], [W, D, outerTop]);
      /* Insulation boards in the cavity. */
      s.box([-400, D - 202, L0], [O0, D - 102, insTop], "cushion");
      s.box([O1, D - 202, L0], [W - 202, D - 102, insTop], "cushion");
      s.box([O0, D - 202, L0], [O1, D - 102, SILL], "cushion");
      s.box([W - 202, -400, L0], [W - 102, D - 102, insTop], "cushion");
      /* Inner leaf, block. */
      s.box([-400, D - 302, L0], [O0, D - 202, innerTop], "concrete");
      s.box([O1, D - 302, L0], [W - 302, D - 202, innerTop], "concrete");
      s.box([O0, D - 302, L0], [O1, D - 202, SILL], "concrete");
      s.box([W - 302, -400, L0], [W - 202, D - 202, innerTop], "concrete");
      s.with(KEY, () => {
        /* Cavity tray lintel, bearing 150 each side. */
        s.box([O0 - 150, D - 302, HEAD], [O1 + 150, D, HEAD + 150], "steel");
      });
      outer([O0 - 150, D - 102, HEAD + 150], [O1 + 150, D, outerTop]);
      s.box([O0 - 150, D - 302, HEAD + 150], [O1 + 150, D - 202, innerTop], "concrete");
      s.box([O0 - 150, D - 202, HEAD + 150], [O1 + 150, D - 102, insTop], "cushion");
      /* A pallet of bricks waiting by the trench. */
      s.add(
        [
          boxPart([-250, D + 600, 0], [350, D + 1100, 120], "timber"),
          boxPart([-230, D + 620, 120], [330, D + 1080, 620], "brick"),
        ],
        { shadow: { x0: -400, y0: D + FW, x1: 600, y1: D + 1400, z: 0 } },
      );
    },
  };
}

/* ----------------------------------------------------------- roofing */

function roofingDetail(): Detail {
  return {
    caption: "Detail 03 / slopes, stack, flashing and eaves",
    alt: "Isometric detail of a pitched slate roof: two slopes meeting at a ridge, bargeboards on the gable, a chimney stack with lead flashing and pots, a rooflight, and the gutter and downpipe at the eaves.",
    build: (s) => {
      const r: GableRoof = { x0: 0, x1: 4400, y0: 0, y1: 4200, eaves: 2400, pitch: 40, ridge: "y", overhang: 300, verge: 200 };
      s.box([0, 0, 0], [4400, 4200, 2400], "brick");
      const st = chimney(r, "near", 1300, 1000, 650, 900, 900);
      const flash = (() => {
        const p = st[0].faces.flatMap((f) => f.pts);
        const xs = p.map((q) => q[0]);
        const ys = p.map((q) => q[1]);
        const x0 = Math.min(...xs) - 80;
        const x1 = Math.max(...xs) + 80;
        const y0 = Math.min(...ys) - 80;
        const y1 = Math.max(...ys) + 80;
        const tan = Math.tan((40 * Math.PI) / 180);
        const zAt = (x: number) => 2400 + (4400 - x) * tan + 160 / Math.cos((40 * Math.PI) / 180) + 2;
        return polyhedron(
          [
            [[x0, y0, zAt(x0)], [x1, y0, zAt(x1)], [x1, y1, zAt(x1)], [x0, y1, zAt(x0)]],
            [[x0, y0, zAt(x0) + 30], [x1, y0, zAt(x1) + 30], [x1, y1, zAt(x1) + 30], [x0, y1, zAt(x0) + 30]],
            [[x0, y0, zAt(x0)], [x1, y0, zAt(x1)], [x1, y0, zAt(x1) + 30], [x0, y0, zAt(x0) + 30]],
            [[x0, y1, zAt(x0)], [x1, y1, zAt(x1)], [x1, y1, zAt(x1) + 30], [x0, y1, zAt(x0) + 30]],
            [[x0, y0, zAt(x0)], [x0, y1, zAt(x0)], [x0, y1, zAt(x0) + 30], [x0, y0, zAt(x0) + 30]],
            [[x1, y0, zAt(x1)], [x1, y1, zAt(x1)], [x1, y1, zAt(x1) + 30], [x1, y0, zAt(x1) + 30]],
          ],
          "lead",
        );
      })();
      /* A rooflight lower down the same slope. */
      const tan = Math.tan((40 * Math.PI) / 180);
      const cos = Math.cos((40 * Math.PI) / 180);
      const rl = (s0: number, s1: number, u0: number, u1: number) => {
        const z = (q: number) => 2400 + q * tan + 160 / cos + 2;
        return obox([4400 - s0, u0, z(s0)], [0, u1 - u0, 0], [-(s1 - s0), 0, (s1 - s0) * tan], [0, 0, 90], { all: "frameDark", top: "glass" });
      };
      const rp = pitchedRoof(r, { onNear: [rl(500, 1250, 2600, 3300), flash, ...st] });
      s.with(KEY, () => {
        s.add(rp.parts);
        s.add(gutterAlong("y", -200, 4400, 4400 + 300, 2400 - 300 * tan + 20, 1));
        s.add(downpipe(4400 + 360, 3900, 0, 2400 - 300 * tan - 80));
      });
      s.box([-300, -300, -140], [5400, 5000, 0], { all: "cut", top: "paving" });
    },
  };
}

const DETAILS: Record<DivisionSlug, () => Detail> = {
  construction: constructionDetail,
  joinery: unitDetail,
  roofing: roofingDetail,
};

const FEATURES: Record<FeatureDrawing, () => Detail> = {
  stair: stairDetail,
  unit: unitDetail,
  kitchen: kitchenDetail,
  opening: openingDetail,
  door: doorDetail,
  extension: extensionDetail,
};

export function DivisionVignette({ slug }: { slug: DivisionSlug }) {
  const detail = DETAILS[slug]();

  return (
    <figure className="pointer-events-none m-0">
      {/* Above the drawing, not below: the sheet reference already sits in the
          bottom right of the band, and two mono captions in one corner read as
          a single garbled line. */}
      <figcaption className="anno mb-2 text-right text-navy-500">
        {detail.caption}
      </figcaption>
      <DetailSvg detail={detail} id={`div-${slug}`} className="w-full" />
    </figure>
  );
}

/** One of the interior details, on its own. Used wherever the site talks about
 *  a piece of interior work, so the hero's cutaway, the home page and the
 *  division pages all draw the same things the same way. */
export function FeatureVignette({
  id,
  className,
}: {
  id: FeatureDrawing;
  className?: string;
}) {
  return <DetailSvg detail={FEATURES[id]()} id={`feat-${id}`} className={className} />;
}

function DetailSvg({
  detail,
  id,
  className,
}: {
  detail: Detail;
  id: string;
  className?: string;
}) {
  const scene = new Scene();
  detail.build(scene);
  const { items, patterns } = renderScene(scene, {
    prefix: `${id}-`,
    inkFor: (n: Node) => (n.tags.key ? DETAIL : undefined),
    edge: 0.5,
    silhouette: 1,
  });
  const proj = projectIso(K);
  return (
    <svg
      viewBox={fitViewBox(items, proj, 14, true)}
      className={className}
      role="img"
      aria-label={detail.alt}
    >
      <defs>
        <PatternDefs patterns={patterns} proj={proj} />
      </defs>
      <IsoItems items={items} proj={proj} />
    </svg>
  );
}

/* Used by other drawings; re-exported so there is one import for the kit. */
export { stool };
