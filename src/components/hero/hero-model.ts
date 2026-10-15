import {
  attach,
  blob,
  books,
  boundaryWall,
  boxPart,
  coffeeTable,
  cylPart,
  doorOn,
  downpipe,
  faceRect,
  glazedDoorsOn,
  gutterAlong,
  hedge,
  island,
  kitchenRun,
  obox,
  pitchedRoof,
  plant,
  polyhedron,
  prismPart,
  ridgeChimney,
  ridgeHeight,
  sofa,
  solarArray,
  splashback,
  stair,
  tree,
  windowOn,
  type GableRoof,
  type WallFace,
} from "@/lib/house-kit";
import { Scene, type Mark, type Part, type V3 } from "@/lib/scene3d";

/* ===========================================================================
   The hero house, in millimetres.

   A detached two-storey house with its gable to the street and a single-storey
   kitchen extension alongside it, on a plot with a front garden, a drive and a
   side patio. x runs along the frontage, y from the back garden towards the
   street, z up from finished floor level. The ground outside is 150 below the
   floor, as it is on a real house with a damp course.

   Four scenes, each depth-sorted on its own and painted in this order:

     siteBack   the ground and everything flat on it, and the hedge behind
     exterior   the house as built
     interior   the same house with its roof off and its walls cut down
     siteFront  what stands between the house and the street

   Exterior and interior are alternatives: one is shown at a time. Splitting
   the site out means it is drawn once and survives the change of view.

   Tags: `key` is the division a part answers to when tapped, `late` marks the
   things an elevation has no use for (they appear once there is depth),
   `hide` marks what is cleared away for the cutaway, and `fit` what the
   camera frames.
   =========================================================================== */

export const GROUND = -150;

/* The main house. */
export const HX = 7200;
export const HY = 7800;
export const EAVES = 5300;
export const PITCH = 40;
const WALL = 300;

/* The extension, flush with the house front and back. */
export const EX1 = 12000;
export const EH = 3000;
const PARAPET = 300;

/* The plot. */
const PLOT = { x0: -2400, x1: 16400, y0: -3600, y1: 15000 };
const STREET = 13000;

export const ROOF: GableRoof = {
  x0: 0,
  x1: HX,
  y0: 0,
  y1: HY,
  eaves: EAVES,
  pitch: PITCH,
  ridge: "y",
  overhang: 300,
  verge: 250,
};

export const RIDGE_TOP = Math.round(ridgeHeight(ROOF) + 160 / Math.cos((PITCH * Math.PI) / 180));

/* Openings, shared by the outside and the cutaway so the two agree. */
const DOOR = { x0: 300, x1: 1250 };
const LIVING_WIN = { x0: 2900, x1: 6400, z0: 800, z1: 2250 };
const EXT_WIN = { x0: 8100, x1: 11100, z0: 800, z1: 2250 };
const BIFOLD = { y0: 1200, y1: 6400, z1: 2300 };
const SINK_WIN = { x0: 8400, x1: 9500, z0: 1100, z1: 2250 };
const OPENING = { y0: 1800, y1: 5800, z1: 2250 };
const DRIVE = { x0: 7800, x1: 11400 };
const PATH = { x0: 250, x1: 1300 };

/** A plinth of darker brick to damp course, as a band on a wall face. */
function plinth(f: WallFace, u0: number, u1: number): Mark {
  return { type: "poly", pts: faceRect(f, u0, u1, GROUND, 150, 0.3), mat: "brickDark" };
}

/* ------------------------------------------------------------------ site */

function siteBack(s: Scene) {
  const { x0, x1, y0, y1 } = PLOT;
  s.box([x0, y0, GROUND - 450], [x1, y1, GROUND], { all: "earth", top: "lawn" }, { tags: { nofit: true } });
  /* Pavement and kerb along the street. */
  s.box([x0, STREET + 225, GROUND], [x1, y1, GROUND + 25], { all: "concrete", top: "paving" }, { tags: { nofit: true } });
  s.with({ late: true, key: "construction" }, () => {
    /* The drive, block paved, from the extension to the street. */
    s.box([DRIVE.x0, HY, GROUND], [DRIVE.x1, STREET + 225, GROUND + 20], { all: "concrete", top: "setts" });
    /* The path to the front door, and the step. */
    s.box([PATH.x0, HY + 350, GROUND], [PATH.x1, STREET + 225, GROUND + 20], { all: "concrete", top: "paving" });
    /* The side patio outside the bi-folds, a step down from the floor. */
    s.box([EX1, 300, GROUND], [EX1 + 3600, 7200, GROUND + 30], { all: "concrete", top: "paving" });
  });
  /* The hedge along the far boundary is behind everything. */
  s.with({ late: true, nofit: true }, () => {
    hedge(s, x0, y0 + 400, x0 + 500, STREET - 300, 1600);
  });
}

function siteFront(s: Scene) {
  const rx = { x0: PLOT.x0, y0: HY + 50, x1: PLOT.x1, y1: STREET, z: GROUND };
  s.with({ late: true, key: "construction" }, () => {
    /* The front wall, broken for the path and the drive. */
    boundaryWall(s, STREET, PLOT.x0, PLOT.x1, [
      [PATH.x0, PATH.x1],
      [DRIVE.x0, DRIVE.x1],
    ]);
  });
  s.with({ late: true, nofit: true }, () => {
    hedge(s, PLOT.x1 - 500, PLOT.y0 + 400, PLOT.x1, STREET - 300, 1500);
  });
  s.with({ late: true, hide: true }, () => {
    tree(s, -700, 10700, 4600, undefined, rx);
    car(s, (DRIVE.x0 + DRIVE.x1) / 2, 8500, rx);
    /* A table on the patio, and a planter by the door. */
    const px = { x0: EX1, y0: 300, x1: EX1 + 3600, y1: 7200, z: GROUND + 30 };
    const z = GROUND + 30;
    s.add(
      [
        boxPart([13500, 3300, z], [13560, 3360, z + 720], "metal"),
        boxPart([14440, 3300, z], [14500, 3360, z + 720], "metal"),
        boxPart([13500, 4240, z], [13560, 4300, z + 720], "metal"),
        boxPart([14440, 4240, z], [14500, 4300, z + 720], "metal"),
        boxPart([13450, 3250, z + 720], [14550, 4350, z + 750], "oak"),
      ],
      { shadow: px },
    );
    plant(s, 1650, HY + 450, GROUND, 1000, undefined, rx);
  });
}

/** A family hatchback, nose to the house. 4.3m long, 1.8m wide. */
function car(s: Scene, cx: number, y0: number, receiver: { x0: number; y0: number; x1: number; y1: number; z: number }) {
  const z = GROUND + 20;
  const W = 1780;
  const L = 4300;
  const x0 = cx - W / 2;
  const x1 = cx + W / 2;
  const y1 = y0 + L;
  const wheel = (y: number, x: number, w: number) =>
    prismPart(
      "x",
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return [y + Math.cos(a) * 320, z + 320 + Math.sin(a) * 320] as [number, number];
      }),
      x,
      x + w,
      "tyre",
    );
  /* Body: a lower box with a raked nose and tail, then the cabin. */
  const body = prismPart(
    "x",
    [
      [y0, z + 260],
      [y1, z + 260],
      [y1, z + 800],
      [y1 - 150, z + 960],
      [y0 + 900, z + 990],
      [y0 + 60, z + 830],
    ],
    x0,
    x1,
    "car",
  );
  const cabin = prismPart(
    "x",
    [
      [y0 + 1150, z + 990],
      [y1 - 300, z + 960],
      [y1 - 520, z + 1460],
      [y0 + 1900, z + 1480],
    ],
    x0 + 90,
    x1 - 90,
    "car",
  );
  const node = s.add(
    [wheel(y0 + 800, x0 - 10, 230), wheel(y1 - 760, x0 - 10, 230), body, cabin, wheel(y0 + 800, x1 - 220, 230), wheel(y1 - 760, x1 - 220, 230)],
    { shadow: receiver },
  );
  /* Glass on the cabin, lights on the tail. */
  const side = (y: number, zz: number): V3 => [x1 - 89, y, zz];
  const glassSide: V3[] = [side(y0 + 1950, z + 1440), side(y1 - 560, z + 1420), side(y1 - 380, z + 1010), side(y0 + 1250, z + 1020)];
  const rear: V3[] = [
    [x0 + 160, y1 - 330, z + 1000],
    [x1 - 160, y1 - 330, z + 1000],
    [x1 - 160, y1 - 510, z + 1420],
    [x0 + 160, y1 - 510, z + 1420],
  ];
  attach(node, [
    { type: "poly", pts: glassSide, mat: "glassDark", stroke: true },
    { type: "line", a: side(y0 + 1650, z + 1430), b: side(y0 + 1700, z + 1010), color: "#2c3546", w: 2.2, opacity: 1 },
    { type: "poly", pts: rear, mat: "glassDark", stroke: true },
    { type: "poly", pts: faceRect({ axis: "y", at: y1 + 1 }, x0 + 80, x0 + 360, z + 640, z + 760), mat: "fire" },
    { type: "poly", pts: faceRect({ axis: "y", at: y1 + 1 }, x1 - 360, x1 - 80, z + 640, z + 760), mat: "fire" },
  ]);
}

/* ------------------------------------------------------------- exterior */

function exterior(s: Scene) {
  const front: WallFace = { axis: "y", at: HY };
  const flank: WallFace = { axis: "x", at: HX };
  const wingFront: WallFace = { axis: "y", at: HY };
  const wingFlank: WallFace = { axis: "x", at: EX1 };
  const onGround = { x0: PLOT.x0, y0: PLOT.y0, x1: PLOT.x1, y1: PLOT.y1, z: GROUND };

  /* The house walls, with their openings painted on. */
  const house = s.with({ key: "construction", fit: true }, () =>
    s.box([0, 0, GROUND], [HX, HY, EAVES], "brick", { shadow: onGround }),
  );
  const joinery: Mark[] = [];
  const cills: Part[] = [];
  s.with({ key: "joinery" }, () => {
    const add = (w: { marks: Mark[]; parts: Part[] }) => {
      joinery.push(...w.marks);
      cills.push(...w.parts);
    };
    joinery.push(...doorOn(front, DOOR.x0, DOOR.x1, 0, { fanlight: true }));
    add(windowOn(front, LIVING_WIN.x0, LIVING_WIN.x1, LIVING_WIN.z0, LIVING_WIN.z1, { lights: 3, transom: true }));
    add(windowOn(front, 1000, 2500, 3500, 4750, { lights: 2, transom: true }));
    add(windowOn(front, 4700, 6200, 3500, 4750, { lights: 2, transom: true }));
    add(windowOn(flank, 3300, 4200, 3700, 4700, { lights: 1 }));
  });
  attach(house, [plinth(front, 0, HX), ...joinery]);

  /* Door step and the canopy over it, on brackets. */
  s.with({ key: "joinery" }, () => {
    s.box([DOOR.x0 - 50, HY, GROUND], [DOOR.x1 + 50, HY + 350, 0], "stone");
    for (const p of cills) s.add(p);
    s.add([
      boxPart([DOOR.x0 - 120, HY, 2560], [DOOR.x0 - 60, HY + 520, 2640], "frame"),
      boxPart([DOOR.x1 + 60, HY, 2560], [DOOR.x1 + 120, HY + 520, 2640], "frame"),
      boxPart([DOOR.x0 - 180, HY, 2640], [DOOR.x1 + 180, HY + 600, 2720], { all: "frame", top: "lead" }),
    ]);
  });

  /* The roof, with the stack on the back gable and panels on the slope that
     faces the sun. */
  s.with({ key: "roofing", fit: true }, () => {
    const stack = ridgeChimney(ROOF, 150, 850, 1100, 900);
    const panels = solarArray(ROOF, "near", 2200, 6400, 700, 2700, 4);
    const r = pitchedRoof(ROOF, { ridgeStack: stack, onNear: panels });
    const roof = s.add(r.parts);
    /* The loft window is in the gable, which belongs to the roof. */
    const gw = windowOn(front, 3150, 4050, 6050, 6950, { lights: 1 });
    attach(roof, gw.marks);
    for (const p of gw.parts) s.add(p);
    s.add(gutterAlong("y", -250, HY + 250, HX + 300, EAVES - 300 * Math.tan((PITCH * Math.PI) / 180) + 20, 1));
    s.add(gutterAlong("y", -250, HY + 250, -300, EAVES - 300 * Math.tan((PITCH * Math.PI) / 180) + 20, -1));
    /* The front downpipe discharges onto the extension roof. */
    s.add(downpipe(HX + 360, HY - 600, EH + 20, EAVES - 300 * Math.tan((PITCH * Math.PI) / 180) - 90));
  });

  /* The extension. */
  const wing = s.with({ key: "construction", fit: true }, () =>
    s.box([HX, 0, GROUND], [EX1, HY, EH], "brick", { shadow: onGround }),
  );
  const wingMarks: Mark[] = [plinth(wingFront, HX, EX1), plinth(wingFlank, 0, BIFOLD.y0), plinth(wingFlank, BIFOLD.y1, HY)];
  const wingCills: Part[] = [];
  {
    const w = windowOn(wingFront, EXT_WIN.x0, EXT_WIN.x1, EXT_WIN.z0, EXT_WIN.z1, { lights: 3, transom: true });
    wingMarks.push(...w.marks);
    wingCills.push(...w.parts);
    wingMarks.push(...glazedDoorsOn(wingFlank, BIFOLD.y0, BIFOLD.y1, 0, BIFOLD.z1, 5));
    wingMarks.push({ type: "poly", pts: faceRect(wingFlank, BIFOLD.y0 - 150, BIFOLD.y1 + 150, BIFOLD.z1, BIFOLD.z1 + 160, 0.5), mat: "steel", stroke: true });
  }
  attach(wing, wingMarks);
  s.with({ key: "joinery" }, () => {
    for (const p of wingCills) s.add(p);
    /* Threshold for the bi-folds. */
    s.box([EX1, BIFOLD.y0, GROUND + 30], [EX1 + 120, BIFOLD.y1, 0], "frameDark");
  });

  s.with({ key: "roofing" }, () => {
    /* Flat roof: the deck inside a parapet with a coping, and a lantern. */
    const CP = EH + PARAPET - 60;
    s.box([HX, WALL, EH], [EX1 - WALL, HY - WALL, EH + 20], "membrane");
    s.box([HX, 0, EH], [EX1 - WALL, WALL, CP], "brick");
    s.box([EX1 - WALL, 0, EH], [EX1, HY, CP], "brick");
    s.box([HX, HY - WALL, EH], [EX1 - WALL, HY, CP], "brick");
    s.box([HX, -30, CP], [EX1 - WALL - 30, WALL + 30, EH + PARAPET], "coping");
    s.box([EX1 - WALL - 30, -30, CP], [EX1 + 30, HY + 30, EH + PARAPET], "coping");
    s.box([HX, HY - WALL - 30, CP], [EX1 - WALL - 30, HY + 30, EH + PARAPET], "coping");
    s.with({ late: true }, () => lantern(s, 8600, 10600, 2300, 5300, EH + 20));
    s.add(downpipe(EX1 + 60, HY - 250, GROUND, EH + 150));
  });
}

/** A hipped roof lantern on its upstand, ridge along y. */
function lantern(s: Scene, x0: number, x1: number, y0: number, y1: number, z: number) {
  const up = z + 250;
  const top = up + 700;
  const mx = (x0 + x1) / 2;
  const ins = (x1 - x0) / 2 - 80;
  const a = mx - 80;
  const b = mx + 80;
  const ya = y0 + ins;
  const yb = y1 - ins;
  const node = s.add([
    boxPart([x0, y0, z], [x1, y1, up], "membrane"),
    polyhedron(
      [
        [[x0, y0, up], [x1, y0, up], [x1, y1, up], [x0, y1, up]],
        [[x0, y0, up], [x1, y0, up], [b, ya, top], [a, ya, top]],
        [[x1, y0, up], [x1, y1, up], [b, yb, top], [b, ya, top]],
        [[x1, y1, up], [x0, y1, up], [a, yb, top], [b, yb, top]],
        [[x0, y1, up], [x0, y0, up], [a, ya, top], [a, yb, top]],
        [[a, ya, top], [b, ya, top], [b, yb, top], [a, yb, top]],
      ],
      (n) => (n[2] > 0.99 ? "frameDark" : "glass"),
    ),
  ]);
  /* Glazing bars down the long slope the camera sees. */
  const bars: Mark[] = [];
  for (let i = 1; i < 5; i++) {
    const y = y0 + ((y1 - y0) * i) / 5;
    const yt = ya + ((yb - ya) * i) / 5;
    bars.push({ type: "line", a: [x1, y, up + 1], b: [b, yt, top + 1], color: "#30363f", w: 1.6, opacity: 0.9 });
  }
  attach(node, bars);
}

/* ------------------------------------------------------------- interior */

/** Height the back and side walls are cut at, and the front ones. */
export const CUT_HIGH = 2650;
const CUT_LOW = 800;

function interior(s: Scene) {
  const floorRx = { x0: WALL, y0: WALL, x1: EX1 - WALL, y1: HY - WALL, z: 0 };
  const wallAll = { all: "plaster", top: "cut" } as const;
  const brickCut = { all: "brick", top: "cut" } as const;

  s.with({ key: "construction", fit: true }, () => {
    /* Slab and floor, through both rooms. */
    s.box([WALL, WALL, GROUND], [EX1 - WALL, HY - WALL, 0], { all: "concrete", top: "floor" });
    /* Back wall and the left-hand wall, cut at first floor. */
    const back = s.box([0, 0, GROUND], [EX1, WALL, CUT_HIGH], wallAll);
    s.box([0, WALL, GROUND], [WALL, HY - WALL, CUT_HIGH], wallAll);
    /* The extension's back wall carries the window over the sink. */
    attach(back, [
      { type: "poly", pts: faceRect({ axis: "y", at: WALL }, SINK_WIN.x0 - 60, SINK_WIN.x1 + 60, SINK_WIN.z0 - 50, SINK_WIN.z1 + 60, 0.3), mat: "paint" },
      ...windowOn({ axis: "y", at: WALL }, SINK_WIN.x0, SINK_WIN.x1, SINK_WIN.z0, SINK_WIN.z1, { lights: 2, cill: false, head: false, reveal: 140 }).marks,
      { type: "line", a: [WALL + 0.5, WALL, 0], b: [WALL + 0.5, WALL, CUT_HIGH], color: "#0d1220", w: 0.6, opacity: 0.25 },
    ]);
    s.box([SINK_WIN.x0 - 40, WALL, SINK_WIN.z0 - 40], [SINK_WIN.x1 + 40, WALL + 120, SINK_WIN.z0], "worktop");
    /* Front walls, cut low so the rooms show, broken at the front door. */
    s.box([0, HY - WALL, GROUND], [DOOR.x0, HY, CUT_LOW], brickCut);
    s.box([DOOR.x1, HY - WALL, GROUND], [EX1 - WALL, HY, CUT_LOW], brickCut);
    s.box([DOOR.x0, HY - WALL, GROUND], [DOOR.x1, HY, 0], { all: "stone", top: "oak" });
    /* The extension's side wall, broken for the bi-folds. */
    s.box([EX1 - WALL, WALL, GROUND], [EX1, BIFOLD.y0, CUT_LOW], brickCut);
    s.box([EX1 - WALL, BIFOLD.y1, GROUND], [EX1, HY, CUT_LOW], brickCut);
    s.box([EX1 - WALL, BIFOLD.y0, GROUND], [EX1, BIFOLD.y1, 0], "frameDark");
  });
  s.with({ key: "joinery" }, () => {
    s.box([DOOR.x0 - 50, HY, GROUND], [DOOR.x1 + 50, HY + 350, 0], "stone");
    s.box([EX1, BIFOLD.y0, GROUND + 30], [EX1 + 120, BIFOLD.y1, 0], "frameDark");
  });

  /* The wall between the house and the extension, opened up: piers, a steel
     on padstones, and the wall it carries. */
  s.with({ key: "construction" }, () => {
    const X0 = HX - WALL;
    const B0 = OPENING.y0 - 300;
    const B1 = OPENING.y1 + 300;
    const BZ = OPENING.z1;
    s.box([X0, WALL, 0], [HX, B0, CUT_HIGH], wallAll);
    s.box([X0, B0, 0], [HX, OPENING.y0, BZ - 150], wallAll);
    s.box([X0, OPENING.y1, 0], [HX, B1, BZ - 150], wallAll);
    s.box([X0, B1, 0], [HX, HY - WALL, CUT_HIGH], wallAll);
    s.box([X0, B0, BZ - 150], [HX, OPENING.y0, BZ], "concrete");
    s.box([X0, OPENING.y1, BZ - 150], [HX, B1, BZ], "concrete");
    s.box([X0 + 20, B0, BZ], [HX - 20, B1, BZ + 220], "steel");
    s.box([X0, B0, BZ + 220], [HX, B1, CUT_HIGH], wallAll);
    s.box([X0, OPENING.y0, 0], [HX, OPENING.y1, 1], "oakDark");
  });

  /* The stair, against the left-hand wall, climbing towards the back, and
     the first floor it arrives at. */
  s.with({ key: "joinery" }, () => {
    const st = stair(s, { x0: WALL, x1: WALL + 900, yStart: 6600, dir: -1, rise: CUT_HIGH, open: "x1", landing: false });
    const LY = st.top;
    const LX = WALL + 2000;
    s.box([WALL, WALL, CUT_HIGH - 250], [LX, LY, CUT_HIGH], { all: "cut", top: "floor" });
    /* Guarding along the landing's two open edges, with a newel at the
       corner. */
    const g: Part[] = [boxPart([LX - 60, WALL, CUT_HIGH], [LX - 20, LY - 90, CUT_HIGH + 50], "oak")];
    for (let y = WALL + 100; y < LY - 150; y += 110) g.push(boxPart([LX - 56, y, CUT_HIGH + 50], [LX - 24, y + 32, CUT_HIGH + 850], "paint"));
    g.push(boxPart([LX - 70, WALL, CUT_HIGH + 850], [LX - 10, LY - 90, CUT_HIGH + 910], "oak"));
    s.add(g);
    const g2: Part[] = [boxPart([WALL + 1020, LY - 60, CUT_HIGH], [LX - 90, LY - 20, CUT_HIGH + 50], "oak")];
    for (let x = WALL + 1100; x < LX - 130; x += 110) g2.push(boxPart([x, LY - 56, CUT_HIGH + 50], [x + 32, LY - 24, CUT_HIGH + 850], "paint"));
    g2.push(boxPart([WALL + 1020, LY - 70, CUT_HIGH + 850], [LX - 90, LY - 10, CUT_HIGH + 910], "oak"));
    g2.push(boxPart([LX - 90, LY - 90, CUT_HIGH], [LX, LY, CUT_HIGH + 1000], "oak"));
    s.add(g2);
  });

  /* The living room: chimney breast on the back wall with a stove in it,
     fitted alcove units either side, and the sofa facing the fire. */
  const BR0 = 2900;
  const BR1 = 4300;
  const BD = WALL + 450;
  s.with({ key: "construction" }, () => {
    const R0 = 3250;
    const R1 = 3950;
    const RD = BD - 380;
    const back = s.box([BR0, WALL, 0], [BR1, RD, CUT_HIGH], wallAll);
    attach(back, [{ type: "poly", pts: faceRect({ axis: "y", at: RD }, R0, R1, 0, 1000, 0.5), mat: "void" }]);
    s.box([BR0, RD, 0], [R0, BD, 1000], "plaster");
    s.box([R1, RD, 0], [BR1, BD, 1000], "plaster");
    s.box([BR0, RD, 1000], [BR1, BD, CUT_HIGH], wallAll);
    s.add(boxPart([R0, RD, 0], [R1, BD, 2], "hearth"), { layer: 1 });
    s.box([BR0 + 50, BD, 0], [BR1 - 50, BD + 450, 40], "hearth");
    const stove = s.add([
      boxPart([3390, RD + 40, 2], [3810, RD + 340, 70], "black"),
      boxPart([3370, RD + 30, 70], [3830, RD + 350, 600], "black"),
      cylPart(3600, RD + 140, 65, 600, 1000, "black", 10),
    ]);
    attach(stove, [
      { type: "poly", pts: faceRect({ axis: "y", at: RD + 350 }, 3430, 3770, 160, 520, 1), mat: "void" },
      { type: "poly", pts: faceRect({ axis: "y", at: RD + 350 }, 3460, 3740, 190, 400, 1.5), mat: "fire" },
    ]);
    s.box([BR0 - 40, BD, 1080], [BR1 + 40, BD + 160, 1140], "oak");
  });
  s.with({ key: "joinery" }, () => {
    for (const [a, b] of [
      [WALL + 2000, BR0],
      [BR1, HX - WALL - 200],
    ] as const) {
      const D = 400;
      const base = s.box([a, WALL, 0], [b, WALL + D, 850], "paint");
      const f: WallFace = { axis: "y", at: WALL + D };
      const n = Math.max(1, Math.round((b - a) / 600));
      const each = (b - a) / n;
      const m: Mark[] = [{ type: "poly", pts: faceRect(f, a, b, 0, 90, 0.6), mat: "shadeSoft" }];
      for (let i = 0; i < n; i++) {
        const d0 = a + i * each;
        m.push({ type: "poly", pts: faceRect(f, d0 + 70, d0 + each - 70, 220, 780, 0.6), mat: "shadeSoft" });
        if (i) m.push({ type: "line", a: [d0, WALL + D + 0.5, 90], b: [d0, WALL + D + 0.5, 848], color: "#0d1220", w: 0.8, opacity: 0.6 });
        const hx = i % 2 ? d0 + 60 : d0 + each - 60;
        m.push({ type: "line", a: [hx, WALL + D + 2, 600], b: [hx, WALL + D + 2, 740], color: "#e2b04f", w: 1.3, opacity: 1 });
      }
      attach(base, m);
      s.box([a, WALL, 850], [b, WALL + D + 20, 890], "oak");
      for (const z of [1350, 1800, 2250]) {
        s.box([a, WALL, z], [b, WALL + 300, z + 32], "oak");
        const run = books({ axis: "y", at: WALL }, a + 60, b - 60, z + 32, 280, 330, Math.round(a / 9 + z / 4));
        if (run.length) s.add(run);
      }
    }
  });
  s.with({}, () => {
    s.add(boxPart([2300, 1900, 0], [4900, 4300, 8], "rug"), { layer: 2 });
    coffeeTable(s, 3050, 2500, 1100, 550, 8, undefined, floorRx);
    sofa(s, 2550, 3650, 2100, 0, undefined, floorRx);
    plant(s, 1900, 7050, 0, 1100, undefined, floorRx);
  });

  /* The kitchen, along the extension's back wall, and the island. */
  s.with({ key: "joinery" }, () => {
    const k = kitchenRun(s, {
      x0: HX,
      wallY: WALL,
      units: [
        { w: 600, kind: "oven" },
        { w: 650, kind: "drawers" },
        { w: 1000, kind: "sink" },
        { w: 600, kind: "door" },
        { w: 600, kind: "hob" },
        { w: 1050, kind: "doors" },
      ],
      wallUnits: [
        { x0: HX, x1: 8300 },
        { x0: 10700, x1: EX1 - WALL },
      ],
    });
    void k;
    void splashback;
    s.add([
      obox([10075, WALL, 1650], [550, 0, 0], [0, 480, 0], [0, 0, 120], "steelBright"),
      boxPart([10250, WALL, 1770], [10450, WALL + 250, CUT_HIGH], "steelBright"),
    ]);
    island(s, 8350, 10650, 2150, { seats: 3, receiver: floorRx });
  });
  /* The table by the bi-folds. */
  s.with({}, () => {
    const t0 = { x0: 8700, x1: 10700, y0: 5100, y1: 6100 };
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
    for (const x of [9050, 9950]) {
      chair(s, x, t0.y0 - 520, "back-far", floorRx);
      chair(s, x, t0.y1 + 70, "back-near", floorRx);
    }
  });
}

/** A dining chair, 450 square, seat at 450, back to 900. */
function chair(s: Scene, x: number, y: number, back: "back-far" | "back-near", rx: { x0: number; y0: number; x1: number; y1: number; z: number }) {
  const W = 450;
  const legs = (yy: number) => [
    boxPart([x, yy, 0], [x + 40, yy + 40, 450], "oakDark"),
    boxPart([x + W - 40, yy, 0], [x + W, yy + 40, 450], "oakDark"),
  ];
  const seat = boxPart([x, y, 450], [x + W, y + W, 490], "oak");
  if (back === "back-far") {
    return s.add([...legs(y), boxPart([x, y, 490], [x + W, y + 40, 900], "oakDark"), ...legs(y + W - 40), seat], { shadow: rx });
  }
  return s.add([...legs(y), ...legs(y + W - 40), seat, boxPart([x, y + W - 40, 490], [x + W, y + W, 900], "oakDark")], { shadow: rx });
}

/* ------------------------------------------------------------------ build */

export function buildHero() {
  const back = new Scene();
  siteBack(back);
  const ext = new Scene();
  exterior(ext);
  const int = new Scene();
  interior(int);
  const front = new Scene();
  siteFront(front);
  return { back, ext, int, front };
}

/** The numbered markers on the cutaway, at points in the model. */
export const CALLOUTS: { n: string; at: V3; title: string; body: string }[] = [
  { n: "01", at: [WALL + 960, 5000, 1700], title: "Staircase", body: "Treads, risers and balustrade made and fitted as one." },
  { n: "02", at: [5500, WALL + 150, 2100], title: "Built-in units", body: "Shelving and storage fitted around the chimney breast." },
  { n: "03", at: [HX - 150, 3800, OPENING.z1 + 110], title: "Opening through", body: "Formed, lintelled and made good by the same firm." },
  { n: "04", at: [11100, WALL + 170, 1800], title: "Fitted kitchen", body: "Units made to the room, not the catalogue." },
  { n: "05", at: [9500, 2600, 950], title: "Island and worktops", body: "Drawn with the structure, so services land right." },
  { n: "06", at: [EX1 - 150, 6900, CUT_LOW], title: "The extension", body: "Structure, roof and glazing by the same firm." },
];

/** Outlines of what the cutaway removed, drawn dashed over it. */
export const GHOSTS: V3[][] = (() => {
  const tan = Math.tan((PITCH * Math.PI) / 180);
  const ez = EAVES - 300 * tan + 160 / Math.cos((PITCH * Math.PI) / 180);
  const mx = HX / 2;
  return [
    [
      [-300, -250, ez],
      [-300, HY + 250, ez],
      [mx, HY + 250, RIDGE_TOP],
      [HX + 300, HY + 250, ez],
      [HX + 300, -250, ez],
    ],
    [
      [mx, HY + 250, RIDGE_TOP],
      [mx, -250, RIDGE_TOP],
    ],
    [
      [HX + 300, HY + 30, EH + PARAPET],
      [EX1 + 30, HY + 30, EH + PARAPET],
      [EX1 + 30, -30, EH + PARAPET],
    ],
  ];
})();

/* Used by the shadows of things standing on the floor. */
export { blob };
