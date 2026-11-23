---
title: "MUSA 5500 Proposal"
---

**Topic:** Housing Demand and ADU Potential Across Pennsylvania

**Team:** Ye Zhang

**Background and Research Question:** Pennsylvania needs more housing, but most towns make it hard to build an accessory dwelling unit (ADU), a small second home on a lot, like a backyard cottage. A state bill, HB 2186, would allow one on every home lot. But allowing ADUs does not mean people will build them. Philadelphia has allowed them in parts of the city since 2012, and only about 10 have been built legally. ADUs get built where people want to live and where the rent covers the cost. So we need to know where housing demand is growing, and where an ADU would pay off.

**Research question:** Where in Pennsylvania are people and jobs growing, did that change after 2019, where would an ADU pay off, and how many ADUs could be built by 2031?

**Study Area:** The whole state of Pennsylvania (all 67 counties), from 2010 to the latest year, with results for every census tract, town, and county.

**Goal:** Planners can see where housing demand is growing and how many new homes ADUs could add in their town or county. Builders and homeowners can search an address and see whether an ADU would pay off there.

**Data sources:** Census population estimates and ACS through the Census API. IRS migration, LEHD jobs, the Building Permits Survey, and Freddie Mac mortgage rates through scripted downloads. Plus NLCD land cover rasters and OpenStreetMap.

**Methods:**

1. Join all the data to census tracts.
2. Compare growth before and after 2019.
3. Group places by trend with K-means.
4. Measure developed land from the rasters and job access with OSMnx.
5. Test where ADU rent covers the cost to build.
6. Use a random forest to estimate how many ADUs could be built by 2031, with a low and high range.

**Course Requirements:** This uses API data collection, more than three data sources, spatial joins, OSMnx, K-means clustering, raster analysis, a random forest model, and interactive maps.

**Expected Outcomes:** A website on GitHub Pages with maps of growth and change, a time slider from 2010 to today, and a switch to compare today's rules with HB 2186. A short written report. A presentation.

## Where each part is

| In the proposal | Where it is |
|---|---|
| Census API, ACS and population estimates | `get_data.py` (acs, rent_bedrooms, decennial, pop), notebook 01 |
| IRS migration, LEHD jobs, permits, Freddie Mac rates | `get_data.py` (migration, jobs, permits, rates), notebooks 01 and 04 |
| NLCD rasters and OpenStreetMap | `get_data.py landcover`, notebook 03 (zonal statistics and OSMnx) |
| 1. Join all the data to census tracts | Notebook 01, with the 2010 to 2020 block crosswalk |
| 2. Growth before and after 2019 | Notebook 01. Map: Jobs, Job Growth Shift, People, Homes, Rent |
| 3. Groups by trend with K-means | Notebook 02, compared with a Gaussian mixture and Ward. Map: Trend Groups |
| 4. Developed land and job access | Notebook 03 |
| 5. Where ADU rent covers the cost | Notebook 04. Map: Does It Pay Off |
| 6. A model and ADUs by 2031, low to high | Notebook 04. Map: ADUs by 2031 |
| Search an address, see if an ADU pays off | Map: the address search at the top of the left panel |
| Maps of growth and change | Map: the Trends layers |
| A time slider from 2010 to today | Map: Over Time, with a slider over the ACS windows 2010-14, 2015-19 and 2020-24 |
| A switch between today's rules and HB 2186 | Map: Where to Build (Today or State Bill) and ADUs by 2031 (Today, HB 2186 or SB 1346) |
| A short written report | The report, linked from Home, with a PDF |
| A website on GitHub Pages | This site (`web/`) |

## What changed since

- The model: a random forest, ridge and gradient boosting were compared against a baseline with counties held out. Gradient boosting had the lowest held-out error and is used. The random forest is still in the comparison.
- The payoff test uses the tract's 1-bedroom rent, since a 600 sq ft unit is a 1-bedroom.
- The time slider steps through the three ACS 5-year windows that do not overlap. Single-year tract data does not exist for the whole period.
- SB 1346, a second state bill, was added next to HB 2186.
