// Where the data files are served: public/data/ under the site's base path (/5500/ on the live site). Absolute, so
// the files load the same with or without a trailing slash on the page address.
/** The map files, as an absolute URL (the site's base is relative, and MapLibre wants absolute URLs). */
export const DATA = new URL(`${import.meta.env.BASE_URL}data/`, window.location.href).href;
