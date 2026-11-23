/// <reference types="vite/client" />

declare module 'virtual:docs' {
  interface MdPage {
    title: string | null;
    html: string;
    toc: { id: string; text: string; level: number }[];
  }
  /** The write-up pages (../docs/*.md), as HTML (plugins/docs.ts). */
  export const DOCS: Record<'proposal' | 'report', MdPage>;
  /** ../requirements.txt as text. */
  export const REQUIREMENTS: string;
}
