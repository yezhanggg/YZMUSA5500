// Notebooks & Code: the four notebooks as run (public/notebooks/<id>.html, made with jupyter nbconvert by
// render_notebooks.py, never run again here), then how to run everything yourself. The package list is read from
// ../requirements.txt at build time (virtual:docs).
import { ArrowLeft, ArrowRight, Download, ExternalLink } from 'lucide-react';
import { REQUIREMENTS } from 'virtual:docs';
import { NOTEBOOKS, REPO_URL, asset, repoFile, type Notebook } from './config';
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

/** The GitHub mark, for links to the code. */
function Github({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

const LINK = 'font-semibold text-violet-800 underline decoration-violet-300 underline-offset-4 hover:decoration-violet-700';
/** The raw .ipynb file on GitHub, for download. */
const rawFile = (path: string) => repoFile(path).replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/');

export default function Notebooks() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-[36px] font-semibold leading-tight tracking-tight text-slate-900">Notebooks and code</h1>
      <p className="mt-3 max-w-2xl text-body text-slate-700">
        The analysis runs in four Jupyter notebooks, in this order. Each opens here as it was run, with every output, and each code cell has a copy button. The code is on{' '}
        <a className={LINK} href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
      <ol className="mt-8 border-t border-slate-900">
        {NOTEBOOKS.map((nb) => (
          <li key={nb.id} className="grid gap-x-6 gap-y-2 border-b border-stone-300 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto]">
            <span className="font-display text-[28px] font-semibold leading-none text-violet-800 tnum">{nb.n}</span>
            <div className="min-w-0">
              <h2 className="font-display text-title font-semibold text-slate-900">
                <a href={href('notebooks', nb.id)} className="hover:underline hover:decoration-stone-400 hover:underline-offset-4">
                  {nb.title}
                </a>
              </h2>
              <p className="mt-1 text-body text-slate-700">{nb.what}</p>
              <p className="mt-1.5 text-small text-stone-500">
                Saves{' '}
                {nb.saves.map((s, i) => (
                  <span key={s}>
                    {i > 0 && ', '}
                    <code className="text-caption text-slate-700">{s}</code>
                  </span>
                ))}
              </p>
            </div>
            <div className="flex items-start gap-4 text-small sm:flex-col sm:items-end sm:gap-1.5">
              <a href={href('notebooks', nb.id)} className="inline-flex items-center gap-1.5 rounded-md bg-violet-800 px-3 py-1.5 font-semibold text-white hover:bg-violet-900">
                Open <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <a className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900" href={repoFile(`notebooks/${nb.id}.ipynb`)} target="_blank" rel="noreferrer">
                <Github className="h-3.5 w-3.5" /> GitHub
              </a>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-title font-semibold text-slate-900">Run it yourself</h2>
      <p className="mt-2 text-body text-slate-700">
        All data is free and public. Run these from the root of the{' '}
        <a className={LINK} href={REPO_URL} target="_blank" rel="noreferrer">
          repository
        </a>
        . The logic of each step is a Python module in <code className="text-small">pipeline/tract/</code>.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-md bg-slate-900 px-4 py-3 text-small leading-relaxed text-slate-100">
        <code>{RUN}</code>
      </pre>
      <p className="mt-4 text-small text-slate-600">
        Python packages:{' '}
        {REQUIREMENTS.split('\n')
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith('#'))
          .join(', ')}
        .
      </p>
      <p className="mt-4 text-small text-slate-600">
        Also: the{' '}
        <a className={LINK} href={asset('explorer/tract_explorer.html')} target="_blank" rel="noreferrer">
          tract explorer
        </a>
        , the linked view from notebook 04, and the{' '}
        <a className={LINK} href={repoFile('README.md')} target="_blank" rel="noreferrer">
          README
        </a>
        .
      </p>
    </div>
  );
}

const BAR_LINK = 'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold text-slate-700 ring-1 ring-stone-300 hover:bg-stone-50 hover:text-slate-900';

/** One notebook, as Jupyter shows it, in a frame that fills the window, with a bar to move between them. */
export function NotebookView({ nb }: { nb: Notebook }) {
  const i = NOTEBOOKS.indexOf(nb);
  const prev = NOTEBOOKS[i - 1];
  const next = NOTEBOOKS[i + 1];
  const file = `notebooks/${nb.id}.ipynb`;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-stone-300 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="min-w-0">
            <a href={href('notebooks')} className="text-caption font-semibold text-stone-500 hover:text-slate-900">
              ← All notebooks
            </a>
            <h1 className="truncate font-mono text-body font-semibold text-slate-900">{file}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-small">
            {prev && (
              <a href={href('notebooks', prev.id)} className={BAR_LINK} aria-label={`Notebook ${prev.n}`}>
                <ArrowLeft className="h-3.5 w-3.5" /> {prev.n}
              </a>
            )}
            {next && (
              <a href={href('notebooks', next.id)} className={BAR_LINK} aria-label={`Notebook ${next.n}`}>
                {next.n} <ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
            <a href={repoFile(file)} target="_blank" rel="noreferrer" className={BAR_LINK}>
              <Github className="h-3.5 w-3.5" /> View on GitHub
            </a>
            <a href={rawFile(file)} download={`${nb.id}.ipynb`} className={BAR_LINK}>
              <Download className="h-3.5 w-3.5" /> .ipynb
            </a>
            <a href={asset(`notebooks/${nb.id}.html`)} target="_blank" rel="noreferrer" className={BAR_LINK} aria-label="Open in a new tab">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
      <iframe key={nb.id} title={`Notebook ${nb.n}: ${nb.title}`} src={asset(`notebooks/${nb.id}.html`)} className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  );
}
