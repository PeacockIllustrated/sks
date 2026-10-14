import {
  DETAIL,
  INK,
  INK_SOFT,
  MATERIALS,
  boxFaces,
  iso,
  points,
  shade,
  type Point3,
} from "@/lib/iso";
import type { DivisionSlug, FeatureDrawing } from "@/lib/site";

/* ===========================================================================
   One isometric detail per division, for the empty half of a division page's
   hero band.

   Drawn on the same camera as the home page hero and the project builder, so
   these read as further sheets from the same set rather than as clip art. They
   are deliberately details rather than whole buildings: the home page already
   draws a house, and what a division page has to answer is "what do you
   actually do", which a construction detail says faster than a house does.

   Static. The hero morph earns its animation by being the first thing anyone
   sees; a decoration in the corner of a subpage does not, and a subpage that
   animates every time you navigate to it gets tiring by the third visit.

   Everything is opaque and lives in ONE ordered list. SVG has no depth buffer,
   so document order is depth order - which means faces and lines have to
   interleave. Holding them in separate arrays drew every brick course over the
   window frame in front of it.
   =========================================================================== */

type Facet = {
  kind: "facet";
  id: string;
  pts: Point3[];
  fill: string;
  /** Picked out in gold: the bit of the detail the division is named for. */
  key?: boolean;
  /** Flat surfaces take no outline. */
  soft?: boolean;
};

type Edge = {
  kind: "edge";
  id: string;
  a: Point3;
  b: Point3;
  key?: boolean;
  w?: number;
};

type Part = Facet | Edge;

type Detail = {
  caption: string;
  alt: string;
  parts: Part[];
};

function facet(
  id: string,
  pts: Point3[],
  fill: string,
  opts?: { key?: boolean; soft?: boolean },
): Facet {
  return { kind: "facet", id, pts, fill, ...opts };
}

function edge(
  id: string,
  a: Point3,
  b: Point3,
  opts?: { key?: boolean; w?: number },
): Edge {
  return { kind: "edge", id, a, b, ...opts };
}

/** A cuboid's three visible faces, back to front. */
function box(
  id: string,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  h: number,
  hex: string,
  key?: boolean,
): Part[] {
  const f = boxFaces(x, y, w, d, z0, h);
  return [
    facet(`${id}-f`, f.front, shade(hex, -0.1), { key }),
    facet(`${id}-s`, f.side, shade(hex, -0.3), { key }),
    facet(`${id}-t`, f.top, shade(hex, 0.12), { key }),
  ];
}

/**
 * Square viewBox around whatever the model turned out to be.
 *
 * Derived rather than written down. Hand-kept bounds are wrong the moment
 * anyone moves a chimney, and the failure is silent until you look: the
 * drawing simply loses an edge off the side of the frame. Square, and sized
 * the same way for all three, so a reader moving between the division pages
 * does not meet a drawing that has changed scale.
 */
function fit(parts: Part[]): string {
  const pts = parts
    .flatMap((p) => (p.kind === "facet" ? p.pts : [p.a, p.b]))
    .map((p) => iso(p[0], p[1], p[2]));

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const size =
    Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...ys) - Math.min(...ys),
    ) + 24;

  const round = (v: number) => v.toFixed(1);
  return `${round(cx - size / 2)} ${round(cy - size / 2)} ${round(size)} ${round(size)}`;
}

/* ---------------------------------------------------------------- roofing --
   A cut through a pitched roof at the stack: the two slopes, courses up the
   near one, the flashing where lead meets brick, and the gutter. Every one of
   those is a line item on the roofing page, and the flashing is the one that
   leaks when somebody else does it. */
function roofing(): Detail {
  const EAVE = 84;
  const RIDGE = 168;
  const parts: Part[] = [];

  /* The walls the roof sits on, so it is not hovering. */
  parts.push(
    facet(
      "gable",
      [
        [0, 176, 0],
        [192, 176, 0],
        [192, 176, EAVE],
        [96, 176, RIDGE],
        [0, 176, EAVE],
      ],
      shade(MATERIALS.brick, -0.16),
    ),
    facet(
      "flank",
      [
        [192, 0, 0],
        [192, 176, 0],
        [192, 176, EAVE],
        [192, 0, EAVE],
      ],
      shade(MATERIALS.brick, -0.34),
    ),
  );

  parts.push(
    facet(
      "slope-far",
      [
        [0, 0, EAVE],
        [0, 176, EAVE],
        [96, 176, RIDGE],
        [96, 0, RIDGE],
      ],
      shade(MATERIALS.slate, -0.26),
      { key: true },
    ),
    facet(
      "slope-near",
      [
        [192, 0, EAVE],
        [192, 176, EAVE],
        [96, 176, RIDGE],
        [96, 0, RIDGE],
      ],
      shade(MATERIALS.slate, 0.06),
      { key: true },
    ),
  );

  /* Courses up the near slope, then the ridge over them. */
  for (let i = 1; i <= 4; i++) {
    const u = i / 5;
    parts.push(
      edge(
        `course-${i}`,
        [192 - u * 96, 0, EAVE + u * 84 + 0.4],
        [192 - u * 96, 176, EAVE + u * 84 + 0.4],
      ),
    );
  }
  parts.push(
    edge("ridge", [96, 0, RIDGE], [96, 176, RIDGE], { key: true, w: 2 }),
  );

  /* Stack, with lead soakers where it passes through the slope. */
  const stackX = 118;
  const roofZ = EAVE + ((192 - stackX - 18) / 96) * 84;
  parts.push(
    ...box("flash", stackX - 7, 55, 50, 50, roofZ - 4, 9, shade(MATERIALS.slate, 0.34), true),
    ...box("stack", stackX, 62, 36, 36, roofZ, 74, shade(MATERIALS.brick, -0.04)),
    ...box("stack-cap", stackX - 4, 58, 44, 44, roofZ + 74, 9, MATERIALS.stone),
  );

  /* Gutter, and the head of the downpipe off it. */
  parts.push(
    ...box("gutter", 192, 0, 12, 176, EAVE - 11, 11, shade(MATERIALS.slate, 0.14), true),
    ...box("pipe", 194, 150, 9, 9, 0, EAVE - 11, shade(MATERIALS.slate, 0.14), true),
  );

  return {
    caption: "Detail 03 / verge, flashing and eaves",
    alt: "Isometric detail of a pitched roof: two slopes meeting at a ridge, tile courses, lead flashing around a chimney stack, and the gutter at the eaves.",
    parts,
  };
}

/* ---------------------------------------------------------------- joinery --
   A fitted unit in a room: cupboards below, one with its door swung open, and
   open shelving above with books on it. The open door is the point. It says the
   thing was made to work, and that it was made for this wall rather than bought
   to stand against it.

   The door is hung at 70 degrees rather than 90. A leaf at a right angle to the
   wall lies in the one plane the camera sees edge-on for the carcass's side
   face, so it reads as a flat sliver stuck to the unit instead of as a door. */
function joinery(): Detail {
  const FACE = 96.4;
  const parts: Part[] = [];

  parts.push(...box("floor", 0, 56, 224, 124, -8, 8, MATERIALS.timber));
  for (let y = 80; y < 180; y += 20) {
    parts.push(edge(`board-${y}`, [0, y, 0.4], [224, y, 0.4]));
  }
  parts.push(...box("wall", 0, 46, 224, 10, 0, 196, MATERIALS.render));
  parts.push(edge("skirting", [0, 56.4, 9], [224, 56.4, 9]));

  /* The carcass, picked out in gold: it is what the division makes. */
  parts.push(...box("unit", 24, 56, 176, 40, 0, 182, MATERIALS.timber, true));

  const face = (
    id: string,
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    fill: string,
    y = FACE + 0.2,
  ) =>
    facet(
      id,
      [
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1],
      ],
      fill,
    );

  /* Below: a closed door on the left, an open bay on the right. */
  parts.push(
    face("door-closed", 30, 108, 6, 76, shade(MATERIALS.timber, -0.18)),
    face("bay", 114, 194, 6, 76, "#1b1f2c"),
    edge("bay-shelf", [114, FACE + 0.6, 40], [194, FACE + 0.6, 40], { w: 2.4 }),
    edge("handle", [92, FACE + 0.8, 56], [92, FACE + 0.8, 68], { key: true, w: 2.6 }),
  );

  /* The open door, hinged on the right-hand edge of its bay. */
  const OPEN = (70 * Math.PI) / 180;
  const LEAF = 80;
  const hx = 194;
  const lx = hx - LEAF * Math.cos(OPEN);
  const ly = FACE + 0.4 + LEAF * Math.sin(OPEN);
  parts.push(
    facet(
      "door-open",
      [
        [hx, FACE + 0.4, 6],
        [lx, ly, 6],
        [lx, ly, 76],
        [hx, FACE + 0.4, 76],
      ],
      shade(MATERIALS.timber, -0.05),
      { key: true },
    ),
  );

  /* Above: three shelves and the books on them. Without the books it is a grey
     recess with lines in it. With them it is somebody's wall. */
  const BOOKS = ["#c8973e", "#8d3f3f", "#7f9bd4", "#b4ad9f", "#3f6a58", "#8d5f4a"];
  const BAYS: [number, number][] = [
    [84, 112],
    [118, 146],
    [152, 176],
  ];
  BAYS.forEach(([z0, z1], bay) => {
    parts.push(face(`recess-${bay}`, 30, 194, z0, z1, "#1b1f2c"));
    parts.push(
      edge(`shelf-${bay}`, [30, FACE + 0.5, z0], [194, FACE + 0.5, z0], { w: 2.6 }),
    );
    let x = 36;
    let i = bay * 4;
    while (x < 186) {
      const w = 5 + ((i * 7) % 5);
      const h = (z1 - z0) * (0.55 + ((i * 11) % 4) / 10);
      if (i % 6 !== 5) {
        parts.push(
          face(`book-${bay}-${i}`, x, x + w, z0 + 0.6, z0 + h, BOOKS[i % BOOKS.length], FACE + 0.9),
        );
      } else {
        x += 10;
      }
      x += w + 1.2;
      i++;
    }
  });

  return {
    caption: "Detail 02 / fitted unit and shelving",
    alt: "Isometric detail of a timber fitted unit against a wall: shelving filled with books above, a closed cupboard door and an open cupboard bay with its door swung out below.",
    parts,
  };
}

/* ----------------------------------------------------------- construction --
   A corner going up: strip footing under the ground line, wall over, one run
   higher than the other, and a lintel across an opening. A drawing of work in
   progress rather than of a finished object, which is the division's actual
   product. */
function construction(): Detail {
  const FACE = 196.4;
  const parts: Part[] = [];

  /* Ground, as an apron hugging the corner rather than a full plot. A square
     of ground wide enough to look like a site is several times the width of
     the detail, and the frame is sized from the model, so the wall would end
     up a small object in the middle of a field. */
  parts.push(
    facet(
      "ground",
      [
        [-30, 130, 0],
        [214, 130, 0],
        [214, 224, 0],
        [-30, 224, 0],
      ],
      MATERIALS.ground,
      { soft: true },
    ),
    facet(
      "ground-return",
      [
        [188, -26, 0],
        [214, -26, 0],
        [214, 130, 0],
        [188, 130, 0],
      ],
      MATERIALS.ground,
      { soft: true },
    ),
  );

  /* Footing, below the ground line. */
  parts.push(
    ...box("footing-return", 140, -14, 60, 176, -34, 30, shade(MATERIALS.stone, -0.42), true),
    ...box("footing", -14, 148, 214, 60, -34, 30, shade(MATERIALS.stone, -0.42), true),
  );

  /* The return wall, then the front run - built to a different height,
     because a corner goes up in lifts and a wall drawn at one uniform height
     is a wall nobody built. */
  parts.push(...box("wall-return", 152, 0, 36, 160, 0, 132, MATERIALS.brick));
  parts.push(...box("wall-front", 0, 160, 188, 36, 0, 164, MATERIALS.brick));

  /* Opening, its lintel, then the courses either side of it. */
  parts.push(
    facet(
      "opening",
      [
        [42, FACE, 34],
        [110, FACE, 34],
        [110, FACE, 126],
        [42, FACE, 126],
      ],
      "#111827",
    ),
  );
  parts.push(...box("lintel", 30, 158, 92, 40, 126, 16, shade(MATERIALS.slate, 0.1), true));
  for (let i = 1; i <= 4; i++) {
    const z = i * 33;
    if (z > 30 && z < 130) {
      parts.push(
        edge(`course-l-${i}`, [0, FACE, z], [40, FACE, z]),
        edge(`course-r-${i}`, [112, FACE, z], [188, FACE, z]),
      );
    } else {
      parts.push(edge(`course-${i}`, [0, FACE, z], [188, FACE, z]));
    }
  }

  return {
    caption: "Detail 01 / footing, cavity wall and lintel",
    alt: "Isometric detail of a masonry corner under construction: strip footing below ground, two wall runs at different heights, and a lintel over an opening.",
    parts,
  };
}

const DETAILS: Record<DivisionSlug, () => Detail> = {
  construction,
  joinery,
  roofing,
};

/* ===========================================================================
   Interior details.

   The same pieces of work the hero's cutaway points at, each drawn on its own:
   a stair, a fitted kitchen, an opening knocked through, a door and its second
   fix, an extension. Drawn by the same rules as the division details above, so
   they read as further sheets from the same set.
   =========================================================================== */

const WALL = "#d9d0bf";
const UNIT = "#43566f";

/** A rectangle on a constant-y face, for door and drawer fronts. */
function frontFacet(
  id: string,
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
  fill: string,
  opts?: { key?: boolean; soft?: boolean },
): Facet {
  return facet(
    id,
    [
      [x0, y, z0],
      [x1, y, z0],
      [x1, y, z1],
      [x0, y, z1],
    ],
    fill,
    opts,
  );
}

/* A closed-string stair rising to the back wall, with a balustrade and a brass
   handrail on the open side. */
function stair(): Detail {
  const parts: Part[] = [];
  parts.push(...box("floor", 0, -10, 140, 140, -8, 8, MATERIALS.timber));
  parts.push(...box("wall", 0, -20, 140, 10, 0, 150, WALL));
  parts.push(...box("landing", 30, -10, 54, 16, 0, 120, shade(MATERIALS.timber, 0.04), true));
  for (let i = 0; i < 12; i++) {
    parts.push(...box(`step-${i}`, 30, 6 + i * 10, 54, 10, 0, 120 - i * 10, MATERIALS.timber, true));
  }
  for (let i = 0; i < 12; i++) {
    const h = 120 - i * 10;
    parts.push(edge(`baluster-${i}`, [86, 11 + i * 10, h], [86, 11 + i * 10, h + 32]));
  }
  parts.push(edge("rail", [86, 11, 152], [86, 121, 42], { key: true, w: 2.6 }));
  parts.push(...box("newel", 83, 116, 6, 6, 0, 46, MATERIALS.timber, true));
  return {
    caption: "Staircase",
    alt: "Isometric detail of a timber staircase rising to a landing, with balusters and a brass handrail on the open side.",
    parts,
  };
}

/* A kitchen run along the wall with wall cabinets over, and an island in front
   of it with its stools. */
function kitchen(): Detail {
  const parts: Part[] = [];
  parts.push(...box("floor", -10, -10, 210, 170, -8, 8, MATERIALS.timber));
  parts.push(...box("wall", -10, -20, 210, 10, 0, 140, WALL));
  parts.push(frontFacet("splash", 4, 190, -9.6, 39.5, 80, shade(MATERIALS.stone, 0.1)));
  for (let i = 0; i < 4; i++) {
    const x = 4 + i * 46;
    parts.push(...box(`base-${i}`, x, -10, 46, 32, 0, 36, UNIT, true));
    parts.push(edge(`base-handle-${i}`, [x + 10, 22.6, 28], [x + 22, 22.6, 28], { key: true, w: 2.2 }));
  }
  parts.push(...box("worktop", 0, -10, 194, 35, 36, 4, MATERIALS.stone));
  ([4, 144] as const).forEach((x, i) => {
    parts.push(...box(`wall-unit-${i}`, x, -10, 46, 18, 84, 40, UNIT, true));
  });
  parts.push(...box("island", 46, 74, 104, 42, 0, 38, shade(MATERIALS.timber, -0.05), true));
  [78, 112].forEach((x, i) => {
    parts.push(edge(`island-seam-${i}`, [x, 116.4, 4], [x, 116.4, 34]));
  });
  parts.push(...box("island-top", 40, 70, 116, 50, 38, 4, MATERIALS.stone));
  [70, 98, 126].forEach((x, i) => {
    parts.push(...box(`stool-leg-${i}`, x - 2, 132, 4, 4, 0, 24, "#2a3142"));
    parts.push(...box(`stool-${i}`, x - 8, 126, 16, 16, 24, 4, MATERIALS.timber));
  });
  return {
    caption: "Fitted kitchen",
    alt: "Isometric detail of a fitted kitchen: base units, worktop and wall cabinets along the wall, with a timber island and three stools in front.",
    parts,
  };
}

/* A wall opened up: two piers, a steel across the gap, and the floor running
   straight through. */
function opening(): Detail {
  const parts: Part[] = [];
  parts.push(...box("floor", -20, -70, 240, 170, -8, 8, MATERIALS.timber));
  parts.push(...box("pier-l", 0, 0, 44, 14, 0, 130, WALL));
  parts.push(...box("over", 44, 0, 112, 14, 112, 18, WALL));
  parts.push(...box("steel", 44, 0, 112, 14, 100, 12, "#2a3142", true));
  parts.push(...box("pier-r", 156, 0, 44, 14, 0, 130, WALL));
  parts.push(edge("pad-l", [40, 14.5, 96], [48, 14.5, 96], { key: true, w: 2 }));
  parts.push(edge("pad-r", [152, 14.5, 96], [160, 14.5, 96], { key: true, w: 2 }));
  return {
    caption: "Opening up",
    alt: "Isometric detail of a wall with a wide opening knocked through it, carried on a steel beam over two brick piers, with the floor running through.",
    parts,
  };
}

/* An internal door in its lining, part open, with architrave and skirting. */
function door(): Detail {
  const FACE = 14.4;
  const parts: Part[] = [];
  parts.push(...box("floor", -10, 0, 200, 110, -8, 8, MATERIALS.timber));
  parts.push(...box("wall-l", 0, 0, 62, 14, 0, 140, WALL));
  parts.push(...box("wall-over", 62, 0, 58, 14, 108, 32, WALL));
  parts.push(...box("wall-r", 120, 0, 60, 14, 0, 140, WALL));
  parts.push(frontFacet("void", 62, 120, 7, 0, 108, "#1b1f2c"));
  /* Architrave, picked out: it is the joinery the room is finished with. */
  parts.push(...box("arch-l", 54, 14, 8, 2, 0, 116, MATERIALS.timber, true));
  parts.push(...box("arch-head", 54, 14, 74, 2, 108, 8, MATERIALS.timber, true));
  parts.push(...box("arch-r", 120, 14, 8, 2, 0, 116, MATERIALS.timber, true));
  parts.push(...box("skirt-l", 0, 14, 54, 2, 0, 10, MATERIALS.timber, true));
  parts.push(...box("skirt-r", 128, 14, 52, 2, 0, 10, MATERIALS.timber, true));
  /* The leaf, hung on the left and swung in towards the room. */
  const OPEN = (75 * Math.PI) / 180;
  const LEAF = 56;
  const lx = 64 + LEAF * Math.cos(OPEN);
  const ly = FACE + LEAF * Math.sin(OPEN);
  parts.push(
    facet(
      "leaf",
      [
        [64, FACE, 1],
        [lx, ly, 1],
        [lx, ly, 106],
        [64, FACE, 106],
      ],
      shade(MATERIALS.timber, -0.08),
      { key: true },
    ),
  );
  const at = (t: number, z: number): Point3 => [
    64 + (lx - 64) * t,
    FACE + (ly - FACE) * t,
    z,
  ];
  parts.push(edge("panel-1", at(0.2, 14), at(0.8, 14)));
  parts.push(edge("panel-2", at(0.2, 58), at(0.8, 58)));
  parts.push(edge("panel-3", at(0.2, 94), at(0.8, 94)));
  parts.push(edge("handle", at(0.86, 52), at(0.86, 60), { key: true, w: 2.6 }));
  return {
    caption: "Doors and second fix",
    alt: "Isometric detail of a panelled internal door standing part open in its lining, with timber architrave and skirting.",
    parts,
  };
}

/* A single-storey extension off the back of a house, with its flat roof,
   lantern and glazing. */
function extensionDetail(): Detail {
  const FACE = 170.6;
  const parts: Part[] = [];
  parts.push(...box("ground", -20, -10, 200, 200, -6, 6, MATERIALS.ground));
  parts.push(...box("house", 0, 0, 160, 80, 0, 180, shade(MATERIALS.brick, -0.25)));
  parts.push(...box("ext", 0, 80, 160, 90, 0, 92, MATERIALS.brick, true));
  parts.push(...box("ext-trim", -4, 80, 168, 94, 92, 7, shade(MATERIALS.slate, 0.08)));
  parts.push(...box("lantern", 52, 104, 56, 40, 99, 20, MATERIALS.glass, true));
  parts.push(frontFacet("glass", 18, 128, FACE, 10, 76, MATERIALS.glass));
  [55, 92].forEach((x, i) => {
    parts.push(edge(`mullion-${i}`, [x, FACE + 0.4, 10], [x, FACE + 0.4, 76], { key: true, w: 1.6 }));
  });
  parts.push(
    facet(
      "side-glass",
      [
        [160.6, 104, 34],
        [160.6, 150, 34],
        [160.6, 150, 76],
        [160.6, 104, 76],
      ],
      MATERIALS.glass,
    ),
  );
  return {
    caption: "Extension",
    alt: "Isometric detail of a single-storey brick extension off the back of a house, with glazed doors, a side window, a flat roof and a roof lantern.",
    parts,
  };
}

const FEATURES: Record<FeatureDrawing, () => Detail> = {
  stair,
  unit: joinery,
  kitchen,
  opening,
  door,
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
      <DetailSvg detail={detail} className="w-full" />
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
  return <DetailSvg detail={FEATURES[id]()} className={className} />;
}

function DetailSvg({
  detail,
  className,
}: {
  detail: Detail;
  className?: string;
}) {
  return (
    <svg
      viewBox={fit(detail.parts)}
      className={className}
      role="img"
      aria-label={detail.alt}
    >
      {detail.parts.map((p) => {
        if (p.kind === "facet") {
          return (
            <polygon
              key={p.id}
              points={points(p.pts)}
              fill={p.fill}
              fillOpacity="0.95"
              stroke={p.soft ? "none" : p.key ? DETAIL : INK}
              strokeWidth={p.key ? 1.5 : 1}
              strokeOpacity={p.key ? 0.95 : 0.6}
              strokeLinejoin="round"
            />
          );
        }
        const [x1, y1] = iso(...p.a);
        const [x2, y2] = iso(...p.b);
        return (
          <line
            key={p.id}
            x1={x1.toFixed(1)}
            y1={y1.toFixed(1)}
            x2={x2.toFixed(1)}
            y2={y2.toFixed(1)}
            stroke={p.key ? DETAIL : INK_SOFT}
            strokeWidth={p.w ?? 1}
            strokeOpacity={p.key ? 0.95 : 0.7}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
