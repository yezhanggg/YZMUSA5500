// The Explore map's state: the layer on the map, its settings, the loaded areas and the picked spot.
import { create } from 'zustand';
import type { Map as MLMap } from 'maplibre-gl';
import { BASE, RATE, SIZE_MAX, SIZE_MIN, SIZE_STEP, type Adu, type Bed, type Stories } from '../lib/numbers';
import type { CountyProps, FC, LngLat, TownProps, TractProps } from './geo';
import { YEAR_MAX, type Forecast, type MapLevel, type MetricId, type Window, type WindowVar, type YearVar } from './metrics';
import type { CostLevel } from '../lib/adu';

/** Where to Build: today's rules, or the state bill HB 2186 (not law). */
export type Rule = 'current' | 'hb2186';

/** A spot picked on the map: the tract and the town there. */
export interface Spot {
  n: number;
  label: string;
  pt: LngLat;
  tract: TractProps;
  town: TownProps;
}

interface ExploreState {
  rule: Rule;
  metric: MetricId;
  /** Map by tract, town or county. */
  level: MapLevel;
  /** The forecast scenario for ADUs by 2031. */
  forecast: Forecast;
  /** Payoff cost level and loan rate (the Pays map and the share that pays). */
  costLevel: CostLevel;
  payRate: number;
  /** The ACS window and measure for the "Over Time" map. */
  winVar: WindowVar;
  win: Window;
  /** The year and measure for the yearly town map (By Year). */
  year: number;
  /** ADUs by 2031: show what HB 2186 adds over today, in place of one scenario. */
  billGain: boolean;
  yearVar: YearVar;
  counties: FC<CountyProps> | null;
  status: 'loading' | 'ready' | 'error';
  /** Tracts, towns and counties (areas.ts). */
  areas: 'idle' | 'loading' | 'ready' | 'error';
  tracts: FC<TractProps> | null;
  towns: FC<TownProps> | null;
  spot: Spot | null;
  /** A spot is being picked (the area files still loading). */
  busy: boolean;
  msg: string | null;
  /** Tilted map with 3D buildings. */
  view3d: boolean;
  /** The ADU whose payoff is mapped. */
  adu: Adu;
  /** Tablet and phone bottom sheet: open or only peeking. */
  sheetOpen: boolean;
  /** Laptop: the results drawer over the map is open. */
  resultsOpen: boolean;
  /** Aerial photo under the map. */
  aerial: boolean;
  set: (p: Partial<ExploreState>) => void;
  setAdu: (p: Partial<Adu>) => void;
}

/** Read the ADU from the hash query (#/map?bed=1&size=600&st=1). Anything missing or odd falls back to the base case. */
export function aduFromHash(hash: string): Adu {
  const q = new URLSearchParams(hash.split('?')[1] ?? '');
  const bed = Number(q.get('bed'));
  const size = Number(q.get('size'));
  const st = Number(q.get('st'));
  return {
    bed: ([0, 1, 2, 3] as number[]).includes(bed) && q.has('bed') ? (bed as Bed) : BASE.bed,
    size: Number.isFinite(size) && size >= SIZE_MIN && size <= SIZE_MAX && size % SIZE_STEP === 0 ? size : BASE.size,
    stories: st === 2 ? (2 as Stories) : BASE.stories,
  };
}

/** The current hash with the ADU written into its query. The page part (#/map) and other keys are kept. */
export function aduHash(a: Adu) {
  const [path, query] = window.location.hash.split('?');
  const q = new URLSearchParams(query ?? '');
  q.set('bed', String(a.bed));
  q.set('size', String(a.size));
  q.set('st', String(a.stories));
  return `${path || '#/map'}?${q.toString()}`;
}

export const useTool = create<ExploreState>((set) => ({
  rule: 'current',
  metric: 'legal',
  level: 'tract',
  forecast: 'current',
  costLevel: 'mid',
  payRate: RATE,
  winVar: 'rent',
  win: '24',
  year: YEAR_MAX,
  billGain: false,
  yearVar: 'pop',
  counties: null,
  status: 'loading',
  areas: 'idle',
  tracts: null,
  towns: null,
  spot: null,
  busy: false,
  msg: null,
  view3d: false,
  sheetOpen: false,
  resultsOpen: false,
  aerial: false,
  adu: typeof window === 'undefined' ? BASE : aduFromHash(window.location.hash),
  set: (p) => set(p),
  setAdu: (p) =>
    set((s) => {
      const adu = { ...s.adu, ...p };
      // Mirror the ADU in the address so it can be shared. replaceState does not fire hashchange.
      if (typeof window !== 'undefined') history.replaceState(null, '', aduHash(adu));
      return { adu };
    }),
}));

/** The live map, shared with the panels (not reactive). */
export const mapRef: { current: MLMap | null } = { current: null };
