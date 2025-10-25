#!/usr/bin/env python3
"""
Extract NCAA Track & Field sponsorship entries from the official NCAA
Projected Sports Sponsorship by School spreadsheet.
"""

import re
import sys
from pathlib import Path
import pandas as pd

# CONFIGURE
INPUT_XLSX = Path("data/RES_ProjectedSportsSponsorshipbySchool.xlsx")
OUTPUT_CSV = Path("data/ncaa_track_programs.csv")
DATA_YEAR = 2025  # update to spreadsheet cycle


def find_col(cols, *patterns):
    cols_lower = {c.lower(): c for c in cols}
    for patt in patterns:
        patt_re = re.compile(patt, re.I)
        for lower, orig in cols_lower.items():
            if patt_re.search(lower):
                return orig
    return None


def match_any(text, patterns):
    return any(re.search(p, text, re.I) for p in patterns)


def is_yes(value):
    if pd.isna(value):
        return False
    s = str(value).strip().lower()
    return s in {"y", "yes", "true", "1", "x"} or s.startswith("yes")


def main():
    if not INPUT_XLSX.exists():
        print(
            f"ERROR: Cannot find {INPUT_XLSX}. Place the NCAA XLSX in /data or update INPUT_XLSX.",
            file=sys.stderr,
        )
        sys.exit(1)

    xls = pd.ExcelFile(INPUT_XLSX)
    sheet_name = xls.sheet_names[0]
    df = xls.parse(sheet_name)

    school_col = find_col(df.columns, r"^school$", r"^institution", r"school name")
    division_col = find_col(df.columns, r"division")
    conference_col = find_col(df.columns, r"conference")

    if not school_col or not division_col:
        print("ERROR: Could not detect School/Division columns. Adjust regexes in script.", file=sys.stderr)
        sys.exit(1)

    selectors = [
        ("Indoor Track & Field", "M", [r"men.*indoor.*track", r"indoor.*track.*men"]),
        ("Indoor Track & Field", "W", [r"women.*indoor.*track", r"indoor.*track.*women"]),
        ("Outdoor Track & Field", "M", [r"men.*outdoor.*track", r"outdoor.*track.*men"]),
        ("Outdoor Track & Field", "W", [r"women.*outdoor.*track", r"outdoor.*track.*women"]),
        ("Cross Country", "M", [r"men.*cross.*country", r"cross.*country.*men"]),
        ("Cross Country", "W", [r"women.*cross.*country", r"cross.*country.*women"]),
    ]

    mapped = []
    for sport_label, gender, patterns in selectors:
        cols = [col for col in df.columns if match_any(col, patterns)]
        if cols:
            mapped.append((sport_label, gender, cols))

    rows = []
    for _, row in df.iterrows():
        school = str(row.get(school_col, "")).strip()
        if not school:
            continue
        division = str(row.get(division_col, "")).strip()
        conference = str(row.get(conference_col, "")).strip() if conference_col else ""

        for sport_label, gender, cols in mapped:
            if any(is_yes(row.get(col, "")) for col in cols):
                rows.append(
                    {
                        "school_name": school,
                        "school_short_name": "",
                        "division": division,
                        "conference": conference,
                        "sport": sport_label,
                        "gender": gender,
                        "data_year": DATA_YEAR,
                        "source": "NCAA Sponsorship XLSX",
                    }
                )

    out = pd.DataFrame(rows).drop_duplicates()
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(OUTPUT_CSV, index=False)
    print(f"Wrote {len(out)} rows → {OUTPUT_CSV}")


+if __name__ == "__main__":
+    main()
+
