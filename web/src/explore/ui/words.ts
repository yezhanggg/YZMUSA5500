// Date wording shared by the Details cards.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-10" -> "Nov 10, 2026". Partial dates keep what they have. Anything else is null. */
export function dateText(iso: string | null | undefined): string | null {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(iso ?? '');
  if (!m) return null;
  const [, y, mo, d] = m;
  if (!mo) return y;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return null;
  return d ? `${month} ${Number(d)}, ${y}` : `${month} ${y}`;
}
