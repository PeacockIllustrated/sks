"use client";

import anime from "animejs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/ui/button";
import {
  DETAIL,
  INK,
  INK_SOFT,
  MATERIALS,
  front,
  project,
  shade,
  type Point3,
} from "@/lib/iso";
import { site } from "@/lib/site";

/* ===========================================================================
   The hero: a front elevation that unfolds into the building.

   One parametric 3D house. A single camera parameter `t` interpolates the
   projection between:

     t = 0  front orthographic - depth collapses, and what is left is exactly an
            architect's elevation: outline, openings, ground line, dimensions
     t = 1  isometric - the drawing stands up into a building

   Every shape stores real 3D points. Only the projection changes, which is what
   makes the move read as one object rotating rather than two drawings crossfading.

   The sequence is: stroke-draw the elevation, bring in the dimension strings and
   title block, then tween t from 0 to 1 while the site context appears and the
   faces fill with colour, and finally the headline.

   The scene is built imperatively against a ref'd <svg>. Tweening `t` through
   React state would re-render sixty times a second to set the same attributes
   this does directly.
   =========================================================================== */

const NS = "http://www.w3.org/2000/svg";

/* The camera, the shading and the palette live in lib/iso, because the project
   builder draws the isometric end of this same camera. `PRJ` and `FP` are the
   two ends of it under their original names, which keeps the scene code below
   reading the way a drawing does. */
const PRJ = project;
const FP = front;

type Shape = { el: SVGElement; pts: Point3[]; kind: "poly" | "line" };

const {
  brick: C_BRICK,
  render: C_RENDER,
  slate: C_SLATE,
  glass: C_GLASS,
  timber: C_TIMBER,
  stone: C_STONE,
  paving: C_PAVING,
  ground: C_GROUND,
} = MATERIALS;

/** Hotspot key -> [label, href]. The three divisions, on the building. */
const ISO_MAP: Record<string, [string, string]> = {
  construction: ["Construction", "/construction"],
  joinery: ["Joinery", "/joinery"],
  roofing: ["Roofing", "/roofing"],
};

export function HeroMorph() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  /* The click handler navigates, so it has to see the current router. Holding
     it in a ref keeps the scene effect free of `router` as a dependency:
     rebuilding the whole scene because a navigation hook re-identified would
     restart the animation halfway through someone watching it. */
  const navigate = useRef<(href: string) => void>(() => {});
  useEffect(() => {
    navigate.current = (href: string) => router.push(href);
  }, [router]);

  useEffect(() => {
    const svg = svgRef.current;
    const viz = vizRef.current;
    const label = labelRef.current;
    if (!svg || !viz || !label) return;

    const reduced = document.documentElement.classList.contains("reduced");
    const SHAPES: Shape[] = [];
    const camera = { t: reduced ? 1 : 0 };

    /* Scene root, under the displacement filter that keeps this off CAD. */
    const scene = document.createElementNS(NS, "g");
    scene.setAttribute("filter", "url(#sks-rough)");
    svg.appendChild(scene);

    function project() {
      const t = camera.t;
      for (const s of SHAPES) {
        if (s.kind === "poly") {
          s.el.setAttribute(
            "points",
            s.pts
              .map((p) =>
                PRJ(p[0], p[1], p[2], t)
                  .map((v) => v.toFixed(1))
                  .join(","),
              )
              .join(" "),
          );
        } else {
          const [x1, y1] = PRJ(s.pts[0][0], s.pts[0][1], s.pts[0][2], t);
          const [x2, y2] = PRJ(s.pts[1][0], s.pts[1][1], s.pts[1][2], t);
          s.el.setAttribute("x1", x1.toFixed(1));
          s.el.setAttribute("y1", y1.toFixed(1));
          s.el.setAttribute("x2", x2.toFixed(1));
          s.el.setAttribute("y2", y2.toFixed(1));
        }
      }
    }

    function poly(g: SVGGElement, pts: Point3[], fill: string) {
      const p = document.createElementNS(NS, "polygon");
      p.setAttribute("fill", fill);
      p.setAttribute("class", "ifc");
      p.setAttribute("stroke", INK);
      p.setAttribute("stroke-width", "1.3");
      p.setAttribute("stroke-linejoin", "round");
      p.style.fillOpacity = reduced ? "0.97" : "0";
      g.appendChild(p);
      SHAPES.push({ el: p, pts, kind: "poly" });
      return p;
    }

    function line(
      g: SVGGElement,
      a: Point3,
      b: Point3,
      colour: string,
      w: number,
      nodash?: boolean,
    ) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("stroke", colour);
      l.setAttribute("stroke-width", String(w));
      l.setAttribute("stroke-linecap", "round");
      if (nodash) l.dataset.nodash = "1";
      g.appendChild(l);
      SHAPES.push({ el: l, pts: [a, b], kind: "line" });
      return l;
    }

    /** A box as its three visible faces: front (max y), side (max x), top. */
    function box(
      g: SVGGElement,
      x: number,
      y: number,
      w: number,
      d: number,
      z0: number,
      h: number,
      hex: string,
    ) {
      poly(
        g,
        [
          [x, y + d, z0],
          [x + w, y + d, z0],
          [x + w, y + d, z0 + h],
          [x, y + d, z0 + h],
        ],
        shade(hex, -0.1),
      );
      poly(
        g,
        [
          [x + w, y, z0],
          [x + w, y + d, z0],
          [x + w, y + d, z0 + h],
          [x + w, y, z0 + h],
        ],
        shade(hex, -0.3),
      );
      poly(
        g,
        [
          [x, y, z0 + h],
          [x + w, y, z0 + h],
          [x + w, y + d, z0 + h],
          [x, y + d, z0 + h],
        ],
        shade(hex, 0.12),
      );
    }

    /** A flat panel on a constant-y face: windows, doors, glazing. */
    function panel(
      g: SVGGElement,
      x0: number,
      x1: number,
      y: number,
      z0: number,
      z1: number,
      hex: string,
    ) {
      return poly(
        g,
        [
          [x0, y, z0],
          [x1, y, z0],
          [x1, y, z1],
          [x0, y, z1],
        ],
        hex,
      );
    }

    /** `late` groups have no meaning in an elevation, so they only appear as
        depth does: the driveway, the roof lantern, the panels on the far slope. */
    function group(key: string | null, late?: boolean) {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "iso-el");
      if (key) g.setAttribute("data-key", key);
      if (late) {
        g.dataset.late = "1";
        if (!reduced) g.style.opacity = "0";
      }
      scene.appendChild(g);
      return g;
    }

    /* ================= the model =================
       x runs along the frontage, y into the plot, z up.
       The front faces are at max y, so the elevation is the y = depth face.
       Groups are appended back to front: SVG has no depth buffer, so document
       order is the depth order. */

    /* Ground. In the elevation this collapses to the single ground line. */
    const gGround = group(null);
    poly(
      gGround,
      [
        [-70, -60, 0],
        [570, -60, 0],
        [570, 350, 0],
        [-70, 350, 0],
      ],
      C_GROUND,
    );

    /* Driveway. Painted early so the building sits on it, revealed late
       because a plot only exists once there is depth to put it in. */
    const gDrive = group("construction", true);
    poly(
      gDrive,
      [
        [280, 250, 0.4],
        [560, 250, 0.4],
        [560, 340, 0.4],
        [280, 340, 0.4],
      ],
      C_PAVING,
    );
    for (let i = 1; i < 5; i++) {
      line(
        gDrive,
        [280 + i * 56, 250, 0.6],
        [280 + i * 56, 340, 0.6],
        INK_SOFT,
        1,
        true,
      );
    }
    line(gDrive, [280, 295, 0.6], [560, 295, 0.6], INK_SOFT, 1, true);

    /* Main house: two storeys of masonry. */
    const gWalls = group("construction");
    box(gWalls, 0, 0, 300, 190, 0, 210, C_BRICK);
    /* Gable wall, carrying on up to the ridge behind the roof. */
    poly(
      gWalls,
      [
        [0, 190, 210],
        [150, 190, 300],
        [300, 190, 210],
      ],
      shade(C_BRICK, -0.1),
    );
    /* Damp course and first-floor string course. */
    line(gWalls, [0, 190, 14], [300, 190, 14], INK_SOFT, 1);
    line(gWalls, [0, 190, 118], [300, 190, 118], INK_SOFT, 1);

    /* Roof: two slopes meeting at a ridge that runs front to back, which is
       what gives the elevation its gable. */
    const gRoof = group("roofing");
    poly(
      gRoof,
      [
        [-14, -14, 203],
        [-14, 204, 203],
        [150, 204, 300],
        [150, -14, 300],
      ],
      shade(C_SLATE, 0.06),
    );
    poly(
      gRoof,
      [
        [314, -14, 203],
        [314, 204, 203],
        [150, 204, 300],
        [150, -14, 300],
      ],
      shade(C_SLATE, -0.16),
    );
    line(gRoof, [150, -14, 300], [150, 204, 300], DETAIL, 2);
    line(gRoof, [-14, 204, 203], [314, 204, 203], INK_SOFT, 1.4);

    /* Solar array, parametrised along the pitch so the panels lie on the roof
       plane rather than floating near it.

       It goes on the left slope and the stack goes on the right. Keeping them
       on separate slopes is the only arrangement that reliably separates them:
       the stack is tall, and in isometric a tall thing on one part of a roof
       covers a flat thing several metres away from it. */
    const gSolar = group("roofing", true);
    const onLeftPitch = (u: number): [number, number] => [
      -14 + u * 164,
      203 + u * 97 + 2,
    ];
    ([
      [22, 88],
      [110, 176],
    ] as const).forEach(([ya, yb]) => {
      const [xa, za] = onLeftPitch(0.18);
      const [xb, zb] = onLeftPitch(0.68);
      poly(
        gSolar,
        [
          [xa, ya, za],
          [xb, ya, zb],
          [xb, yb, zb],
          [xa, yb, za],
        ],
        "#2c3a52",
      );
    });

    /* Chimney, on the right slope, breaking the ridge line. */
    const gChimney = group("roofing");
    box(gChimney, 236, 62, 38, 42, 232, 112, shade(C_BRICK, -0.06));
    box(gChimney, 241, 67, 28, 32, 344, 12, C_STONE);

    /* Rainwater goods. Gutter along the right-hand eaves and the downpipe that
       takes it to the ground - the detail most drawings of a house leave out
       and most roofing jobs are actually about. */
    const gRainwater = group("roofing");
    box(gRainwater, 304, -14, 10, 218, 194, 9, shade(C_SLATE, 0.14));
    box(gRainwater, 305, 178, 8, 8, 0, 194, shade(C_SLATE, 0.14));

    /* First-floor joinery. */
    const gUpper = group("joinery");
    ([
      [30, 85],
      [122, 177],
      [214, 269],
    ] as const).forEach(([a, b]) => {
      panel(gUpper, a, b, 190.6, 126, 186, C_GLASS);
      line(gUpper, [(a + b) / 2, 191, 126], [(a + b) / 2, 191, 186], INK, 1.4);
      line(gUpper, [a - 4, 191, 122], [b + 4, 191, 122], C_STONE, 3);
    });

    /* Gable light, above the eaves. */
    const gGable = group("joinery");
    panel(gGable, 132, 168, 190.6, 224, 258, C_GLASS);

    /* Ground-floor joinery: the door under its porch, and a window. */
    const gLower = group("joinery");
    panel(gLower, 30, 76, 190.6, 0, 96, C_TIMBER);
    line(gLower, [70, 191.2, 46], [70, 191.2, 56], DETAIL, 3);
    panel(gLower, 205, 270, 190.6, 36, 110, C_GLASS);
    line(gLower, [237, 191, 36], [237, 191, 110], INK, 1.4);
    line(gLower, [201, 191, 32], [274, 191, 32], C_STONE, 3);

    /* Porch: a canopy on two posts rather than a flat hood, because it gives
       the elevation something to step forward with. */
    const gPorch = group("joinery");
    box(gPorch, 18, 184, 70, 28, 100, 8, C_STONE);
    box(gPorch, 22, 204, 7, 7, 0, 100, C_TIMBER);
    box(gPorch, 79, 204, 7, 7, 0, 100, C_TIMBER);

    /* Bay window. Masonry below, glazing on three sides, stone cap over. The
       one element that puts a curve in the plan and makes the front read as a
       house rather than a box with holes in it. */
    const gBay = group("joinery");
    box(gBay, 106, 190, 74, 30, 0, 116, shade(C_BRICK, -0.04));
    panel(gBay, 112, 174, 220.6, 34, 108, C_GLASS);
    [129, 157].forEach((x) => {
      line(gBay, [x, 221, 34], [x, 221, 108], INK, 1.4);
    });
    line(gBay, [108, 221, 30], [178, 221, 30], C_STONE, 3);
    box(gBay, 102, 186, 82, 38, 116, 7, C_STONE);

    /* Single-storey extension, stepping forward of the main frontage. */
    const gExt = group("construction");
    box(gExt, 300, 60, 200, 190, 0, 130, C_RENDER);
    line(gExt, [300, 250, 14], [500, 250, 14], INK_SOFT, 1);

    /* Its parapet and flat roof, capped in stone. */
    const gParapet = group("roofing");
    box(gParapet, 294, 54, 212, 202, 130, 9, C_STONE);

    /* Roof lantern. Hidden behind the parapet in the elevation, which is
       exactly why it belongs to the part of the sequence that has depth. */
    const gLantern = group("roofing", true);
    box(gLantern, 356, 112, 88, 86, 139, 26, C_GLASS);
    line(gLantern, [400, 155, 165], [400, 155, 178], DETAIL, 2, true);

    /* Bi-fold doors across the extension frontage. */
    const gBifold = group("joinery");
    panel(gBifold, 318, 482, 250.6, 12, 112, C_GLASS);
    [359, 400, 441].forEach((x) => {
      line(gBifold, [x, 251, 12], [x, 251, 112], INK, 1.4);
    });
    line(gBifold, [314, 251, 8], [486, 251, 8], C_STONE, 3);

    /* Boundary wall and gate piers along the front of the plot. Appended last
       because it is the nearest thing in the scene, and SVG has no depth
       buffer: document order is the depth order. Late, like the driveway it
       encloses - a plot boundary means nothing in an elevation. */
    const gBoundary = group("construction", true);
    box(gBoundary, -56, 330, 428, 11, 0, 36, shade(C_BRICK, -0.08));
    box(gBoundary, 372, 327, 16, 17, 0, 50, C_STONE);
    box(gBoundary, 466, 327, 16, 17, 0, 50, C_STONE);
    box(gBoundary, 482, 330, 78, 11, 0, 36, shade(C_BRICK, -0.08));

    /* ================= annotations =================
       Front-view coordinates, and outside the displacement filter: dimension
       strings that wobble read as sloppy rather than hand-drawn. */
    const anno = document.createElementNS(NS, "g");
    anno.style.opacity = "0";
    svg.appendChild(anno);

    function aLine(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      dash?: boolean,
    ) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", String(x1));
      l.setAttribute("y1", String(y1));
      l.setAttribute("x2", String(x2));
      l.setAttribute("y2", String(y2));
      l.setAttribute("stroke", INK);
      l.setAttribute("stroke-width", "1.1");
      l.setAttribute("opacity", "0.65");
      if (dash) l.setAttribute("stroke-dasharray", "9 7");
      anno.appendChild(l);
    }

    function aText(
      x: number,
      y: number,
      str: string,
      cls?: string,
      rot?: boolean,
    ) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", String(x));
      t.setAttribute("y", String(y));
      if (cls) t.setAttribute("class", cls);
      if (rot) t.setAttribute("transform", `rotate(90 ${x} ${y})`);
      t.textContent = str;
      anno.appendChild(t);
    }

    /** A dimension tick: the 45-degree stroke surveyors use instead of an arrow. */
    function tick(x: number, y: number) {
      aLine(x - 5, y + 5, x + 5, y - 5);
    }

    {
      /* Overall frontage, below the ground line. */
      const [dx1, dy] = FP(0, -34);
      const [dx2] = FP(500, -34);
      aLine(dx1, dy, dx2, dy);
      tick(dx1, dy);
      tick(dx2, dy);
      aLine(...FP(0, -8), ...FP(0, -42));
      aLine(...FP(500, -8), ...FP(500, -42));
      aText((dx1 + dx2) / 2 - 26, dy + 22, "12500");

      /* Ridge height, up the right-hand side. */
      const [vx, vy1] = FP(545, 0);
      const [, vy2] = FP(545, 300);
      aLine(vx, vy1, vx, vy2);
      tick(vx, vy1);
      tick(vx, vy2);
      aLine(...FP(505, 0), ...FP(553, 0));
      aLine(...FP(160, 300), ...FP(553, 300));
      aText(vx + 20, (vy1 + vy2) / 2 - 26, "7500", undefined, true);

      /* Ridge centre line. */
      aLine(...FP(150, 316), ...FP(150, -16), true);

      /* Title block, set out to the left of the chimney so the two do not
         collide at the top of the sheet. */
      aText(...FP(-64, 330), "SKS - FRONT ELEVATION - SCALE 1:100", "title");
      const [ux, uy] = FP(-64, 322);
      aLine(ux, uy, ux + 300, uy);

      /* Finished floor level. */
      aText(...FP(-52, 6), "0.000");
    }

    project();

    /* ================= hotspots ================= */
    const cleanups: Array<() => void> = [];
    svg.querySelectorAll<SVGGElement>(".iso-el[data-key]").forEach((g) => {
      const key = g.dataset.key;
      if (!key || !ISO_MAP[key]) return;
      const siblings = () =>
        svg.querySelectorAll<SVGGElement>(`.iso-el[data-key="${key}"]`);

      const onEnter = () => {
        siblings().forEach((el) => el.classList.add("lift"));
        const r = g.getBoundingClientRect();
        const host = viz.getBoundingClientRect();
        const b = label.querySelector("b");
        if (b) b.textContent = ISO_MAP[key][0];
        label.style.left = `${r.left - host.left + r.width / 2}px`;
        label.style.top = `${r.top - host.top - 10}px`;
        label.style.display = "block";
      };
      const onLeave = () => {
        siblings().forEach((el) => el.classList.remove("lift"));
        label.style.display = "none";
      };
      const onClick = () => navigate.current(ISO_MAP[key][1]);

      g.addEventListener("mouseenter", onEnter);
      g.addEventListener("mouseleave", onLeave);
      g.addEventListener("click", onClick);
      cleanups.push(() => {
        g.removeEventListener("mouseenter", onEnter);
        g.removeEventListener("mouseleave", onLeave);
        g.removeEventListener("click", onClick);
      });
    });

    /* ================= the timeline ================= */
    let tl: anime.AnimeTimelineInstance | null = null;

    if (!reduced) {
      const drawGroups = ([...scene.children] as SVGGElement[]).filter(
        (g) => !g.dataset.late,
      );

      drawGroups.forEach((g) => {
        ([...g.children] as SVGGeometryElement[]).forEach((el) => {
          if ((el as SVGElement).dataset.nodash) return;
          let len = 600;
          try {
            len = el.getTotalLength();
          } catch {
            /* Some engines refuse getTotalLength on a polygon. 600 is longer
               than any edge here, so the stroke still draws on cleanly. */
          }
          el.style.strokeDasharray = String(len);
          el.style.strokeDashoffset = String(len);
        });
      });

      /* The mark lives outside the scene SVG, so it gets its own dash setup. */
      const markStrokes = Array.from(
        document.querySelectorAll<SVGGeometryElement>(
          "#sks-hero .sks-mark path, #sks-hero .sks-mark line",
        ),
      );
      markStrokes.forEach((el) => {
        let len = 200;
        try {
          len = el.getTotalLength();
        } catch {
          /* The 200 fallback is longer than any stroke in the mark. */
        }
        el.style.strokeDasharray = String(len);
        el.style.strokeDashoffset = String(len);
      });

      tl = anime.timeline({ easing: "easeInOutSine" });

      tl.add(
        {
          targets: markStrokes,
          strokeDashoffset: 0,
          duration: 620,
          delay: anime.stagger(70),
        },
        0,
      )
        .add(
          {
            targets: "#sks-hero .sks-square",
            scale: [0, 1],
            rotate: ["90deg", "0deg"],
            duration: 520,
            easing: "easeOutBack",
          },
          520,
        )
        .add(
          {
            targets: "#sks-hero .sks-tag",
            opacity: [0, 1],
            duration: 420,
            easing: "linear",
          },
          700,
        );

      drawGroups.forEach((g, i) => {
        tl?.add(
          {
            targets: ([...g.children] as SVGElement[]).filter(
              (el) => !el.dataset.nodash,
            ),
            strokeDashoffset: 0,
            duration: 460,
            delay: anime.stagger(50),
          },
          i * 150,
        );
      });

      /* Every offset below is absolute. Relative offsets would chain off
         whatever was added last, and the copy deliberately runs alongside the
         drawing rather than after it, so there is no single "previous" step to
         hang the rest of the sequence off. */
      const drawEnd = drawGroups.length * 150 + 460;
      const morph = drawEnd + 620;
      const MORPH_MS = 1650;
      const scope = "#sks-hero";

      /* The copy leads. Holding the headline back until the drawing finishes
         looked dramatic in isolation and looked broken in a browser: four
         seconds of empty column above the fold, and nothing for the largest
         paint to land on. */
      tl.add(
        {
          targets: `${scope} .line-mask > span`,
          translateY: ["110%", "0%"],
          duration: 780,
          delay: anime.stagger(110),
          easing: "easeOutCubic",
        },
        240,
      )
        .add(
          {
            targets: `${scope} .hero-fade`,
            opacity: [0, 1],
            translateY: [16, 0],
            duration: 560,
            delay: anime.stagger(90),
          },
          720,
        )
        /* Dimension strings and title block, once there is a drawing to
           annotate. */
        .add(
          { targets: anno, opacity: [0, 1], duration: 520, easing: "linear" },
          drawEnd - 520,
        )
        .add(
          {
            targets: `${scope} .bp-note-1`,
            opacity: [0, 1],
            translateY: [8, 0],
            duration: 440,
          },
          drawEnd - 380,
        )
        /* The camera move. The elevation stands up into the building. */
        .add(
          {
            targets: camera,
            t: [0, 1],
            duration: MORPH_MS,
            easing: "easeInOutCubic",
            begin: () => {
              /* Release the stroke dashes before anything moves, or the edges
                 re-length under the tween and appear to unzip. */
              scene
                .querySelectorAll<SVGElement>("*")
                .forEach((el) => (el.style.strokeDasharray = "none"));
            },
            update: project,
          },
          morph,
        )
        /* An elevation's annotations do not survive the building standing up. */
        .add(
          {
            targets: [anno, `${scope} .bp-note-1`],
            opacity: 0,
            duration: 340,
            easing: "linear",
          },
          morph,
        )
        .add(
          {
            targets: ".iso-el[data-late]",
            opacity: [0, 1],
            duration: 700,
            easing: "linear",
          },
          morph + 650,
        )
        .add(
          {
            targets: ".iso-el .ifc",
            fillOpacity: [0, 0.97],
            delay: anime.stagger(12),
            duration: 420,
            easing: "linear",
          },
          morph + 770,
        )
        .add(
          {
            targets: `${scope} .bp-note-2`,
            opacity: [0, 1],
            translateY: [8, 0],
            duration: 440,
          },
          morph + MORPH_MS - 260,
        )
        .add(
          {
            targets: `${scope} .iso-hint`,
            opacity: [0, 1],
            duration: 480,
            easing: "linear",
          },
          morph + MORPH_MS - 120,
        );
    }

    /* React runs effects twice in development. Tear the scene down completely
       rather than leaving a second copy of it behind the first. */
    return () => {
      tl?.pause();
      cleanups.forEach((fn) => fn());
      scene.remove();
      anno.remove();
    };
  }, []);

  return (
    <section
      id="sks-hero"
      className="relative overflow-hidden border-b border-navy-700 bg-navy-950 text-white"
    >
      <div className="blueprint-grid absolute inset-0" aria-hidden="true" />
      {/* Lifts the copy off the grid without a shadow. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/80 to-transparent"
        aria-hidden="true"
      />

      {/* The drawing leads on small screens. On a phone the headline arrives
          first anyway by being taller than the fold; putting the drawing above
          it means the thing that explains the business is the thing you see,
          rather than a column of text with the drawing stranded below it.
          From lg up the twelve-column layout puts the copy back on the left. */}
      <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-4 lg:py-20">
        <div className="order-2 lg:order-1 lg:col-span-5">
          <p className="anno hero-fade mb-5 text-gold-300">
            {site.serviceArea}
          </p>

          <h1 className="text-4xl leading-[1.02] sm:text-5xl lg:text-[3.85rem]">
            <span className="line-mask">
              <span>Construction,</span>
            </span>
            <span className="line-mask">
              <span>joinery and roofing</span>
            </span>
            <span className="line-mask">
              <span className="text-gold-300">under one roof.</span>
            </span>
          </h1>

          <p className="hero-fade mt-7 max-w-md text-lg text-navy-200">
            One firm, one point of contact, one quote. We handle the trades
            between us instead of handing you a chain of subcontractors to
            chase.
          </p>

          <div className="hero-fade mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/contact" size="lg">
              Request a quote
            </ButtonLink>
            <ButtonLink href="/projects" size="lg" variant="onDark">
              See our work
            </ButtonLink>
          </div>

          {/* Division index. Doubles as the keyboard-reachable route to the
              same three pages the drawing links to on click. */}
          <ul className="hero-fade mt-10 grid gap-px border border-navy-700 bg-navy-700 sm:grid-cols-3">
            {Object.entries(ISO_MAP).map(([key, [name, href]]) => (
              <li key={key} className="bg-navy-950">
                <Link
                  href={href}
                  className="block px-4 py-3 text-sm font-semibold text-navy-100 transition-colors hover:bg-navy-900 hover:text-gold-300"
                >
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7">
          <div
            ref={vizRef}
            className="relative aspect-[9/7] w-full"
            aria-label="Front elevation of a house that unfolds into an isometric view. Each part links to the division that builds it."
          >
            <svg viewBox="0 0 900 660" className="iso-svg" ref={svgRef}>
              <defs>
                {/* The hand-drawn wobble. It is the whole reason this reads as
                    a drawing rather than a CAD export. */}
                <filter
                  id="sks-rough"
                  x="-8%"
                  y="-8%"
                  width="116%"
                  height="116%"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.011"
                    numOctaves={2}
                    seed={11}
                    result="n"
                  />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale={2.4} />
                </filter>
              </defs>
            </svg>

            {/* The practice signs the sheet before it draws on it. Stroked
                letterforms rather than the header's typeset wordmark, so the
                mark is drawn by the same hand as the building. */}
            <svg
              className="sks-mark absolute top-[2%] left-[2%] w-[26%] max-w-[190px]"
              viewBox="0 0 150 66"
              aria-hidden="true"
            >
              <path d="M32 15C32 9 26 7 19 7C11 7 5 10 5 16C5 22 12 24 19 25C26 26 33 28 33 35C33 42 26 45 19 45C12 45 5 42 5 36" />
              <path d="M46 7L46 45" />
              <path d="M72 7L48 26" />
              <path d="M56 20L72 45" />
              <path d="M112 15C112 9 106 7 99 7C91 7 85 10 85 16C85 22 92 24 99 25C106 26 113 28 113 35C113 42 106 45 99 45C92 45 85 42 85 36" />
              <rect className="sks-square" x="124" y="7" width="12" height="12" />
              <line x1="5" y1="55" x2="136" y2="55" />
              <text
                className="sks-tag"
                x="5"
                y="64"
                fill="#7f9bd4"
                fontSize="7"
                letterSpacing="2.6"
                fontFamily="ui-monospace, monospace"
              >
                CONSTRUCTION
              </text>
            </svg>

            <span className="bp-note bp-note-1 top-[24%] left-[2%]">
              As drawn
            </span>
            <span className="bp-note bp-note-2 top-[3%] right-[2%]">
              As built
            </span>

            <div className="iso-label" ref={labelRef}>
              <b />
              <span>View division</span>
            </div>
          </div>

          <p className="anno iso-hint mt-2 text-center text-navy-300">
            Select any part of the building
          </p>
        </div>
      </div>
    </section>
  );
}
