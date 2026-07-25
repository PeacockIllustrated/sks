/**
 * Isometric drawing maths.
 *
 * Shared by the hero, which tweens a camera between a front elevation and an
 * isometric view, and the project builder, which only ever draws the isometric
 * end of that same camera. Keeping one projection here is what makes the two
 * drawings look like they came out of the same drawing office rather than
 * merely using the same palette.
 *
 * The model space is millimetres-ish and consistent across both: x runs along
 * the frontage, y into the plot, z up. Front faces are at maximum y, so the
 * elevation is the y = depth face.
 */

export type Point3 = [number, number, number];
export type Point2 = [number, number];

/** Camera constants. Chosen so the extremes of either model stay inside the
 *  viewBox at both ends of the hero's tween. */
export const ISO_K = 0.9;
export const ISO_OX = 445;
export const ISO_OY = 210;
export const F_S = 1.25;
export const F_X0 = 120;
export const F_Y0 = 575;

/**
 * Project a 3D point at camera position `t`.
 *
 *   t = 0  front orthographic - y drops out, so depth collapses and what is
 *          left reads as an architect's elevation
 *   t = 1  isometric
 *
 * Interpolating the projected points rather than rotating the model is what
 * makes the hero read as one object standing up instead of two drawings
 * crossfading.
 */
export function project(x: number, y: number, z: number, t: number): Point2 {
  const fx = F_X0 + x * F_S;
  const fy = F_Y0 - z * F_S;
  const ix = ISO_OX + (x - y) * 0.866 * ISO_K;
  const iy = ISO_OY + (x + y) * 0.5 * ISO_K - z * ISO_K;
  return [fx + (ix - fx) * t, fy + (iy - fy) * t];
}

/** The isometric end of the camera, for drawings that never rotate. */
export function iso(x: number, y: number, z: number): Point2 {
  return project(x, y, z, 1);
}

/** The front-orthographic end, for annotation overlays that stay flat. */
export function front(x: number, z: number): Point2 {
  return [F_X0 + x * F_S, F_Y0 - z * F_S];
}

/** Format a list of 3D points as an SVG `points` attribute at camera `t`. */
export function points(pts: Point3[], t = 1): string {
  return pts
    .map((p) =>
      project(p[0], p[1], p[2], t)
        .map((v) => v.toFixed(1))
        .join(","),
    )
    .join(" ");
}

/**
 * Lighten (f > 0) or darken (f < 0) a hex colour.
 *
 * Returns hex rather than `rgb()` so the result can be fed straight back in.
 * Box faces are each shaded from the same base colour, and a colour that has
 * already been shaded once still has to parse.
 */
export function shade(hex: string, f: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  let r = n >> 16;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (f < 0) {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  } else {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  }
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** A cuboid's three visible faces: front (max y), side (max x) and top.
 *  Returned back to front, which is also the order they must be painted in:
 *  SVG has no depth buffer, so document order is the depth order. */
export function boxFaces(
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  h: number,
): { front: Point3[]; side: Point3[]; top: Point3[] } {
  return {
    front: [
      [x, y + d, z0],
      [x + w, y + d, z0],
      [x + w, y + d, z0 + h],
      [x, y + d, z0 + h],
    ],
    side: [
      [x + w, y, z0],
      [x + w, y + d, z0],
      [x + w, y + d, z0 + h],
      [x + w, y, z0 + h],
    ],
    top: [
      [x, y, z0 + h],
      [x + w, y, z0 + h],
      [x + w, y + d, z0 + h],
      [x, y + d, z0 + h],
    ],
  };
}

/** A flat panel on a constant-y face: windows, doors, glazing. */
export function facePanel(
  x0: number,
  x1: number,
  y: number,
  z0: number,
  z1: number,
): Point3[] {
  return [
    [x0, y, z0],
    [x1, y, z0],
    [x1, y, z1],
    [x0, y, z1],
  ];
}

/** Shared material palette. Muted enough to sit on the navy ground without
 *  turning a drawing into a paint chart. */
export const MATERIALS = {
  brick: "#8d5f4a",
  render: "#c8c1b4",
  slate: "#474d57",
  glass: "#6d90b6",
  timber: "#a8783e",
  stone: "#b4ad9f",
  paving: "#5c5c68",
  ground: "#1c2133",
} as const;

/** Line colours. The ink is blueprint blue; the detail is warmer. */
export const INK = "#7f9bd4";
export const INK_SOFT = "rgba(127,155,212,0.45)";
export const DETAIL = "#c8973e";
