// Boundary outlines on the map: counties, municipalities (townships, boroughs, cities), census tracts and ZIP codes
// (2020 Census ZCTAs). The choice is remembered per viewer in localStorage. Counties are on by default.
import { create } from 'zustand';

export type BoundaryId = 'county' | 'town' | 'tract' | 'zip';
export type Boundaries = Record<BoundaryId, boolean>;

export const BOUNDARY_IDS: BoundaryId[] = ['county', 'town', 'tract', 'zip'];
export const DEFAULT_BOUNDARIES: Boundaries = { county: true, town: false, tract: false, zip: false };
export const BOUNDARY_KEY = 'm5500.boundaries';

export const BOUNDARY_LABEL: Record<BoundaryId, string> = { county: 'County', town: 'Township or City', tract: 'Census Tract', zip: 'ZIP Code' };
export const BOUNDARY_HINT: Record<BoundaryId, string> = {
  county: 'The 67 county lines.',
  town: 'Pennsylvania municipalities: cities, boroughs and townships. Each one sets its own zoning. Their names show when you zoom in.',
  tract: '2020 census tracts. Their names show when you zoom in.',
  zip: 'ZIP Code Tabulation Areas from the 2020 Census. The Census Bureau draws them to match ZIP codes, but they are not the exact postal areas.',
};

/** Read a saved choice. Anything missing or broken falls back to the default. */
export function parseBoundaries(raw: string | null): Boundaries {
  if (!raw) return { ...DEFAULT_BOUNDARIES };
  try {
    const v = JSON.parse(raw) as Partial<Record<BoundaryId, unknown>>;
    const out = { ...DEFAULT_BOUNDARIES };
    if (v && typeof v === 'object') for (const id of BOUNDARY_IDS) if (typeof v[id] === 'boolean') out[id] = v[id] as boolean;
    return out;
  } catch {
    return { ...DEFAULT_BOUNDARIES };
  }
}

function saved(): Boundaries {
  try {
    return parseBoundaries(window.localStorage.getItem(BOUNDARY_KEY));
  } catch {
    return { ...DEFAULT_BOUNDARIES };
  }
}

interface BoundaryState {
  on: Boundaries;
  toggle: (id: BoundaryId) => void;
  setOn: (id: BoundaryId, v: boolean) => void;
}

export const useBoundaries = create<BoundaryState>((set, get) => ({
  on: typeof window === 'undefined' ? { ...DEFAULT_BOUNDARIES } : saved(),
  toggle: (id) => get().setOn(id, !get().on[id]),
  setOn: (id, v) => {
    const on = { ...get().on, [id]: v };
    set({ on });
    try {
      window.localStorage.setItem(BOUNDARY_KEY, JSON.stringify(on));
    } catch {
      /* storage blocked: the choice lasts for this visit only */
    }
  },
}));
