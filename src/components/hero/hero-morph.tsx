"use client";

import anime from "animejs";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { DETAIL, INK } from "@/lib/iso";
import {
  isoUnit,
  patternMarkup,
  patternSize,
  patternTransform,
  renderScene,
  type Item,
  type PatternSpec,
  type Projector,
  type V2,
  type V3,
} from "@/lib/scene3d";
import { cn } from "@/lib/utils";
import {
  CALLOUTS,
  EX1,
  GHOSTS,
  GROUND,
  HX,
  HY,
  RIDGE_TOP,
  buildHero,
} from "./hero-model";

/* ===========================================================================
   The hero: a front elevation that unfolds into the building.

   One house, modelled in millimetres (hero-model.ts). A single camera
   parameter `t` interpolates the projection between:

     t = 0  front orthographic - depth collapses, and what is left is exactly an
            architect's elevation: outline, openings, ground line, dimensions
     t = 1  isometric - the drawing stands up into a building

   Every shape stores real 3D points. Only the projection changes, which is what
   makes the move read as one object rotating rather than two drawings
   crossfading.

   It is drawn twice. The linework layer is the elevation: every face filled
   with the sheet colour, so the faces in front hide the lines behind them
   the way an elevation does, and outlined in blueprint ink under a wobble.
   The finished layer is the building in its materials. The sequence draws
   the linework on, stands it up, and fades the finished building in over it
   as the camera arrives.

   The scene is built imperatively against a ref'd <svg>. Tweening `t` through
   React state would re-render sixty times a second to set the same attributes
   this does directly.
   =========================================================================== */

const NS = "http://www.w3.org/2000/svg";

/** The sheet colour, which the linework layer fills its faces with. */
const SHEET = "#0b0b15";

/** Hotspot key -> what the info box says about it. The three divisions, on
 *  the building. */
type Hotspot = { name: string; href: string; body: string; cta: string };

const ISO_MAP: Record<string, Hotspot> = {
  joinery: {
    name: "Joinery & interiors",
    href: "/joinery",
    body: "Kitchens, staircases and fitted furniture, made and fitted by our own team.",
    cta: "See our joinery",
  },
  construction: {
    name: "Extensions",
    href: "/construction",
    body: "Extensions, openings and structural work, built to the same programme as the fit-out.",
    cta: "See our extensions",
  },
  roofing: {
    name: "Roofing",
    href: "/roofing",
    body: "Pitched and flat roofs, rooflights, leadwork and guttering.",
    cta: "See our roofing",
  },
};

/** Where the info box sits, in pixels inside the drawing. `below` flips it
 *  under the tap point when there is no room above it. */
type Info = { key: string; x: number; y: number; below: boolean };

type View = "exterior" | "interior";

type Box = { x0: number; y0: number; x1: number; y1: number };

/* ------------------------------------------------------------ the camera */

/** Fit a set of points, through a unit projection, into a target rectangle. */
function fit(pts: V3[], unit: (p: V3) => V2, into: Box) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    const [x, y] = unit(p);
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const k = Math.min((into.x1 - into.x0) / (x1 - x0), (into.y1 - into.y0) / (y1 - y0));
  const ox = (into.x0 + into.x1) / 2 - ((x0 + x1) / 2) * k;
  const oy = (into.y0 + into.y1) / 2 - ((y0 + y1) / 2) * k;
  return { k, ox, oy };
}

const itemPts = (it: Item): V3[] => (it.kind === "poly" ? it.pts : [it.a, it.b]);

/** The whole scene, rendered once into paint with both ends of the camera
 *  fitted to the sheet. Deterministic, so it is computed once per page. */
function prepare() {
  const { back, ext, int, front } = buildHero();
  const opts = (prefix: string) => ({ prefix, edge: 0.5, silhouette: 1, shadow: 0.34 });
  const R = {
    back: renderScene(back, opts("hb")),
    ext: renderScene(ext, opts("he")),
    int: renderScene(int, opts("hi")),
    front: renderScene(front, opts("hf")),
  };

  /* Frame the building and what stands round it; the ground, the hedges and
     the street wall are allowed to run off the sheet. */
  const framed = [...R.back.items, ...R.ext.items, ...R.front.items]
    .filter((it) => it.role !== "shadow" && !it.node.tags.nofit && it.node.tags.key !== undefined)
    .filter((it) => !(it.node.tags.key === "construction" && it.node.tags.late && it.node.max[2] > GROUND + 100))
    .flatMap(itemPts);
  const iso = fit(framed, isoUnit, { x0: 30, y0: 40, x1: 880, y1: 650 });

  /* The elevation: the frontage and its height, with room for the
     dimension strings either side and the title block above. */
  const elevation = R.ext.items.filter((it) => it.role !== "shadow").flatMap(itemPts);
  const front2 = fit(elevation, (p) => [p[0], -p[2]], { x0: 150, y0: 150, x1: 790, y1: 585 });

  const I: Projector = (p) => [iso.ox + (p[0] - p[1]) * 0.8660254 * iso.k, iso.oy + ((p[0] + p[1]) * 0.5 - p[2]) * iso.k];
  const F: Projector = (p) => [front2.ox + p[0] * front2.k, front2.oy - p[2] * front2.k];
  const at = (t: number): Projector => {
    if (t >= 1) return I;
    if (t <= 0) return F;
    return (p) => {
      const a = F(p);
      const b = I(p);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
  };

  /* The room framing: tight on the cutaway, at the sheet's aspect. */
  const room = R.int.items.filter((it) => it.role !== "shadow").flatMap(itemPts).map(I);
  const rx0 = Math.min(...room.map((p) => p[0])) - 24;
  const rx1 = Math.max(...room.map((p) => p[0])) + 24;
  const ry0 = Math.min(...room.map((p) => p[1])) - 24;
  const ry1 = Math.max(...room.map((p) => p[1])) + 24;
  let w = rx1 - rx0;
  let h = ry1 - ry0;
  if (w / h > 900 / 660) h = (w * 660) / 900;
  else w = (h * 900) / 660;
  const cx = (rx0 + rx1) / 2;
  const cy = (ry0 + ry1) / 2;
  const interior: [number, number, number, number] = [cx - w / 2, cy - h / 2, w, h];

  return { R, I, F, at, interior };
}

let prepared: ReturnType<typeof prepare> | null = null;

/** The two framings of the sheet. The interior one is computed from the
 *  cutaway, at the same aspect ratio as the full sheet. */
const VIEWBOX: Record<View, [number, number, number, number]> = {
  exterior: [0, 0, 900, 660],
  interior: [0, 0, 900, 660],
};

export function HeroMorph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const vizRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("exterior");
  const [info, setInfo] = useState<Info | null>(null);

  /* The scene lives in an effect, the toggle lives in the render. This is the
     seam between them: the effect installs the function that flips the scene,
     and the buttons call it. `touched` stops the opening sequence from
     overriding a choice somebody has already made. */
  const applyView = useRef<(next: View, user?: boolean) => void>(() => {});

  /* Closes the info box and drops the highlight it put on the building. The
     effect installs it, because the highlight lives on the scene. */
  const dismiss = useRef<() => void>(() => {});

  useEffect(() => {
    const svg = svgRef.current;
    const viz = vizRef.current;
    if (!svg || !viz) return;

    const reduced = document.documentElement.classList.contains("reduced");
    prepared ??= prepare();
    const { R, I, F, at, interior } = prepared;
    VIEWBOX.interior = interior;
    const camera = { t: reduced ? 1 : 0 };

    type Shape = { el: SVGElement; pts: V3[]; kind: "poly" | "line" };
    const moving: Shape[] = [];
    const lines: Shape[] = [];

    const setPts = (s: Shape, proj: Projector) => {
      if (s.kind === "poly") {
        let d = "";
        for (const p of s.pts) {
          const [x, y] = proj(p);
          d += `${x.toFixed(1)},${y.toFixed(1)} `;
        }
        s.el.setAttribute("points", d);
      } else {
        const [x1, y1] = proj(s.pts[0]);
        const [x2, y2] = proj(s.pts[1]);
        s.el.setAttribute("x1", x1.toFixed(1));
        s.el.setAttribute("y1", y1.toFixed(1));
        s.el.setAttribute("x2", x2.toFixed(1));
        s.el.setAttribute("y2", y2.toFixed(1));
      }
    };

    /* ================= patterns =================
       Laid in each face's plane by a matrix, so the ones on moving faces are
       re-laid every frame of the camera move. */
    const defs = svg.querySelector("defs") as SVGDefsElement;
    const movingPatterns: { el: SVGPatternElement; spec: PatternSpec }[] = [];
    const addPatterns = (list: PatternSpec[], moves: boolean) => {
      for (const p of list) {
        const el = document.createElementNS(NS, "pattern") as SVGPatternElement;
        const [w, h] = patternSize(p.kind);
        el.setAttribute("id", p.id);
        el.setAttribute("patternUnits", "userSpaceOnUse");
        el.setAttribute("width", String(w));
        el.setAttribute("height", String(h));
        el.innerHTML = patternMarkup(p);
        el.setAttribute("patternTransform", patternTransform(p, moves ? at(camera.t) : I));
        defs.appendChild(el);
        if (moves) movingPatterns.push({ el, spec: p });
      }
    };
    addPatterns(R.back.patterns, true);
    addPatterns(R.ext.patterns, true);
    addPatterns(R.front.patterns, true);
    addPatterns(R.int.patterns, false);

    /* ================= the finished layer =================
       Painted back to front. Consecutive items that answer to the same
       hotspot share a group, which is what the hover and tap handlers hang
       off. */
    const finished = document.createElementNS(NS, "g");
    finished.setAttribute("class", "hero-finished");
    if (!reduced) finished.style.opacity = "0";
    svg.appendChild(finished);

    const paint = (items: Item[], layer: "site" | "out" | "in") => {
      let g: SVGGElement | null = null;
      let sig = "";
      for (const it of items) {
        const tags = it.node.tags;
        const key = (tags.key as string | undefined) ?? "";
        const late = !!tags.late && layer !== "in";
        const hide = !!tags.hide;
        const next = `${key}|${late}|${hide}`;
        if (!g || next !== sig) {
          sig = next;
          g = document.createElementNS(NS, "g");
          const cls = ["iso-el"];
          if (layer === "out" || hide) cls.push("ext-out");
          if (layer === "in") cls.push("ext-in");
          g.setAttribute("class", cls.join(" "));
          if (key) g.setAttribute("data-key", key);
          if (late) {
            g.dataset.late = "1";
            if (!reduced) g.style.opacity = "0";
          }
          finished.appendChild(g);
        }
        let el: SVGElement;
        if (it.kind === "poly") {
          el = document.createElementNS(NS, "polygon");
          el.setAttribute("fill", it.fill);
          if (it.fillOpacity !== undefined) el.setAttribute("fill-opacity", String(it.fillOpacity));
          if (it.stroke) {
            el.setAttribute("stroke", it.stroke);
            el.setAttribute("stroke-width", String(it.sw ?? 0.5));
            el.setAttribute("stroke-opacity", String(it.so ?? 0.5));
            el.setAttribute("stroke-linejoin", "round");
          }
        } else {
          el = document.createElementNS(NS, "line");
          el.setAttribute("stroke", it.stroke);
          el.setAttribute("stroke-width", String(it.sw));
          el.setAttribute("stroke-opacity", String(it.so));
          el.setAttribute("stroke-linecap", "round");
        }
        g.appendChild(el);
        const shape: Shape = { el, pts: itemPts(it), kind: it.kind };
        if (layer === "in") setPts(shape, I);
        else moving.push(shape);
      }
    };
    paint(R.back.items, "site");
    paint(R.ext.items, "out");
    paint(R.int.items, "in");
    paint(R.front.items, "site");

    /* ================= the linework layer =================
       The elevation as it is drawn. Not needed at all without motion. */
    const linework = document.createElementNS(NS, "g");
    linework.setAttribute("filter", "url(#sks-rough)");
    linework.setAttribute("class", "hero-linework");
    if (!reduced) {
      svg.insertBefore(linework, finished);
      const ground = document.createElementNS(NS, "line");
      ground.setAttribute("stroke", INK);
      ground.setAttribute("stroke-width", "1.4");
      ground.setAttribute("stroke-linecap", "round");
      linework.appendChild(ground);
      lines.push({ el: ground, pts: [[-1600, HY, GROUND], [EX1 + 1800, HY, GROUND]], kind: "line" });
      for (const it of R.ext.items) {
        if (it.role === "shadow" || it.role === "edge") continue;
        let el: SVGElement;
        if (it.kind === "poly") {
          el = document.createElementNS(NS, "polygon");
          const face = it.role === "face";
          el.setAttribute("fill", face ? SHEET : "none");
          el.setAttribute("stroke", INK);
          el.setAttribute("stroke-width", face ? "1" : "0.7");
          el.setAttribute("stroke-opacity", face ? "0.95" : "0.75");
          el.setAttribute("stroke-linejoin", "round");
        } else {
          el = document.createElementNS(NS, "line");
          el.setAttribute("stroke", INK);
          el.setAttribute("stroke-width", "0.7");
          el.setAttribute("stroke-opacity", "0.75");
          el.setAttribute("stroke-linecap", "round");
        }
        linework.appendChild(el);
        lines.push({ el, pts: itemPts(it), kind: it.kind });
      }
    }

    function project() {
      const proj = at(camera.t);
      for (const s of lines) setPts(s, proj);
      for (const s of moving) setPts(s, proj);
      for (const p of movingPatterns) p.el.setAttribute("patternTransform", patternTransform(p.spec, proj));
    }

    /* ================= annotations =================
       Outside the displacement filter: dimension strings are typeset, not
       drawn by hand. Only meaningful in elevation, so they fade before the
       camera moves. */
    const anno = document.createElementNS(NS, "g");
    anno.style.opacity = "0";
    anno.style.pointerEvents = "none";
    svg.appendChild(anno);
    const FP = (x: number, z: number) => F([x, 0, z]);

    function aLine(a: V2, b: V2, dash?: boolean) {
      const l = document.createElementNS(NS, "line");
      l.setAttribute("x1", a[0].toFixed(1));
      l.setAttribute("y1", a[1].toFixed(1));
      l.setAttribute("x2", b[0].toFixed(1));
      l.setAttribute("y2", b[1].toFixed(1));
      l.setAttribute("stroke", INK);
      l.setAttribute("stroke-width", "1.1");
      l.setAttribute("opacity", "0.65");
      if (dash) l.setAttribute("stroke-dasharray", "9 7");
      anno.appendChild(l);
    }

    function aText(p: V2, str: string, cls?: string, rot?: boolean) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("x", p[0].toFixed(1));
      t.setAttribute("y", p[1].toFixed(1));
      if (cls) t.setAttribute("class", cls);
      if (rot) t.setAttribute("transform", `rotate(90 ${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
      t.textContent = str;
      anno.appendChild(t);
    }

    /** A dimension tick: the 45-degree stroke surveyors use instead of an arrow. */
    function tick(p: V2) {
      aLine([p[0] - 5, p[1] + 5], [p[0] + 5, p[1] - 5]);
    }

    {
      /* Overall frontage, below the ground line. */
      const dz = GROUND - 750;
      const a = FP(0, dz);
      const b = FP(EX1, dz);
      aLine(a, b);
      tick(a);
      tick(b);
      aLine(FP(0, GROUND - 180), FP(0, dz - 220));
      aLine(FP(EX1, GROUND - 180), FP(EX1, dz - 220));
      aText([(a[0] + b[0]) / 2 - 26, a[1] + 22], String(EX1));

      /* Ridge height above floor level, up the right-hand side. */
      const vx = EX1 + 1100;
      const v0 = FP(vx, 0);
      const v1 = FP(vx, RIDGE_TOP);
      aLine(v0, v1);
      tick(v0);
      tick(v1);
      aLine(FP(EX1 + 200, 0), FP(vx + 220, 0));
      aLine(FP(HX / 2 + 300, RIDGE_TOP), FP(vx + 220, RIDGE_TOP));
      aText([v0[0] + 20, (v0[1] + v1[1]) / 2 - 26], String(RIDGE_TOP), undefined, true);

      /* Ridge centre line. */
      aLine(FP(HX / 2, RIDGE_TOP + 1900), FP(HX / 2, GROUND - 400), true);

      /* Title block, top right of the sheet, clear of the stack. */
      const tp = FP(HX / 2 + 1000, RIDGE_TOP + 1300);
      aText(tp, "SKS - FRONT ELEVATION - SCALE 1:100", "title");
      aLine([tp[0], tp[1] + 8], [tp[0] + 300, tp[1] + 8]);

      /* Finished floor level. */
      aText(FP(-2000, 80), "0.000");
    }

    /* ================= cutaway annotations =================
       Static, at the isometric end of the camera. They only exist in the
       interior view. */
    const annoIn = document.createElementNS(NS, "g");
    annoIn.setAttribute("class", "anno-in");
    annoIn.style.pointerEvents = "none";
    svg.appendChild(annoIn);

    {
      /* Where the roof was. A dashed outline is how a drawing says "removed
         for clarity", and it keeps the house reading as a house with a roof
         on it rather than a set of rooms that was never closed. */
      for (const run of GHOSTS) {
        const ghost = document.createElementNS(NS, "polyline");
        ghost.setAttribute(
          "points",
          run.map((p) => I(p).map((v) => v.toFixed(1)).join(",")).join(" "),
        );
        ghost.setAttribute("fill", "none");
        ghost.setAttribute("stroke", DETAIL);
        ghost.setAttribute("stroke-width", "1");
        ghost.setAttribute("stroke-dasharray", "7 5");
        ghost.setAttribute("opacity", "0.5");
        annoIn.appendChild(ghost);
      }

      CALLOUTS.forEach((c) => {
        const [mx, my] = I(c.at);
        const m = document.createElementNS(NS, "g");
        m.setAttribute("transform", `translate(${mx.toFixed(1)} ${my.toFixed(1)})`);
        const r = document.createElementNS(NS, "rect");
        r.setAttribute("x", "-9");
        r.setAttribute("y", "-9");
        r.setAttribute("width", "18");
        r.setAttribute("height", "18");
        r.setAttribute("class", "marker-box");
        const t = document.createElementNS(NS, "text");
        t.setAttribute("class", "marker-n");
        t.setAttribute("y", "3.2");
        t.textContent = c.n;
        m.append(r, t);
        annoIn.appendChild(m);
      });
    }

    project();

    /* ================= the view toggle ================= */
    let touched = false;
    let zoom: anime.AnimeInstance | null = null;
    const frame = { x: 0, y: 0, w: 900, h: 660 };
    applyView.current = (next, user) => {
      if (user) touched = true;
      else if (touched) return;
      viz.dataset.view = next;
      dismiss.current();
      setView(next);

      /* Move the camera in on the room, or back out to the whole plot. */
      const to = VIEWBOX[next];
      zoom?.pause();
      if (reduced) {
        svg.setAttribute("viewBox", to.join(" "));
        return;
      }
      zoom = anime({
        targets: frame,
        x: to[0],
        y: to[1],
        w: to[2],
        h: to[3],
        duration: 1300,
        easing: "easeInOutCubic",
        update: () =>
          svg.setAttribute(
            "viewBox",
            `${frame.x} ${frame.y} ${frame.w} ${frame.h}`,
          ),
      });
    };
    /* Without motion there is no sequence to wait for, so go straight to the
       room. It is the point of the page. */
    if (reduced) applyView.current("interior");

    /* ================= hotspots =================
       A tap or click opens an info box at the point touched, with a button
       through to the division. It does not navigate on its own: on a phone
       there is no hover, so a tap that jumped straight to another page would
       give nobody the chance to see what they had touched. Hover still lifts
       the part under a mouse, as a hint that it can be selected. */
    const cleanups: Array<() => void> = [];
    let pinned: string | null = null;
    const lift = (key: string | null) => {
      svg.querySelectorAll<SVGGElement>(".iso-el.lift").forEach((el) => {
        if (el.dataset.key !== key) el.classList.remove("lift");
      });
      if (key) {
        svg
          .querySelectorAll<SVGGElement>(`.iso-el[data-key="${key}"]`)
          .forEach((el) => el.classList.add("lift"));
      }
    };

    dismiss.current = () => {
      pinned = null;
      lift(null);
      setInfo(null);
    };

    /* Delegated from the finished layer: it holds a few hundred groups. */
    const keyOf = (e: Event) => {
      const g = (e.target as Element | null)?.closest<SVGGElement>(".iso-el[data-key]");
      const key = g?.dataset.key;
      return key && ISO_MAP[key] ? key : null;
    };
    let hovered: string | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const key = keyOf(e);
      if (key === hovered) return;
      hovered = key;
      lift(key ?? pinned);
    };
    const onOut = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (finished.contains(e.relatedTarget as Node | null)) return;
      hovered = null;
      lift(pinned);
    };
    const onClick = (e: MouseEvent) => {
      const key = keyOf(e);
      if (!key) return;
      const host = viz.getBoundingClientRect();
      pinned = key;
      lift(key);
      const y = e.clientY - host.top;
      setInfo({
        key,
        x: e.clientX - host.left,
        y,
        /* The box is roughly 170px tall. Under the tap if it would run off
           the top of the drawing. */
        below: y < 190,
      });
    };
    finished.addEventListener("pointermove", onMove);
    finished.addEventListener("pointerout", onOut);
    finished.addEventListener("click", onClick);
    cleanups.push(() => {
      finished.removeEventListener("pointermove", onMove);
      finished.removeEventListener("pointerout", onOut);
      finished.removeEventListener("click", onClick);
    });

    /* Anywhere else closes it: a tap on the page, the grid, or Escape. */
    const onDocDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || !pinned) return;
      if (popRef.current?.contains(target)) return;
      if (target.closest(".iso-el[data-key]")) return;
      dismiss.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pinned) dismiss.current();
    };
    document.addEventListener("pointerdown", onDocDown);
    document.addEventListener("keydown", onKey);
    cleanups.push(() => {
      document.removeEventListener("pointerdown", onDocDown);
      document.removeEventListener("keydown", onKey);
    });

    /* ================= the timeline ================= */
    let tl: anime.AnimeTimelineInstance | null = null;
    let flip: number | undefined;

    if (!reduced) {
      /* Dash every line of the elevation so it can be drawn on. Lengths come
         from the elevation itself, which is cheaper than asking the browser
         and works on engines that refuse getTotalLength on a polygon. */
      const drawn = lines.map((s) => {
        const pts = s.pts.map(F);
        let len = 0;
        const n = s.kind === "poly" ? pts.length : 1;
        for (let i = 0; i < n; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          len += Math.hypot(b[0] - a[0], b[1] - a[1]);
        }
        len = Math.max(1, len);
        s.el.style.strokeDasharray = String(len);
        s.el.style.strokeDashoffset = String(len);
        return s.el;
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

      /* The elevation is drawn from the ground up, the way it would be set
         out on a board. */
      const DRAW_MS = 1700;
      const STROKE_MS = 480;
      const order = drawn
        .map((el, i) => {
          const pts = lines[i].pts.map(F);
          return { el, y: Math.max(...pts.map((p) => p[1])) };
        })
        .sort((a, b) => b.y - a.y);
      const rank = new Map(order.map((o, i) => [o.el, i]));
      tl.add(
        {
          targets: drawn,
          strokeDashoffset: 0,
          duration: STROKE_MS,
          delay: (el: Element) => ((rank.get(el as SVGElement) ?? 0) / drawn.length) * DRAW_MS,
          easing: "easeInOutSine",
        },
        300,
      );

      /* Every offset below is absolute. Relative offsets would chain off
         whatever was added last, and the copy deliberately runs alongside the
         drawing rather than after it, so there is no single "previous" step to
         hang the rest of the sequence off. */
      const drawEnd = 300 + DRAW_MS + STROKE_MS;
      const morph = drawEnd + 620;
      const MORPH_MS = 1750;
      const scope = "#sks-hero";
      const rough = svg.querySelector("#sks-rough feDisplacementMap");
      const wobble = { s: 2.4 };

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
              drawn.forEach((el) => (el.style.strokeDasharray = "none"));
            },
            update: project,
          },
          morph,
        )
        /* The hand-drawn wobble firms up as the building arrives. */
        .add(
          {
            targets: wobble,
            s: 0,
            duration: MORPH_MS,
            easing: "linear",
            update: () => rough?.setAttribute("scale", wobble.s.toFixed(2)),
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
        /* The building in its materials, over the linework. */
        .add(
          {
            targets: finished,
            opacity: [0, 1],
            duration: 760,
            easing: "linear",
          },
          morph + 760,
        )
        .add(
          {
            targets: linework,
            opacity: [1, 0],
            duration: 520,
            easing: "linear",
            complete: () => linework.remove(),
          },
          morph + 1240,
        )
        .add(
          {
            targets: ".iso-el[data-late]",
            opacity: [0, 1],
            duration: 700,
            easing: "linear",
          },
          morph + 900,
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

      /* Let the finished building be seen, then lift the roof off. The
         interior is the point of the page, so the sequence ends there. */
      flip = window.setTimeout(
        () => applyView.current("interior"),
        morph + MORPH_MS + 2300,
      );
    }

    /* React runs effects twice in development. Tear the scene down completely
       rather than leaving a second copy of it behind the first. */
    return () => {
      tl?.pause();
      window.clearTimeout(flip);
      zoom?.pause();
      cleanups.forEach((fn) => fn());
      finished.remove();
      linework.remove();
      anno.remove();
      annoIn.remove();
      defs.querySelectorAll("pattern").forEach((p) => p.remove());
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
            Joinery and interiors &middot; North East England
          </p>

          <h1 className="text-4xl leading-[1.02] sm:text-5xl lg:text-[3.85rem]">
            <span className="line-mask">
              <span>Joinery, interiors</span>
            </span>
            <span className="line-mask">
              <span>and extensions</span>
            </span>
            <span className="line-mask">
              <span className="text-gold-300">under one roof.</span>
            </span>
          </h1>

          <p className="hero-fade mt-7 max-w-md text-lg text-navy-200">
            Bespoke kitchens, staircases and fitted furniture, and the
            extensions that hold them. One firm builds the space and fits it
            out, so you deal with one team and one quote.
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
            {Object.entries(ISO_MAP).map(([key, { name, href }]) => (
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
            aria-label="Front elevation of a house that unfolds into an isometric view, then opens up to show the fitted interior of the house and its extension. Selecting a part opens a note on the division that builds it."
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

            {/* Clear of the title block, which sits at the top of the sheet in
                elevation coordinates and was being written over. */}
            <span className="bp-note bp-note-1 top-[47%] left-[1%]">
              As drawn
            </span>
            <span className="bp-note bp-note-2 top-[3%] right-[2%]">
              {view === "interior" ? "Inside the house" : "As built"}
            </span>

            {info ? (
              <InfoBox
                info={info}
                ref={popRef}
                onClose={() => dismiss.current()}
              />
            ) : null}
          </div>

          {/* The view toggle and the key to the cutaway. Both stay in the
              layout whichever view is showing, stacked in one grid cell, so the
              sheet does not jump when the roof comes off. */}
          <div className="iso-hint mt-3">
            <div
              role="group"
              aria-label="Choose a view"
              className="inline-flex border border-navy-600"
            >
              {(
                [
                  ["exterior", "Outside"],
                  ["interior", "Inside the house"],
                ] as const
              ).map(([key, name]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={view === key}
                  onClick={() => applyView.current(key, true)}
                  className={cn(
                    "anno px-4 py-2.5 transition-colors",
                    view === key
                      ? "bg-gold-400 text-navy-900"
                      : "text-navy-200 hover:bg-navy-800",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="mt-3 grid [&>*]:col-start-1 [&>*]:row-start-1">
              <p
                className={cn(
                  "anno pt-1 text-navy-300 transition-opacity duration-500",
                  view === "interior" && "invisible opacity-0",
                )}
              >
                Tap any part of the building
              </p>
              <ol
                aria-label="Key to the cutaway"
                aria-hidden={view !== "interior"}
                className={cn(
                  "grid grid-cols-2 gap-px border border-navy-700 bg-navy-700 transition-opacity duration-700 sm:grid-cols-3",
                  view !== "interior" && "invisible opacity-0",
                )}
              >
                {CALLOUTS.map((c) => (
                  <li key={c.n} className="bg-navy-950 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span className="anno inline-flex size-5 shrink-0 items-center justify-center border border-gold-400 text-[10px] tracking-normal text-gold-300">
                        {c.n}
                      </span>
                      {c.title}
                    </p>
                    <p className="mt-1 hidden pl-7 text-xs leading-snug text-navy-300 min-[1700px]:block">
                      {c.body}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The note that opens when part of the drawing is tapped. Kept inside the
 *  drawing's box, and pointed at the spot that was touched. */
function InfoBox({
  info,
  ref,
  onClose,
}: {
  info: Info;
  ref: React.Ref<HTMLDivElement>;
  onClose: () => void;
}) {
  const spot = ISO_MAP[info.key];
  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={spot.name}
      className="iso-pop"
      data-below={info.below ? "" : undefined}
      style={
        {
          "--x": `${info.x}px`,
          "--y": `${info.y}px`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-1.5 right-1.5 p-1.5 text-navy-300 transition-colors hover:text-white"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <p className="anno text-gold-300">Built by</p>
      <p className="mt-1 pr-6 font-display text-base font-bold text-white">
        {spot.name}
      </p>
      <p className="mt-1.5 text-sm leading-snug text-navy-200">{spot.body}</p>
      <Link
        href={spot.href}
        className="mt-3 inline-flex items-center gap-2 bg-gold-400 px-3.5 py-2 text-sm font-semibold text-navy-900 transition-colors hover:bg-gold-300"
      >
        {spot.cta}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
