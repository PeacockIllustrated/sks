import type { DivisionSlug } from "@/lib/site";

/**
 * The project builder's option set.
 *
 * Two stages, and the split is the whole point. First the visitor says what
 * their house *is*, which is a question they can answer without knowing
 * anything about building. Then they say which parts need work, and the drawing
 * shows how much of the house that actually touches.
 *
 * Nothing here is priced. The builder exists to make the size of a job legible
 * before someone fills in the enquiry form, not to pretend a bespoke build has
 * a list price.
 */

export type HouseType = "detached" | "semi" | "terraced";
export type Storeys = "bungalow" | "two";
export type RoofShape = "gable" | "hipped";

/** Anything the drawing can highlight. */
export type ScopeKey =
  | "roof"
  | "extension"
  | "loft"
  | "windows"
  | "groundwork";

export type House = {
  type: HouseType;
  storeys: Storeys;
  roof: RoofShape;
};

export const HOUSE_TYPES: Record<HouseType, { label: string; note: string }> = {
  detached: { label: "Detached", note: "Standing on its own plot" },
  semi: { label: "Semi-detached", note: "Joined on one side" },
  terraced: { label: "Terraced", note: "Joined on both sides" },
};

export const HOUSE_TYPE_ORDER: HouseType[] = ["detached", "semi", "terraced"];

/** Wall height to the eaves. The roof sits on top of this. */
export const STOREYS: Record<Storeys, { label: string; height: number }> = {
  bungalow: { label: "Bungalow", height: 110 },
  two: { label: "Two storey", height: 210 },
};

export const STOREY_ORDER: Storeys[] = ["bungalow", "two"];

export const ROOF_SHAPES: Record<RoofShape, { label: string }> = {
  gable: { label: "Gable ends" },
  hipped: { label: "Hipped" },
};

export const ROOF_SHAPE_ORDER: RoofShape[] = ["gable", "hipped"];

/**
 * The work itself.
 *
 * `divisions` is what makes the argument: tick two or three of these and the
 * summary shows the job already crosses divisions that would otherwise be
 * three separate firms.
 *
 * `adds` marks scope that puts something on the drawing that was not there
 * before, rather than highlighting something that was. An extension is new
 * building; a roof replacement is the roof you already have.
 */
export const SCOPE: Record<
  ScopeKey,
  {
    label: string;
    detail: string;
    divisions: DivisionSlug[];
    adds: boolean;
  }
> = {
  roof: {
    label: "Roof",
    detail: "Recover or replace, including leadwork, fascias and guttering.",
    divisions: ["roofing"],
    adds: false,
  },
  windows: {
    label: "Windows and doors",
    detail: "Made and fitted by the same firm doing the building work.",
    divisions: ["joinery"],
    adds: false,
  },
  extension: {
    label: "Extension",
    detail: "New floor area, from groundwork through to the glazing.",
    divisions: ["construction", "joinery", "roofing"],
    adds: true,
  },
  loft: {
    label: "Loft conversion",
    detail: "A dormer, the structure to carry it and the stair to reach it.",
    divisions: ["construction", "joinery"],
    adds: true,
  },
  groundwork: {
    label: "Patio and groundwork",
    detail: "Levels, drainage and hard standing at the back of the house.",
    divisions: ["construction"],
    adds: true,
  },
};

export const SCOPE_ORDER: ScopeKey[] = [
  "roof",
  "windows",
  "extension",
  "loft",
  "groundwork",
];

export const DIVISION_LABEL: Record<DivisionSlug, string> = {
  construction: "Construction",
  joinery: "Joinery",
  roofing: "Roofing",
};

/** Every division touched by the current selection, in a stable order. */
export function divisionsFor(scope: Set<ScopeKey>): DivisionSlug[] {
  const order: DivisionSlug[] = ["construction", "joinery", "roofing"];
  const hit = new Set<DivisionSlug>();
  scope.forEach((key) => {
    SCOPE[key].divisions.forEach((d) => hit.add(d));
  });
  return order.filter((d) => hit.has(d));
}

/** A one-line specification, carried into the enquiry. */
export function summarise(house: House, scope: Set<ScopeKey>): string {
  const shape = `${HOUSE_TYPES[house.type].label} ${STOREYS[
    house.storeys
  ].label.toLowerCase()}, ${ROOF_SHAPES[house.roof].label.toLowerCase()}`;

  const work = SCOPE_ORDER.filter((k) => scope.has(k))
    .map((k) => SCOPE[k].label.toLowerCase())
    .join(", ");

  return work ? `${shape}. Work needed: ${work}.` : `${shape}. Work not yet decided.`;
}
