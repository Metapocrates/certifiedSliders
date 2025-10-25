> NCAA Track & Field Programs → Supabase (Zero-Manual Workflow)
>
> Step-by-step playbook to build a clean, importable list of NCAA programs into Supabase **without manual data entry** using the official NCAA “Projected Sports Sponsorship by School” spreadsheet.

---

## Why this approach?

The NCAA membership spreadsheet has stable identifiers, sport/gender columns, and division/conference metadata. We parse it to CSV with a small Python script and bulk-load into Supabase for a repeatable yearly update.

---

## Repo layout

```
/docs/ncaa-track-programs-playbook.md      ← this file
/data/RES_ProjectedSportsSponsorshipbySchool.xlsx   ← NCAA spreadsheet (drop here)
/data/ncaa_track_programs.csv              ← script output
/scripts/ncaa_taf_extract.py               ← parser script
```

---

## 1) Supabase schema

Run in Supabase SQL editor:

```sql
-- schema: public
create table if not exists ncaa_track_programs (
  id uuid primary key default gen_random_uuid(),
  school_name text not null,
  school_short_name text,
  division text not null,
  conference text,
  sport text not null,
  gender text not null check (gender in ('M','W')),
  data_year int,
  source text default 'NCAA Sponsorship XLSX',
  created_at timestamptz not null default now()
);

create index if not exists idx_ncaa_track_programs_school on ncaa_track_programs (school_name);
create index if not exists idx_ncaa_track_programs_div_conf on ncaa_track_programs (division, conference);
create index if not exists idx_ncaa_track_programs_sport_gender on ncaa_track_programs (sport, gender);
```

---

## 2) Download the NCAA XLSX

1. Grab “Projected Sports Sponsorship by School” from NCAA Research/Membership.
2. Save as `data/RES_ProjectedSportsSponsorshipbySchool.xlsx`.
3. If filename differs, update the script constant.

---

## 3) Parse → CSV with Python

Create `scripts/ncaa_taf_extract.py` (see script in repo). Configure:

```python
INPUT_XLSX = Path("data/RES_ProjectedSportsSponsorshipbySchool.xlsx")
OUTPUT_CSV = Path("data/ncaa_track_programs.csv")
DATA_YEAR  = 2025    # adjust per spreadsheet cycle
```

Run from repo root:

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install pandas openpyxl
python scripts/ncaa_taf_extract.py
# -> writes data/ncaa_track_programs.csv
```

---

## 4) Bulk-load into Supabase

**Option A – Supabase UI**
* Dashboard → `ncaa_track_programs` table → Import CSV → map columns → upload `/data/ncaa_track_programs.csv`.

**Option B – psql**

```bash
export SUPABASE_DB_URL="postgresql://postgres:PASS@db.HOST:5432/postgres"
psql "$SUPABASE_DB_URL" -c "\
  \copy ncaa_track_programs (school_name, school_short_name, division, conference, sport, gender, data_year, source)
  FROM 'data/ncaa_track_programs.csv' WITH (FORMAT csv, HEADER true);"
```

To refresh for new year:

```sql
delete from ncaa_track_programs where data_year = 2025; -- update year
```

---

## 5) Handy queries

```sql
-- Program counts
select division, sport, gender, count(*) as programs
from ncaa_track_programs
group by 1,2,3
order by 1,2,3;

-- All offerings per school
select school_name, division, conference,
       string_agg(sport || ' ' || gender, ', ' order by sport, gender) as offerings
from ncaa_track_programs
group by school_name, division, conference
order by school_name;
```

---

## 6) Optional pivot view

```sql
create or replace view v_ncaa_schools_tf as
with base as (
  select
    school_name,
    division,
    conference,
    max((sport='Indoor Track & Field'  and gender='M')::int)::int as men_indoor,
    max((sport='Indoor Track & Field'  and gender='W')::int)::int as women_indoor,
    max((sport='Outdoor Track & Field' and gender='M')::int)::int as men_outdoor,
    max((sport='Outdoor Track & Field' and gender='W')::int)::int as women_outdoor,
    max((sport='Cross Country'         and gender='M')::int)::int as men_xc,
    max((sport='Cross Country'         and gender='W')::int)::int as women_xc
  from ncaa_track_programs
  group by school_name, division, conference
)
select * from base;
```

---

## 7) Notes & gotchas

* Column drift: tweak regex helpers if NCAA renames headers.
* Conference data is “primary conference”; sport-specific leagues vary.
* Cross Country selectors optional—keep if relevant.

---

## 8) Outcome

Supabase holds a structured `ncaa_track_programs` dataset ready for:

* Search/filters by division, conference, sport, gender  
* Program directory UI, star-rating heuristics  
* Future enrichment (coach contacts, facility info, etc.)

