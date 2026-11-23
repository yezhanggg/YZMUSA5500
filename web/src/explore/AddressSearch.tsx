// Search an address in Pennsylvania (Photon, OpenStreetMap data) and see whether an ADU would pay off there: the map
// switches to Does It Pay Off and picks the tract at that address, and Details opens with its answer.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { cx } from '../lib/cx';
import { PA_BBOX, type LngLat } from './geo';
import { pickSpot } from './actions';
import { useTool } from './store';

interface Hit {
  label: string;
  pt: LngLat;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; housenumber?: string; street?: string; city?: string; county?: string; state?: string; postcode?: string };
}

const labelOf = (p: PhotonFeature['properties']) =>
  [[p.housenumber, p.street].filter(Boolean).join(' ') || p.name, p.city ?? p.county, p.postcode].filter(Boolean).join(', ');

async function find(text: string, signal: AbortSignal): Promise<Hit[]> {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&bbox=${PA_BBOX.join(',')}&limit=5&lang=en`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(String(r.status));
  const j = (await r.json()) as { features: PhotonFeature[] };
  return j.features
    .filter((f) => !f.properties.state || f.properties.state === 'Pennsylvania')
    .map((f) => ({ label: labelOf(f.properties), pt: f.geometry.coordinates }));
}

export default function AddressSearch() {
  const [text, setText] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);

  const go = (h: Hit) => {
    setHits(null);
    setText(h.label);
    const { set } = useTool.getState();
    set({ metric: 'pays', level: 'tract', resultsOpen: true, sheetOpen: true });
    void pickSpot(h.pt, h.label);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (q.length < 3) return;
    ctrl.current?.abort();
    const c = (ctrl.current = new AbortController());
    setNote('Searching…');
    try {
      const found = await find(q, c.signal);
      if (c.signal.aborted) return;
      if (!found.length) return void (setHits(null), setNote('No address found in Pennsylvania. Try the street and town.'));
      setNote(null);
      if (found.length === 1) go(found[0]);
      else setHits(found);
    } catch {
      if (!c.signal.aborted) setNote('The address search is not answering. Click the map instead.');
    }
  };

  return (
    <section aria-label="Address search" className="rounded-xl bg-white p-2.5 ring-1 ring-stone-200/80">
      <form onSubmit={submit} role="search" className="flex items-center gap-1.5">
        <label htmlFor="address" className="sr-only">
          Search an address in Pennsylvania
        </label>
        <input id="address" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search an address" autoComplete="off" className="min-w-0 flex-1 rounded-lg bg-stone-50 px-3 py-2 text-small text-slate-900 ring-1 ring-stone-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400" />
        <button type="submit" aria-label="Search" className="tap grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white hover:bg-violet-700">
          <Search className="h-4 w-4" />
        </button>
      </form>
      {hits && (
        <ul className="mt-1.5 space-y-0.5" aria-label="Addresses found">
          {hits.map((h, i) => (
            <li key={`${i}:${h.pt[0]},${h.pt[1]}`}>
              <button type="button" onClick={() => go(h)} className={cx('tap block w-full rounded-lg px-2.5 py-1.5 text-left text-small text-slate-800 hover:bg-violet-50')}>
                {h.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 px-0.5 text-caption leading-snug text-slate-500">{note ?? 'See whether a backyard home would pay off there.'}</p>
    </section>
  );
}
