# The every-municipality summary (docs/places.md): the scenarios and the legal, pays and room path.
import pytest

pytest.importorskip("geopandas")


def _toy_table():
    import pandas as pd

    from pipeline import places_analysis as A

    t = pd.DataFrame(
        {
            "geoid": ["4210160000", "4200361000", "1", "2", "3"],
            "status": ["limited", "by_right", "no_zoning", "unknown", "not_addressed"],
            "pop": [100, 50, 10, 30, 10],
            "housing_units": [40, 20, 5, 12, 4],
            "tier": ["verified", "verified", "reported", "baseline", "verified"],
            "legal_class": ["conversion_only", "by_right", "no_zoning", "unknown", "none"],
            "rule_file": ["philadelphia", "pittsburgh", None, None, "x"],
        }
    )
    t["group"] = t.status.map(A.GROUP)
    return A, t


def test_scenarios_bills_reach():
    A, t = _toy_table()
    assert list(A.scenario_status(t, "hb2186")) == ["by right", "by right", "no zoning", "by right", "by right"]
    # SB 1346 amends the MPC: Philadelphia and Pittsburgh keep today's rule
    assert list(A.scenario_status(t, "sb1346")) == ["limited", "by right", "no zoning", "by right", "by right"]
    sc = A.scenarios(t)
    today = sc[sc.scenario == "today"].set_index("group").pop_share
    assert abs(today["by right"] - 50 / 200) < 1e-9 and abs(today.sum() - 1) < 1e-9


def test_alt_classes_no_zoning_counts_as_by_right():
    A, t = _toy_table()
    c = A.alt_classes(t)
    assert list(c.legal_class) == ["conversion_only", "by_right", "by_right", "unknown", "none"]
    assert list(c.review) == ["verified", "verified", "none", "none", "verified"]


def test_legal_pays_room_permit_path():
    import pandas as pd

    A, t = _toy_table()
    p = pd.DataFrame(
        {
            "town_geoid": ["4210160000", "4200361000", "1", "2"],
            "pop_2024": [100.0, 50.0, 10.0, 30.0],
            "pays": ["yes", "maybe", "no", "yes"],
            "lots_room_mid": [5.0, 20.0, 8.0, 30.0],
            "lots_room_low": [1.0, 10.0, 4.0, 15.0],
            "lots_room_high": [9.0, 30.0, 12.0, 45.0],
        }
    ).merge(t, left_on="town_geoid", right_on="geoid")
    h = A.headline(A.legal_pays_room(p))
    assert h["today"]["lots_room_mid_legal"] == 28.0  # Pittsburgh by right + the no-zoning place
    assert h["today"]["lots_room_mid_legal_pays_yes_maybe"] == 20.0
    assert h["hb2186"]["lots_room_mid_legal"] == 63.0
    assert h["hb2186"]["lots_room_mid_legal_pays_yes_maybe"] == 55.0
