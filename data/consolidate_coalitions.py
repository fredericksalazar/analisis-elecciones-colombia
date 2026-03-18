#!/usr/bin/env python3
import csv
from collections import defaultdict

MAESTRO_PATH = 'data/partidos_maestro.csv'
CSV_PATH = 'data/elecciones_legislativas_partidos_wikipedia.csv'
OUTPUT_PATH = 'data/elecciones_legislativas_partidos_consolidated.csv'

maestro = {}
with open(MAESTRO_PATH) as f:
    reader = csv.DictReader(f)
    for row in reader:
        alias = row['alias'].strip()
        maestro[alias] = {
            'nombre_normalizado': row['nombre_normalizado'].strip(),
            'color_hex': row['color_hex'].strip(),
            'ideologia': row['ideologia'].strip(),
        }

reader = csv.DictReader(open(CSV_PATH))
rows = list(reader)

WIKIPEDIA_TOTALS = {
    (2022, 'Senado'): 108,
    (2022, 'Camara'): 188,
    (2026, 'Senado'): 103,
    (2026, 'Camara'): 183,
}

aggregated = defaultdict(lambda: defaultdict(lambda: {'votos': 0, 'curules': 0, 'color': None, 'ideologia': None}))

SENADO_SPECIAL_SEATS = {
    'Curul Segunda Formula Vicepresidencial': 'Curul Segunda Formula Presidencial',
    'Estatuto Oposicion Sen': 'Curul Segunda Formula Presidencial',
}

CAMARA_SPECIAL_SEATS = {
    'Curul Segunda Formula Vicepresidencial': 'Curul Segunda Formula Vicepresidencial Cam',
}

SPECIAL_SEAT_COLOR = '#CCCCCC'
SPECIAL_SEAT_IDEO = 'Centro'

for row in rows:
    year = int(row['year'])
    corp = row['corp']
    partido = row['partido'].strip()
    votos = int(row['votos'])
    curules = int(row['curules'])

    key = (year, corp)
    if key not in WIKIPEDIA_TOTALS:
        continue

    if corp == 'Senado' and partido in SENADO_SPECIAL_SEATS:
        name = SENADO_SPECIAL_SEATS[partido]
        color = SPECIAL_SEAT_COLOR
        ideologia = SPECIAL_SEAT_IDEO
    elif corp == 'Camara' and partido in CAMARA_SPECIAL_SEATS:
        name = CAMARA_SPECIAL_SEATS[partido]
        color = SPECIAL_SEAT_COLOR
        ideologia = SPECIAL_SEAT_IDEO
    elif partido in maestro:
        info = maestro[partido]
        name = info['nombre_normalizado']
        color = info['color_hex']
        ideologia = info['ideologia']
    else:
        name = partido
        color = '#94a3b8'
        ideologia = row['ideologia'].strip()

    entry = aggregated[key][name]
    entry['votos'] += votos
    entry['curules'] += curules
    if entry['color'] is None:
        entry['color'] = color
    if entry['ideologia'] is None:
        entry['ideologia'] = ideologia

for key in aggregated:
    current_total = sum(v['curules'] for v in aggregated[key].values())
    target = WIKIPEDIA_TOTALS.get(key)
    if target and current_total != target:
        diff = target - current_total
        print(f"WARNING: {key[0]} {key[1]} has {current_total} curules, expected {target} (diff: {diff})")
        # Note: Comunes Cam 2026 is NOT included - Wikipedia visible table shows 0 seats.
        # The 183 total from Wikipedia's electoral system description doesn't match the visible table total.
        # We follow the visible seat allocation (which excludes Comunes in 2026).

unmatched = set()
for row in rows:
    partido = row['partido'].strip()
    if partido not in maestro:
        unmatched.add(partido)
if unmatched:
    print(f"Unmatched aliases: {sorted(unmatched)}")

with open(OUTPUT_PATH, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['year', 'corp', 'partido', 'votos', 'curules', 'color', 'ideologia'])
    for (year, corp) in sorted(aggregated.keys()):
        for partido in sorted(aggregated[(year, corp)].keys()):
            entry = aggregated[(year, corp)][partido]
            writer.writerow([year, corp, partido, entry['votos'], entry['curules'], entry['color'], entry['ideologia']])

print(f"Written to {OUTPUT_PATH}")
print()
for (year, corp) in sorted(aggregated.keys()):
    total = sum(v['curules'] for v in aggregated[(year, corp)].values())
    print(f"  {year} {corp}: {total} curules, {len(aggregated[(year, corp)])} parties")
