"""Turn the MUSA 5500 tables into the files the website's map reads.

The part of the Backyard Homes PA (MUSA 6950) build that the map needs, with no lot files and no imports from the rest
of the repo. Run from the repo root after the notebooks (geospatial env):
    python web/build_data.py
    python web/build_data.py --headline          only src/lib/headline.json
    python web/build_data.py --copy-app-data DIR also copy the four files built elsewhere from DIR (see below)

Reads
    data/processed/                tables from get_data.py and the notebooks (--processed, or ADU_PROCESSED)
    $ADU_DATA_DIR/processed/5500/  summaries for the headline numbers (--results). ADU_DATA_DIR defaults to ~/musa-drive
    shared/legal_status.csv        the older town rule fields, when the file is there (--legal-status)
    shared/assumptions.json        the six payoff values, when the file is there (--assumptions)
Writes (web/)
    public/data/tracts.geojson     one shape per tract with the numbers the map and Details read
    public/data/towns.geojson      one shape per town with town totals and ADUs by 2031
    public/data/counties.geojson   one shape per county with the county roll-up
    src/lib/headline.json          the statewide headline numbers
    src/lib/assumptions.json       the payoff values the map's payoff test uses
Built elsewhere, copied with --copy-app-data DIR. The copies in public/data are kept in git, so this is only
needed to refresh them:
    pa_places.json, pa_places_meta.json   built in the MUSA 6950 repo (its app/public/data)
    zcta.geojson                          built in the MUSA 6950 repo (its app/public/data)
    tract_towns.json                      python -m pipeline.tract.towns
Missing inputs are skipped and named, so the map shows "Not ready yet" for them.
"""

import argparse
import json
import os
import shutil
import warnings
from pathlib import Path

import geopandas as gpd
import pandas as pd

WEB = Path(__file__).resolve().parent
OUT_DATA = WEB / "public" / "data"
HEADLINE = WEB / "src" / "lib" / "headline.json"
ASSUMPTIONS = WEB / "src" / "lib" / "assumptions.json"

SIMPLIFY = 0.0003  # degrees, about 30 m. Keeps the files small.
warnings.filterwarnings("ignore", category=RuntimeWarning)

# The payoff values of shared/assumptions.json the map reads (src/lib/numbers.ts).
PAYOFF_ITEMS = (
    "tract.payoff.hard_psf",
    "tract.payoff.soft_share",
    "financing.pmms30_2026_avg",
    "tract.payoff.loan_years",
    "tract.payoff.opex_share",
    "tract.payoff.close_band",
)
# Built by other modules, read by the map.
COPIED = ("pa_places.json", "pa_places_meta.json", "tract_towns.json", "zcta.geojson")

# Tract columns the map reads. Everything else stays out, to keep tracts.geojson small.
TRACT_KEEP = [
    "GEOID",
    "NAMELSAD",
    "county",
    "jobs_2010",
    "jobs_2019",
    "jobs_2024",
    "pop",
    "median_rent",
    "trend_group",
    "rent_est",
    "cost_month",
    "pays",
    # Lots with room for a 600 sq ft unit (state-reform setbacks), from room_tract.csv: measured from every lot in
    # Philadelphia and Pittsburgh, modelled elsewhere. room_measured 1 = measured, room_out 1 = outside training range.
    "lots_est",
    "room_lo",
    "room_mid",
    "room_hi",
    "room_measured",
    "room_out",
    "rent_b0",
    "rent_b1",
    "rent_b2",
    "rent_b3",
    # Growth after 2019 in % per year, and 1 when the 2019 to 2024 change is inside its margin of error
    "pop_after",
    "units_after",
    "rent_after",
    "pop_after_moe",
    "units_after_moe",
    "rent_after_moe",
    # Levels in the three ACS 5-year windows (2010-14, 2015-19, 2020-24). Rent in 2024 dollars.
    "pop_14",
    "pop_19",
    "pop_24",
    "homes_14",
    "homes_19",
    "homes_24",
    "rent_14",
    "rent_19",
    "rent_24",
]
TOWN_KEEP_DROP = [f"pop_{y}" for y in range(2010, 2026) if y not in (2010, 2019, 2025)]
COUNTY_KEEP = [
    "GEOID",
    "NAME",
    "tracts",
    "pop_2024",
    "tracts_pays_yes",
    "tracts_pays_maybe",
    "tracts_pays_no",
    "share_tracts_yes",
    "median_tract_rent_1br",
    "largest_trend_group",
    "lots_est",
    "lots_room_low",
    "lots_room_mid",
    "lots_room_high",
    "tracts_room_measured",
    "tracts_outside_training_range",
    *[f"adus_{c}_{r}" for r in ("current", "hb2186", "sb1346") for c in ("low", "mid", "high")],
]


def read(folder, name, **kw):
    p = folder / name
    if not p.exists():
        print(f"  not ready: {name}")
        return None
    print(f"  using    {name}")
    return pd.read_csv(p, **kw)


def wide(df, key, col, prefix):
    """Long table (key, year, value) -> one column per year."""
    w = df.pivot_table(index=key, columns="year", values=col, aggfunc="sum")
    w.columns = [f"{prefix}_{c}" for c in w.columns]
    return w.reset_index()


def trend_columns(t):
    """Growth after 2019 (% per year) and margin-of-error flags, from trends_tract.csv."""
    out = t[["GEOID", "trend_group"]].copy()
    for m in ("pop", "units", "rent"):
        out[f"{m}_after"] = (t[f"{m}_growth_after"] * 100).round(2)
        flag = t[f"{m}_after_within_moe"]
        out[f"{m}_after_moe"] = flag.map({True: 1, False: 0, "True": 1, "False": 0}).astype("Int64")
    return out


def room_columns(room):
    """Lots and lots with room for a 600 sq ft unit (low, mid, high), measured or modelled, from room_tract.csv."""
    out = room[["GEOID"]].copy()
    out["lots_est"] = room.lots_est.round(0).astype("Int64")
    for src, dst in [("lots_room_low", "room_lo"), ("lots_room_mid", "room_mid"), ("lots_room_high", "room_hi")]:
        out[dst] = room[src].round(0).astype("Int64")
    out["room_measured"] = (room.source == "measured").astype(int)
    # Outside the training range matters only where the number is modelled (some measured tracts carry the flag too).
    out_range = room.outside_training_range.astype(str).str.lower().eq("true")
    out["room_out"] = (out_range & (room.source != "measured")).astype(int)
    return out


def window_columns(panel):
    """Population, homes and rent (2024 dollars) in the three ACS windows, from tract_panel.csv."""
    out = panel[["GEOID"]].copy()
    for src, dst in [("pop", "pop"), ("housing_units", "homes"), ("median_rent", "rent")]:
        for y in (2014, 2019, 2024):
            out[f"{dst}_{str(y)[2:]}"] = panel[f"{src}_{y}"].round(0).astype("Int64")
    return out


def headline(results):
    """Statewide numbers for the site text, from the MUSA 5500 summaries."""
    pay = json.loads((results / "payoff_summary.json").read_text())
    fc = json.loads((results / "forecast_summary.json").read_text())
    groups = json.loads((results / "groups_summary.json").read_text())
    cv = pd.read_csv(results / "forecast_cv.csv") if (results / "forecast_cv.csv").exists() else None
    r2 = None
    if cv is not None:
        row = cv[(cv.model == fc["model"]) & (cv.scheme == "county_blocks")]
        r2 = round(float(row.r2_pooled.iloc[0]), 3) if len(row) else None
    adus = {
        r: {k.split(".")[1]: round(v) for k, v in vals.items() if k.startswith("by_2031.")}
        for r, vals in fc["totals"].items()
    }
    return {
        "pays_share": round(pay["share_yes"], 4),
        "pays_tracts": pay["count"]["yes"],
        "tracts": pay["tracts"],
        "rate": pay["rate"],
        "adus_by_2031": adus,
        "groups_k": groups["k"],
        "groups_silhouette": round(groups["silhouette"], 3),
        "groups_counts": dict(sorted(groups["counts"].items(), key=lambda kv: -kv[1])),
        "forecast_model": fc["model"],
        "forecast_r2_county_cv": r2,
        "room": room_headline(results),
    }


def room_headline(results):
    """Statewide lots with room for a 600 sq ft unit (state-reform setbacks), from room_summary.json."""
    p = results / "room_summary.json"
    if not p.exists():
        return None
    s = json.loads(p.read_text())["statewide"]
    keys = ("tracts", "measured_tracts", "modelled_tracts", "modelled_outside_training_range", "lots_est")
    out = {k: round(s[k]) for k in keys}
    out.update(
        {k.removeprefix("lots_room_"): round(s[k]) for k in ("lots_room_low", "lots_room_mid", "lots_room_high")}
    )
    return out


def write_headline(results, path=HEADLINE):
    """src/lib/headline.json. Keys this script does not write (older lot numbers) are kept as they are."""
    old = json.loads(path.read_text()) if path.exists() else {}
    if not (results / "payoff_summary.json").exists():
        print(f"  not ready: {results}/payoff_summary.json, kept the last headline numbers")
        return
    h = {**old, **headline(results)}
    path.write_text(json.dumps(h, indent=2) + "\n")
    print(f"  wrote {path.relative_to(WEB)}: pays {h['pays_share']:.1%}, ADUs by 2031 today {h['adus_by_2031']['current']['mid']}")


def write_assumptions(src, path=ASSUMPTIONS):
    """src/lib/assumptions.json: the payoff values, copied from shared/assumptions.json."""
    if not src.exists():
        print(f"  not ready: {src}, kept {path.name}")
        return
    a = json.loads(src.read_text())
    out = {"version": a.get("version"), "currency": a.get("currency"), "items": {k: a["items"][k] for k in PAYOFF_ITEMS}}
    path.write_text(json.dumps(out, indent=2) + "\n")
    print(f"  wrote {path.relative_to(WEB)} (version {out['version']})")


def compact_geojson(path):
    """Rewrite a GeoJSON file GDAL wrote with no spaces or line breaks, and whole-number floats (249.0) as 249.
    Same features, numbers and 5-decimal coordinates, about 14% smaller."""
    d = json.loads(path.read_text())
    for f in d["features"]:
        f["properties"] = {
            k: int(v) if isinstance(v, float) and v.is_integer() else v for k, v in f["properties"].items()
        }
    path.write_text(json.dumps(d, separators=(",", ":"), ensure_ascii=False))


def build_areas(processed, legal_status, out_dir):
    tracts = gpd.read_file(processed / "tracts_2020.gpkg")
    towns = gpd.read_file(processed / "towns_2020.gpkg")
    counties = gpd.read_file(processed / "counties_2020.gpkg")
    tracts["county"] = tracts.GEOID.str[:5].map(counties.set_index("GEOID").NAME)
    towns["county"] = towns.GEOID.str[:5].map(counties.set_index("GEOID").NAME)

    print("Tract data")
    jobs = read(processed, "jobs_tract.csv", dtype={"GEOID": str})
    if jobs is not None:
        tracts = tracts.merge(wide(jobs, "GEOID", "jobs_here", "jobs"), on="GEOID", how="left")
    acs = read(processed, "acs_tract.csv", dtype={"GEOID": str})
    if acs is not None:
        latest = acs[acs.acs_year == acs.acs_year.max()]
        tracts = tracts.merge(
            latest[["GEOID", "pop", "median_rent", "median_value", "renter_units"]], on="GEOID", how="left"
        )
    trends = read(processed, "trends_tract.csv", dtype={"GEOID": str})
    if trends is not None:
        tracts = tracts.merge(trend_columns(trends), on="GEOID", how="left")
    panel = read(processed, "tract_panel.csv", dtype={"GEOID": str})
    if panel is not None:
        tracts = tracts.merge(window_columns(panel), on="GEOID", how="left")
    payoff = read(processed, "payoff_tract.csv", dtype={"GEOID": str})
    if payoff is not None:
        tracts = tracts.merge(payoff, on="GEOID", how="left")
    room = read(processed, "room_tract.csv", dtype={"GEOID": str})
    if room is not None:
        tracts = tracts.merge(room_columns(room), on="GEOID", how="left")
    # Rent by bedrooms, for the ADU sizes on the map (studio to 3 BR)
    rent = read(processed, "rent_bedrooms_tract.csv", dtype={"GEOID": str})
    if rent is not None:
        rent = rent[["GEOID", "rent_b0", "rent_b1", "rent_b2", "rent_b3"]].copy()
        rent["rent_b0"] = rent.rent_b0.fillna(rent.rent_b1)  # a few counties have no studio rents
        tracts = tracts.merge(rent, on="GEOID", how="left")

    print("Town data")
    pop = read(processed, "pop_town.csv", dtype={"GEOID": str})
    if pop is not None:
        towns = towns.merge(wide(pop, "GEOID", "pop", "pop"), on="GEOID", how="left")
    permits = read(processed, "permits_town.csv", dtype={"town_geoid": str})
    if permits is not None:
        # Average new homes permitted per year, before and after 2019
        before = permits[permits.year <= 2019].groupby("town_geoid").units_total.sum() / 10
        after = permits[permits.year >= 2020].groupby("town_geoid").units_total.sum() / (permits.year.max() - 2019)
        p = pd.DataFrame({"permits_yr_before": before.round(1), "permits_yr_after": after.round(1)})
        towns = towns.merge(p.rename_axis("GEOID").reset_index(), on="GEOID", how="left")
    if legal_status.exists():
        legal = pd.read_csv(legal_status, dtype={"GEOID": str}, comment="#")
        keep = [c for c in legal.columns if c not in ("name",)]
        towns = towns.merge(
            legal[keep].rename(columns={"notes": "rule_notes", "as_of": "rule_as_of"}), on="GEOID", how="left"
        )
    else:
        print(f"  not ready: {legal_status}")
    forecast = read(processed, "forecast_town.csv", dtype={"town_geoid": str})
    if forecast is not None:
        f = forecast.pivot_table(index="town_geoid", columns="rule", values=["adus_low", "adus_mid", "adus_high"])
        f.columns = [f"{v}_{r}" for v, r in f.columns]
        towns = towns.merge(f.rename_axis("GEOID").reset_index(), on="GEOID", how="left")
    # How each town's own rule file treats ADUs (by_right, conversion_only, family_only, discretionary, none, unknown)
    legal_class = read(processed, "town_legal_class.csv", dtype={"town_geoid": str})
    if legal_class is not None:
        lc = legal_class[["town_geoid", "legal_class"]].rename(columns={"town_geoid": "GEOID"})
        towns = towns.merge(lc, on="GEOID", how="left")

    tracts = tracts[[c for c in TRACT_KEEP if c in tracts.columns] + ["geometry"]]
    towns = towns.drop(columns=[c for c in TOWN_KEEP_DROP if c in towns.columns])

    print("County data")
    rollup = read(processed, "county_rollup.csv", dtype={"county_geoid": str})
    if rollup is not None:
        counties = counties[["GEOID", "geometry"]].merge(
            rollup.rename(columns={"county_geoid": "GEOID", "name": "NAME"}), on="GEOID", how="left"
        )
        counties = counties[[c for c in COUNTY_KEEP if c in counties.columns] + ["geometry"]]
        for c in counties.columns:
            if c.startswith("adus_"):
                counties[c] = counties[c].round(0)
    out_files = [(tracts, "tracts"), (towns, "towns")] + ([(counties, "counties")] if rollup is not None else [])

    out_dir.mkdir(parents=True, exist_ok=True)
    for gdf, name in out_files:
        gdf = gdf.copy()
        gdf["geometry"] = gdf.geometry.simplify(SIMPLIFY, preserve_topology=True)
        path = out_dir / f"{name}.geojson"
        if path.exists():
            path.unlink()  # GDAL will not overwrite a GeoJSON file
        gdf.to_file(path, driver="GeoJSON", COORDINATE_PRECISION=5)
        compact_geojson(path)
        print(f"  wrote {name}.geojson ({path.stat().st_size / 1e6:.1f} MB, {len(gdf)} shapes)")


def copy_app_data(src, out_dir):
    """The four map files built by other modules, copied as they are."""
    for name in COPIED:
        p = src / name
        if p.exists():
            shutil.copy2(p, out_dir / name)
            print(f"  copied   {name}")
        else:
            print(f"  not there: {p}")


def parse_args(argv=None):
    data_root = Path(os.environ.get("ADU_DATA_DIR", "~/musa-drive")).expanduser()
    ap = argparse.ArgumentParser(description="Turn the MUSA 5500 tables into the files the website's map reads.")
    ap.add_argument("--processed", type=Path, default=Path(os.environ.get("ADU_PROCESSED", "data/processed")), help="clean tables (default data/processed)")
    ap.add_argument("--results", type=Path, default=data_root / "processed" / "5500", help="MUSA 5500 summaries (default $ADU_DATA_DIR/processed/5500)")
    ap.add_argument("--legal-status", type=Path, default=Path("shared/legal_status.csv"), help="older town rule fields")
    ap.add_argument("--assumptions", type=Path, default=Path("shared/assumptions.json"), help="the payoff values")
    ap.add_argument("--out", type=Path, default=OUT_DATA, help="where the map files go (default web/public/data)")
    ap.add_argument("--headline", action="store_true", help="only write src/lib/headline.json")
    ap.add_argument("--copy-app-data", type=Path, metavar="DIR", help="also copy the four files built elsewhere from DIR, for example the MUSA 6950 app/public/data")
    return ap.parse_args(argv)


def main():
    args = parse_args()
    if args.headline:
        print("Headline numbers only")
        write_headline(args.results)
        return
    build_areas(args.processed, args.legal_status, args.out)
    if args.copy_app_data:
        print("Files built elsewhere")
        copy_app_data(args.copy_app_data, args.out)
    print("Headline numbers and payoff values")
    write_headline(args.results)
    write_assumptions(args.assumptions)
    print("Done. See the site with: cd web && npm run dev")


if __name__ == "__main__":
    main()
