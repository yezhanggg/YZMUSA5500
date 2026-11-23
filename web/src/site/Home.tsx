// Home: the question, what we found (lib/headline.json, written by build_data.py from the tract outputs), the report
// and the course requirements. Laid out like a printed page: thin rules between parts, no boxes.
import type { ReactNode } from 'react';
import { ArrowRight, Download } from 'lucide-react';
import { HEADLINE, NUMBERS } from '../lib/numbers';
import { href } from './route';
import { REPO_URL, asset } from './config';

const n = (v: number) => Math.round(v).toLocaleString('en-US');
const range = (r: { low: number; high: number }) => `${n(r.low)} to ${n(r.high)}`;

/** What the course asks for, and where it is in this project. */
const COURSE: [string, string][] = [
  ['Data from an API', 'Census API (ACS 5-year, decennial)'],
  ['Three or more sources', 'ACS, LODES jobs, permits, IRS migration, Freddie Mac rates, NLCD land cover, OpenStreetMap'],
  ['Complex joins', '2010 to 2020 tract crosswalk, blocks to tracts and towns'],
  ['OSMnx', 'Jobs within 30 minutes on the street network'],
  ['Clustering', 'K-means, Gaussian mixture and Ward'],
  ['Raster analysis', 'Developed land by zonal statistics'],
  ['Spatial cross-validation', 'Housing growth models, scored on held-out counties'],
  ['Interactive views', 'The map and a linked tract explorer'],
];

const QUESTIONS = ['Where are people and jobs growing?', 'Did that change after 2019?', 'Where would a new ADU pay for itself?', "How many ADUs could be built by 2031, under today's rules and under the state bills?"];

function Label({ children }: { children: ReactNode }) {
  return <h2 className="text-caption font-semibold uppercase tracking-[0.14em] text-stone-500">{children}</h2>;
}

export default function Home() {
  const a = HEADLINE.adus_by_2031;
  const stats: { value: string; label: string; note: string }[] = [
    { value: NUMBERS.paysShareExact, label: 'of tracts where an ADU pays off', note: `${n(HEADLINE.pays_tracts)} of ${n(HEADLINE.tracts)} tracts, at $250 per sq ft and ${(HEADLINE.rate * 100).toFixed(2)}%.` },
    { value: n(a.current.mid), label: "ADUs by 2031, today's rules", note: `Range ${range(a.current)}.` },
    { value: n(a.hb2186.mid), label: 'ADUs by 2031 under HB 2186', note: `Range ${range(a.hb2186)}. Bills are not law.` },
    { value: NUMBERS.roomMid, label: 'lots with room for a unit', note: `Measured in ${n(HEADLINE.room.measured_tracts)} city tracts, modelled elsewhere.` },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="pb-10 pt-12 sm:pt-16">
        <p className="text-small text-stone-500">MUSA 5500 Geospatial Data Science in Python · Fall 2026 · Ye Zhang</p>
        <h1 className="mt-3 max-w-3xl font-display text-[36px] font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-[48px]">Housing demand and backyard homes across Pennsylvania</h1>
        <p className="mt-5 max-w-2xl text-lead text-slate-700">
          A state bill, HB 2186, would allow a backyard home (an ADU) on every home lot in Pennsylvania. Legal does not mean built. ADUs get built where demand is growing and the rent covers the cost. This project measures both for all {n(HEADLINE.tracts)} census tracts in the state.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-body font-semibold">
          <a href={href('map')} className="inline-flex items-center gap-2 rounded-md bg-violet-800 px-4 py-2.5 text-white transition hover:bg-violet-900">
            Open the map <ArrowRight className="h-4 w-4" />
          </a>
          <a href={href('report')} className="text-violet-800 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-700">
            Read the report
          </a>
          <a href={href('notebooks')} className="text-violet-800 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-700">
            Notebooks and code
          </a>
        </div>
      </section>

      <section className="border-t border-slate-900 py-8">
        <Label>What we found</Label>
        <dl className="mt-5 grid gap-y-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-stone-300">
          {stats.map((s, i) => (
            <div key={s.label} className={i ? 'lg:pl-6' : 'lg:pr-6'}>
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <div className="font-display text-[38px] font-semibold leading-none tracking-tight text-violet-800 tnum">{s.value}</div>
                <div className="mt-2 text-body font-semibold text-slate-900">{s.label}</div>
                <div className="mt-1 text-small text-stone-500">{s.note}</div>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <figure className="border-t border-stone-300 py-8">
        <a href={asset('docs/figures/04_payoff_map.png')} target="_blank" rel="noreferrer">
          <img src={asset('docs/figures/04_payoff_map.png')} alt="Map of Pennsylvania tracts where a backyard unit pays off" className="mx-auto w-full max-w-3xl" loading="lazy" />
        </a>
        <figcaption className="mx-auto mt-2 max-w-3xl text-small text-stone-500">Where a 600 sq ft unit pays off at the mid cost. Mostly the Philadelphia suburbs and parts of the city. From notebook 04.</figcaption>
      </figure>

      <section className="grid gap-10 border-t border-stone-300 py-8 md:grid-cols-2">
        <div>
          <Label>The question</Label>
          <ol className="mt-4 space-y-2.5">
            {QUESTIONS.map((q, i) => (
              <li key={q} className="flex gap-3 text-body text-slate-800">
                <span className="w-4 shrink-0 font-display font-semibold text-violet-800 tnum">{i + 1}</span>
                {q}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-small text-stone-500">Unit: 2020 census tracts ({n(HEADLINE.tracts)}) and towns (2,572 county subdivisions), 2010 to the latest year of each source.</p>
        </div>
        <div>
          <Label>Course requirements</Label>
          <table className="mt-3 w-full text-small">
            <tbody>
              {COURSE.map(([what, how]) => (
                <tr key={what} className="border-b border-stone-200 last:border-0">
                  <th scope="row" className="w-[42%] py-1.5 pr-3 text-left align-top font-semibold text-slate-900">{what}</th>
                  <td className="py-1.5 align-top text-slate-600">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-stone-300 py-8 pb-14 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <Label>The report</Label>
          <p className="mt-2 text-body text-slate-700">Three pages: introduction, data, methods, results and conclusion.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-body font-semibold">
          <a href={href('report')} className="text-violet-800 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-700">
            Read it here
          </a>
          <a href={asset('report.pdf')} download className="inline-flex items-center gap-1.5 text-violet-800 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-700">
            <Download className="h-4 w-4" /> PDF
          </a>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="text-violet-800 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-700">
            Code on GitHub
          </a>
        </div>
      </section>
    </div>
  );
}
