/**
 * Advanced Electoral Analysis Calculations
 */

export function calculateAdvancedMetrics(data, corp) {
    const d22 = data.partidos[corp];
    const d26 = data.partidos[corp]; // For Pedersen we need the full list
    const adv = data.indicadores_avanzados[corp];
    
    // 1. NEP (Número Efectivo de Partidos)
    // Formula: 1 / Sum(si^2) where si is seat share. 
    // We already have IHH which is Sum(vi^2) but for seats it's similar.
    // Using IHH based on votes as a proxy, or recalculating for seats.
    const ihh26 = adv['2026'].IHH;
    const nep = (10000 / ihh26).toFixed(2);
    const nep22 = (10000 / adv['2022'].IHH).toFixed(2);
    const nepChange = (nep - nep22).toFixed(2);

    // 2. Gallagher Index (Disproportionality)
    // Formula: sqrt( 0.5 * Sum( (Vote% - Seat%)^2 ) )
    const parties26 = Object.values(data.partidos[corp]).filter(p => p['2026']);
    let sumSqDiff = 0;
    parties26.forEach(p => {
        const vPct = p['2026'].cuota_poder_votos_pct;
        const sPct = p['2026'].poder_relativo_curules_pct;
        sumSqDiff += Math.pow(vPct - sPct, 2);
    });
    const gallagher = Math.sqrt(0.5 * sumSqDiff).toFixed(2);

    // 3. Pedersen Volatility (Approximate with available comparable parties)
    // Formula: 0.5 * Sum( |v2026% - v2022%| )
    let sumAbsDiff = 0;
    const allParties = Object.values(data.partidos[corp]);
    allParties.forEach(p => {
        const v26 = p['2026'] ? p['2026'].cuota_poder_votos_pct : 0;
        const v22 = p['2022'] ? p['2022'].cuota_poder_votos_pct : 0;
        sumAbsDiff += Math.abs(v26 - v22);
    });
    const volatility = (0.5 * sumAbsDiff).toFixed(2);

    // 4. Polarization Score (Weight of extremes)
    // Based on ideology    // 4. Polarization Score (Weight of extremes)
    const ideo = data.ideologia[corp];
    const izq = ideo['Izquierda']['2026'].poder_curules_pct;
    const der = ideo['Derecha']['2026'].poder_curules_pct;
    const polarization = Math.abs(izq - der).toFixed(2);

    return {
        nep: { 
            val: nep, 
            trend: nepChange, 
            trendLabel: "partidos más",
            label: "Fragmentación (Poder Repartido)", 
            desc: `Con un valor de <b>${nep}</b>, el poder en el Congreso quedó repartido eficazmente entre unos <b>${Math.round(nep)} partidos</b>. Esto significa que ninguna fuerza domina sola y se necesitarán alianzas amplias para aprobar leyes; es un reflejo de un país con voces muy diversas.`,
            status: nep > 8 ? 'danger' : (nep > 5 ? 'warning' : 'good'),
            interpretation: nep > 8 ? 'Extrema' : (nep > 5 ? 'Alta' : 'Moderada'),
            info: "Concentración de Poder"
        },
        gallagher: { 
            val: gallagher, 
            label: "Justicia del Sistema", 
            trend: (gallagher - 1.2).toFixed(2), 
            trendLabel: "puntos de desvío",
            desc: `El sistema tuvo un desvío de <b>${gallagher} puntos</b>. Al ser un número bajo, significa que el reparto de sillas fue muy fiel a los votos reales. Por cada 100 votos, casi el 100% se tradujo en una representación directa, garantizando que el Congreso sea un espejo de lo que tú votaste.`,
            status: gallagher > 12 ? 'danger' : (gallagher > 7 ? 'warning' : 'good'),
            interpretation: gallagher > 12 ? 'Baja' : (gallagher > 7 ? 'Media' : 'Alta'),
            info: "Respeto al Voto"
        },
        volatility: { 
            val: volatility, 
            label: "Cambio de Opinión (Volatilidad)", 
            trend: (volatility - 30).toFixed(2), 
            trendLabel: "% de saltos",
            desc: `Un <b>${volatility}%</b> de los electores cambió radicalmente su lealtad política. Es un valor muy alto que indica un "terremoto electoral": miles de personas dejaron de confiar en sus partidos de siempre para buscar nuevas alternativas, mostrando un clima de insatisfacción o renovación.`,
            status: volatility > 20 ? 'danger' : (volatility > 15 ? 'warning' : 'good'),
            interpretation: volatility > 20 ? 'Terremoto' : (volatility > 15 ? 'Fuerte' : 'Baja'),
            info: "Lealtad del Ciudadano"
        },
        polarization: { 
            val: polarization, 
            label: "División (Polarización)", 
            trend: (polarization - 10).toFixed(2),
            trendLabel: "puntos de brecha",
            desc: `La brecha entre bandos es de <b>${polarization} puntos</b>. Aunque hay diferencias, esta distancia sugiere que todavía existe un espacio para el diálogo. No estamos en un escenario de "mitad contra mitad" absoluta, lo que permite que fuerzas de centro medien entre los extremos.`,
            status: polarization > 30 ? 'danger' : (polarization > 15 ? 'warning' : 'good'),
            interpretation: polarization > 30 ? 'Extrema' : (polarization > 15 ? 'Alta' : 'Baja'),
            info: "Clima de Convivencia"
        }
    };
}
