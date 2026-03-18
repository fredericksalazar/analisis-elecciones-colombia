import csv
import json
import os

def load_csv(path):
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    gen_data = load_csv(os.path.join(base_dir, 'resumen_general_elecciones_completo.csv'))
    part_data = load_csv(os.path.join(base_dir, 'elecciones_legislativas_partidos.csv'))
    terr_data = load_csv(os.path.join(base_dir, 'eleccione_legislativas_territorio.csv'))

    res = {
        "comportamiento_electoral": {},
        "partidos": {"Senado": {}, "Cámara": {}},
        "ideologia": {"Senado": {}, "Cámara": {}},
        "indicadores_avanzados": {"Senado": {}, "Cámara": {}},
        "territorio": {}
    }

    # 1. Comportamiento Electoral General
    comportamiento = {}
    for row in gen_data:
        y = row['year']
        c = row['corp']
        censo = int(row['censo'])
        votantes = int(row['votantes'])
        validos = int(row['validos'])
        nulos = int(row['nulos'])
        invalidos = int(row['invalidos'])
        
        if y not in comportamiento:
            comportamiento[y] = {}
            
        comportamiento[y][c] = {
            "censo": censo,
            "votantes": votantes,
            "participacion_pct": round((votantes / censo) * 100, 2),
            "abstencion_pct": round(((censo - votantes) / censo) * 100, 2),
            "votos_validos": validos,
            "validos_pct": round((validos / votantes) * 100, 2),
            "votos_nulos_invalidos": nulos + invalidos,
            "nulos_invalidos_pct": round(((nulos + invalidos) / votantes) * 100, 2)
        }
    
    comparativo = {}
    for c in ["Senado", "Cámara"]:
        try:
            d26 = comportamiento["2026"][c]
            d22 = comportamiento["2022"][c]
            comparativo[c] = {
                "variacion_votantes_abs": d26["votantes"] - d22["votantes"],
                "variacion_participacion_pp": round(d26["participacion_pct"] - d22["participacion_pct"], 2),
                "variacion_nulos_invalidos_pp": round(d26["nulos_invalidos_pct"] - d22["nulos_invalidos_pct"], 2)
            }
        except KeyError:
            pass

    res["comportamiento_electoral"] = {
        "anuales": comportamiento,
        "comparativo_2026_vs_2022": comparativo
    }

    # 2. Análisis por Partidos
    # Primero totalizar votos y curules por año y corporacion para calcular relativos
    totales_corp = {}
    for row in part_data:
        y = row['year']
        c = row['corp']
        votos = int(row['votos'])
        curules = int(row['curules'])
        
        if y not in totales_corp: totales_corp[y] = {}
        if c not in totales_corp[y]: totales_corp[y][c] = {"votos": 0, "curules": 0}
        
        totales_corp[y][c]["votos"] += votos
        totales_corp[y][c]["curules"] += curules

    partidos_dict = {"Senado": {}, "Cámara": {}}
    ideologia_dict = {"Senado": {}, "Cámara": {}}

    for row in part_data:
        y = row['year']
        c = row['corp']
        p = row['partido']
        votos = int(row['votos'])
        curules = int(row['curules'])
        ideo = row['ideo']

        # Partidos
        if p not in partidos_dict[c]:
            partidos_dict[c][p] = {"ideologia": ideo, "2022": None, "2026": None}
            
        t_votos = totales_corp[y][c]["votos"]
        t_curules = totales_corp[y][c]["curules"]
        
        cuota_votos = round((votos / t_votos) * 100, 2)
        poder_relativo = round((curules / t_curules) * 100, 2)
        
        # Eficiencia: (% curules / % votos)
        eficiencia = round(poder_relativo / cuota_votos, 4) if cuota_votos > 0 else 0
        
        # Costo por curul
        costo_curul = round(votos / curules, 0) if curules > 0 else 0

        partidos_dict[c][p][y] = {
            "votos": votos,
            "curules": curules,
            "cuota_poder_votos_pct": cuota_votos,
            "poder_relativo_curules_pct": poder_relativo,
            "eficiencia_electoral": eficiencia,
            "costo_votos_por_curul": costo_curul
        }

        # Ideologia
        if ideo not in ideologia_dict[c]:
            ideologia_dict[c][ideo] = {"2022": {"votos": 0, "curules": 0}, "2026": {"votos": 0, "curules": 0}}
        ideologia_dict[c][ideo][y]["votos"] += votos
        ideologia_dict[c][ideo][y]["curules"] += curules

    # Calcular variaciones partidos
    for c, partidos in partidos_dict.items():
        for p, data in partidos.items():
            d22 = data["2022"]
            d26 = data["2026"]
            if d22 and d26:
                data["comparativo"] = {
                    "variacion_votos_abs": d26["votos"] - d22["votos"],
                    "variacion_votos_pct": round(((d26["votos"] - d22["votos"]) / d22["votos"]) * 100, 2),
                    "curules_adicionales": d26["curules"] - d22["curules"],
                    "variacion_poder_relativo_pp": round(d26["poder_relativo_curules_pct"] - d22["poder_relativo_curules_pct"], 2)
                }
            else:
                data["comparativo"] = "No comparable (No participó en ambas)"
                
    res["partidos"] = partidos_dict

    # Calcular variaciones ideologia
    for c, ideologias in ideologia_dict.items():
        for i, data in ideologias.items():
            for y in ["2022", "2026"]:
                tv = totales_corp[y][c]["votos"]
                tc = totales_corp[y][c]["curules"]
                data[y]["poder_votos_pct"] = round((data[y]["votos"] / tv) * 100, 2) if tv > 0 else 0
                data[y]["poder_curules_pct"] = round((data[y]["curules"] / tc) * 100, 2) if tc > 0 else 0
                
            data["comparativo"] = {
                "curules_adicionales": data["2026"]["curules"] - data["2022"]["curules"],
                "variacion_poder_votos_pp": round(data["2026"]["poder_votos_pct"] - data["2022"]["poder_votos_pct"], 2),
                "variacion_poder_curules_pp": round(data["2026"]["poder_curules_pct"] - data["2022"]["poder_curules_pct"], 2)
            }
            
    res["ideologia"] = ideologia_dict

    # 4. Indicadores Avanzados: IHH
    for c in ["Senado", "Cámara"]:
        for y in ["2022", "2026"]:
            sum_sq_votos = 0
            for p, data in partidos_dict[c].items():
                if data[y]:
                    sum_sq_votos += (data[y]["cuota_poder_votos_pct"] ** 2)
            
            if y not in res["indicadores_avanzados"][c]:
                res["indicadores_avanzados"][c][y] = {}
            res["indicadores_avanzados"][c][y]["IHH"] = round(sum_sq_votos, 2)
            
            # Clasificacion IHH
            cls = "No Concentrado"
            if sum_sq_votos > 2500: cls = "Alta Concentración"
            elif sum_sq_votos > 1500: cls = "Moderada Concentración"
            res["indicadores_avanzados"][c][y]["IHH_clasificacion"] = cls

    # 5. Territorio
    terr_analysis = {"2022": {}, "2026": {}}
    for row in terr_data:
        y = row['year']
        c = row['corp']
        dpto = row['dpto']
        winner = row['winner']
        ideo = row['ideo']
        votos = int(row['votos'])
        
        if c not in terr_analysis[y]:
            terr_analysis[y][c] = {
                "dominio_partidos": {}, 
                "dominio_ideo": {}, 
                "total_votos_ganadores": 0, 
                "num_dptos": 0,
                "detalles_departamentos": {} # NEW: For map visualization
            }
            
        if winner not in terr_analysis[y][c]["dominio_partidos"]:
            terr_analysis[y][c]["dominio_partidos"][winner] = 0
        terr_analysis[y][c]["dominio_partidos"][winner] += 1
        
        if ideo not in terr_analysis[y][c]["dominio_ideo"]:
            terr_analysis[y][c]["dominio_ideo"][ideo] = 0
        terr_analysis[y][c]["dominio_ideo"][ideo] += 1
        
        terr_analysis[y][c]["total_votos_ganadores"] += votos
        terr_analysis[y][c]["num_dptos"] += 1

        # NEW: Store per-department data for the map
        terr_analysis[y][c]["detalles_departamentos"][dpto] = {
            "ganador": winner,
            "votos": votos,
            "ideologia": ideo
        }

    for y, corps in terr_analysis.items():
        for c, data in corps.items():
            if data["num_dptos"] > 0:
                data["costo_territorial_promedio_victoria"] = round(data["total_votos_ganadores"] / data["num_dptos"], 0)

    # 5b. Variación de participación electoral por departamento (2026 vs 2022)
    for c in ["senado", "camara"]:
        dptos_2026 = terr_analysis["2026"].get(c, {}).get("detalles_departamentos", {})
        dptos_2022 = terr_analysis["2022"].get(c, {}).get("detalles_departamentos", {})

        for dpto_name, d26_data in dptos_2026.items():
            if dpto_name in dptos_2022:
                v22 = dptos_2022[dpto_name].get("votos", 0)
                v26 = d26_data.get("votos", 0)
                if v22 > 0:
                    variacion = round(((v26 - v22) / v22) * 100, 2)
                else:
                    variacion = None
            else:
                variacion = None
            d26_data["variacion_participacion_pct"] = variacion

    res["territorio"] = terr_analysis

    # Write output
    out_path = os.path.join(base_dir, 'resultados_analisis.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=4)
        
    print("Análisis completado. Archivo JSON generado en:", out_path)

if __name__ == '__main__':
    main()
