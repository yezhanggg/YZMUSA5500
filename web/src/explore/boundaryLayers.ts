// Boundary outlines on the map (boundaries.ts holds the switches). Thin lines and small labels, drawn under the
// basemap labels. The lines and labels are never part of a click query (a click finds the tract and town in memory).
// Counties, municipalities and tracts reuse the areas already in memory, else load their file the first time their
// switch is on. ZIP codes load the first time their switch is on.
import { useEffect } from 'react';
import type { ExpressionSpecification, LayerSpecification, Map as MLMap } from 'maplibre-gl';
import { mapRef, useTool } from './store';
import { BOUNDARY_IDS, useBoundaries, type BoundaryId } from './boundaries';
import { DATA } from '../lib/data';

const FONT = ['Noto Sans Regular'];
const HALO = { 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.2 };

export const BOUNDARY_LAYERS: Record<BoundaryId, string[]> = {
  county: ['bnd-county-line', 'bnd-county-label'],
  town: ['bnd-town-line', 'bnd-town-label'],
  tract: ['bnd-tract-line', 'bnd-tract-label'],
  zip: ['bnd-zip-line', 'bnd-zip-label'],
};
const SOURCE: Record<BoundaryId, string> = { county: 'bnd-county', town: 'bnd-town', tract: 'bnd-tract', zip: 'bnd-zip' };
const FILE: Record<BoundaryId, string> = { county: `${DATA}counties.geojson`, town: `${DATA}towns.geojson`, tract: `${DATA}tracts.geojson`, zip: `${DATA}zcta.geojson` };

function layers(id: BoundaryId): LayerSpecification[] {
  const source = SOURCE[id];
  const hidden = { visibility: 'none' as const };
  if (id === 'county')
    return [
      { id: 'bnd-county-line', type: 'line', source, layout: { ...hidden, 'line-join': 'round' }, paint: { 'line-color': '#334155', 'line-opacity': 0.75, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 10, 1.6, 14, 2.2] as unknown as ExpressionSpecification } },
      { id: 'bnd-county-label', type: 'symbol', source, minzoom: 6.5, maxzoom: 10.5, layout: { ...hidden, 'text-field': ['get', 'NAME'], 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 6.5, 10, 10, 13] as unknown as ExpressionSpecification, 'text-transform': 'uppercase', 'text-letter-spacing': 0.08, 'text-max-width': 8, 'text-padding': 4 }, paint: { 'text-color': '#334155', ...HALO } },
    ];
  if (id === 'town')
    return [
      { id: 'bnd-town-line', type: 'line', source, minzoom: 7, layout: { ...hidden, 'line-join': 'round' }, paint: { 'line-color': '#5b4f8a', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.45, 11, 0.75] as unknown as ExpressionSpecification, 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 10, 1, 14, 1.6] as unknown as ExpressionSpecification } },
      { id: 'bnd-town-label', type: 'symbol', source, minzoom: 9.5, maxzoom: 14, layout: { ...hidden, 'text-field': ['coalesce', ['get', 'NAMELSAD'], ['get', 'NAME']] as unknown as ExpressionSpecification, 'text-font': FONT, 'text-size': ['interpolate', ['linear'], ['zoom'], 9.5, 10.5, 13, 12.5] as unknown as ExpressionSpecification, 'text-max-width': 8, 'text-padding': 6 }, paint: { 'text-color': '#4c4277', ...HALO } },
    ];
  if (id === 'tract')
    return [
      { id: 'bnd-tract-line', type: 'line', source, minzoom: 8, layout: hidden, paint: { 'line-color': '#4f46e5', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.35, 12, 0.6] as unknown as ExpressionSpecification, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 14, 1.1] as unknown as ExpressionSpecification } },
      // "Census Tract 123.01" -> "Tract 123.01"
      { id: 'bnd-tract-label', type: 'symbol', source, minzoom: 12.5, layout: { ...hidden, 'text-field': ['concat', 'Tract ', ['slice', ['coalesce', ['get', 'NAMELSAD'], 'Census Tract '], 13]] as unknown as ExpressionSpecification, 'text-font': FONT, 'text-size': 11, 'text-padding': 6 }, paint: { 'text-color': '#4338ca', ...HALO } },
    ];
  return [
    { id: 'bnd-zip-line', type: 'line', source, minzoom: 7, layout: hidden, paint: { 'line-color': '#0f766e', 'line-opacity': 0.7, 'line-dasharray': [3, 2], 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.6, 14, 1.4] as unknown as ExpressionSpecification } },
    { id: 'bnd-zip-label', type: 'symbol', source, minzoom: 11, layout: { ...hidden, 'text-field': ['get', 'ZCTA5'], 'text-font': FONT, 'text-size': 11.5, 'text-padding': 6 }, paint: { 'text-color': '#0f766e', ...HALO } },
  ];
}

/** The first basemap label: the lines go under it. */
function anchor(map: MLMap): string | undefined {
  return map.getStyle().layers.find((l) => l.type === 'symbol' && !l.id.startsWith('bnd-'))?.id;
}

/** The data for a source: what is already in memory, else the file (MapLibre fetches it in its worker). The file
 * needs a full address there, so the base path is made absolute against the page. */
function dataFor(id: BoundaryId): GeoJSON.FeatureCollection | string {
  const st = useTool.getState();
  if (id === 'county' && st.counties) return st.counties as unknown as GeoJSON.FeatureCollection;
  if (id === 'tract' && st.tracts) return st.tracts as unknown as GeoJSON.FeatureCollection;
  if (id === 'town' && st.towns) return st.towns as unknown as GeoJSON.FeatureCollection;
  return new URL(FILE[id], window.location.href).href;
}

function ensure(map: MLMap, id: BoundaryId) {
  if (map.getSource(SOURCE[id])) return;
  map.addSource(SOURCE[id], { type: 'geojson', data: dataFor(id) });
  for (const l of layers(id)) map.addLayer(l);
}

/** Keep every boundary layer just under the basemap labels (area fills added later go above them). Lines first,
 * labels after, so every label sits over every line. */
function order(map: MLMap) {
  const ids = BOUNDARY_IDS.flatMap((id) => BOUNDARY_LAYERS[id]).filter((l) => map.getLayer(l));
  const sorted = [...ids.filter((l) => l.endsWith('-line')), ...ids.filter((l) => l.endsWith('-label'))];
  for (const l of sorted) map.moveLayer(l, anchor(map));
}

/** The boundary layers shown now, on the map element. */
function mark(map: MLMap) {
  const on = BOUNDARY_IDS.flatMap((id) => BOUNDARY_LAYERS[id]).filter((l) => map.getLayer(l) && map.getLayoutProperty(l, 'visibility') === 'visible');
  map.getContainer().dataset.boundaries = on.join(' ');
}

/** Adds, orders and shows the boundary layers. Called once from MapCanvas. */
export function useBoundaryLayers() {
  const status = useTool((s) => s.status);
  const areas = useTool((s) => s.areas);
  const on = useBoundaries((s) => s.on);
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map) return;
    // Other effects add the area layers in the same render: wait a frame so the order holds.
    const frame = requestAnimationFrame(() => {
      if (mapRef.current !== map) return;
      for (const id of BOUNDARY_IDS) {
        if (on[id]) ensure(map, id);
        for (const l of BOUNDARY_LAYERS[id]) if (map.getLayer(l)) map.setLayoutProperty(l, 'visibility', on[id] ? 'visible' : 'none');
      }
      order(map);
      mark(map);
    });
    return () => cancelAnimationFrame(frame);
  }, [status, areas, on]);
}
