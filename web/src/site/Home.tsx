// Home: the question, what we found (lib/headline.json, written by build_data.py from the tract outputs), the report
// and the course requirements. The menu has the other three pages.
import { Check, Code2, Download, FileText, Map as MapIcon } from 'lucide-react';
import { HEADLINE, NUMBERS } from '../lib/numbers';
import { href } from './route';
import { asset } from './config';

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const range = (r: { low: number; high: number }) => `${n(r.low)} to ${n(r.high)}`;

function Stat({ value, label, note }: { value: string; label: string; note: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/80">
      <div className="font-display text-[34px] font-bold leading-none tracking-tight text-violet-700 tnum">{value}</div>
      <div className="mt-2 text-body font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-small text-slate-500">{note}</div>
    </div>
  );
}

/** What the course asks for, and where it is in this project. */
const COURSE: [string, string][] = [
  ['Data from an API', 'Census API (ACS 5-year, decennial)'],
  ['Three or more sources', 'ACS, LODES jobs, permits, IRS migration, Freddie Mac rates, NLCD land cover, OpenStreetMap'],
  ['Complex joins', '2010 to 2020 tract crosswalk, blocks to tracts and towns'],
  ['OSMnx', 'Jobs within 30 minutes on the street network'],
  ['Clustering', 'K-means, Gaussian mixture and Ward'],
  ['Raster analysis', 'Developed land by zonal statistics'],
  ['Models with spatial cross-validation', 'Housing growth, scored on held-out counties'],
  ['Interactive views', 'This map and a linked tract explorer'],
];

const QUESTIONS = ['Where are people and jobs growing?', 'Did that change after 2019?', 'Where would a new ADU pay for itself?', "How many ADUs could be built by 2031, under today's rules and under the state bills?"];

export default function Home() {
  const a = HEADLINE.adus_by_2031;
  return (
    <div>
      <section className="border-b border-stone-200/70 bg-gradient-to-b from-violet-50/70 to-transparent">
        <div className="mx-auto grid max-w-6xl items-start gap-8 px-4 pb-12 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-violet-700">MUSA 5500 · Geospatial Data Science in Python · Fall 2026</p>
          <h1 className="mt-3 max-w-3xl font-display text-[34px] font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-[46px]">Housing demand and backyard homes across Pennsylvania</h1>
          <p className="mt-4 max-w-2xl text-lead text-slate-700">
            A state bill, HB 2186, would allow a backyard home (an ADU) on every home lot in Pennsylvania. But legal does not mean built. ADUs get built where demand is growing and the rent covers the cost. This project measures both for all {n(HEADLINE.tracts)} census tracts in the state.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a href={href('map')} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-body font-semibold text-white shadow-sm transition hover:bg-violet-700">
              <MapIcon className="h-4 w-4" /> Open the map
            </a>
            <a href={href('report')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-body font-semibold text-slate-800 ring-1 ring-stone-200 transition hover:ring-violet-300">
              <FileText className="h-4 w-4" /> Read the report
            </a>
            <a href={href('notebooks')} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-body font-semibold text-slate-800 ring-1 ring-stone-200 transition hover:ring-violet-300">
              <Code2 className="h-4 w-4" /> Notebooks & code
            </a>
          </div>
          </div>
          <aside aria-label="Course requirements" className="rounded-2xl bg-white/90 p-5 ring-1 ring-stone-200/80">
            <h2 className="text-caption font-semibold uppercase tracking-[0.12em] text-slate-500">Course requirements</h2>
            <ul className="mt-3 space-y-2">
              {COURSE.map(([what, how]) => (
                <li key={what} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-small leading-snug">
                    <span className="font-semibold text-slate-900">{what}.</span> <span className="text-slate-600">{how}.</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-title font-bold text-slate-900">The question</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {QUESTIONS.map((q, i) => (
            <li key={q} className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200/80">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-600 text-caption font-bold text-white">{i + 1}</span>
              <span className="text-body text-slate-800">{q}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-small text-slate-500">Unit: 2020 census tracts ({n(HEADLINE.tracts)}) and towns (2,572 county subdivisions). From 2010 to the latest year of each source.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <h2 className="font-display text-title font-bold text-slate-900">What we found</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={NUMBERS.paysShareExact} label="of tracts where an ADU pays off" note={`${n(HEADLINE.pays_tracts)} of ${n(HEADLINE.tracts)} tracts. A 600 sq ft 1-bedroom unit at $250 per sq ft and ${(HEADLINE.rate * 100).toFixed(2)}%, rent from the tract.`} />
          <Stat value={n(a.current.mid)} label="ADUs by 2031 under today's rules" note={`Mid case. Range ${range(a.current)}. Scenario arithmetic, not a fitted forecast.`} />
          <Stat value={n(a.hb2186.mid)} label="ADUs by 2031 under HB 2186" note={`Range ${range(a.hb2186)}. SB 1346: about ${n(a.sb1346.mid)}. Bills are not law.`} />
          <Stat value={NUMBERS.roomMid} label="lots with room for a 600 sq ft unit" note={`Range ${(HEADLINE.room.low / 1e6).toFixed(1)} to ${(HEADLINE.room.high / 1e6).toFixed(1)} million. Measured in ${n(HEADLINE.room.measured_tracts)} city tracts, modelled in ${n(HEADLINE.room.modelled_tracts)} more.`} />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-10 sm:px-6">
        <figure className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200/80">
          <a href={asset('docs/figures/04_payoff_map.png')} target="_blank" rel="noreferrer">
            <img src={asset('docs/figures/04_payoff_map.png')} alt="Map of Pennsylvania tracts where a backyard unit pays off" className="w-full" loading="lazy" />
          </a>
          <figcaption className="border-t border-stone-100 px-4 py-3 text-small text-slate-600">Where a 600 sq ft unit pays off at the mid cost. The tracts that pay are mostly in the Philadelphia suburbs and parts of the city. From notebook 04.</figcaption>
        </figure>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-stone-200/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-title font-bold text-slate-900">The report</h2>
            <p className="mt-1 text-body text-slate-600">Three pages: introduction, data, methods, results and conclusion.</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href={href('report')} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-body font-semibold text-white shadow-sm transition hover:bg-violet-700">
              <FileText className="h-4 w-4" /> Read it here
            </a>
            <a href={asset('report.pdf')} download className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-body font-semibold text-slate-800 ring-1 ring-stone-200 transition hover:ring-violet-300">
              <Download className="h-4 w-4" /> PDF
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
