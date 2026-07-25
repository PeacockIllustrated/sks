/**
 * The project builder's option set.
 *
 * Dimensions are millimetres throughout, which is what the drawings and the
 * quotes use. Nothing here is priced: the builder exists to make a multi-trade
 * job feel concrete before someone fills in the enquiry form, not to pretend a
 * bespoke build has a list price.
 */

export type FormKey = "single" | "double" | "wrap";
export type RoofKey = "pitched" | "flat" | "mono";
export type GlazingKey = "bifold" | "sliding" | "picture";

export type Finish = { name: string; hex: string };

/** Overall envelope of the main mass, before the roof goes on. */
export const FORMS: Record<
  FormKey,
  { label: string; width: number; depth: number; height: number; note: string }
> = {
  single: {
    label: "Single storey",
    width: 6000,
    depth: 4000,
    height: 2700,
    note: "Rear extension, one storey, opening onto the garden.",
  },
  double: {
    label: "Two storey",
    width: 6000,
    depth: 4000,
    height: 5400,
    note: "Two storeys, adding a bedroom over the new ground floor.",
  },
  wrap: {
    label: "Wraparound",
    width: 6000,
    depth: 4000,
    height: 2700,
    note: "Rear extension carried around the side return in one programme.",
  },
};

export const FORM_ORDER: FormKey[] = ["single", "double", "wrap"];

/** The side return on a wraparound. Flat roofed, whatever the main roof does. */
export const RETURN = { width: 2600, depth: 2600 };

export const ROOFS: Record<
  RoofKey,
  { label: string; rise: number; division: string }
> = {
  pitched: { label: "Pitched slate", rise: 1750, division: "Roofing" },
  flat: { label: "Flat, with lantern", rise: 0, division: "Roofing" },
  mono: { label: "Mono-pitch", rise: 1250, division: "Roofing" },
};

export const ROOF_ORDER: RoofKey[] = ["pitched", "flat", "mono"];

export const GLAZING: Record<
  GlazingKey,
  { label: string; leaves: number; widthRatio: number }
> = {
  bifold: { label: "Bi-fold doors", leaves: 5, widthRatio: 0.74 },
  sliding: { label: "Sliding doors", leaves: 3, widthRatio: 0.68 },
  picture: { label: "Picture window", leaves: 2, widthRatio: 0.52 },
};

export const GLAZING_ORDER: GlazingKey[] = ["bifold", "sliding", "picture"];

/** Wall finishes. Real ranges, kept to what a North East job actually uses. */
export const FINISHES: Finish[] = [
  { name: "Red multi brick", hex: "#8d5f4a" },
  { name: "Buff brick", hex: "#b09272" },
  { name: "Grey brick", hex: "#7c7e84" },
  { name: "White render", hex: "#e4e0d8" },
  { name: "Cedar cladding", hex: "#a2703c" },
];

export type Selection = {
  form: FormKey;
  roof: RoofKey;
  glazing: GlazingKey;
  finish: string;
  finishName: string;
};

/** Lighten (f > 0) or darken (f < 0) a hex colour. Mirrors the hero's helper. */
export function shadeHex(hex: string, f: number): string {
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
