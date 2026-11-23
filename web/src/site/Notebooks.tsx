// Notebooks & Code: the four notebooks as run (public/notebooks/<id>.html, made with jupyter nbconvert by
// render_notebooks.py, never run again here), then how to run everything yourself. The package list is read from
// ../requirements.txt at build time (virtual:docs).
import { ArrowLeft, ArrowRight, Download, ExternalLink } from 'lucide-react';
import { REQUIREMENTS } from 'virtual:docs';
import { NOTEBOOKS, REPO_DIR, REPO_URL, asset, repoFile, type Notebook } from './config';
import { href } from './route';

const RUN = `# 1. Python 3.12+ with the packages below
pip install -r requirements.txt

# 2. Download the data (free Census API key in .env as CENSUS_API_KEY=...)
python shared/get_boundaries.py
python get_data.py

# 3. Run the notebooks in order
jupyter lab notebooks/

# 4. Rebuild this website
python web/build_data.py
python web/render_notebooks.py
cd web && npm install && npm run build`;

export default function Notebooks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-caption font-semibold uppercase tracking-[0.14em] text-violet-700">MUSA 5500</p>
      <h1 className="mt-1 font-display text-[34px] font-bold leading-tight tracking-tight text-slate-900">Notebooks & Code</h1>
      <p className="mt-3 max-w-2xl text-body text-slate-700">
        The analysis runs in four notebooks, in this order. Each one loads the data, calls the modules in <code className="rounded bg-stone-100 px-1 text-small">pipeline/tract/</code> and shows the result. They are shown here as they were run, with every output. To run them yourself, see the steps below.
      </p>
      <ol className="mt-6 space-y-3">
        {NOTEBOOKS.map((nb) => (
          <li key={nb.id} className="rounded-2xl bg-white p-5 ring-1 ring-stone-200/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-caption font-semibold text-violet-700">Notebook {nb.n}</p>
                <h2 className="font-display text-title font-bold text-slate-900">{nb.title}</h2>
              </div>
              <a href={href('notebooks', nb.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-small font-semibold text-white shadow-sm transition hover:bg-violet-700">
                Read it <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-2 text-body text-slate-700">{nb.what}</p>
            <p className="mt-2 text-small text-slate-500">
              Saves{' '}
              {nb.saves.map((s, i) => (
                <span key={s}>
                  {i > 0 && ', '}
                  <code className="rounded bg-stone-100 px-1 text-caption text-slate-700">{s}</code>
                </span>
              ))}
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small">
              <a className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:text-violet-900" href={asset(`notebooks/${nb.id}.html`)} target="_blank" rel="noreferrer">
                Full page <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <a className="inline-flex items-center gap-1 font-semibold text-violet-700 hover:text-violet-900" href={repoFile(`notebooks/${nb.id}.ipynb`)} target="_blank" rel="noreferrer">
                The .ipynb file <Download className="h-3.5 w-3.5" />
              </a>
            </p>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-title font-bold text-slate-900">Run it yourself</h2>
      <p className="mt-2 text-body text-slate-700">
        All data is free and public. Run these from the root of the{' '}
        <a className="font-semibold text-violet-700 hover:text-violet-900" href={`${REPO_URL}/tree/main/${REPO_DIR}`} target="_blank" rel="noreferrer">
          code on GitHub
        </a>
        . The logic of each step is a Python module in <code className="rounded bg-stone-100 px-1 text-small">pipeline/tract/</code>.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 text-small leading-relaxed text-slate-100">
        <code>{RUN}</code>
      </pre>
      <p className="mt-4 text-small text-slate-600">Python packages:</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Python packages">
        {REQUIREMENTS.split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .map((r) => (
            <li key={r}>
              <code className="rounded-lg bg-white px-2 py-1 text-caption text-slate-800 ring-1 ring-stone-200">{r}</code>
            </li>
          ))}
      </ul>
      <p className="mt-6 text-small text-slate-500">
        Also: the{' '}
        <a className="font-semibold text-violet-700 hover:text-violet-900" href={asset('explorer/tract_explorer.html')} target="_blank" rel="noreferrer">
          tract explorer
        </a>
        , the linked view from notebook 04, and the{' '}
        <a className="font-semibold text-violet-700 hover:text-violet-900" href={repoFile('README.md')} target="_blank" rel="noreferrer">
          README
        </a>{' '}
        with every detail.
      </p>
    </div>
  );
}

/** One notebook in a frame that fills the window, with a bar to move between them. */
export function NotebookView({ nb }: { nb: Notebook }) {
  const i = NOTEBOOKS.indexOf(nb);
  const prev = NOTEBOOKS[i - 1];
  const next = NOTEBOOKS[i + 1];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-stone-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <a href={href('notebooks')} className="text-caption font-semibold text-violet-700 hover:text-violet-900">
              All notebooks
            </a>
            <h1 className="truncate font-display text-lead font-bold text-slate-900">
              {nb.n}. {nb.title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-small">
            {prev && (
              <a href={href('notebooks', prev.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 ring-1 ring-stone-200 hover:text-slate-900">
                <ArrowLeft className="h-3.5 w-3.5" /> {prev.n}
              </a>
            )}
            {next && (
              <a href={href('notebooks', next.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 ring-1 ring-stone-200 hover:text-slate-900">
                {next.n} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
            <a href={asset(`notebooks/${nb.id}.html`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-violet-700 ring-1 ring-violet-200 hover:text-violet-900">
              Full page <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a href={repoFile(`notebooks/${nb.id}.ipynb`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold text-violet-700 ring-1 ring-violet-200 hover:text-violet-900">
              .ipynb <Download className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
      <iframe key={nb.id} title={`Notebook ${nb.n}: ${nb.title}`} src={asset(`notebooks/${nb.id}.html`)} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  );
}
