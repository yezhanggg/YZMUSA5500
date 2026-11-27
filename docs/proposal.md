---
title: "MUSA 5500 Proposal"
---

**Topic:** Housing Demand and ADU Potential Across Pennsylvania. **Team:** Ye Zhang.

**Background.** A state bill, HB 2186, would allow an accessory dwelling unit (ADU), a small backyard home, on every home lot in Pennsylvania. Allowed does not mean built. Philadelphia has allowed ADUs in parts of the city since 2012, and only about 10 have been built legally. ADUs get built where demand is growing and the rent covers the cost.

**Question.** Where in Pennsylvania are people and jobs growing, did that change after 2019, where would an ADU pay off, and how many ADUs could be built by 2031?

**Study area.** All of Pennsylvania, 2010 to the latest year, by census tract, town and county.

**Data.** Census API (ACS, population estimates), IRS migration, LEHD jobs, building permits, Freddie Mac mortgage rates, NLCD land cover rasters and OpenStreetMap.

**Methods.**

1. Join all data to census tracts.
2. Compare growth before and after 2019.
3. Group places by trend with K-means.
4. Measure developed land (rasters) and job access (OSMnx).
5. Test where ADU rent covers the cost to build.
6. Model housing growth and estimate ADUs by 2031, with a low and high range.

**Outcomes.** A website with maps of growth, a time slider and a switch between today's rules and HB 2186. A short report. A presentation.

## Where each part is

| In the proposal | Where it is |
|---|---|
| Data downloads | `get_data.py`, notebook 01 |
| Steps 1 and 2, growth before and after 2019 | Notebook 01. Map: the Trends layers |
| Step 3, trend groups | Notebook 02. Map: Trend Groups |
| Step 4, land and job access | Notebook 03 |
| Steps 5 and 6, payoff and ADUs by 2031 | Notebook 04. Map: Does It Pay Off, ADUs by 2031 |
| Time slider and rules switch | Map: Over Time, Where to Build |
| Report | Linked from Home, with a PDF |

## What changed

- **Model:** gradient boosting beat the random forest on held-out counties, so it is used. The random forest stays in the comparison.
- **Payoff test:** uses each tract's 1-bedroom rent.
- **Time slider:** yearly tract data does not exist, so there are two sliders. Towns by Year steps through every year from 2010 to 2025 (people and new homes permitted) with a Play button. Tracts Over Time steps through the three ACS 5-year windows.
- **Bills:** SB 1346 was added next to HB 2186.
- **Website:** hosted on Vercel instead of GitHub Pages.
