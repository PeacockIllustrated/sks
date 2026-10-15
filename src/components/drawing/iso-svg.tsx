import {
  type Item,
  type PatternSpec,
  type Projector,
  itemBounds,
  patternMarkup,
  patternSize,
  patternTransform,
  pointsAttr,
} from "@/lib/scene3d";

/**
 * Paint a rendered scene as SVG elements.
 *
 * Static: the hero draws its own scene imperatively because its camera moves,
 * everything else comes through here. Server-renderable, so a detail sheet
 * costs no JavaScript on the page it sits on.
 */

export function PatternDefs({ patterns, proj }: { patterns: PatternSpec[]; proj: Projector }) {
  return (
    <>
      {patterns.map((p) => {
        const [w, h] = patternSize(p.kind);
        return (
          <pattern
            key={p.id}
            id={p.id}
            patternUnits="userSpaceOnUse"
            width={w}
            height={h}
            patternTransform={patternTransform(p, proj)}
            dangerouslySetInnerHTML={{ __html: patternMarkup(p) }}
          />
        );
      })}
    </>
  );
}

export function IsoItems({
  items,
  proj,
  itemProps,
}: {
  items: Item[];
  proj: Projector;
  /** Extra attributes per item, e.g. a class for the parts in scope. */
  itemProps?: (it: Item) => Record<string, string | number | undefined> | undefined;
}) {
  return (
    <>
      {items.map((it, i) => {
        const extra = itemProps?.(it);
        if (it.kind === "poly") {
          return (
            <polygon
              key={i}
              points={pointsAttr(it.pts, proj)}
              fill={it.fill}
              fillOpacity={it.fillOpacity}
              stroke={it.stroke ?? "none"}
              strokeWidth={it.sw}
              strokeOpacity={it.so}
              strokeLinejoin="round"
              {...extra}
            />
          );
        }
        const [x1, y1] = proj(it.a);
        const [x2, y2] = proj(it.b);
        return (
          <line
            key={i}
            x1={x1.toFixed(1)}
            y1={y1.toFixed(1)}
            x2={x2.toFixed(1)}
            y2={y2.toFixed(1)}
            stroke={it.stroke}
            strokeWidth={it.sw}
            strokeOpacity={it.so}
            strokeLinecap="round"
            {...extra}
          />
        );
      })}
    </>
  );
}

/** A viewBox around the drawing, with padding. Square when asked, so a set of
 *  sheets shown side by side keeps one scale. */
export function fitViewBox(items: Item[], proj: Projector, pad = 16, square = false) {
  const b = itemBounds(items, proj);
  let w = b.x1 - b.x0 + pad * 2;
  let h = b.y1 - b.y0 + pad * 2;
  let x = b.x0 - pad;
  let y = b.y0 - pad;
  if (square) {
    const s = Math.max(w, h);
    x -= (s - w) / 2;
    y -= (s - h) / 2;
    w = s;
    h = s;
  }
  const r = (v: number) => v.toFixed(1);
  return `${r(x)} ${r(y)} ${r(w)} ${r(h)}`;
}
