# Housing Demand and ADU Potential Across Pennsylvania

MUSA 5500 Geospatial Data Science in Python, Fall 2026. Ye Zhang.

- **Website:** https://yezhanggg.github.io/YZMUSA5500/ (the map, the proposal, the report and the notebooks)
- **Report:** `docs/report.md`, on the site from Home, and as a 3-page PDF (`web/public/report.pdf`)
- The lot tool this feeds (MUSA 6950): https://pa-adu.vercel.app

The question: where in Pennsylvania are people and jobs growing, did that change after 2019, where would an ADU (a backyard home) pay off, and how many ADUs could be built by 2031?

## What is here

```
README.md
get_data.py            downloads every source (Census API, LODES, permits, IRS, Freddie Mac, NLCD)
requirements.txt       Python packages
notebooks/             01 to 04, the analysis, one step per notebook (as run)
pipeline/              the logic of each step, tested Python modules
  tract/               one module per step: growth, groups, payoff, forecast, room, legal, ...
  money.py, market.py  the loan payment and HUD rents the payoff test uses
  rules.py             reads the town rule files (shared/rules/)
  paths.py             where the data drive is ($ADU_DATA_DIR)
  places_analysis.py   the every-municipality summary (docs/places.md, a draft)
shared/                assumptions.json (every cost, rate and weight), the town rule files, boundaries download
tests/                 pytest for the tract modules
docs/                  proposal.md, report.md, and the full write-up: data.md, methods.md, results.md, figures/
figures/               tract_explorer.html, the linked view from notebook 04
web/                   the website
```

## The website

Four pages, React and Vite. Pages live in the hash, so a host only needs `index.html`. The base is relative, so the build works at any address.

| Link | Page |
|---|---|
| `#/` | Home: the question, what we found, the payoff map, the report (page and PDF), the course requirements |
| `#/proposal` | The proposal, and where each part of it is |
| `#/map` | The map: address search (does an ADU pay off here?), Boundaries, and the Data Layers: Where to Build (Today or State Bill), Lots with Room, Does It Pay Off, the growth trends, Trend Groups, Over Time (a time slider over 2010-14, 2015-19 and 2020-24) and ADUs by 2031 (Today, HB 2186 or SB 1346). Click an area for its Details |
| `#/notebooks` | Notebooks & Code: the four notebooks readable in the browser, and how to run everything |

`#/report` is the report page, linked from Home and printed to the PDF.

```bash
cd web
npm install
npm run dev          # http://localhost:5191/
npm run build        # into web/dist/
npm run preview      # serve that build on port 5191
npm run report:pdf   # print the Report page to public/report.pdf (then build again)
```

Node 22 or newer. If Chromium is missing for the PDF: `npx playwright install chromium`.

### Publish

`.github/workflows/pages.yml` builds `web/` and publishes it to GitHub Pages on every push to `main`. Turn it on once: on GitHub, Settings > Pages > Source: GitHub Actions. The site is then at https://yezhanggg.github.io/YZMUSA5500/. Any static host works too (upload `web/dist/`).

## Rerun the analysis

```bash
conda activate geospatial                 # or: pip install -r requirements.txt
export ADU_DATA_DIR=/path/to/musa-drive   # default ~/musa-drive
ln -s "$ADU_DATA_DIR/data" data           # data/raw and data/processed
python shared/get_boundaries.py
python get_data.py                        # or one part: acs, rent_bedrooms, decennial, pop, jobs, permits, migration, rates, landcover
```

The ACS calls need a free Census API key in `.env` (`CENSUS_API_KEY=...`). Never commit it. Then run the notebooks in order:

| Notebook | What it does | Saves |
|---|---|---|
| `notebooks/01_trends.ipynb` | Everything on 2020 tracts. Growth before vs after 2019, inflation, margins of error | `trends_tract.csv`, `tract_panel.csv` |
| `notebooks/02_groups.ipynb` | Trend groups: k from 2 to 10, stability, K-means vs Gaussian mixture vs Ward | `trend_group` column |
| `notebooks/03_land_access.ipynb` | Developed land (zonal stats) and jobs within 30 min (OSMnx) | `access_tract.csv` |
| `notebooks/04_payoff_forecast.ipynb` | Rent vs cost test (1-bedroom rent). Housing growth model with spatial CV and a backtest. ADUs by 2031. County roll-up. Linked view | `payoff_tract.csv`, `forecast_town.csv`, `county_rollup.csv`, `figures/tract_explorer.html` |

Each step also runs alone, for example `python -m pipeline.tract.growth`. Tests: `python -m pytest tests -q`.

Notebook 04's lot roll-up reads the lot records of Philadelphia and Pittsburgh from the MUSA 6950 tool (`$ADU_DATA_DIR/lots/<city>/index.parquet`). Without them, keep the saved `lots_tract_v2.csv`.

Then update the website:

```bash
python web/build_data.py            # tracts, towns, counties .geojson, headline.json, assumptions.json
python web/render_notebooks.py      # web/public/notebooks/*.html (nbconvert, no re-run)
python -m pipeline.tract.towns      # web/public/data/tract_towns.json
```

Three map files are copies from the MUSA 6950 tool, whose builders live there: `pa_places.json`, `pa_places_meta.json` (the statewide place table) and `zcta.geojson` (ZIP code areas).

## Due

- Presentation: Thu Dec 3 (class) or Dec 4
- Report (~3 pages: intro, methods, results, conclusion): Mon Dec 7, 11:59 pm. Done: `docs/report.md` and `web/public/report.pdf`
- Canvas: this repository's link and the website URL

## Course requirements met

API data, 3+ sources, complex joins, OSMnx, clustering (K-means, Gaussian mixture, Ward), raster zonal stats, models with spatial cross-validation (random forest among them), interactive views (the map and a linked tract explorer). Details in `docs/methods.md`.

Estimates, not legal advice. Bills are not law. Apache-2.0.
