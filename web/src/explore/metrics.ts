// Map colour for each metric (Explore). Tract metrics read tract properties (web/build_data.py),
// Pays off follows the ADU and payoff controls, so it reads feature-state that MapCanvas recomputes live.
// Towns and counties are coloured by ADUs by 2031 per 1,000 people, under the forecast scenario.
import type { ExpressionSpecification } from 'maplibre-gl';
import { HEADLINE } from '../lib/numbers';

export type MetricId = 'legal' | 'jobs_after' | 'jobs_shift' | 'pop_after' | 'units_after' | 'rent_after' | 'group' | 'window' | 'yearly' | 'room' | 'pays';
export type MapLevel = 'tract' | 'town' | 'county';
export type Forecast = 'current' | 'hb2186' | 'sb1346';
export type WindowVar = 'pop' | 'homes' | 'rent';
export type Window = '14' | '19' | '24';
/** Yearly town measures: people (change since 2010) or new homes permitted that year (per 1,000 people). */
export type YearVar = 'pop' | 'permits';
export const YEAR_MIN = 2010;
export const YEAR_MAX = 2025;
export const YEAR_VAR_LABEL: Record<YearVar, string> = { pop: 'People', permits: 'New Homes' };

export const NO_DATA = '#e7e5e4';
/** Tracts whose change is inside the ACS margin of error. */
export const MOE_GREY = '#cbd5e1';

export const FORECAST_LABEL: Record<Forecast, string> = { current: 'Today', hb2186: 'HB 2186', sb1346: 'SB 1346' };
export const WINDOW_LABEL: Record<Window, string> = { '14': '2010-14', '19': '2015-19', '24': '2020-24' };
export const WINDOW_VAR_LABEL: Record<WindowVar, string> = { pop: 'People', homes: 'Homes', rent: 'Rent' };

interface Metric {
  short: string;
  label: string;
  steps: [number, string][];
  names: string[];
  /** Tract property with 1 where the change is inside its margin of error. */
  moe?: string;
}

const GROWTH_STEPS: [number, string][] = [[-Infinity, '#be123c'], [-0.5, '#fda4af'], [0, '#a7f3d0'], [0.5, '#059669']];
const GROWTH_NAMES = ['Fell over 0.5% a year', 'Fell 0 to 0.5%', 'Grew 0 to 0.5%', 'Grew over 0.5% a year'];
const LEVEL_COLORS = ['#d5e7e5', '#7fb2ad', '#2f746f', '#143c3c'];

export const METRICS: Record<MetricId, Metric> = {
  // Where you can build an ADU today, per municipality (tool/places.ts, drawn by tool/placesLayer.ts, not on tracts).
  legal: { short: 'Where to Build', label: 'Where you can build an ADU today, by municipality', steps: [], names: [] },
  jobs_after: {
    short: 'Jobs',
    label: 'Job change, 2019 to 2024',
    steps: [[-Infinity, '#be123c'], [-5, '#fda4af'], [0, '#a7f3d0'], [5, '#059669']],
    names: ['Lost over 5%', 'Lost 0 to 5%', 'Grew 0 to 5%', 'Grew over 5%'],
  },
  jobs_shift: {
    short: 'Jobs shift',
    label: 'Job growth after 2019 minus before (pts per year)',
    steps: [[-Infinity, '#be123c'], [-1, '#fda4af'], [0, '#a7f3d0'], [1, '#059669']],
    names: ['Slowed a lot', 'Slowed a little', 'Sped up a little', 'Sped up a lot'],
  },
  pop_after: { short: 'People', label: 'People, growth per year, ACS 2015-19 to 2020-24', steps: GROWTH_STEPS, names: GROWTH_NAMES, moe: 'pop_after_moe' },
  units_after: { short: 'Homes', label: 'Homes, growth per year, ACS 2015-19 to 2020-24', steps: GROWTH_STEPS, names: GROWTH_NAMES, moe: 'units_after_moe' },
  rent_after: { short: 'Rent', label: 'Rent (2024 dollars), growth per year, ACS 2015-19 to 2020-24', steps: GROWTH_STEPS, names: GROWTH_NAMES, moe: 'rent_after_moe' },
  group: { short: 'Groups', label: 'Trend groups (K-means)', steps: [], names: [] },
  window: { short: 'Over time', label: 'Levels in one ACS window (time slider)', steps: [], names: [] },
  yearly: { short: 'By year', label: 'Towns year by year, 2010 to 2025 (time slider)', steps: [], names: [] },
  room: {
    short: 'Room',
    label: 'Lots with room for a 600 sq ft unit (MUSA 5500)',
    // Darker than the other violet scales: modelled tracts are drawn at half opacity and most tracts are hatched.
    steps: [[-Infinity, '#aed0cc'], [250, '#4f918b'], [750, '#1f5e5a'], [1500, '#112f31']],
    names: ['Under 250', '250 to 750', '750 to 1,500', 'Over 1,500'],
    moe: 'room_out',
  },
  pays: {
    short: 'Pays',
    label: 'Does your ADU pay off? (MUSA 5500)',
    steps: [[0, '#fda4af'], [1, '#fcd34d'], [2, '#10b981']],
    names: ['No', 'Close', 'Yes'],
  },
};

/** The trend groups of pipeline/tract/groups.py, largest first, with a colour each. */
export const GROUP_NAMES: string[] = Object.keys(HEADLINE.groups_counts);
const GROUP_PALETTE = ['#94a3b8', '#60a5fa', '#f59e0b', '#4f918b', '#f472b6', '#34d399', '#ef4444', '#14b8a6'];
export const GROUP_COLORS: [string, string][] = GROUP_NAMES.filter((g) => g !== 'Not enough data').map((g, i) => [g, GROUP_PALETTE[i % GROUP_PALETTE.length]]);

/** Breaks for the levels in one window: people and homes per tract, rent in 2024 dollars. */
export const WINDOW_STEPS: Record<WindowVar, number[]> = { pop: [2500, 4000, 5500], homes: [1000, 1700, 2400], rent: [800, 1050, 1300] };

export function windowLegend(v: WindowVar): { names: string[]; colors: string[] } {
  const b = WINDOW_STEPS[v];
  const f = (n: number) => (v === 'rent' ? `$${n.toLocaleString('en-US')}` : n.toLocaleString('en-US'));
  return { names: [`Under ${f(b[0])}`, `${f(b[0])} to ${f(b[1])}`, `${f(b[1])} to ${f(b[2])}`, `Over ${f(b[2])}`], colors: LEVEL_COLORS };
}

/** Pays off as a number for the map: no 0, maybe 1, yes 2. */
export const PAYS_CODE = { no: 0, maybe: 1, yes: 2 } as const;

const stepped = (value: unknown, steps: [number, string][], prop: string) => {
  const expr: unknown[] = ['step', value, steps[0][1]];
  steps.slice(1).forEach(([brk, col]) => expr.push(brk, col));
  return ['case', ['==', ['get', prop], null], NO_DATA, expr];
};

export function colorExpr(metric: MetricId, win: { v: WindowVar; w: Window } = { v: 'rent', w: '24' }): ExpressionSpecification {
  // Where to Build and Towns by Year colour municipalities, not tracts. The tract fill is hidden under them.
  if (metric === 'legal' || metric === 'yearly') return colorExpr('jobs_after');
  if (metric === 'group') {
    return ['match', ['get', 'trend_group'], ...GROUP_COLORS.flat(), NO_DATA] as unknown as ExpressionSpecification;
  }
  if (metric === 'window') {
    const prop = `${win.v}_${win.w}`;
    const b = WINDOW_STEPS[win.v];
    return stepped(['to-number', ['get', prop], 0], [[-Infinity, LEVEL_COLORS[0]], [b[0], LEVEL_COLORS[1]], [b[1], LEVEL_COLORS[2]], [b[2], LEVEL_COLORS[3]]], prop) as unknown as ExpressionSpecification;
  }
  const m = METRICS[metric];
  // Room: the 600 sq ft estimate per tract (room_mid). Tracts outside the training range keep their colour and are
  // hatched by the tract-moe layer. Modelled tracts are drawn lighter (MapCanvas tractOpacity).
  if (metric === 'room') return stepped(['to-number', ['get', 'room_mid'], -9999], m.steps, 'room_mid') as unknown as ExpressionSpecification;
  // live metric: feature-state, -1 when there is no answer for this ADU
  if (metric === 'pays') {
    const expr: unknown[] = ['step', ['coalesce', ['feature-state', metric], -1], NO_DATA, 0, m.steps[0][1]];
    m.steps.slice(1).forEach(([brk, col]) => expr.push(brk, col));
    return expr as unknown as ExpressionSpecification;
  }
  const colored = stepped(['to-number', ['get', metric], -9999], m.steps, metric);
  // A change inside its margin of error is greyed (and hatched by the tract-moe layer): no clear change.
  return (m.moe ? ['case', ['==', ['get', m.moe], 1], MOE_GREY, colored] : colored) as unknown as ExpressionSpecification;
}

/** Towns and counties: ADUs by 2031 (mid) per 1,000 people, for one forecast scenario. */
export const AREA_STEPS: [number, string][] = [[-Infinity, '#eef5f4'], [0.1, '#7fb2ad'], [0.5, '#2f746f'], [1, '#143c3c']];
export const AREA_NAMES = ['Under 0.1', '0.1 to 0.5', '0.5 to 1', 'Over 1'];

export function areaColorExpr(f: Forecast, popProp: string): ExpressionSpecification {
  const mid = ['get', `adus_mid_${f}`];
  const pop = ['get', popProp];
  const per = ['/', ['to-number', mid, 0], ['max', ['/', ['to-number', pop, 1], 1000], 0.001]];
  const expr: unknown[] = ['step', per, AREA_STEPS[0][1]];
  AREA_STEPS.slice(1).forEach(([brk, col]) => expr.push(brk, col));
  return ['case', ['any', ['==', mid, null], ['==', pop, null]], NO_DATA, expr] as unknown as ExpressionSpecification;
}

/** Yearly town colours. People: % change since 2010. New homes: homes permitted that year per 1,000 people. */
export const YEAR_STEPS: Record<YearVar, [number, string][]> = {
  pop: [[-Infinity, '#be123c'], [-5, '#fda4af'], [0, '#a7f3d0'], [5, '#34d399'], [15, '#047857']],
  permits: [[-Infinity, '#eef5f4'], [0.5, '#aed0cc'], [2, '#4f918b'], [5, '#1f5e5a'], [10, '#112f31']],
};
export const YEAR_NAMES: Record<YearVar, string[]> = {
  pop: ['Lost over 5%', 'Lost 0 to 5%', 'Grew 0 to 5%', 'Grew 5 to 15%', 'Grew over 15%'],
  permits: ['Under 0.5', '0.5 to 2', '2 to 5', '5 to 10', 'Over 10'],
};

/** The value one town shows on the yearly map. null when the data is missing. */
export function yearValue(p: Record<string, unknown>, v: YearVar, year: number): number | null {
  const num = (k: string) => (typeof p[k] === 'number' && Number.isFinite(p[k] as number) ? (p[k] as number) : null);
  const base = num('pop_2010');
  if (v === 'pop') {
    const now = num(`pop_${year}`);
    return base && now != null ? (now / base - 1) * 100 : null;
  }
  const permits = num(`permits_${year}`);
  const pop = num(`pop_${year}`) ?? base;
  return permits != null && pop ? permits / (pop / 1000) : null;
}

/** The yearly town fill, as a MapLibre expression. */
export function yearColorExpr(v: YearVar, year: number): ExpressionSpecification {
  const steps = YEAR_STEPS[v];
  const base = ['to-number', ['get', 'pop_2010'], 0];
  const value =
    v === 'pop'
      ? ['*', ['-', ['/', ['to-number', ['get', `pop_${year}`], 0], ['max', base, 1]], 1], 100]
      : ['/', ['to-number', ['get', `permits_${year}`], 0], ['max', ['/', ['to-number', ['coalesce', ['get', `pop_${year}`], ['get', 'pop_2010']], 1], 1000], 0.001]];
  const missing = v === 'pop' ? ['any', ['==', ['get', `pop_${year}`], null], ['<=', base, 0]] : ['==', ['get', `permits_${year}`], null];
  const expr: unknown[] = ['step', value, steps[0][1]];
  steps.slice(1).forEach(([brk, col]) => expr.push(brk, col));
  return ['case', missing, NO_DATA, expr] as unknown as ExpressionSpecification;
}

/** What HB 2186 adds: the bill's mid minus today's mid, per 1,000 people. Same breaks, a purple scale. */
export const GAIN_STEPS: [number, string][] = [[-Infinity, '#f5f3ff'], [0.1, '#c4b5fd'], [0.5, '#8b5cf6'], [1, '#4c1d95']];

export function areaGainExpr(popProp: string): ExpressionSpecification {
  const bill = ['to-number', ['get', 'adus_mid_hb2186'], 0];
  const today = ['to-number', ['get', 'adus_mid_current'], 0];
  const per = ['/', ['-', bill, today], ['max', ['/', ['to-number', ['get', popProp], 1], 1000], 0.001]];
  const expr: unknown[] = ['step', per, GAIN_STEPS[0][1]];
  GAIN_STEPS.slice(1).forEach(([brk, col]) => expr.push(brk, col));
  return ['case', ['any', ['==', ['get', 'adus_mid_hb2186'], null], ['==', ['get', popProp], null]], NO_DATA, expr] as unknown as ExpressionSpecification;
}
