// Explore, ADUs by 2031: the planner table. Every county or town with its ADUs by 2031 (mid, low to high), per 1,000
// people, what the state bill would add, and, for counties, the tracts where a unit pays off. Sort by any column,
// search by name, click a row to see it on the map, or save the table as a CSV file.
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { fmt } from '../lib/format';
import { cx } from '../lib/cx';
import { Card } from './Report';
import { FORECAST_LABEL, type Forecast } from './metrics';
import { bboxOf, inGeom, type Feature, type Geom, type LngLat } from './geo';
import { pickSpot } from './actions';
import { useTool } from './store';

type Kind = 'county' | 'town';
type SortKey = 'name' | 'pop' | 'mid' | 'perK' | 'bill' | 'pays';

interface TableRow {
  id: string;
  name: string;
  county: string;
  pop: number | null;
  mid: number | null;
  low: number | null;
  high: number | null;
  perK: number | null;
  /** HB 2186 mid minus today's mid. */
  bill: number | null;
  /** Counties: tracts where the base unit pays off, and all tracts. */
  pays: number | null;
  tracts: number | null;
  geom: Geom;
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** A point inside the shape: the middle of its box when that is inside, else the first inside point on a grid. */
export function insidePoint(g: Geom): LngLat {
  const [x0, y0, x1, y1] = bboxOf(g);
  const mid: LngLat = [(x0 + x1) / 2, (y0 + y1) / 2];
  if (inGeom(mid, g)) return mid;
  for (let i = 1; i < 12; i++)
    for (let j = 1; j < 12; j++) {
      const p: LngLat = [x0 + ((x1 - x0) * i) / 12, y0 + ((y1 - y0) * j) / 12];
      if (inGeom(p, g)) return p;
    }
  return mid;
}

function rowsFor(kind: Kind, features: Feature<Record<string, unknown>>[], forecast: Forecast): TableRow[] {
  return features.map((f) => {
    const p = f.properties;
    const pop = n(kind === 'county' ? p.pop_2024 : p.pop_2025);
    const mid = n(p[`adus_mid_${forecast}`]);
    const today = n(p.adus_mid_current);
    const bill = n(p.adus_mid_hb2186);
    return {
      id: String(p.GEOID),
      name: kind === 'county' ? `${p.NAME} County` : String(p.NAMELSAD ?? p.NAME ?? ''),
      county: kind === 'county' ? String(p.NAME ?? '') : String(p.county ?? ''),
      pop,
      mid,
      low: n(p[`adus_low_${forecast}`]),
      high: n(p[`adus_high_${forecast}`]),
      perK: mid != null && pop ? mid / (pop / 1000) : null,
      bill: today != null && bill != null ? bill - today : null,
      pays: kind === 'county' ? n(p.tracts_pays_yes) : null,
      tracts: kind === 'county' ? n(p.tracts) : null,
      geom: f.geometry,
    };
  });
}

function toCsv(kind: Kind, rows: TableRow[], forecast: Forecast): string {
  const head = [kind === 'county' ? 'county' : 'town', ...(kind === 'town' ? ['county'] : []), 'population', `adus_2031_mid_${forecast}`, 'adus_2031_low', 'adus_2031_high', 'per_1000_people', 'hb2186_adds', ...(kind === 'county' ? ['tracts_that_pay', 'tracts'] : [])];
  const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const v = (x: number | null, d = 0) => (x == null ? '' : x.toFixed(d));
  const lines = rows.map((r) => [q(r.name), ...(kind === 'town' ? [q(r.county)] : []), v(r.pop), v(r.mid, 1), v(r.low, 1), v(r.high, 1), v(r.perK, 2), v(r.bill, 1), ...(kind === 'county' ? [v(r.pays), v(r.tracts)] : [])].join(','));
  return [head.join(','), ...lines].join('\n') + '\n';
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const COLS: { key: SortKey; label: string; title: string; right?: boolean }[] = [
  { key: 'name', label: 'Name', title: 'Sort by name' },
  { key: 'mid', label: 'ADUs by 2031', title: 'Mid case, with the low to high range', right: true },
  { key: 'perK', label: 'Per 1,000', title: 'ADUs by 2031 per 1,000 people', right: true },
  { key: 'bill', label: 'Bill adds', title: 'HB 2186 mid minus today, mid. Not law.', right: true },
];

export default function CountyTable({ bare }: { bare?: boolean }) {
  const counties = useTool((s) => s.counties);
  const towns = useTool((s) => s.towns);
  const forecast = useTool((s) => s.forecast);
  const level = useTool((s) => s.level);
  const set = useTool((s) => s.set);
  const [kind, setKind] = useState<Kind>(level === 'town' ? 'town' : 'county');
  // The table follows the map's Towns or Counties switch.
  useEffect(() => setKind(level === 'town' ? 'town' : 'county'), [level]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'mid', desc: true });
  const fc = kind === 'county' ? counties : towns;
  const all = useMemo(() => (fc ? rowsFor(kind, fc.features as unknown as Feature<Record<string, unknown>>[], forecast) : []), [fc, kind, forecast]);
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = needle ? all.filter((r) => r.name.toLowerCase().includes(needle) || r.county.toLowerCase().includes(needle)) : all;
    const dir = sort.desc ? -1 : 1;
    return [...hit].sort((a, b) => {
      if (sort.key === 'name') return dir * a.name.localeCompare(b.name);
      const av = a[sort.key] ?? -Infinity;
      const bv = b[sort.key] ?? -Infinity;
      return dir * (av - bv);
    });
  }, [all, q, sort]);
  if (!counties) return <p className="rounded-xl bg-stone-50 px-3 py-2.5 text-small text-slate-600 ring-1 ring-stone-200">The county table is not built yet.</p>;
  const shown = rows.slice(0, kind === 'town' ? 200 : 67);
  const cols = kind === 'county' ? [...COLS, { key: 'pays' as SortKey, label: 'Tracts that pay', title: 'Tracts where a 600 sq ft 1-bedroom unit pays off at the mid cost', right: true }] : COLS;
  const go = (r: TableRow) => {
    set({ level: kind });
    void pickSpot(insidePoint(r.geom), r.name);
  };
  const by = (key: SortKey) => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== 'name' }));
  return (
    <Card title={kind === 'county' ? 'Counties' : 'Towns'} tag="MUSA 5500" bare={bare}>
      <div className="-mt-1 mb-2 flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Table of" className="inline-flex rounded-lg bg-stone-100 p-0.5 text-caption font-semibold">
          {(['county', 'town'] as Kind[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cx('tap rounded-md px-2 py-1', kind === k ? 'bg-white text-violet-800 shadow-sm' : 'text-slate-600')}>
              {k === 'county' ? 'Counties' : 'Towns'}
            </button>
          ))}
        </div>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={kind === 'county' ? 'Find a county' : 'Find a town or county'} aria-label="Find by name" className="min-w-0 flex-1 rounded-lg bg-white px-2 py-1 text-small ring-1 ring-stone-200 focus:outline-none focus:ring-violet-400" />
        <button type="button" onClick={() => download(`adus_2031_${kind === 'county' ? 'counties' : 'towns'}_${forecast}.csv`, toCsv(kind, rows, forecast))} className="tap inline-flex items-center gap-1 rounded-lg px-2 py-1 text-caption font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50" title="Save this table (with your search and sort) as a CSV file">
          <Download className="h-3.5 w-3.5" aria-hidden /> CSV
        </button>
      </div>
      <p className="mb-2 text-caption text-slate-500">
        {FORECAST_LABEL[forecast]}, mid (low to high). Click a column to sort, a row to see it on the map.
      </p>
      <div className="max-h-[420px] overflow-y-auto rounded-lg ring-1 ring-stone-200/80">
        <table className="w-full text-left text-small">
          <thead className="sticky top-0 bg-stone-50 text-caption text-slate-500">
            <tr>
              {cols.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : 'none'} className={cx('px-2 py-1.5 font-semibold', c.right && 'text-right')}>
                  <button type="button" onClick={() => by(c.key)} title={c.title} className={cx('inline-flex items-center gap-0.5 hover:text-slate-900', sort.key === c.key && 'text-violet-800')}>
                    {c.label}
                    {sort.key === c.key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {shown.map((r, i) => (
              <tr key={r.id} onClick={() => go(r)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go(r))} tabIndex={0} data-table-row={r.id} className={cx('cursor-pointer hover:bg-violet-50 focus:bg-violet-50 focus:outline-none', i % 2 === 1 && 'bg-stone-50/50')}>
                <td className="px-2 py-1 text-slate-900">
                  {r.name}
                  {kind === 'town' && r.county && <span className="block text-caption text-slate-500">{r.county} County</span>}
                </td>
                <td className="px-2 py-1 text-right text-slate-900 tnum">
                  <b className="font-semibold">{fmt(r.mid, r.mid != null && r.mid < 10 ? 1 : 0)}</b>{' '}
                  <span className="block text-caption text-slate-500">
                    {fmt(r.low, r.low != null && r.low < 10 ? 1 : 0)} to {fmt(r.high, r.high != null && r.high < 10 ? 1 : 0)}
                  </span>
                </td>
                <td className="px-2 py-1 text-right text-slate-700 tnum">{r.perK == null ? '-' : r.perK.toFixed(r.perK < 10 ? 1 : 0)}</td>
                <td className="px-2 py-1 text-right text-slate-700 tnum">{r.bill == null ? '-' : `+${fmt(r.bill, r.bill < 10 ? 1 : 0)}`}</td>
                {kind === 'county' && (
                  <td className="px-2 py-1 text-right text-slate-700 tnum">
                    {fmt(r.pays)} of {fmt(r.tracts)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-caption leading-snug text-slate-500" title="Both bills die on Nov 30, 2026 if not enacted.">
        {rows.length > shown.length ? `Top ${shown.length} of ${fmt(rows.length)} shown. The CSV has all of them. ` : ''}Arithmetic, not a forecast. Bills are not law.
      </p>
    </Card>
  );
}
