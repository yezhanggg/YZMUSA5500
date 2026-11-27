# Housing Demand and ADU Potential Across Pennsylvania

Ye Zhang. MUSA 5500 Geospatial Data Science in Python, Fall 2026.

**Website:** https://musa5500.vercel.app/
**Report:** [`docs/report.md`](docs/report.md) (3 pages, also as [PDF](web/public/report.pdf))

## What this project is

A state bill, HB 2186, would allow a backyard home (an accessory dwelling unit, or ADU) on every home lot in Pennsylvania. Legal does not mean built. This project asks where ADUs would actually make sense, across all 3,445 census tracts in the state:

1. Where are people, homes, jobs and rents growing?
2. Did that change after 2019?
3. Where would a new ADU pay for itself?
4. How many ADUs could be built by 2031, under today's rules and under the state bills?

The results feed an interactive map on the website and a lot-level tool for homeowners (https://pa-adu.vercel.app, the MUSA 6950 half).

What you can do on the website map:

- Hover any tract, town or county for its numbers. Click it for the details.
- Play the towns year by year, 2010 to 2025 (people and new homes permitted).
- Switch between today's rules and HB 2186, and map what the bill adds.
- Sort, search and download (CSV) every town and county by ADUs by 2031.
- Search an address and see if a unit pays off there, with the rent, build cost and loan rate it needs.

The notebook pages are interactive too: Altair charts with menus and brushing, and folium maps.

## Main findings

- **Growth slowed after 2019.** Job growth fell from 0.95% a year to 0.31%. Most single-tract changes sit inside their margin of error.
- **An ADU pays off in about one tract in ten** (356 tracts, 10.3%), mostly in and around Philadelphia. Build cost matters more than rent or the mortgage rate.
- **Housing growth is only a little predictable** (gradient boosting, R2 0.20 with counties held out).
- **ADUs by 2031:** about 1,000 under today's rules, about 13,500 under HB 2186.

Estimates, not legal advice. Bills are not law.

## Data and methods

Free public data, downloaded by one script: Census API (ACS, decennial), LEHD LODES jobs, building permits, IRS migration, Freddie Mac rates, NLCD land cover rasters, OpenStreetMap (OSMnx), HUD rents and hand-read town zoning rules.

Methods: tract crosswalks and margin-of-error checks, clustering (K-means, Gaussian mixture, Ward), raster zonal statistics, street-network job access, a rent vs cost payoff test, and forecast models with spatial cross-validation and conformal intervals. Details in [`docs/methods.md`](docs/methods.md), full results in [`docs/results.md`](docs/results.md).

## Repository

```
get_data.py     downloads every source
notebooks/      01 trends, 02 groups, 03 land and access, 04 payoff and forecast
pipeline/       tested Python modules behind each notebook step
shared/         assumptions.json (every cost and rate) and the town rule files
tests/          pytest
docs/           proposal, report, methods, results, talk
web/            the website (React + Vite)
```

## Run it

```bash
pip install -r requirements.txt
export ADU_DATA_DIR=/path/to/data      # default ~/musa-drive
ln -s "$ADU_DATA_DIR/data" data
python shared/get_boundaries.py
python get_data.py                     # needs CENSUS_API_KEY in .env
# then run notebooks/01 to 04 in order
python -m pytest tests -q
```

Website:

```bash
cd web && npm install && npm run dev   # Node 22+
```

The site is hosted on Vercel at https://musa5500.vercel.app/.

Apache-2.0.
