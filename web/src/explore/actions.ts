// What a click on the map does: find the tract and town there, outline the area the layer is about, and fit it in
// the open map. Also the 2D and 3D switch.
import { Marker, type GeoJSONSource } from 'maplibre-gl';
import { bboxOf, findFeature, type Feature, type LngLat, type TownProps, type TractProps } from './geo';
import { loadAreas } from './areas';
import { mapRef, useTool, type Spot } from './store';
import { placesShown } from './places';
import { mapPadding } from './layout';

export { mapPadding };

let counter = 0;

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Pitch used for the 3D view, and the gentler one used when flying to a picked spot. */
export const PITCH_3D = 55;
const PITCH_SPOT = 45;

/** A brief ripple where the user clicked. It fades out and leaves nothing behind. */
function ripple(pt: LngLat) {
  const map = mapRef.current;
  if (!map || reduced()) return;
  const el = document.createElement('div');
  el.className = 'bh-ripple';
  const m = new Marker({ element: el }).setLngLat(pt).addTo(map);
  window.setTimeout(() => m.remove(), 900);
}

/** Pick one spot: the tract and town there. The map fits the outline of the area the layer is about. */
export async function pickSpot(pt: LngLat, label = 'Selected tract') {
  const { set, view3d } = useTool.getState();
  const map = mapRef.current;
  if (!map) return;
  const n = ++counter;
  set({ msg: null, busy: true });
  const fail = (msg: string) => n === counter && set({ msg, busy: false });
  if (!(await loadAreas())) return void fail('The map data did not load. Refresh the page to try again.');
  if (n !== counter) return; // a newer spot won
  const { tracts, towns } = useTool.getState();
  const tract = tracts ? findFeature(tracts, pt) : undefined;
  const town = towns ? findFeature(towns, pt) : undefined;
  if (!tract) return void fail('That spot is outside Pennsylvania.');

  ripple(pt);
  // Where to Build answers for a whole municipality: zoom in only to about county level, so its outline shows.
  const legal = placesShown(useTool.getState());
  // The outline of the area the layer is about: the municipality (Where to Build, ADUs by 2031 by town), the county
  // (by county) or the tract.
  const outline = exploreOutline(pt, tract, town, legal);
  const want = Math.max(map.getZoom(), legal ? 10 : 12);
  // When that zoom would crop the outline, fit the outline in the open map instead. The padding is the whole room the
  // panels take (absolutePadding), not added to the map's own padding, which already holds the open Details panel.
  const fitZoom = !outline || want <= map.getZoom() ? undefined : map.cameraForBounds(bboxOf(outline.geometry), { padding: mapPadding(true), absolutePadding: true })?.zoom;
  const motion = { pitch: view3d ? PITCH_SPOT : 0, duration: reduced() ? 0 : 1400, padding: mapPadding(true), essential: true };
  if (outline && fitZoom !== undefined && fitZoom < want) map.fitBounds(bboxOf(outline.geometry), { ...motion, absolutePadding: true });
  else map.flyTo({ center: pt, zoom: want, ...motion });
  (map.getSource('pick') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: outline ? [outline as unknown as GeoJSON.Feature] : [] });

  const spot: Spot = { n, label, pt, tract: tract.properties, town: town?.properties ?? {} };
  set({ busy: false, spot });
}

/** Draw the outline of the picked area again after the map layer changed (tract, town or county). */
export function redrawPick() {
  const { spot, tracts, towns } = useTool.getState();
  const map = mapRef.current;
  if (!map || !spot) return;
  const tract = tracts ? findFeature(tracts, spot.pt) : undefined;
  const town = towns ? findFeature(towns, spot.pt) : undefined;
  const outline = exploreOutline(spot.pt, tract, town, placesShown(useTool.getState()));
  (map.getSource('pick') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: outline ? [outline as unknown as GeoJSON.Feature] : [] });
}

/** The outline of the area the map layer is about, at a clicked spot. */
function exploreOutline(pt: LngLat, tract: Feature<TractProps> | undefined, town: Feature<TownProps> | undefined, legal: boolean): Feature<unknown> | undefined {
  const { level, counties, metric } = useTool.getState();
  if (level === 'tract' && metric === 'yearly' && town) return town;
  if (level === 'county') return (counties ? findFeature(counties, pt) : undefined) ?? tract;
  if ((legal || level === 'town') && town) return town;
  return tract;
}

/** Let go of the picked spot (Esc, a click off the state, the Details close button). */
export function clearSpot() {
  counter++;
  (mapRef.current?.getSource('pick') as GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [] });
  useTool.getState().set({ spot: null, busy: false });
}

/** Switch between the flat map and the tilted 3D view. */
export function setView3d(on: boolean) {
  const map = mapRef.current;
  useTool.getState().set({ view3d: on });
  if (!map) return;
  map.easeTo({ pitch: on ? PITCH_3D : 0, bearing: on ? map.getBearing() || -20 : 0, duration: reduced() ? 0 : 1000 });
}
