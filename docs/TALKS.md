# Talk notes: MUSA 5500

Speaking notes for the MUSA 5500 talk (Thu Dec 3 in class, or Dec 4). They are notes, not slides. Each number has its source file in a comment. Moved here from the Backyard Homes PA repository on Nov 22, 2026.

**Reminder, morning of Mon Nov 30, 2026:** HB 2186 and SB 1346 die if they are not enacted by the end of the session on Nov 30, 2026. Check palegis.us that morning. If either passed, change "pending" to "enacted" wherever these notes and the site call them bills.

Say once: not legal advice, not a zoning determination.

---

## MUSA 5500: geospatial data science in Python (about 10 minutes)

### 1. The question (1 min)

- Where in Pennsylvania is there demand for backyard homes, where would one pay off, and what stops them today?
- Unit: 3,445 census tracts (2020), towns and counties. Lot-level answers in six lot places (625,687 lots). The tract analysis measured lots in Philadelphia and Pittsburgh only.

### 2. Data sources (1 min)

<!-- source: docs/data.md -->

- Census: ACS 5-year (rent, rent by bedrooms, units in structure), decennial housing units, population estimates, TIGER tracts.
- LEHD LODES jobs, the Census building permits survey, IRS migration, Freddie Mac mortgage rates, Annual NLCD land cover, OpenStreetMap streets via OSMnx.
- HUD Small Area Fair Market Rents by ZIP.
- The town rule files and the lot records from the lot tool. The tract analysis read the 38 rule files of Nov 11. 157 exist now (see section 8).
- Figure: `docs/figures/01_moe.png` (margins of error).

### 3. The payoff test (1.5 min)

<!-- source: ~/musa-drive/processed/5500/payoff_summary.json, payoff_bases.csv -->

- A 600 sq ft 1-bedroom unit. Mid build cost $172,500, borrowed over 30 years at 6.53 %. It pays when the tract's 1-bedroom rent, less running costs, covers the payment.
- **10.3 %** of tracts pay off (356 of 3,445). 26.0 % are close. 63.6 % do not.
- **Why 10.3 % replaced 20 %.** The first draft used the median rent of all units (20.3 %). A backyard unit rents like a 1-bedroom, which is lower. Using HUD Small Area FMR instead gives 16.5 %. At the latest weekly rate (7.18 %) it drops to 7.3 %.
- Build cost moves the answer more than the rent guess or the rate.
- Figures: `04_payoff_map.png`, `04_payoff_sensitivity.png`.

### 4. Clustering, stated as descriptive (1 min)

<!-- source: ~/musa-drive/processed/5500/groups_summary.json, groups_methods.csv -->

- Six growth rates (jobs, people, real rent, before and after 2019). k from 2 to 10, three methods.
- K-means with k = 7, silhouette 0.136. Stable across seeds (ARI 0.95) and subsamples (0.91), but the methods disagree with each other (ARI 0.24 against GMM, 0.20 against Ward).
- Say it: the tracts do not fall into natural clusters. The groups describe the spread. They are not a discovery.
- Figures: `02_k_metrics.png`, `02_groups_map.png`.

### 5. Model validation, including the weak backtest (1.5 min)

<!-- source: ~/musa-drive/processed/5500/forecast_cv.csv, forecast_backtest.csv, forecast_conformal.csv -->

- Target: housing growth per tract. Gradient boosting, chosen by lowest error with whole counties held out.
- County-held-out R2 0.202 (fold mean 0.256). The median baseline scores about 0.
- Temporal backtest (train 2014 to 2019, test 2019 to 2024): R2 0.021 for gradient boosting. Last period's rate scores -0.086. Five-year ACS changes per tract are mostly noise.
- Conformal 90 % intervals cover 85 % to 95 % of tracts by held-out county.
- So the model ranks places a little. It does not predict a tract's growth well.
- Figures: `04_model_compare.png`, `04_backtest.png`, `04_importance_pdp.png`.

### 6. Measured room in two cities against the old estimate (1.5 min)

<!-- source: data/processed/lots_city_v2.csv, ~/musa-drive/processed/5500/room_cross_city.csv, lots_compare_pilot.json -->

- The lot tool measured every 1 to 4 unit lot. Share with room for a 600 sq ft unit under state-reform setbacks:
  - Philadelphia: 7.6 % (34,741 of 459,998)
  - Pittsburgh: 45.9 % (42,229 of 92,081)
- The old estimate used one pilot rate, 0.719, for nearly every tract. It is far off in both cities.
- In the matched Philadelphia pilot lots the old raster test said 48.6 % fit and the vector test says 40.0 %. They agree on 79.2 % of lots. By tract the shares do not correlate (0.04).
- Figure: `05_lots_old_vs_new.png`.

### 7. The statewide estimate with its range (1 min)

<!-- source: ~/musa-drive/processed/5500/room_summary.json, room_cross_city.csv -->

- A ridge model, trained on one city and tested on the other: R2 0.486 on Philadelphia and 0.458 on Pittsburgh.
- Statewide lots with room for 600 sq ft: about **2.88 million**, range 1.49 to 3.55 million. The old estimate was 2.59 million.
- 1,780 of the 2,932 modelled tracts are outside the range of the two cities. The suburban and rural numbers are an extrapolation.
- Figure: `05_room_model.png`.

### 8. Legal classes from the town files (1 min)

<!-- source: ~/musa-drive/processed/5500/legal_class_coverage.csv (Nov 11 run), shared/rules/towns_index.json and the town files (Nov 16), web/public/data/pa_places_meta.json (built 2026-11-16) -->

- Now (Nov 16): 155 towns beyond the two cities have rule files. With the two cities, 101 are verified by an independent second reading and 56 stay first readings. 60 of the 155 town codes have no ADU text at all. Reading bans ADUs.
- 46.0 % of Pennsylvanians live in a place with a rule file (35.1 % verified, 10.9 % drafted).
- The answer ladder gives every one of the 2,572 places one answer and says how good the evidence is: rule file, a dated agency report or no zoning on record, a search of public zoning text, or the statewide baseline. A status is known for 52 % of people.
- The tract numbers below come from the Nov 11 run with 38 rule files. They were not rerun.
- By people, in that run: 71.2 % live in towns with no rule file yet ("unknown"). 12.5 % live in a conversion-only town (Philadelphia, York), 6.3 % by right, 6.0 % none, 3.5 % family only, 0.4 % discretionary.
- Why not today: in Philadelphia the law is the limit (1.2 % of lots have any path). In Pittsburgh every lot has a path, and the yard is the limit.

### 9. ADUs by 2031: scenario arithmetic (1 min)

<!-- source: ~/musa-drive/processed/5500/forecast_summary.json totals -->

| Scenario | Low | Mid | High |
|---|---|---|---|
| Today's rules | 314 | 1,012 | 2,451 |
| HB 2186 | 6,540 | 13,455 | 20,367 |
| SB 1346 | 6,431 | 13,238 | 20,056 |

- This is arithmetic on stated assumptions (permit rates from cities that allow ADUs, payoff, room, legal class). It is not a fitted forecast. There is no ADU permit series to fit it to.
- The range shows the assumptions, not statistical error.
- Figure: `04_forecast_map.png`.

### 10. The interactive pieces (30 s)

- The tool's Projecting mode: tract, town and county maps, payoff controls, the room map (measured tracts solid, modelled lighter, outside the training range hatched).
- The linked tract explorer: `figures/tract_explorer.html` (click counties, brush the scatter).

### 11. Limits (30 s)

- ACS tract data is noisy. Most single-tract changes are inside the margin of error.
- The room model rests on two cities.
- The "today" scenario rests on the 71 % of people in towns whose code had not been read on Nov 11. Rule files now cover 46 % of people. The tract run was not redone.

### 12. Likely questions

1. **"Is 10.3 % low because you were strict?"** It uses the mid cost and a 1-bedroom rent, which is what a 600 sq ft unit rents for. With all-unit rent it is 20.3 %. With HUD Small Area FMR it is 16.5 %. The sensitivity figure shows cost moves it most.
2. **"Why report a model with R2 0.02 on the backtest?"** Because that is the honest test of predicting forward. The county-held-out R2 of 0.20 shows some ranking skill. The 2031 numbers do not depend on it predicting well. They are scenario arithmetic.
3. **"How can you give a statewide room number from two cities?"** With a range, and with a warning: 61 % of modelled tracts are outside the cities' range. The measured numbers are the two cities. The rest is a model.

---

## Live demo (about 2 minutes)

1. **Home.** The question and the four numbers: 10.3% of tracts pay off, about 1,000 ADUs by 2031 today, about 13,500 with HB 2186, about 2.9 million lots with room.
2. **The map, address search.** Search "1818 E Moyamensing Ave, Philadelphia". The map switches to Does It Pay Off and Details opens: Maybe, close to paying off, allowed with limits in Philadelphia.
3. **Over Time.** Pick Over Time, Rent, and drag the time slider from 2010-14 to 2020-24.
4. **Today against the bill.** Pick Where to Build and switch Today to State Bill. Then ADUs by 2031: Today, HB 2186, SB 1346. Say again: bills, not law.
5. **Lots with Room.** The two cities drawn solid (measured), the rest lighter (modelled), hatching outside the training range.
6. **Notebooks & Code.** Open notebook 04 to show the model comparison and the backtest.

Backup if the network is slow: open the map once before the talk so the tract and town files are cached.
