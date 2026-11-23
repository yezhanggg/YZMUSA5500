// The answer box, the checklist rows and the closed folds of the Details panel. Nothing here decides a rule.
import { useState, type ReactNode } from 'react';
import { Check, ChevronDown, CircleHelp, Clock, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import type { Answer, RowState } from './types';

/** The full notice, as hover text on the short line under an answer. */
export const NOTICE = 'Not legal advice. Not a zoning determination. Check with the city or township before you design or build.';

export const ANSWER_LOOK: Record<Answer, { box: string; title: string; line: string; icon: string }> = {
  yes: { box: 'bg-emerald-50 ring-emerald-200', title: 'text-emerald-800', line: 'text-emerald-900/80', icon: 'bg-emerald-600 text-white' },
  approval: { box: 'bg-amber-50 ring-amber-200', title: 'text-amber-800', line: 'text-amber-900/80', icon: 'bg-amber-500 text-white' },
  no: { box: 'bg-rose-50 ring-rose-200', title: 'text-rose-700', line: 'text-rose-900/80', icon: 'bg-rose-600 text-white' },
  unknown: { box: 'bg-stone-50 ring-stone-200', title: 'text-slate-800', line: 'text-slate-600', icon: 'bg-slate-400 text-white' },
};

export const ANSWER_ICON: Record<Answer, ReactNode> = {
  yes: <Check className="h-5 w-5" strokeWidth={3} />,
  approval: <Clock className="h-5 w-5" strokeWidth={2.5} />,
  no: <X className="h-5 w-5" strokeWidth={3} />,
  unknown: <CircleHelp className="h-5 w-5" strokeWidth={2.5} />,
};

/** "not law" next to anything that shows a bill's result. */
export const NotLaw = ({ className }: { className?: string }) => (
  <span className={cx('inline-flex items-center whitespace-nowrap rounded-full bg-white px-1.5 py-px text-[11px] font-semibold text-slate-600 ring-1 ring-slate-300', className)}>not law</span>
);

/** The answer box: a coloured icon, one or two words, one short line. */
export function AnswerBox({ answer, title, sub, notLaw, icon, label, data }: { answer: Answer; title: string; sub: ReactNode; notLaw?: boolean; icon?: ReactNode; label: string; data?: Record<string, string> }) {
  const L = ANSWER_LOOK[answer];
  return (
    <section aria-label={label} aria-live="polite" data-answer={answer} {...data} className={cx('flex items-center gap-3 rounded-2xl px-4 py-3 ring-1', L.box)}>
      <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', L.icon)} aria-hidden>
        {icon ?? ANSWER_ICON[answer]}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2">
          <h3 className={cx('font-display text-display font-bold leading-tight', L.title)}>{title}</h3>
          {notLaw && <NotLaw />}
        </div>
        <p className={cx('text-body font-medium', L.line)}>{sub}</p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ checklist
const STATE_LABEL: Record<RowState, string> = { pass: 'Passes', fail: 'Fails', approval: 'Needs approval', unknown: 'Not checked' };
const STATE_DOT: Record<RowState, string> = {
  pass: 'bg-emerald-100 text-emerald-700',
  fail: 'bg-rose-100 text-rose-700',
  approval: 'bg-amber-100 text-amber-700',
  unknown: 'bg-stone-200 text-slate-600',
};

export function StateIcon({ state, small, label }: { state: RowState; small?: boolean; label?: string }) {
  const i = small ? 'h-3 w-3' : 'h-3.5 w-3.5';
  return (
    <span role="img" aria-label={label ?? STATE_LABEL[state]} title={label ?? STATE_LABEL[state]} className={cx('grid shrink-0 place-items-center rounded-full', small ? 'h-4 w-4' : 'h-5 w-5', STATE_DOT[state])}>
      {state === 'pass' ? <Check className={i} strokeWidth={3} /> : state === 'fail' ? <X className={i} strokeWidth={3} /> : state === 'approval' ? <Clock className={i} strokeWidth={2.5} /> : <CircleHelp className={i} strokeWidth={2.5} />}
    </span>
  );
}

/** A neutral dot for a row that is a number, not a pass or fail. */
const InfoDot = () => (
  <span className="grid h-5 w-5 shrink-0 place-items-center" aria-hidden>
    <span className="h-2 w-2 rounded-full bg-violet-400" />
  </span>
);

/** One checklist row: icon, a short name, the numbers on the right. A click opens the detail below. */
export function Row({ state, stateLabel, name, value, children, data, icon }: { state: RowState | null; stateLabel?: string; name: string; value: ReactNode; children: ReactNode; data?: Record<string, string>; icon?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <li {...data}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="tap flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-stone-50">
        {icon ?? (state ? <StateIcon state={state} label={stateLabel} /> : <InfoDot />)}
        <span className="shrink-0 whitespace-nowrap text-small font-semibold text-slate-900">{name}</span>
        <span className={cx('min-w-0 flex-1 text-right text-small tnum', state === 'fail' ? 'font-semibold text-rose-700' : 'text-slate-700')}>{value}</span>
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <div className="space-y-1.5 px-3 pb-3 pl-[42px] text-small text-slate-700">{children}</div>}
    </li>
  );
}

/** The list around Row: white, rounded, thin lines between rows. */
export const Rows = ({ label, title, children }: { label: string; title?: string; children: ReactNode }) => (
  <section aria-label={label}>
    {title && <h3 className="mb-1.5 px-1 text-small font-semibold text-slate-900">{title}</h3>}
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/80">{children}</ul>
  </section>
);

// ------------------------------------------------------------------ folds
/** A closed section with a one-line title. */
export function Fold({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={title} className="border-t border-stone-100 first:border-t-0">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="tap flex w-full items-center justify-between gap-2 py-2.5 text-left text-body font-semibold text-slate-900">
        {title}
        <ChevronDown className={cx('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </section>
  );
}

export function Folds({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-white px-4 ring-1 ring-stone-200/80">{children}</div>;
}

/** One short line under the answer. The full notice is its hover text. */
export const ShortNotice = () => (
  <p className="px-1 text-caption text-slate-500" title={NOTICE}>
    Estimate. Not legal advice.
  </p>
);
