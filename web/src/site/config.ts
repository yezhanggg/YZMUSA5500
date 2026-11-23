// Site-wide links and the notebook list. Change REPO_URL here when the code moves to its own repository.
import { HEADLINE } from '../lib/numbers';

/** The code on GitHub (the notebooks' .ipynb files are linked from there). */
export const REPO_URL = 'https://github.com/yezhanggg/YZMUSA5500';
/** The folder of this project inside REPO_URL ('' once it is the repository root). */
export const REPO_DIR = '';
/** The lot-level tool this project feeds. */
export const TOOL_URL = 'https://pa-adu.vercel.app/';
/** Where this site is published (GitHub Pages, .github/workflows/pages.yml). */
export const SITE_URL = 'https://yezhanggg.github.io/YZMUSA5500/';

/** Files next to the page (the site uses a relative base, so it works at any address). */
export const asset = (path: string) => new URL(`${import.meta.env.BASE_URL}${path}`, window.location.href).href;
export const repoFile = (path: string) => `${REPO_URL}/blob/main/${REPO_DIR ? `${REPO_DIR}/` : ''}${path}`;

export interface Notebook {
  id: string;
  n: string;
  title: string;
  what: string;
  saves: string[];
}

/** The four notebooks, in the order they run. Each is rendered to public/notebooks/<id>.html (render_notebooks.py). */
export const NOTEBOOKS: Notebook[] = [
  { id: '01_trends', n: '01', title: 'Trends', what: 'Puts every source on 2020 tracts. Growth before and after 2019, inflation to 2024 dollars, and margins of error.', saves: ['trends_tract.csv', 'tract_panel.csv'] },
  { id: '02_groups', n: '02', title: 'Trend groups', what: `Groups tracts by how they changed. k from 2 to 10, stability checks, and K-means against a Gaussian mixture and Ward clustering. ${HEADLINE.groups_k} groups.`, saves: ['trend_group column in trends_tract.csv'] },
  { id: '03_land_access', n: '03', title: 'Land and job access', what: 'Developed land from the NLCD rasters (zonal statistics) and jobs within 30 minutes on the street network (OSMnx).', saves: ['access_tract.csv'] },
  { id: '04_payoff_forecast', n: '04', title: 'Payoff and forecast', what: 'The rent against cost test, the housing growth model with spatial cross-validation and a backtest, ADUs by 2031, the county roll-up and the linked view.', saves: ['payoff_tract.csv', 'forecast_town.csv', 'county_rollup.csv', 'figures/tract_explorer.html'] },
];
