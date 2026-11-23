// The map: tracts, towns and counties coloured by the layer that is on, the boundary outlines, the picked area's
// outline, 3D buildings and the aerial photo. A click picks the tract and town there (actions.ts).
import { useEffect, useRef } from 'react';
import { Map as MLMap, setWorkerUrl, type ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { tractPayoff } from '../lib/adu';
import { PA_BBOX } from './geo';
import { METRICS, PAYS_CODE, areaColorExpr, colorExpr, type MetricId } from './metrics';
import { loadAreas } from './areas';
import { mapRef, useTool } from './store';
import { mapPadding, pickSpot } from './actions';
import { aerialSource, watchAerial } from './aerial';
import { usePlacesLayer } from './placesLayer';
import { PlacesLegend } from './PlaceResults';
import { useBoundaryLayers } from './boundaryLayers';

setWorkerUrl(workerUrl);

const MOE_NONE: ExpressionSpecification = ['==', ['get', 'GEOID'], '__none__'];

/** A small repeating pattern drawn on a canvas, for fill-pattern. */
function pattern(draw: (c: CanvasRenderingContext2D) => void, size: number) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d')!;
  draw(c);
  return { width: size, height: size, data: new Uint8Array(c.getImageData(0, 0, size, size).data.buffer) };
}

/**
 * Tract fill opacity: fades out between z12.5 and z14. On the Room map, measured tracts (the two cities) are drawn
 * solid and modelled tracts lighter.
 */
function tractOpacity(metric: MetricId): ExpressionSpecification {
  const at = (solid: number) => (metric === 'room' ? ['case', ['==', ['get', 'room_measured'], 1], solid, Math.round(solid * 0.5 * 100) / 100] : solid);
  return ['interpolate', ['linear'], ['zoom'], 7, at(0.62), 12.5, at(0.4), 14, 0] as unknown as ExpressionSpecification;
}

/** Tracts, towns and counties, once loaded: above the basemap, under its labels. */
function addAreaLayers(map: MLMap) {
  const { tracts, towns, counties, metric, forecast, level } = useTool.getState();
  if (!tracts || !towns || map.getSource('tracts')) return;
  const before = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
  map.addSource('tracts', { type: 'geojson', data: tracts as unknown as GeoJSON.FeatureCollection, promoteId: 'GEOID' });
  map.addSource('towns', { type: 'geojson', data: towns as unknown as GeoJSON.FeatureCollection });
  map.addSource('pick', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  // Area fills fade out between z12.5 and z14.
  const fade = ['interpolate', ['linear'], ['zoom'], 7, 0.62, 12.5, 0.4, 14, 0] as unknown as ExpressionSpecification;
  map.addLayer({ id: 'tract-fill', type: 'fill', source: 'tracts', paint: { 'fill-color': colorExpr(metric), 'fill-opacity': tractOpacity(metric) } }, before);
  map.addLayer({ id: 'tract-line', type: 'line', source: 'tracts', minzoom: 9, paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 0.7 } }, before);
  // Margin of error: tracts whose change is inside it are hatched (People / Homes / Rent).
  map.addImage(
    'bh-moe',
    pattern((c) => {
      c.strokeStyle = 'rgba(71,85,105,0.75)';
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, 8);
      c.lineTo(8, 0);
      c.stroke();
    }, 8),
  );
  map.addLayer({ id: 'tract-moe', type: 'fill', source: 'tracts', maxzoom: 14, layout: { visibility: 'none' }, filter: MOE_NONE, paint: { 'fill-pattern': 'bh-moe', 'fill-opacity': 0.8 } }, before);
  // Towns and counties: ADUs by 2031 per 1,000 people, under the forecast scenario.
  map.addLayer({ id: 'town-fill', type: 'fill', source: 'towns', layout: { visibility: level === 'town' ? 'visible' : 'none' }, paint: { 'fill-color': areaColorExpr(forecast, 'pop_2025'), 'fill-opacity': fade } }, before);
  if (counties) {
    map.addSource('counties', { type: 'geojson', data: counties as unknown as GeoJSON.FeatureCollection });
    map.addLayer({ id: 'county-fill', type: 'fill', source: 'counties', layout: { visibility: level === 'county' ? 'visible' : 'none' }, paint: { 'fill-color': areaColorExpr(forecast, 'pop_2024'), 'fill-opacity': fade } }, before);
    map.addLayer({ id: 'county-line', type: 'line', source: 'counties', layout: { visibility: level === 'county' ? 'visible' : 'none' }, paint: { 'line-color': '#334155', 'line-width': 1, 'line-opacity': 0.6 } }, before);
  }
  map.addLayer({ id: 'town-line', type: 'line', source: 'towns', minzoom: 8, paint: { 'line-color': '#475569', 'line-width': 0.6, 'line-opacity': 0.45 } }, before);
  // The picked area's outline: above the labels and the 3D buildings.
  map.addLayer({ id: 'pick-glow', type: 'line', source: 'pick', paint: { 'line-color': '#a78bfa', 'line-width': 8, 'line-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.35, 15, 0.12], 'line-blur': 4 } });
  map.addLayer({ id: 'pick-line', type: 'line', source: 'pick', paint: { 'line-color': '#7c3aed', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 2.5, 15, 1.2] } });
}

export default function MapCanvas() {
  const el = useRef<HTMLDivElement>(null);
  const metric = useTool((s) => s.metric);
  const level = useTool((s) => s.level);
  const forecast = useTool((s) => s.forecast);
  const costLevel = useTool((s) => s.costLevel);
  const payRate = useTool((s) => s.payRate);
  const winVar = useTool((s) => s.winVar);
  const win = useTool((s) => s.win);
  const status = useTool((s) => s.status);
  const areas = useTool((s) => s.areas);
  const view3d = useTool((s) => s.view3d);
  const adu = useTool((s) => s.adu);
  const aerial = useTool((s) => s.aerial);
  // Where to Build: municipalities coloured by status (placesLayer.ts).
  usePlacesLayer();
  // County, municipality, tract and ZIP code outlines (boundaryLayers.ts).
  useBoundaryLayers();

  useEffect(() => {
    const container = el.current;
    if (!container) return;
    const map = new MLMap({
      container,
      style: 'https://tiles.openfreemap.org/styles/positron',
      bounds: PA_BBOX,
      fitBoundsOptions: { padding: mapPadding(false) },
      // No attribution button on the map: one small "© OpenStreetMap" line in the corner (below).
      attributionControl: false,
      // Right-drag or ctrl-drag rotates and tilts. Two-finger drag tilts on touch screens.
      maxPitch: 60,
      dragRotate: true,
      pitchWithRotate: true,
      touchPitch: true,
    });
    mapRef.current = map;

    const { set } = useTool.getState();
    let alive = true;

    map.on('load', () => {
      try {
        if (!alive) return;
        map.addSource('aerial', aerialSource());
        const firstLabel = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
        // Aerial photo under the data layers and the labels, off until the Aerial button turns it on.
        map.addLayer({ id: 'aerial', type: 'raster', source: 'aerial', layout: { visibility: useTool.getState().aerial ? 'visible' : 'none' } }, firstLabel);
        watchAerial(map);
        // 3D buildings from the OpenFreeMap vector tiles. Shown in the 3D view.
        map.addLayer({
          id: 'buildings-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
          layout: { visibility: useTool.getState().view3d ? 'visible' : 'none' },
          paint: {
            'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, '#e7e5e4', 40, '#d6d3d1', 120, '#c4b5fd'],
            'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['coalesce', ['get', 'render_height'], 8]],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.85,
          },
        });
        addAreaLayers(map);
        set({ status: 'ready' });
      } catch {
        if (alive) set({ status: 'error' });
      }
    });

    // The zoom on the map element, for checks in a browser.
    map.on('moveend', () => (container.dataset.zoom = map.getZoom().toFixed(2)));

    map.on('pitchend', () => {
      const on = map.getPitch() > 8;
      if (on !== useTool.getState().view3d) set({ view3d: on });
    });

    // A click picks the tract and town there.
    map.on('click', (e) => void pickSpot([e.lngLat.lng, e.lngLat.lat]));

    return () => {
      alive = false;
      map.remove();
      mapRef.current = null;
      useTool.getState().set({ status: 'loading', spot: null });
    };
  }, []);

  // The tracts, towns and counties load with the map.
  useEffect(() => void loadAreas(), []);
  useEffect(() => {
    const map = mapRef.current;
    if (status === 'ready' && areas === 'ready' && map) addAreaLayers(map);
  }, [areas, status]);

  // Tract metric, map level, forecast scenario and the margin-of-error hatch.
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || areas !== 'ready' || !map?.getLayer('tract-fill')) return;
    map.setPaintProperty('tract-fill', 'fill-color', colorExpr(metric, { v: winVar, w: win }));
    map.setPaintProperty('tract-fill', 'fill-opacity', tractOpacity(metric));
    const show = (id: string, on: boolean) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    show('tract-fill', level === 'tract' && metric !== 'legal');
    show('town-fill', level === 'town');
    show('county-fill', level === 'county');
    show('county-line', level === 'county');
    const moe = METRICS[metric].moe;
    show('tract-moe', level === 'tract' && !!moe);
    map.setFilter('tract-moe', moe ? (['==', ['get', moe], 1] as unknown as ExpressionSpecification) : MOE_NONE);
    // Room hatches most of the state (modelled outside the training range), so its hatch is fainter.
    map.setPaintProperty('tract-moe', 'fill-opacity', metric === 'room' ? 0.4 : 0.8);
    map.setPaintProperty('town-fill', 'fill-color', areaColorExpr(forecast, 'pop_2025'));
    if (map.getLayer('county-fill')) map.setPaintProperty('county-fill', 'fill-color', areaColorExpr(forecast, 'pop_2024'));
  }, [metric, winVar, win, level, forecast, status, areas]);

  // Pays off for every tract follows the ADU and payoff settings (debounced for the sliders).
  useEffect(() => {
    const map = mapRef.current;
    const tracts = useTool.getState().tracts;
    if (status !== 'ready' || areas !== 'ready' || !map || !tracts) return;
    const t = window.setTimeout(() => {
      for (const f of tracts.features) {
        const p = f.properties;
        const pay = tractPayoff(p, adu, costLevel, payRate);
        map.setFeatureState({ source: 'tracts', id: p.GEOID }, { pays: pay ? PAYS_CODE[pay.pays] : null });
      }
    }, 150);
    return () => window.clearTimeout(t);
  }, [adu, status, areas, costLevel, payRate]);

  useEffect(() => {
    const map = mapRef.current;
    if (status === 'ready' && map?.getLayer('aerial')) map.setLayoutProperty('aerial', 'visibility', aerial ? 'visible' : 'none');
  }, [aerial, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status === 'ready' && map?.getLayer('buildings-3d')) map.setLayoutProperty('buildings-3d', 'visibility', view3d ? 'visible' : 'none');
  }, [view3d, status]);

  // MapLibre's own CSS makes its container `position: relative`, so the container fills a positioned wrapper.
  return (
    <div className="bh-map absolute inset-0">
      <div ref={el} className="h-full w-full" aria-label="Map of Pennsylvania. Click an area for its details." />
      {/* The OpenStreetMap credit the ODbL asks for: one small line in the bottom right corner of the open map. */}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" data-osm-credit className="absolute z-[5] rounded-tl bg-white/70 px-1 text-[10px] leading-3 text-slate-500 hover:text-slate-800" style={{ right: 'var(--credit-right, 0px)', bottom: 'var(--credit-bottom, 0px)' }}>
        © OpenStreetMap
      </a>
      <PlacesLegend />
    </div>
  );
}
