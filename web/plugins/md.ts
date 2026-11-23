// A small Markdown to HTML converter for the write-up pages (../docs/*.md), run at build time by plugins/docs.ts.
// It covers what those pages use: a front matter title, headings, paragraphs, bold, italic, inline code, links,
// images, fenced code, tables, nested bullet and numbered lists, block quotes, rules and HTML comments (dropped).
// Text is escaped first, so the pages cannot inject markup.

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface MdPage {
  title: string | null;
  html: string;
  toc: TocItem[];
}

export interface MdOptions {
  /** Rewrites a link or image target ("results.md", "figures/x.png"). */
  url?: (href: string, kind: 'link' | 'image') => string;
  /** The pixel size of an image (its target as written), so the page keeps its room before it loads. */
  size?: (href: string) => [number, number] | null;
}

/** ' width="800" height="600"' when the size is known. */
const dims = (href: string, o: MdOptions) => {
  const wh = o.size?.(href);
  return wh ? ` width="${wh[0]}" height="${wh[1]}"` : '';
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "4. Where an ADU pays off" -> "4-where-an-adu-pays-off" */
export function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z]+;/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'section'
  );
}

/** Inline Markdown: code spans, images, links, bold, italic. */
function inline(src: string, o: MdOptions): string {
  const code: string[] = [];
  // Code spans first, so nothing inside them is read as Markdown.
  let s = src.replace(/`([^`]+)`/g, (_, c: string) => {
    code.push(`<code>${esc(c)}</code>`);
    return `\u0000${code.length - 1}\u0000`;
  });
  s = esc(s);
  const url = (h: string, kind: 'link' | 'image') => esc(o.url ? o.url(h.replace(/&amp;/g, '&'), kind) : h);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt: string, h: string) => `<img src="${url(h, 'image')}" alt="${alt}"${dims(h.replace(/&amp;/g, '&'), o)} loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, h: string) => {
    const href = url(h, 'link');
    const ext = /^https?:/i.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noreferrer"' : ''}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => code[Number(i)]);
}

/** The cells of one table row. A pipe inside a code span or written as \| stays in the cell. */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inCode = false;
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '\\' && t[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (c === '`') {
      inCode = !inCode;
      cur += c;
    } else if (c === '|' && !inCode) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const isRule = (l: string) => /^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(l);
const isTableSep = (l: string) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(l);

interface Item {
  indent: number;
  ordered: boolean;
  text: string[];
  children: Item[];
}

/** Lists, nested by indentation. Returns the HTML and the number of lines read. */
function list(lines: string[], start: number, o: MdOptions): [string, number] {
  const roots: Item[] = [];
  const stack: Item[] = [];
  let i = start;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) {
      // A blank line ends the list unless the next line goes on with it.
      const next = lines[i + 1];
      if (next !== undefined && (LIST.test(next) || (/^\s{2,}\S/.test(next) && stack.length))) continue;
      break;
    }
    const m = LIST.exec(l);
    if (m) {
      const item: Item = { indent: m[1].length, ordered: /\d/.test(m[2]), text: [m[3]], children: [] };
      while (stack.length && stack[stack.length - 1].indent >= item.indent) stack.pop();
      (stack.length ? stack[stack.length - 1].children : roots).push(item);
      stack.push(item);
    } else if (stack.length && /^\s+\S/.test(l)) {
      stack[stack.length - 1].text.push(l.trim());
    } else if (stack.length && !/^(#{1,6}\s|\||```|>)/.test(l) && !isRule(l)) {
      // A lazy continuation line.
      stack[stack.length - 1].text.push(l.trim());
    } else break;
  }
  const render = (items: Item[]): string => {
    if (!items.length) return '';
    const tag = items[0].ordered ? 'ol' : 'ul';
    return `<${tag}>${items.map((it) => `<li>${inline(it.text.join(' '), o)}${render(it.children)}</li>`).join('')}</${tag}>`;
  };
  // Siblings of different kinds (a bullet list after a numbered one) become separate lists.
  let html = '';
  let run: Item[] = [];
  for (const it of roots) {
    if (run.length && run[0].ordered !== it.ordered) {
      html += render(run);
      run = [];
    }
    run.push(it);
  }
  html += render(run);
  return [html, i - start];
}

export function markdown(src: string, o: MdOptions = {}): MdPage {
  let text = src.replace(/\r\n?/g, '\n');
  let title: string | null = null;
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (fm) {
    const t = /^title:\s*["']?(.*?)["']?\s*$/m.exec(fm[1]);
    title = t ? t[1] : null;
    text = text.slice(fm[0].length);
  }
  text = text.replace(/<!--[\s\S]*?-->\n?/g, '');
  const lines = text.split('\n');
  const out: string[] = [];
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    // Fenced code
    const fence = /^\s*```\s*([\w-]*)/.exec(l);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push(`<pre><code${fence[1] ? ` class="language-${fence[1]}"` : ''}>${esc(body.join('\n'))}</code></pre>`);
      continue;
    }
    // Headings
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l);
    if (h) {
      const level = h[1].length;
      const html = inline(h[2], o);
      let id = slug(h[2]);
      const n = used.get(id) ?? 0;
      used.set(id, n + 1);
      if (n) id = `${id}-${n}`;
      if (level <= 3) toc.push({ id, text: html.replace(/<[^>]+>/g, ''), level });
      out.push(`<h${level} id="${id}">${html}</h${level}>`);
      i++;
      continue;
    }
    if (isRule(l)) {
      out.push('<hr>');
      i++;
      continue;
    }
    // Tables
    if (l.trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(l);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : null));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      const td = (tag: string, c: string, k: number) => `<${tag}${align[k] ? ` style="text-align:${align[k]}"` : ''}>${inline(c, o)}</${tag}>`;
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map((c, k) => td('th', c, k)).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, k) => td('td', c, k)).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    // Lists
    if (LIST.test(l)) {
      const [html, n] = list(lines, i, o);
      out.push(html);
      i += Math.max(n, 1);
      continue;
    }
    // Block quotes
    if (/^\s*>/.test(l)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) body.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${markdown(body.join('\n'), o).html}</blockquote>`);
      continue;
    }
    // An image on its own line: a figure with its caption.
    const img = /^\s*!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(l);
    if (img) {
      const src2 = esc(o.url ? o.url(img[2], 'image') : img[2]);
      out.push(`<figure><a href="${src2}" target="_blank" rel="noreferrer"><img src="${src2}" alt="${esc(img[1])}"${dims(img[2], o)} loading="lazy"></a>${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ''}</figure>`);
      i++;
      continue;
    }
    // Paragraph: lines up to a blank line or the start of another block.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*```|\s*>)/.test(lines[i]) && !LIST.test(lines[i]) && !isRule(lines[i]) && !(lines[i].trim().startsWith('|') && isTableSep(lines[i + 1] ?? ''))) para.push(lines[i++].trim());
    if (para.length) out.push(`<p>${inline(para.join(' '), o)}</p>`);
    else i++;
  }
  return { title, html: out.join('\n'), toc };
}
