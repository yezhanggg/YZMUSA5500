// The MUSA 5500 website: Home, Proposal, the map and Notebooks & Code.
//   npm run dev       http://localhost:5191/
//   npm run build     builds into dist/ here
// The base is relative ('./'), so the build works at any address: the root of a domain, GitHub Pages
// (user.github.io/YZMUSA5500/) or a subfolder. Pages live in the hash, so a host only needs index.html.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import docs from './plugins/docs.ts';

const HERE = import.meta.dirname;
/** The repository root: the write-ups (docs/), figures and requirements the pages read. */
const COURSE = resolve(HERE, '..');

export default defineConfig({
  root: HERE,
  base: './',
  publicDir: 'public',
  plugins: [react(), tailwindcss(), docs(COURSE)],
  server: { port: 5191, strictPort: true, fs: { allow: [COURSE] } },
  preview: { port: 5191, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 1500 },
});
