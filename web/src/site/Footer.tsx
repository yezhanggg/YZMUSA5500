// The line at the foot of every page but the map and a notebook.
import { REPO_URL, TOOL_URL } from './config';

export default function Footer() {
  return (
    <footer className="border-t border-stone-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-caption text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          MUSA 5500 Geospatial Data Science in Python, Fall 2026. Part of{' '}
          <a className="font-semibold text-violet-700 hover:text-violet-900" href={TOOL_URL}>
            Backyard Homes PA
          </a>
          .
        </p>
        <p>
          Estimates, not legal advice. Bills are not law.{' '}
          <a className="font-semibold text-violet-700 hover:text-violet-900" href={REPO_URL} target="_blank" rel="noreferrer">
            Code
          </a>
        </p>
      </div>
    </footer>
  );
}
