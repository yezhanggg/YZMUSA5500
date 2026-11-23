// The area files (public/data, made by build_data.py) and the small geometry helpers that find the tract and town
// at a clicked spot in the browser (point in polygon).
import type { TractRoomFields } from '../lib/adu';
import type { TownRule } from '../lib/rules';
import { annual } from '../lib/format';
import { DATA } from '../lib/data';

export type LngLat = [number, number];
export const PA_BBOX: [number, number, number, number] = [-80.52, 39.72, -74.69, 42.27];

type Ring = LngLat[];
export type Geom = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };

export interface TractProps extends TractRoomFields {
  GEOID: string;
  NAMELSAD?: string;
  county?: string;
  jobs_2010?: number | null;
  jobs_2014?: number | null;
  jobs_2019?: number | null;
  jobs_2024?: number | null;
  median_rent?: number | null;
  trend_group?: string | null;
  rent_est?: number | null;
  cost_month?: number | null;
  pays?: 'yes' | 'maybe' | 'no' | null;
  /** monthly gross rent for a studio, 1, 2, 3 bedroom unit (2024 dollars) */
  rent_b0?: number | null;
  rent_b1?: number | null;
  rent_b2?: number | null;
  rent_b3?: number | null;
  // worked out in the browser
  jobs_after?: number | null;
  jobs_shift?: number | null;
  [k: string]: unknown;
}

export interface TownProps extends TownRule {
  GEOID?: string;
  NAME?: string;
  NAMELSAD?: string;
  county?: string;
  permits_yr_before?: number | null;
  permits_yr_after?: number | null;
  [k: string]: unknown;
}

/** County roll-up of tract results (counties.geojson, from county_rollup.csv). */
export interface CountyProps {
  GEOID: string;
  NAME?: string;
  tracts?: number | null;
  pop_2024?: number | null;
  tracts_pays_yes?: number | null;
  tracts_pays_maybe?: number | null;
  tracts_pays_no?: number | null;
  share_tracts_yes?: number | null;
  median_tract_rent_1br?: number | null;
  largest_trend_group?: string | null;
  [k: string]: unknown;
}

export interface Feature<P> {
  type: 'Feature';
  properties: P;
  geometry: Geom;
  _bbox?: [number, number, number, number];
}
export interface FC<P> {
  type: 'FeatureCollection';
  features: Feature<P>[];
}

const polys = (g: Geom): Ring[][] => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);

export const bboxOf = (g: Geom) => bbox(g);

function bbox(g: Geom): [number, number, number, number] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of polys(g)) for (const [x, y] of p[0]) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

function inRing([x, y]: LngLat, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const inGeom = (pt: LngLat, g: Geom) => polys(g).some((p) => inRing(pt, p[0]) && !p.slice(1).some((hole) => inRing(pt, hole)));

export function findFeature<P>(fc: FC<P>, pt: LngLat): Feature<P> | undefined {
  return fc.features.find((f) => {
    const b = f._bbox!;
    return pt[0] >= b[0] && pt[0] <= b[2] && pt[1] >= b[1] && pt[1] <= b[3] && inGeom(pt, f.geometry);
  });
}

/** Add bounding boxes and the display numbers worked out from raw job counts. */
export function prepare(tracts: FC<TractProps>, towns: FC<TownProps>) {
  for (const f of tracts.features) {
    const p = f.properties;
    f._bbox = bbox(f.geometry);
    p.jobs_after = p.jobs_2019 && p.jobs_2019 > 0 && p.jobs_2024 != null ? (p.jobs_2024 / p.jobs_2019 - 1) * 100 : null;
    const before = annual(p.jobs_2010, p.jobs_2019, 9);
    const after = annual(p.jobs_2019, p.jobs_2024, 5);
    p.jobs_shift = before != null && after != null ? after - before : null;
  }
  for (const f of towns.features) f._bbox = bbox(f.geometry);
}

export async function loadData() {
  const [tracts, towns] = (await Promise.all([`${DATA}tracts.geojson`, `${DATA}towns.geojson`].map((u) => fetch(u).then((r) => r.json())))) as [FC<TractProps>, FC<TownProps>];
  prepare(tracts, towns);
  const counties = (await fetch(`${DATA}counties.geojson`).then((r) => (r.ok ? r.json() : null)).catch(() => null)) as FC<CountyProps> | null;
  if (counties) for (const f of counties.features) f._bbox = bbox(f.geometry);
  return { tracts, towns, counties };
}
