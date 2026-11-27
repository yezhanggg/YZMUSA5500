// Explore: the small label under the mouse. The area's name and the value of the layer that is on, so you can read
// the map without clicking. It reads the loaded areas in the store (the same numbers as Details).
import { Popup, type Map as MLMap } from 'maplibre-gl';
import { tractPayoff, tractRoom } from '../lib/adu';
import { findFeature, type CountyProps, type FC, type LngLat, type TownProps, type TractProps } from './geo';
import { FORECAST_LABEL, WINDOW_LABEL, WINDOW_VAR_LABEL, yearValue } from './metrics';
import { STATUS_NAME, shownStatus, usePlaces } from './places';
import { useTool } from './store';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const signed = (v: number, d = 1) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toFixed(d)}`;
const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;
const count = (v: number) => Math.round(v).toLocaleString('en-US');
/** Small counts keep one decimal (0.4 ADUs, not 0). */
const few = (v: number) => (Math.abs(v) < 10 ? v.toFixed(1) : count(v));
const perK = (adus: unknown, pop: unknown) => (isNum(adus) && isNum(pop) && pop > 0 ? adus / (pop / 1000) : null);

function gainText(p: Record<string, unknown>, pop: unknown): string {
  const a = p.adus_mid_current;
  const b = p.adus_mid_hb2186;
  if (!isNum(a) || !isNum(b)) return 'No data';
  const k = perK(b - a, pop);
  return `+${few(b - a)} ADUs (${few(a)} today to ${few(b)})${k != null ? `, ${k.toFixed(1)} per 1,000` : ''}`;
}

export interface HoverText {
  title: string;
  sub?: string;
  value: string;
}

/** The label for the spot under the mouse, or null off the state. */
export function hoverText(pt: LngLat): HoverText | null {
  const s = useTool.getState();
  const { tracts, towns, counties, level, metric, forecast } = s;
  if (!tracts || !towns) return null;
  if (level === 'county') {
    const c = counties ? findFeature(counties as FC<CountyProps>, pt) : undefined;
    if (!c) return null;
    const p = c.properties;
    const mid = p[`adus_mid_${forecast}`];
    const k = perK(mid, p.pop_2024);
    if (s.billGain) return { title: `${p.NAME} County`, sub: 'What HB 2186 adds by 2031 (not law)', value: gainText(p, p.pop_2024) };
    return { title: `${p.NAME} County`, sub: `ADUs by 2031, ${FORECAST_LABEL[forecast]}`, value: isNum(mid) ? `${count(mid)} ADUs (${k?.toFixed(1)} per 1,000 people)` : 'No data' };
  }
  const town = findFeature(towns as FC<TownProps>, pt);
  if (level === 'town' || metric === 'yearly' || metric === 'legal') {
    if (!town) return null;
    const p = town.properties;
    const title = (p.NAMELSAD as string) ?? 'Town';
    const sub = p.county ? `${p.county} County` : undefined;
    if (level === 'town' && s.billGain) return { title, sub: 'What HB 2186 adds by 2031 (not law)', value: gainText(p, p.pop_2025) };
    if (level === 'town') {
      const mid = p[`adus_mid_${forecast}`];
      const lo = p[`adus_low_${forecast}`];
      const hi = p[`adus_high_${forecast}`];
      const k = perK(mid, p.pop_2025);
      return { title, sub, value: isNum(mid) ? `${few(mid)} ADUs by 2031 (${isNum(lo) ? few(lo) : '?'} to ${isNum(hi) ? few(hi) : '?'}), ${k?.toFixed(1)} per 1,000` : 'No data' };
    }
    if (metric === 'yearly') {
      const v = yearValue(p, s.yearVar, s.year);
      if (v == null) return { title, sub, value: 'No data' };
      return { title, sub, value: s.yearVar === 'pop' ? `People ${signed(v)}% from 2010 to ${s.year}` : `${v.toFixed(1)} new homes per 1,000 people in ${s.year}` };
    }
    const row = p.GEOID ? usePlaces.getState().places?.byGeoid.get(p.GEOID as string) : undefined;
    return { title, sub, value: STATUS_NAME[shownStatus(row, s.rule)] + (s.rule === 'hb2186' ? ' (state bill, not law)' : '') };
  }
  const tract = findFeature(tracts as FC<TractProps>, pt);
  if (!tract) return null;
  const t = tract.properties;
  const title = (t.NAMELSAD as string) ?? 'Tract';
  const sub = [town?.properties.NAMELSAD, t.county ? `${t.county} County` : null].filter(Boolean).join(', ') || undefined;
  const pct = (v: unknown, unit = '% a year') => (isNum(v) ? `${signed(v)}${unit}` : 'No data');
  const moe = (flag: unknown) => (flag === 1 ? ' (inside margin of error)' : '');
  switch (metric) {
    case 'jobs_after':
      return { title, sub, value: `Jobs ${pct(t.jobs_after, '%')} since 2019` };
    case 'jobs_shift':
      return { title, sub, value: `Job growth ${pct(t.jobs_shift, ' pts a year')} after 2019` };
    case 'pop_after':
      return { title, sub, value: `People ${pct(t.pop_after)}${moe(t.pop_after_moe)}` };
    case 'units_after':
      return { title, sub, value: `Homes ${pct(t.units_after)}${moe(t.units_after_moe)}` };
    case 'rent_after':
      return { title, sub, value: `Rent ${pct(t.rent_after)}${moe(t.rent_after_moe)}` };
    case 'group':
      return { title, sub, value: t.trend_group ?? 'Not enough data' };
    case 'window': {
      const v = t[`${s.winVar}_${s.win}`];
      return { title, sub, value: `${WINDOW_VAR_LABEL[s.winVar]}, ${WINDOW_LABEL[s.win]}: ${isNum(v) ? (s.winVar === 'rent' ? usd(v) : count(v)) : 'No data'}` };
    }
    case 'room': {
      const r = tractRoom(t);
      return { title, sub, value: r ? `${count(r.mid)} lots with room (${count(r.low)} to ${count(r.high)})${r.measured ? ', measured' : ', modelled'}` : 'No data' };
    }
    case 'pays': {
      const p = tractPayoff(t, s.adu, s.costLevel, s.payRate);
      if (!p) return { title, sub, value: 'No data' };
      const word = p.pays === 'yes' ? 'Pays off' : p.pays === 'maybe' ? 'Close' : 'Does not pay off';
      return { title, sub, value: `${word}: ${p.gap >= 0 ? '+' : '-'}${usd(Math.abs(p.gap))} a month` };
    }
    default:
      return null;
  }
}

/** Show the label under the mouse on a mouse (not touch) screen. Returns a cleanup function. */
export function watchHover(map: MLMap): () => void {
  const popup = new Popup({ closeButton: false, closeOnClick: false, offset: 12, className: 'bh-hover', maxWidth: '280px' });
  let frame = 0;
  let last: { lng: number; lat: number } | null = null;
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;
  const draw = () => {
    frame = 0;
    if (!last) return;
    const h = useTool.getState().areas === 'ready' ? hoverText([last.lng, last.lat]) : null;
    if (!h) {
      popup.remove();
      map.getCanvas().style.cursor = '';
      return;
    }
    const el = document.createElement('div');
    const b = document.createElement('div');
    b.className = 'bh-hover-title';
    b.textContent = h.title;
    el.append(b);
    if (h.sub) {
      const sub = document.createElement('div');
      sub.className = 'bh-hover-sub';
      sub.textContent = h.sub;
      el.append(sub);
    }
    const v = document.createElement('div');
    v.className = 'bh-hover-value';
    v.textContent = h.value;
    el.append(v);
    popup.setLngLat(last).setDOMContent(el).addTo(map);
    map.getCanvas().style.cursor = 'pointer';
  };
  const move = (e: { lngLat: { lng: number; lat: number } }) => {
    last = e.lngLat;
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const out = () => {
    last = null;
    popup.remove();
  };
  if (!fine) return () => undefined;
  map.on('mousemove', move);
  map.on('mouseout', out);
  map.on('movestart', out);
  // The label follows the layer settings too (the year on Play, the scenario).
  const unsub = useTool.subscribe(() => {
    if (last && !frame) frame = requestAnimationFrame(draw);
  });
  return () => {
    unsub();
    map.off('mousemove', move);
    map.off('mouseout', out);
    map.off('movestart', out);
    popup.remove();
  };
}
