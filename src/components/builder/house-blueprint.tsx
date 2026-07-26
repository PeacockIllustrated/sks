import {
  DETAIL,
  INK,
  INK_SOFT,
  MATERIALS,
  boxFaces,
  facePanel,
  iso,
  points,
  shade,
  sidePanel,
  type Point3,
} from "@/lib/iso";
import { STOREYS, type House, type ScopeKey } from "./house-config";

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

/** Model extents, worst case, mapped into the viewBox.
 *
 *  Fixed rather than fitted to the current selection: a drawing that rescales
 *  when you tick a box makes the change hard to read, which is the one thing
 *  this drawing exists to do. A bungalow just sits lower in the frame. */
const FIT = "translate(97,51) scale(0.88)";

/** The house footprint. Street side at y = 0, garden side at y = DEPTH. */
const W = 300;
const DEPTH = 190;

/** How far an extension projects into the garden.
 *
 *  Named because two places need it: the extension's own footprint, and the
 *  building line that every ground-level element sets out from. Holding it as a
 *  literal in both is what let the patio and gully drift away from the wall
 *  they are supposed to address - the exact bug the building line was
 *  introduced to fix, waiting to happen again on the next edit. */
const EXT_DEPTH = 130;

type Face = {
  id: string;
  pts: Point3[];
  /** Material colour, used when the part is in scope. */
  fill: string;
  /**
   * Undefined for context: the plot, the garden, the neighbours, the walls.
   *
   * A list where an element genuinely belongs to more than one trade - the
   * extension's bi-folds are new building *and* joinery, so they light under
   * either. That overlap is the argument the whole page makes, so the drawing
   * should not have to pick one.
   */
  scope?: ScopeKey | ScopeKey[];
  /** Flat ground surfaces take no stroke; an outlined lawn looks like lino. */
  soft?: boolean;
  /**
   * Setting rather than subject: the plot, the lawn, the boundary.
   *
   * These keep their own material colour even when nothing is selected, because
   * they are never "work" and so can never be lit. Buildings do the opposite -
   * out of scope they recede to a flat massing colour, which is what makes the
   * lit parts read. Treating both the same is what made the garden invisible.
   */
  ambient?: boolean;
};

type Rule = {
  id: string;
  a: Point3;
  b: Point3;
  scope?: ScopeKey | ScopeKey[];
  colour?: string;
};

/** Push a cuboid's three visible faces, back to front. */
function pushBox(
  out: Face[],
  id: string,
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  h: number,
  hex: string,
  scope?: ScopeKey | ScopeKey[],
) {
  const f = boxFaces(x, y, w, d, z0, h);
  out.push({ id: `${id}-front`, pts: f.front, fill: shade(hex, -0.1), scope });
  out.push({ id: `${id}-side`, pts: f.side, fill: shade(hex, -0.3), scope });
  out.push({ id: `${id}-top`, pts: f.top, fill: shade(hex, 0.12), scope });
}

export function HouseBlueprint({
  house,
  scope,
}: {
  house: House;
  scope: Set<ScopeKey>;
}) {
  const H = STOREYS[house.storeys].height;
  const RIDGE = H + 90;
  const EAVES = H - 7;
  const on = (key: ScopeKey) => scope.has(key);
  const isLit = (s?: ScopeKey | ScopeKey[]) =>
    s === undefined ? false : Array.isArray(s) ? s.some(on) : on(s);

  /* A terraced house has no visible side elevation, because the neighbour is
     standing in it. Worth being accurate about: it is the sort of detail that
     tells someone the drawing is paying attention. */
  const sideVisible = house.type !== "terraced";

  const faces: Face[] = [];
  const rules: Rule[] = [];

  /* ---- plot, then the ground surfaces that sit on it ---- */
  faces.push({
    id: "plot",
    pts: [
      [-220, -60, 0],
      [520, -60, 0],
      [520, 470, 0],
      [-220, 470, 0],
    ],
    fill: MATERIALS.ground,
    soft: true,
    ambient: true,
  });

  /**
   * The building line: the back of the house, or the back of the extension if
   * there is going to be one.
   *
   * Everything at ground level sets out from this rather than from a fixed
   * number. Hard-coding it to the extension's face left the gully and the patio
   * floating in the middle of the lawn whenever no extension was selected,
   * because the house's own back wall is 130 further in.
   */
  const buildLine = on("extension") ? DEPTH + EXT_DEPTH : DEPTH;

  /* Extension height, capped so the parapet clears the first-floor cills with
     brickwork still showing between, and so it never overtops a bungalow's
     eaves. Flush with the ground floor, not jammed under the windows. */
  const extH = Math.min(H - 40, 106);

  /* Lawn. Always there - a garden is context, not work. It runs from the house
     to the boundary, and whatever paving gets laid lands on top of it.
     Taken down hard from the shared palette. The garden covers more of the
     sheet than the building does, so at the tone the hero uses for a couple of
     small front patches it became the subject of the drawing. */
  faces.push({
    id: "lawn",
    pts: [
      [-90, 200, 0.3],
      [410, 200, 0.3],
      [410, 466, 0.3],
      [-90, 466, 0.3],
    ],
    fill: shade(MATERIALS.lawn, -0.5),
    soft: true,
    ambient: true,
  });

  /* Patio and drainage, only when it is being done. */
  if (on("groundwork")) {
    faces.push({
      id: "patio",
      pts: [
        [24, buildLine + 22, 0.6],
        [292, buildLine + 22, 0.6],
        [292, buildLine + 84, 0.6],
        [24, buildLine + 84, 0.6],
      ],
      fill: MATERIALS.paving,
      scope: "groundwork",
    });
    /* Just enough coursing to read as paving. More lines and the gold starts
       competing with the building for attention. */
    for (let i = 1; i < 4; i++) {
      rules.push({
        id: `patio-v${i}`,
        a: [24 + i * 67, buildLine + 22, 0.8],
        b: [24 + i * 67, buildLine + 84, 0.8],
        scope: "groundwork",
      });
    }
    rules.push({
      id: "patio-h",
      a: [24, buildLine + 53, 0.8],
      b: [292, buildLine + 53, 0.8],
      scope: "groundwork",
    });
    /* A gully along the house, which is most of what groundwork actually is. */
    pushBox(faces, "gully", 20, buildLine + 14, 280, 6, 0, 5, MATERIALS.stone, "groundwork");
  }

  /** A neighbour: the same house, roofed the same way, with no openings drawn.
   *  A flat capping block read as a shipping container parked against the
   *  gable, which made the whole terrace look like storage. */
  function pushNeighbour(id: string, x0: number) {
    pushBox(faces, id, x0, 0, 190, DEPTH, 0, H, MATERIALS.brick);
    const nbSlate = shade(MATERIALS.slate, -0.1);
    faces.push({
      id: `${id}-roof-street`,
      pts: [
        [x0 - 10, -12, EAVES],
        [x0 + 200, -12, EAVES],
        [x0 + 200, 95, RIDGE],
        [x0 - 10, 95, RIDGE],
      ],
      fill: shade(nbSlate, -0.26),
    });
    faces.push({
      id: `${id}-roof-garden`,
      pts: [
        [x0 - 10, 202, EAVES],
        [x0 + 200, 202, EAVES],
        [x0 + 200, 95, RIDGE],
        [x0 - 10, 95, RIDGE],
      ],
      fill: nbSlate,
    });
    faces.push({
      id: `${id}-gable`,
      pts: [
        [x0 + 190, 0, H],
        [x0 + 190, DEPTH, H],
        [x0 + 190, 95, RIDGE],
      ],
      fill: shade(MATERIALS.brick, -0.34),
    });
  }

  /* ---- attached neighbours ---- */
  if (house.type === "semi" || house.type === "terraced") {
    pushNeighbour("nb-left", -190);
  }

  /* ---- the house ---- */
  pushBox(faces, "walls", 0, 0, W, DEPTH, 0, H, MATERIALS.brick);
  /* Damp course, and the first-floor string course on a two storey. */
  rules.push({ id: "dpc", a: [0, DEPTH, 14], b: [W, DEPTH, 14] });
  if (H >= 210) {
    rules.push({ id: "course", a: [0, DEPTH, 118], b: [W, DEPTH, 118] });
  }

  /* ---- roof. The visible slope faces the garden. ---- */
  if (house.roof === "gable") {
    faces.push({
      id: "roof-street",
      pts: [
        [-14, -14, EAVES],
        [W + 14, -14, EAVES],
        [W + 14, 95, RIDGE],
        [-14, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, -0.26),
      scope: "roof",
    });
    faces.push({
      id: "roof-garden",
      pts: [
        [-14, 204, EAVES],
        [W + 14, 204, EAVES],
        [W + 14, 95, RIDGE],
        [-14, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, 0.06),
      scope: "roof",
    });
    /* Masonry, but it only exists because of the roof shape, so it follows the
       roof's highlight. Not drawn on a terrace: that edge is a party wall, and
       the roof carries on over the neighbour rather than stopping in a gable.
       The neighbour's own roof happens to paint over it today, so this is
       geometry that was only invisible by accident of paint order. */
    if (house.type !== "terraced") {
      faces.push({
        id: "roof-gable-end",
        pts: [
          [W, 0, H],
          [W, DEPTH, H],
          [W, 95, RIDGE],
        ],
        fill: shade(MATERIALS.brick, -0.3),
        scope: "roof",
      });
    }
  } else {
    faces.push({
      id: "roof-street",
      pts: [
        [-14, -14, EAVES],
        [W + 14, -14, EAVES],
        [254, 95, RIDGE],
        [60, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, -0.26),
      scope: "roof",
    });
    faces.push({
      id: "roof-garden",
      pts: [
        [-14, 204, EAVES],
        [W + 14, 204, EAVES],
        [254, 95, RIDGE],
        [60, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, 0.06),
      scope: "roof",
    });
    faces.push({
      id: "roof-hip",
      pts: [
        [W + 14, -14, EAVES],
        [W + 14, 204, EAVES],
        [254, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, -0.16),
      scope: "roof",
    });
  }
  /* Tile courses up the garden slope, which is the slope we are looking at.
     They are what stops a re-roof reading as a grey wedge: a roof is a set of
     laid courses, and four lines is the difference between a shape and a
     material. Their own colour when lit, because a course line competing with
     the gold outline just makes the highlight noisier.

     The x span narrows with height on a hipped roof and does not on a gable,
     which is the same distinction the slopes themselves make. */
  for (let i = 1; i <= 4; i++) {
    const u = i / 5;
    const hip = house.roof === "hipped";
    rules.push({
      id: `tile-course-${i}`,
      a: [hip ? -14 + u * 74 : -14, 204 - u * 109, EAVES + u * (RIDGE - EAVES) + 0.4],
      b: [hip ? W + 14 - u * 60 : W + 14, 204 - u * 109, EAVES + u * (RIDGE - EAVES) + 0.4],
      scope: "roof",
      colour: shade(MATERIALS.slate, 0.3),
    });
  }

  /* A hipped roof's ridge runs only between the hips; a gable's runs the full
     length with the verge overhang. Spanning the full width either way drew a
     gold line off the end of the building into open sky. */
  const ridgeSpan: [number, number] =
    house.roof === "gable" ? [-14, W + 14] : [60, 254];
  rules.push({
    id: "ridge",
    a: [ridgeSpan[0], 95, RIDGE],
    b: [ridgeSpan[1], 95, RIDGE],
    scope: "roof",
    colour: DETAIL,
  });

  /* Stack, on the ridge at the gable end. */
  pushBox(faces, "chimney", 250, 72, 38, 42, H + 55, 95, shade(MATERIALS.brick, -0.06), "roof");
  pushBox(faces, "chimney-cap", 255, 77, 28, 32, H + 150, 11, MATERIALS.stone, "roof");

  /* Rainwater goods: the gutter along the garden eaves and the downpipe that
     takes it to the ground. The detail most drawings leave out and most
     roofing jobs are actually about. */
  pushBox(faces, "gutter", -14, 196, W + 28, 10, EAVES - 9, 9, shade(MATERIALS.slate, 0.14), "roof");
  const dpFoot = on("extension") ? extH + 9 : 0;
  pushBox(faces, "downpipe", W - 8, 198, 8, 8, dpFoot, EAVES - 9 - dpFoot, shade(MATERIALS.slate, 0.14), "roof");

  /* ---- joinery on the garden elevation ---- */
  const FACE = DEPTH + 0.6;

  /* Patio doors and the kitchen window, with their threshold, canopy and cill.
     Drawn only while there is no extension: once one is built this wall is
     internal and the openings have been knocked through, so leaving them on
     put a box across a door and made the extension look stuck on rather than
     built. The glazing moves out to the new rear wall below. */
  if (!on("extension")) {
    faces.push({
      id: "patio-doors",
      pts: facePanel(60, 152, FACE, 0, 104),
      fill: MATERIALS.glass,
      scope: "windows",
    });
    [83, 106, 129].forEach((x, i) =>
      rules.push({
        id: `patio-door-mullion-${i}`,
        a: [x, FACE + 0.4, 0],
        b: [x, FACE + 0.4, 104],
        scope: "windows",
        colour: DETAIL,
      }),
    );
    pushBox(faces, "threshold", 54, DEPTH - 2, 104, 16, 0, 5, MATERIALS.stone, "windows");
    pushBox(faces, "door-canopy", 52, DEPTH - 4, 108, 22, 108, 7, MATERIALS.stone, "windows");

    faces.push({
      id: "win-ground",
      pts: facePanel(196, 264, FACE, 40, 106),
      fill: MATERIALS.glass,
      scope: "windows",
    });
    rules.push({
      id: "win-ground-mullion",
      a: [230, FACE + 0.4, 40],
      b: [230, FACE + 0.4, 106],
      scope: "windows",
      colour: DETAIL,
    });
    pushBox(faces, "cill-ground", 192, DEPTH - 3, 76, 8, 34, 5, MATERIALS.stone, "windows");
  }

  /* First floor, where there is one. */
  if (H >= 210) {
    ([
      [34, 100],
      [196, 262],
    ] as const).forEach(([a, b], i) => {
      faces.push({
        id: `win-first-${i}`,
        pts: facePanel(a, b, FACE, 126, 186),
        fill: MATERIALS.glass,
        scope: "windows",
      });
      rules.push({
        id: `win-first-${i}-mullion`,
        a: [(a + b) / 2, FACE + 0.4, 126],
        b: [(a + b) / 2, FACE + 0.4, 186],
        scope: "windows",
        colour: DETAIL,
      });
      pushBox(faces, `cill-first-${i}`, a - 4, DEPTH - 3, b - a + 8, 8, 120, 5, MATERIALS.stone, "windows");
    });
  }

  /* A side window, on the elevation you can only see when nobody is joined to
     it. Constant x rather than constant y, so it needs the other helper. */
  if (sideVisible) {
    faces.push({
      id: "win-side",
      pts: sidePanel(56, 116, W + 0.6, 44, 104),
      fill: MATERIALS.glass,
      scope: "windows",
    });
    rules.push({
      id: "win-side-mullion",
      a: [W + 1, 86, 44],
      b: [W + 1, 86, 104],
      scope: "windows",
      colour: DETAIL,
    });
  }

  /* ---- loft conversion: a rear dormer that was not there before ---- */
  if (on("loft")) {
    /* Set out from the eaves, because that is what the dormer sits on. Setting
       it out from the wall height instead pushed it up to the ridge on a
       bungalow, where the roof is the same size but starts far lower. */
    const dormZ = EAVES + 14;
    const dormTop = dormZ + 58;
    pushBox(faces, "dormer", 150, 118, 100, 72, dormZ, 58, MATERIALS.slate, "loft");
    /* Lead flashing where the cheeks meet the tiles. */
    pushBox(faces, "dormer-flashing", 146, 116, 108, 76, dormZ - 4, 5, shade(MATERIALS.slate, 0.2), "loft");
    faces.push({
      id: "dormer-glass",
      pts: facePanel(162, 238, FACE, dormZ + 12, dormTop - 10),
      fill: MATERIALS.glass,
      scope: "loft",
    });
    rules.push({
      id: "dormer-mullion",
      a: [200, FACE + 0.4, dormZ + 12],
      b: [200, FACE + 0.4, dormTop - 10],
      scope: "loft",
      colour: DETAIL,
    });
  }

  /* ---- the other neighbour, nearer than the house in this view ---- */
  if (house.type === "terraced") {
    pushNeighbour("nb-right", W);
  }

  /* ---- extension: new floor area, out into the garden ----

     Full width and flush with the sides of the house, capped just above the
     ground-floor ceiling. It reads as the ground floor coming forward, which
     is what a rear extension is; a narrower box landed across the patio doors
     and looked bolted on.

     Its height follows the house so it never overtops a bungalow's eaves. */
  if (on("extension")) {
    const extFace = DEPTH + EXT_DEPTH + 0.6;

    /* Brick to match the house rather than render. A cream mass against a brick
       terrace read as a different building bolted on, which is the opposite of
       what a well-built extension looks like. It still reads as new work,
       because that comes from the gold highlight rather than the material. */
    pushBox(faces, "ext", 0, DEPTH, W, EXT_DEPTH, 0, extH, MATERIALS.brick, "extension");
    rules.push({
      id: "ext-dpc",
      a: [0, DEPTH + EXT_DEPTH, 14],
      b: [W, DEPTH + EXT_DEPTH, 14],
      scope: "extension",
    });
    /* Parapet and flat roof, capped in stone and oversailing a little. */
    /* A dark edge trim rather than a stone coping. Once the walls went to brick
       the pale cap became the thing that looked stuck on, and a flat roof is
       finished with a metal trim in practice, which also ties it to the slate
       on the main roof. */
    pushBox(faces, "ext-coping", -7, DEPTH, W + 14, EXT_DEPTH + 7, extH, 9, shade(MATERIALS.slate, 0.08), "extension");
    /* The deck itself, laid inside the trim and darker than it. Left as one
       box, the trim's top face *was* the roof - four square metres of edge
       detail, which is why it read as a slab rather than as a covering. */
    faces.push({
      id: "ext-deck",
      pts: [
        [0, DEPTH, extH + 9.2],
        [W, DEPTH, extH + 9.2],
        [W, DEPTH + EXT_DEPTH, extH + 9.2],
        [0, DEPTH + EXT_DEPTH, extH + 9.2],
      ],
      fill: shade(MATERIALS.slate, -0.3),
      soft: true,
      scope: "extension",
    });

    /* The lantern - new roof over new floor area, so it answers to both. */
    pushBox(faces, "ext-lantern", 104, DEPTH + 32, 92, 64, extH + 9, 27, MATERIALS.glass, ["extension", "roof"]);
    pushBox(faces, "ext-lantern-cap", 99, DEPTH + 27, 102, 74, extH + 36, 6, shade(MATERIALS.slate, 0.1), ["extension", "roof"]);

    /* Bi-folds across most of the new wall. New building and joinery both, so
       they light under either. */
    const glassTop = extH - 18;
    faces.push({
      id: "ext-glass",
      pts: facePanel(30, 198, extFace, 12, glassTop),
      fill: MATERIALS.glass,
      scope: ["extension", "windows"],
    });
    [72, 114, 156].forEach((x, i) =>
      rules.push({
        id: `ext-mullion-${i}`,
        a: [x, extFace + 0.4, 12],
        b: [x, extFace + 0.4, glassTop],
        scope: ["extension", "windows"],
        colour: DETAIL,
      }),
    );
    pushBox(faces, "ext-threshold", 24, buildLine, 180, 12, 0, 6, MATERIALS.stone, ["extension", "windows"]);

    /* A window beside them, so the new wall is not one unbroken run of glass. */
    faces.push({
      id: "ext-win",
      pts: facePanel(224, 282, extFace, 40, glassTop - 10),
      fill: MATERIALS.glass,
      scope: ["extension", "windows"],
    });
    pushBox(faces, "ext-cill", 220, DEPTH + EXT_DEPTH - 3, 66, 8, 34, 5, MATERIALS.stone, ["extension", "windows"]);

    /* And one on the flank, where there is a flank to see. */
    if (sideVisible) {
      faces.push({
        id: "ext-side-win",
        pts: sidePanel(DEPTH + 34, DEPTH + 96, W + 0.6, 44, glassTop - 14),
        fill: MATERIALS.glass,
        scope: ["extension", "windows"],
      });
    }
  }

  /* ---- garden boundary, the nearest thing in the scene ----
     Knocked well back in tone. At full timber colour it was the brightest
     thing on the sheet with nothing selected, so the eye went to the fence
     rather than to the house - which inverts the whole point of a drawing that
     recedes until you pick some work. */
  const fence = boxFaces(-86, 450, 492, 8, 0, 40);
  faces.push({
    id: "fence-front",
    pts: fence.front,
    fill: shade(MATERIALS.fence, -0.52),
    ambient: true,
  });
  faces.push({
    id: "fence-top",
    pts: fence.top,
    fill: shade(MATERIALS.fence, -0.38),
    ambient: true,
  });

  return (
    <svg
      viewBox="0 0 900 720"
      className="iso-svg"
      role="img"
      aria-label={`Isometric drawing of a ${house.type} ${STOREYS[
        house.storeys
      ].label.toLowerCase()}, seen from the garden, with the selected work highlighted.`}
    >
      <defs>
        {/* Glass reads as glass with a gradient and as paint without one. */}
        <linearGradient id="bp-glass" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#a8c6e2" />
          <stop offset="55%" stopColor="#6d90b6" />
          <stop offset="100%" stopColor="#4a6a8e" />
        </linearGradient>
        {/* Depth behind the model, so it does not sit flat on the grid. */}
        <radialGradient id="bp-vignette" cx="0.5" cy="0.45" r="0.62">
          <stop offset="0%" stopColor="#1b2440" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#0b0b15" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="900" height="720" fill="url(#bp-vignette)" />

      <g transform={FIT}>
        {faces.map((f) => {
          const lit = isLit(f.scope);
          const isGlass = lit && f.fill === MATERIALS.glass;
          const fill = lit
            ? isGlass
              ? "url(#bp-glass)"
              : f.fill
            : f.ambient
              ? f.fill
              : "#161d30";
          return (
            <polygon
              key={f.id}
              points={points(f.pts)}
              className="bp-face"
              fill={fill}
              fillOpacity={lit ? 0.96 : f.ambient ? 0.9 : 0.94}
              stroke={f.soft ? "none" : lit ? DETAIL : INK}
              strokeWidth={lit ? 1.7 : 1}
              strokeOpacity={lit ? 1 : f.ambient ? 0.28 : 0.72}
              strokeLinejoin="round"
            />
          );
        })}

        {rules.map((r) => {
          const lit = isLit(r.scope);
          const [x1, y1] = iso(...r.a);
          const [x2, y2] = iso(...r.b);
          return (
            <line
              key={r.id}
              x1={x1.toFixed(1)}
              y1={y1.toFixed(1)}
              x2={x2.toFixed(1)}
              y2={y2.toFixed(1)}
              className="bp-face"
              stroke={lit ? (r.colour ?? DETAIL) : INK_SOFT}
              strokeWidth={lit ? 1.6 : 0.9}
              strokeOpacity={lit ? 0.9 : 0.45}
              strokeLinecap="round"
            />
          );
        })}
      </g>

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
}: {
  house: House;
  scope: Set<ScopeKey>;
}) {
  return (
    <div className="relative size-full">
      <HouseBlueprint house={house} scope={scope} />

      {/* Along the bottom, because that band of the drawing is empty whatever
          is selected. At the top it landed across the roof. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-3 sm:p-5">
        <div className="min-w-0">
          <div className="mb-2 h-px w-full bg-gold-400/70" />
          <p className="font-mono text-[11px] leading-tight tracking-[0.2em] text-gold-300 sm:text-sm">
            REAR ELEVATION
          </p>
          <p className="mt-1 font-mono text-[9px] leading-tight tracking-[0.14em] text-navy-200 sm:text-xs">
            YOU ARE LOOKING AT THE BACK OF THE HOUSE
          </p>
        </div>
        <OrientationKey />
      </div>
    </div>
  );
}
