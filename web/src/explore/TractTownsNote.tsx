// Explore, the Allowed row of a tract: when the tract crosses a town line, say so and give each town's share of the
// homes (public/data/tract_towns.json, 2020 Census blocks). Zoning is set by each town, so the answer above is for the town
// where the map was clicked. Nothing shows for a tract inside one town.
import { useEffect, useState } from 'react';
import { DATA } from '../lib/data';
import { loadPlaces, usePlaces } from './places';

/** tract GEOID -> [town GEOID, share of homes, share of people], largest share first. */
type TractTowns = Record<string, [string, number, number][]>;

/** tract_towns.json, read once. A failed read is tried again next time. */
let pending: Promise<TractTowns | null> | null = null;
function tractTowns(): Promise<TractTowns | null> {
  if (!pending) {
    pending = fetch(`${DATA}tract_towns.json`)
      .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
      .then((v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as TractTowns) : null))
      .catch(() => null);
    void pending.then((v) => v === null && (pending = null));
  }
  return pending;
}

/** "Lancaster township 80%, Lancaster city 20%". Shares under 1% are left out. */
export function townSplitText(list: [string, number, number][], name: (geoid: string) => string): string {
  return list
    .filter(([, h]) => h >= 0.01)
    .map(([g, h]) => `${name(g)} ${Math.round(h * 100)}%`)
    .join(', ');
}

export default function TractTownsNote({ tract, town }: { tract: string; town: string | null }) {
  const [tt, setTt] = useState<TractTowns | null>(null);
  const places = usePlaces((s) => s.places);
  useEffect(() => {
    let live = true;
    void loadPlaces();
    void tractTowns().then((v) => live && setTt(v));
    return () => {
      live = false;
    };
  }, []);
  const list = tt?.[tract]?.filter(([, h]) => h >= 0.01);
  if (!list || list.length < 2) return null;
  const name = (g: string) => places?.byGeoid.get(g)?.name ?? g;
  return (
    <p className="text-caption text-slate-500" data-tract-towns>
      This tract crosses a town line. Its homes: {townSplitText(list, name)}. Each town sets its own rule. This answer is for {town ?? 'the town'} where you clicked.
    </p>
  );
}
