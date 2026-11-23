// The write-up pages for the website, read at build time from the folder next to web/ ():
//   docs/{proposal,report}.md   turned into HTML (md.ts), in the module `virtual:docs`
//   docs/figures/*.png                        served at <base>docs/figures/, copied into the build
//   figures/tract_explorer.html               the linked view, served at <base>explorer/tract_explorer.html
//   requirements.txt                          shown on the Recreate page, in `virtual:docs` too
// `vite dev` serves the files from where they are and reloads the page when a write-up changes.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { markdown, type MdPage } from './md.ts';

export const PAGES = ['proposal', 'report'] as const;
const ID = 'virtual:docs';

export default function docs(folder: string): Plugin {
  const DOCS = resolve(folder, 'docs');
  const FIGS = resolve(DOCS, 'figures');
  const EXPLORER = resolve(folder, 'figures', 'tract_explorer.html');
  const REQS = resolve(folder, 'requirements.txt');
  let base = '/';
  const used = new Set<string>();

  /** "results.md#x" -> "#/results", "figures/a.png" -> "<base>docs/figures/a.png". */
  const url = (href: string, kind: 'link' | 'image') => {
    if (/^(https?:|mailto:|#)/i.test(href)) return href;
    const page = /^(?:\.\/)?(proposal|data|methods|results|report)\.md(#.*)?$/.exec(href);
    if (kind === 'link' && page) return `#/${page[1]}`;
    const fig = /^(?:\.\/)?figures\/([\w.-]+)$/.exec(href);
    if (fig) {
      used.add(fig[1]);
      return `${base}docs/figures/${fig[1]}`;
    }
    return href;
  };

  /** Width and height of a PNG figure, from its header. */
  const size = (href: string): [number, number] | null => {
    const fig = /^(?:\.\/)?figures\/([\w.-]+\.png)$/.exec(href);
    const f = fig && resolve(FIGS, fig[1]);
    if (!f || !existsSync(f)) return null;
    const b = readFileSync(f).subarray(0, 24);
    return b.toString('ascii', 12, 16) === 'IHDR' ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
  };

  const build = () => {
    const pages = {} as Record<(typeof PAGES)[number], MdPage>;
    for (const p of PAGES) pages[p] = markdown(readFileSync(resolve(DOCS, `${p}.md`), 'utf8'), { url, size });
    const reqs = existsSync(REQS) ? readFileSync(REQS, 'utf8') : '';
    return `export const DOCS = ${JSON.stringify(pages)};\nexport const REQUIREMENTS = ${JSON.stringify(reqs)};\n`;
  };

  const serveFile = (server: ViteDevServer, mount: string, file: (rest: string) => string | null, type: (f: string) => string) => {
    server.middlewares.use((req, res, next) => {
      const path = decodeURIComponent((req.url ?? '').split('?')[0]);
      if (!path.startsWith(base + mount)) return next();
      const f = file(path.slice((base + mount).length));
      if (!f || !existsSync(f)) {
        res.statusCode = 404;
        return res.end('not found');
      }
      res.setHeader('content-type', type(f));
      res.end(readFileSync(f));
    });
  };

  return {
    name: 'musa5500-docs',
    configResolved(c) {
      base = c.base;
    },
    resolveId: (s) => (s === ID ? '\0' + ID : null),
    load(s) {
      if (s !== '\0' + ID) return null;
      for (const p of PAGES) this.addWatchFile(resolve(DOCS, `${p}.md`));
      return build();
    },
    configureServer(server) {
      serveFile(
        server,
        'docs/figures/',
        (rest) => {
          const f = resolve(FIGS, rest);
          return f.startsWith(FIGS + sep) ? f : null;
        },
        (f) => (f.endsWith('.png') ? 'image/png' : f.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream'),
      );
      serveFile(server, 'explorer/tract_explorer.html', (rest) => (rest === '' ? EXPLORER : null), () => 'text/html; charset=utf-8');
      // A changed write-up: rebuild the module and reload the page.
      server.watcher.add([DOCS, REQS]);
      server.watcher.on('change', (f) => {
        if (!f.startsWith(DOCS) && f !== REQS) return;
        const mod = server.moduleGraph.getModuleById('\0' + ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      });
    },
    generateBundle() {
      // Only the figures the pages show (the folder may hold older ones).
      const figs = used.size ? [...used] : existsSync(FIGS) ? readdirSync(FIGS) : [];
      for (const f of figs) {
        const p = resolve(FIGS, f);
        if (existsSync(p)) this.emitFile({ type: 'asset', fileName: `docs/figures/${f}`, source: readFileSync(p) });
      }
      if (existsSync(EXPLORER)) this.emitFile({ type: 'asset', fileName: 'explorer/tract_explorer.html', source: readFileSync(EXPLORER) });
    },
  };
}
