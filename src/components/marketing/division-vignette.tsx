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
import type { DivisionSlug } from "@/lib/site";

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
      <svg
        viewBox={fit(detail.parts)}
        className="w-full"
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
    </figure>
  );
}
