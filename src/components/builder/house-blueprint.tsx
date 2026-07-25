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
  type Point3,
} from "@/lib/iso";
import {
  STOREYS,
  type House,
  type ScopeKey,
} from "./house-config";

/* ===========================================================================
   The house, drawn isometrically, with the work in scope picked out.

   Same camera and palette as the hero, so the two drawings read as one set.
   Everything is derived from the two pieces of state: what the house is, and
   what needs doing to it. Parts in scope come up in full material colour under
   a gold line; everything else stays as blueprint, present but not the subject.

   Two kinds of scope. Most of it highlights something already on the drawing -
   the roof you have, the windows you have. Extension, loft and groundwork
   *add* geometry, because that work is new building rather than replacement,
   and watching the house grow is the honest way to show that.

   This renders declaratively rather than imperatively like the hero. There is
   no timeline here, only state, and React re-rendering a few hundred polygons
   when someone taps a chip is not a problem worth solving twice.
   =========================================================================== */

/** Model extents, worst case, mapped into the viewBox.
 *
 *  Fixed rather than fitted to the current selection: a drawing that rescales
 *  when you tick a box makes the change hard to read, which is the one thing
 *  this drawing exists to do. So the frame reserves room for the largest the
 *  model can get - terraced, two storey, everything in scope - and a bungalow
 *  simply sits lower in it. */
const FIT = "translate(125,196) scale(0.8)";

type Face = {
  id: string;
  pts: Point3[];
  /** Material colour, used when the part is in scope. */
  fill: string;
  /** Undefined for context: the plot, the neighbours, the walls themselves. */
  scope?: ScopeKey;
};

type Rule = {
  id: string;
  a: Point3;
  b: Point3;
  scope?: ScopeKey;
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
  scope?: ScopeKey,
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
  const on = (key: ScopeKey) => scope.has(key);

  const faces: Face[] = [];
  const rules: Rule[] = [];

  /* ---- the plot ---- */
  faces.push({
    id: "plot",
    pts: [
      [-220, -60, 0],
      [520, -60, 0],
      [520, 460, 0],
      [-220, 460, 0],
    ],
    fill: MATERIALS.ground,
  });

  /* ---- driveway and groundwork, only when it is being done ---- */
  if (on("groundwork")) {
    faces.push({
      id: "drive",
      pts: [
        [-40, 340, 0.4],
        [300, 340, 0.4],
        [300, 450, 0.4],
        [-40, 450, 0.4],
      ],
      fill: MATERIALS.paving,
      scope: "groundwork",
    });
    for (let i = 1; i < 5; i++) {
      rules.push({
        id: `drive-v${i}`,
        a: [-40 + i * 68, 340, 0.6],
        b: [-40 + i * 68, 450, 0.6],
        scope: "groundwork",
      });
    }
    rules.push({
      id: "drive-h",
      a: [-40, 395, 0.6],
      b: [300, 395, 0.6],
      scope: "groundwork",
    });
  }

  /* ---- attached neighbours ---- */
  const neighbours: Array<[string, number]> = [];
  if (house.type === "semi" || house.type === "terraced") {
    neighbours.push(["nb-left", -190]);
  }
  if (house.type === "terraced") {
    neighbours.push(["nb-right", 300]);
  }
  neighbours.forEach(([id, x0]) => {
    pushBox(faces, id, x0, 0, 190, 190, 0, H, MATERIALS.brick);
    /* A low roof block, so a neighbour does not read as a shipping container
       parked against the gable. */
    pushBox(faces, `${id}-roof`, x0 - 8, -8, 206, 206, H, 46, MATERIALS.slate);
  });

  /* ---- the house itself ---- */
  pushBox(faces, "walls", 0, 0, 300, 190, 0, H, MATERIALS.brick);

  /* ---- roof ---- */
  const eaves = H - 7;
  if (house.roof === "gable") {
    faces.push({
      id: "roof-back",
      pts: [
        [-14, -14, eaves],
        [314, -14, eaves],
        [314, 95, RIDGE],
        [-14, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, -0.24),
      scope: "roof",
    });
    faces.push({
      id: "roof-front",
      pts: [
        [-14, 204, eaves],
        [314, 204, eaves],
        [314, 95, RIDGE],
        [-14, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, 0.05),
      scope: "roof",
    });
    /* The gable wall is masonry, not roof, but it only exists because of the
       roof shape, so it follows the roof's highlight. */
    faces.push({
      id: "roof-gable-end",
      pts: [
        [300, 0, H],
        [300, 190, H],
        [300, 95, RIDGE],
      ],
      fill: shade(MATERIALS.brick, -0.3),
      scope: "roof",
    });
  } else {
    faces.push({
      id: "roof-back",
      pts: [
        [-14, -14, eaves],
        [314, -14, eaves],
        [254, 95, RIDGE],
        [60, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, -0.24),
      scope: "roof",
    });
    faces.push({
      id: "roof-front",
      pts: [
        [-14, 204, eaves],
        [314, 204, eaves],
        [254, 95, RIDGE],
        [60, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, 0.05),
      scope: "roof",
    });
    faces.push({
      id: "roof-hip",
      pts: [
        [314, -14, eaves],
        [314, 204, eaves],
        [254, 95, RIDGE],
      ],
      fill: shade(MATERIALS.slate, -0.16),
      scope: "roof",
    });
  }

  /* Chimney and rainwater goods belong to the roof. */
  pushBox(faces, "chimney", 228, 70, 38, 42, H + 55, 95, shade(MATERIALS.brick, -0.06), "roof");
  pushBox(faces, "chimney-cap", 233, 75, 28, 32, H + 150, 11, MATERIALS.stone, "roof");
  pushBox(faces, "gutter", 304, -14, 10, 218, H - 16, 9, shade(MATERIALS.slate, 0.14), "roof");
  pushBox(faces, "downpipe", 300, 178, 8, 8, 0, H - 16, shade(MATERIALS.slate, 0.14), "roof");

  /* ---- joinery on the front face ---- */
  faces.push({
    id: "door",
    pts: facePanel(30, 76, 190.6, 0, 92),
    fill: MATERIALS.timber,
    scope: "windows",
  });

  const bands: number[][] = [[30, 100]];
  if (H >= 210) bands.push([126, 186]);

  bands.forEach(([z0, z1], row) => {
    /* The ground floor gives its left-hand bay to the front door. */
    const columns: Array<[number, number]> =
      row === 0
        ? [
            [110, 175],
            [205, 270],
          ]
        : [
            [30, 85],
            [122, 177],
            [214, 269],
          ];

    columns.forEach(([a, b], i) => {
      faces.push({
        id: `win-${row}-${i}`,
        pts: facePanel(a, b, 190.6, z0, z1),
        fill: MATERIALS.glass,
        scope: "windows",
      });
      rules.push({
        id: `win-${row}-${i}-mullion`,
        a: [(a + b) / 2, 191, z0],
        b: [(a + b) / 2, 191, z1],
        scope: "windows",
        colour: DETAIL,
      });
    });
  });

  /* ---- loft conversion: a dormer that was not there before ---- */
  if (on("loft")) {
    pushBox(faces, "dormer", 96, 118, 98, 72, H + 18, 68, MATERIALS.slate, "loft");
    faces.push({
      id: "dormer-glass",
      pts: facePanel(108, 182, 190.6, H + 30, H + 76),
      fill: MATERIALS.glass,
      scope: "loft",
    });
  }

  /* ---- extension: new floor area, in front of the existing frontage ---- */
  if (on("extension")) {
    pushBox(faces, "ext", 30, 190, 220, 140, 0, 130, MATERIALS.render, "extension");
    pushBox(faces, "ext-coping", 24, 184, 232, 152, 130, 9, MATERIALS.stone, "extension");
    faces.push({
      id: "ext-glass",
      pts: facePanel(60, 220, 330.6, 12, 112),
      fill: MATERIALS.glass,
      scope: "extension",
    });
    [100, 140, 180].forEach((x, i) =>
      rules.push({
        id: `ext-mullion-${i}`,
        a: [x, 331, 12],
        b: [x, 331, 112],
        scope: "extension",
        colour: DETAIL,
      }),
    );
  }

  return (
    <svg
      viewBox="0 0 900 720"
      className="iso-svg"
      role="img"
      aria-label={`Isometric drawing of a ${house.type} ${STOREYS[house.storeys].label.toLowerCase()}, with the selected work highlighted.`}
    >
      <g transform={FIT}>
        {faces.map((f) => {
          const lit = f.scope ? on(f.scope) : false;
          return (
            <polygon
              key={f.id}
              points={points(f.pts)}
              className="bp-face"
              /* Out of scope is still a solid massing model, not a wireframe.
                 SVG has no depth buffer, so a translucent face shows whatever
                 is behind it and the building stops reading as a solid at all;
                 the drawing has to occlude to have any depth. */
              fill={lit ? f.fill : "#161d30"}
              fillOpacity={lit ? 0.96 : 0.94}
              stroke={lit ? DETAIL : INK}
              strokeWidth={lit ? 1.7 : 1}
              strokeOpacity={lit ? 1 : 0.55}
              strokeLinejoin="round"
            />
          );
        })}

        {rules.map((r) => {
          const lit = r.scope ? on(r.scope) : false;
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
              strokeOpacity={lit ? 0.9 : 0.5}
              strokeLinecap="round"
            />
          );
        })}
      </g>
    </svg>
  );
}
