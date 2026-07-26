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
   A window in its opening, with one casement swung out. The open sash is the
   whole point: it says the thing was made to work, rather than to look like a
   window in an elevation. */
function joinery(): Detail {
  const FACE = 122.4;
  const parts: Part[] = [];

  /* The masonry it sits in. Courses only where there is brick to course - a
     line across the glass is a line that says nobody looked. */
  parts.push(...box("wall", 0, 96, 200, 26, 0, 200, shade(MATERIALS.brick, -0.06)));
  for (let i = 1; i <= 5; i++) {
    const z = i * 32;
    if (z > 34 && z < 176) {
      parts.push(
        edge(`course-l-${i}`, [0, FACE, z], [22, FACE, z]),
        edge(`course-r-${i}`, [178, FACE, z], [200, FACE, z]),
      );
    } else {
      parts.push(edge(`course-${i}`, [0, FACE, z], [200, FACE, z]));
    }
  }

  /* Frame, fixed light, and the void the casement has swung out of. */
  parts.push(...box("frame", 24, 94, 152, 30, 40, 128, MATERIALS.timber, true));
  parts.push(
    facet(
      "glass-fixed",
      [
        [38, FACE + 2, 54],
        [96, FACE + 2, 54],
        [96, FACE + 2, 154],
        [38, FACE + 2, 154],
      ],
      MATERIALS.glass,
    ),
    facet(
      "void",
      [
        [104, FACE + 2, 54],
        [162, FACE + 2, 54],
        [162, FACE + 2, 154],
        [104, FACE + 2, 154],
      ],
      "#111827",
    ),
  );
  parts.push(...box("cill", 14, 88, 172, 42, 28, 12, MATERIALS.stone));

  /* The casement itself, swung out so it leaves the wall plane and reads as a
     moving part. Top hung, and that is a projection decision rather than a
     joinery one: a side-hung sash sweeps between two screen directions that
     are 60 degrees apart, and passes through vertical on the way - which is
     exactly parallel to the sash's own height, so the panel goes edge-on and
     collapses to a line. Swung about the head instead, the two axes stay well
     apart at every angle.

     Drawn as a stile frame with the glass inset, because a bare pane hanging
     in front of a wall reads as a mistake rather than as an opening window. */
  const HEAD = 154;
  const LEAF = 100;
  const OPEN = (35 * Math.PI) / 180;
  /** A point down the swung leaf: t = 0 at the hinge, 1 at the bottom rail. */
  const leaf = (t: number): [number, number] => [
    FACE + 2 + t * LEAF * Math.sin(OPEN),
    HEAD - t * LEAF * Math.cos(OPEN),
  ];
  const [by, bz] = leaf(1);
  const [gy0, gz0] = leaf(0.09);
  const [gy1, gz1] = leaf(0.91);

  parts.push(
    facet(
      "sash",
      [
        [104, FACE + 2, HEAD],
        [162, FACE + 2, HEAD],
        [162, by, bz],
        [104, by, bz],
      ],
      shade(MATERIALS.timber, -0.12),
      { key: true },
    ),
    facet(
      "sash-glass",
      [
        [112, gy0, gz0],
        [154, gy0, gz0],
        [154, gy1, gz1],
        [112, gy1, gz1],
      ],
      MATERIALS.glass,
    ),
    /* Stay on the bottom rail, which is the detail that names the thing. */
    edge("stay", [128, by, bz], [138, by, bz], { key: true, w: 3 }),
  );

  return {
    caption: "Detail 02 / casement, reveal and cill",
    alt: "Isometric detail of a timber window in a masonry opening, with a stone cill and one casement swung open on its hinge.",
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
