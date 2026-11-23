// One write-up page (../docs/<page>.md, turned into HTML at build time by plugins/docs.ts), with a list of its
// sections on wide screens.
import { DOCS } from 'virtual:docs';
import { cx } from '../lib/cx';
import { href, type Page } from './route';
import { asset } from './config';

type DocId = 'proposal' | 'report';
const NAME: Record<DocId, string> = { proposal: 'Proposal', report: 'Report' };
/** Where each page leads next. */
const NEXT: Record<DocId, { page: Page; label: string }> = { proposal: { page: 'map', label: 'Open the map' }, report: { page: 'notebooks', label: 'Notebooks & Code' } };

export default function DocPage({ page }: { page: DocId }) {
  const doc = DOCS[page];
  const title = (doc.title ?? NAME[page]).replace(/^MUSA 5500\s+/, '');
  const toc = doc.toc.filter((t) => t.level === 2 || t.level === 3);
  const side = toc.length > 2;
  const next = NEXT[page];
  // Section links scroll inside the page: the hash holds the page, not the section.
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className={cx('mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6', side && 'lg:grid-cols-[minmax(0,1fr)_220px]')}>
      <article className="min-w-0">
        <p className="text-caption font-semibold uppercase tracking-[0.14em] text-violet-700">MUSA 5500</p>
        <h1 className="mt-1 font-display text-[34px] font-bold leading-tight tracking-tight text-slate-900">{title}</h1>
        {page === 'report' && (
          <p className="print-hide mt-3 text-small">
            <a className="font-semibold text-violet-700 hover:text-violet-900" href={asset('report.pdf')} download>
              Download the report as a PDF
            </a>
          </p>
        )}
        <div className="doc mt-6" dangerouslySetInnerHTML={{ __html: doc.html }} />
        <nav aria-label="Next and previous page" className="mt-12 flex justify-between gap-3 border-t border-stone-200 pt-5 text-small">
          <a className="font-semibold text-violet-700 hover:text-violet-900" href={href('home')}>
            ← Home
          </a>
          <a className="font-semibold text-violet-700 hover:text-violet-900" href={href(next.page)}>
            {next.label} →
          </a>
        </nav>
      </article>
      {side && (
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto scroll-quiet">
            <p className="mb-2 text-caption font-semibold uppercase tracking-[0.12em] text-slate-500">On this page</p>
            <ul className="space-y-0.5 border-l border-stone-200">
              {toc.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => go(t.id)} className={cx('-ml-px block w-full border-l border-transparent py-1 text-left text-small leading-snug text-slate-600 transition-colors hover:border-violet-400 hover:text-slate-900', t.level === 3 ? 'pl-6' : 'pl-3')}>
                    {t.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}
