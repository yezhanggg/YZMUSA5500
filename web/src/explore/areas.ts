// Tracts, towns and counties (public/data/*.geojson, about 10 MB) load once, when the map opens.
import { loadData } from './geo';
import { useTool } from './store';

let pending: Promise<boolean> | null = null;

/** Load the area files once. Resolves true when they are in the store. */
export function loadAreas(): Promise<boolean> {
  if (useTool.getState().areas === 'ready') return Promise.resolve(true);
  if (!pending) {
    useTool.getState().set({ areas: 'loading' });
    pending = loadData()
      .then(({ tracts, towns, counties }) => {
        useTool.getState().set({ tracts, towns, counties, areas: 'ready' });
        return true;
      })
      .catch(() => {
        pending = null;
        useTool.getState().set({ areas: 'error' });
        return false;
      });
  }
  return pending;
}
