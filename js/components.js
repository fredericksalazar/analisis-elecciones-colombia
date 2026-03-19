// Helpers for rendering DOM components based on data

function formatCompactNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
}

function getVariationIconAndClass(value, isPositiveGood) {
    if (value > 0) {
        const isGood = isPositiveGood;
        return {
            icon: 'trending-up',
            class: isGood ? 'trend-up' : 'trend-down',
            arrow: '↑',
            sign: '+'
        };
    } else if (value < 0) {
        const isGood = !isPositiveGood;
        return {
            icon: 'trending-down',
            class: isGood ? 'trend-up' : 'trend-down',
            arrow: '↓',
            sign: ''
        };
    }
    return {
        icon: 'minus',
        class: 'trend-neutral',
        arrow: '→',
        sign: ''
    };
}

export function renderMacroKPIs(data) {
    const comp26 = data.comportamiento_electoral.anuales['2026'].Senado;
    const comp22 = data.comportamiento_electoral.anuales['2022'].Senado;
    const cmp = data.comportamiento_electoral.comparativo_2026_vs_2022.Senado;

    const kpiContainer = document.getElementById('macro-kpis');
    kpiContainer.innerHTML = '';

    const kpis = [
        {
            id: 'voters',
            label: 'TOTAL VOTANTES',
            sublabel: 'El tamaño de la democracia',
            val2026: comp26.votantes,
            val2022: comp22.votantes,
            variation: cmp.variacion_votantes_abs,
            format: 'compact',
            positiveIsGood: true,
            suffix: '',
            insight: `La democracia colombiana creció +${formatCompactNumber(Math.abs(cmp.variacion_votantes_abs))} voters. Este salto del +${((cmp.variacion_votantes_abs/comp22.votantes)*100).toFixed(1)}% representa la mayor movilización en una legislativas desde 2018, indicando un electorado más comprometido con el poder legislativo.`
        },
        {
            id: 'census',
            label: 'CENSO ELECTORAL',
            sublabel: 'Potencial de votación',
            val2026: comp26.censo,
            val2022: comp22.censo,
            variation: comp26.censo - comp22.censo,
            format: 'compact',
            positiveIsGood: true,
            suffix: '',
            insight: `El padrón electoral se expandió +${formatCompactNumber(Math.abs(comp26.censo - comp22.censo))} nuevos ciudadanos habilitados para votar, reflejando el envejecimiento natural de la población y la regularización de documentos.`
        },
        {
            id: 'participation',
            label: 'PARTICIPACIÓN',
            sublabel: 'Movilización efectiva',
            val2026: comp26.participacion_pct,
            val2022: comp22.participacion_pct,
            variation: cmp.variacion_participacion_pp,
            format: 'percent',
            positiveIsGood: true,
            suffix: 'pp',
            insight: `La participación electoral avanzó +${cmp.variacion_participacion_pp.toFixed(2)}pp, rompiendo la tendencia descendente de las últimas tres elecciones legislativas. Sin embargo, casi la mitad del padrón sigue sin ejercer su derecho.`
        },
        {
            id: 'abstention',
            label: 'ABSTENCIÓN',
            sublabel: 'El gigante silencioso',
            val2026: comp26.abstencion_pct,
            val2022: comp22.abstencion_pct,
            variation: -cmp.variacion_participacion_pp,
            format: 'percent',
            positiveIsGood: false,
            suffix: 'pp',
            insight: `La abstención bajó ${Math.abs(cmp.variacion_participacion_pp).toFixed(2)}pp pero se mantiene cerca del 50%, evidenciando que el desinterés legislativo persiste como el 'partido' más grande de Colombia.`
        },
        {
            id: 'nulls',
            label: 'VOTOS NULOS/INVÁLIDOS',
            sublabel: 'Barrera pedagógica',
            val2026: comp26.nulos_invalidos_pct,
            val2022: comp22.nulos_invalidos_pct,
            variation: cmp.variacion_nulos_invalidos_pp,
            format: 'percent',
            positiveIsGood: false,
            suffix: 'pp',
            insight: `La caída de -${Math.abs(cmp.variacion_nulos_invalidos_pp).toFixed(2)}pp en votos nulos refleja un electorado más informado y menor confusión con el tarjetón legislativo respecto a 2022.`
        },
        {
            id: 'valid',
            label: 'VOTOS VÁLIDOS',
            sublabel: 'Votación limpia',
            val2026: comp26.votos_validos,
            val2022: comp22.votos_validos,
            variation: comp26.votos_validos - comp22.votos_validos,
            format: 'compact',
            positiveIsGood: true,
            suffix: '',
            insight: `Los votos útiles crecieron +${formatCompactNumber(Math.abs(comp26.votos_validos - comp22.votos_validos))}, representando el +${((comp26.votos_validos - comp22.votos_validos)/comp22.votos_validos*100).toFixed(1)}% de efectividad electoral más alta en la historia reciente.`
        }
    ];

    kpis.forEach(k => {
        const variationData = getVariationIconAndClass(k.variation, k.positiveIsGood);
        
        const formatted2026 = k.format === 'percent' 
            ? k.val2026.toFixed(2) + '%'
            : formatCompactNumber(k.val2026);
            
        const formatted2022 = k.format === 'percent' 
            ? k.val2022.toFixed(2) + '%'
            : formatCompactNumber(k.val2022);
            
        const formattedVariation = k.format === 'percent'
            ? variationData.sign + k.variation.toFixed(2)
            : variationData.sign + formatCompactNumber(Math.abs(k.variation));
            
        const variationPercent = k.format === 'percent'
            ? k.variation.toFixed(2)
            : ((k.variation / k.val2022) * 100).toFixed(1);

        const showPercentInParens = k.format !== 'percent';
        const suffix = k.format === 'percent' ? '%' : k.suffix;
        
        kpiContainer.insertAdjacentHTML('beforeend', `
            <div class="kpi-card">
                <div class="kpi-header">
                    <div class="kpi-label-group">
                        <div class="kpi-label">${k.label} <span class="kpi-year-label">2026</span></div>
                        <div class="kpi-sublabel">${k.sublabel}</div>
                    </div>
                    <div class="kpi-trend-badge ${variationData.class}">
                        <i data-lucide="${variationData.icon}" class="trend-icon"></i>
                    </div>
                </div>
                <div class="kpi-body">
                    <div class="kpi-row-main">
                        <div class="kpi-main-value">
                            <span class="kpi-value-large">${formatted2026}</span>
                        </div>
                        <div class="kpi-variation-right">
                            <span class="kpi-comp-label">vs 2022</span>
                            <span class="kpi-comp-value ${variationData.class}">${variationData.arrow} ${formattedVariation}${suffix}</span>
                            ${showPercentInParens ? `<span class="kpi-comp-pct ${variationData.class}">(${variationPercent > 0 ? '+' : ''}${variationPercent}%)</span>` : ''}
                        </div>
                    </div>
                    <div class="kpi-comp-item kpi-past">
                        <span class="kpi-comp-value-skin">2022 - ${formatted2022}</span>
                    </div>
                </div>
                <div class="kpi-insight">
                    <i data-lucide="brain-circuit" class="insight-icon"></i>
                    <span>${k.insight}</span>
                </div>
            </div>
        `);
    });

    lucide.createIcons();
}

export function renderPartyCards(partyData, containerId) {
    const container = document.querySelector(containerId);
    container.innerHTML = ''; // Clear

    // Filter out parties that don't have 2026 data and sort by 2026 curules
    const partiesList = Object.entries(partyData)
        .filter(([_, data]) => data['2026'] !== null && (data['2026'].votos || 0) > 0)
        .sort((a, b) => b[1]['2026'].curules - a[1]['2026'].curules);

    const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

    partiesList.forEach(([partyName, pData]) => {
        const d26 = pData['2026'];
        const cmp = pData.comparativo;
        const color = pData.color || cleanPartyStr(partyName);

        let curulesCmpHtml = '';
        if (typeof cmp === 'object') {
            const classGain = cmp.curules_adicionales > 0 ? 'gain' : (cmp.curules_adicionales < 0 ? 'loss' : '');
            const signGain = cmp.curules_adicionales > 0 ? '+' : '';
            curulesCmpHtml = `<span class="${classGain}">${signGain}${cmp.curules_adicionales} curules</span> comparado con 2022`;
        } else {
            curulesCmpHtml = `<span>Nuevo Partido (Formación Reciente)</span>`;
        }

        const html = `
            <div class="party-card">
                <div class="pc-header">
                    <div class="pc-color" style="background-color: ${color}"></div>
                    <div class="pc-name">${partyName}</div>
                    <div class="pc-tag">${pData.ideologia}</div>
                </div>
                <div class="pc-body">
                    <div class="pc-stat-row">
                        <span>Curules Totales</span>
                        <span class="pc-stat-val" style="font-size: 1.5rem">${d26.curules}</span>
                    </div>
                    <div class="pc-stat-row" style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.85rem">
                        ${curulesCmpHtml}
                    </div>
                    
                    <div class="pc-stat-row">
                        <span>Cuota de Poder</span>
                        <span class="pc-stat-val">${d26.poder_relativo_curules_pct}%</span>
                    </div>
                    <div class="pc-stat-row">
                        <span>Costo de Curul (Votos)</span>
                        <span class="pc-stat-val">${formatNumber(d26.costo_votos_por_curul)}</span>
                    </div>
                    <div class="pc-stat-row">
                        <span>Eficiencia</span>
                        <span class="pc-stat-val" style="color: ${d26.eficiencia_electoral > 1 ? 'var(--color-cen)' : (d26.eficiencia_electoral === 0 ? 'inherit' : 'var(--color-izq)')}">${d26.eficiencia_electoral}x</span>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// Comprehensive distinct color palette for all parties
const PARTY_COLORS_COMPONENTS = {
    "Pacto Historico": "#FF00FF",
    "Coalicion Pacto Historico": "#FF00FF",
    "Coalicion PH": "#FF00FF",
    "Coalicion PH-Alianza Verde": "#FF00FF",
    "A.V. y PH": "#FF00FF",
    "Pacto H. y A. Verde": "#FF00FF",
    "PH-Alianza Verde": "#FF00FF",
    "PH y MAIS": "#FF00FF",
    "PH y A. Verde": "#FF00FF",
    "PH-MAIS-ED": "#FF00FF",
    "Putumayo Tambien": "#FF00FF",
    "Coalicion PH-MAIS": "#FF00FF",
    "Coalicion PH-MAIS-ED": "#FF00FF",
    "Coalicion Putumayo Tambien": "#FF00FF",

    "Centro Democratico": "#0393F7",
    "CD y MIRA": "#0393F7",
    "CD-LAU": "#0393F7",
    "PC-CD": "#0393F7",
    "CoR-MIRA-AV": "#0393F7",
    "Coalicion CD-MIRA": "#0393F7",
    "Coalicion CD-LAU": "#0393F7",
    "Coalicion PC-CD": "#0393F7",
    "Coalicion CoR-MIRA-AV": "#0393F7",
    "Coalicion PC-PU": "#0393F7",
    "Coalicion NL-ASI-AV": "#0393F7",
    "Coalicion PDC-LF-ADA": "#0393F7",
    "Partido Democrata": "#0393F7",

    "Partido Liberal": "#D32F2F",
    "Coalicion PL-CoR": "#D32F2F",
    "PL y CoR": "#D32F2F",
    "PL-CJL": "#D32F2F",
    "Coalicion PL-CJL": "#D32F2F",

    "Partido Conservador": "#1565C0",
    "Coalicion PC-MSN": "#1565C0",
    "Coalicion CD-PC": "#1565C0",
    "Coalicion PC-CD": "#1565C0",

    "Partido de la U": "#F9A825",
    "LAU-CR": "#F9A825",
    "Coalicion LAU-CR": "#F9A825",

    "Cambio Radical": "#00897B",
    "CR y ALMA": "#00897B",
    "CR-CJL-LIGA": "#00897B",
    "CR-MIRA": "#00897B",
    "Coalicion CR y ALMA": "#00897B",
    "Coalicion CR-CJL-LIGA": "#00897B",
    "Coalicion CR-MIRA": "#00897B",
    "Coalicion CR-LAU-MSN-OXI": "#00897B",
    "Coalicion PC-MSN": "#00897B",

    "A.V.": "#2E7D32",
    "Alianza Verde": "#2E7D32",
    "A.V. y Centro Esperanza": "#00695C",
    "Alianza por Colombia": "#2E7D32",
    "Alternativos AV-PDA": "#2E7D32",
    "AV-EM": "#2E7D32",
    "AV y AICO": "#2E7D32",
    "NL-ASI-AV": "#2E7D32",
    "Coalicion AV-AICO": "#2E7D32",
    "Coalicion AV-EM": "#2E7D32",
    "Coalicion A.V.": "#2E7D32",
    "Coalicion Alianza Verde": "#2E7D32",
    "Coalicion NL-ASI-AV": "#2E7D32",
    "Coalicion Verde Esperanza": "#2E7D32",
    "Coalicion Frente Amplio": "#2E7D32",
    "Coalicion A.V. y PH": "#2E7D32",
    "Coalicion PH-Alianza Verde": "#2E7D32",
    "Coalicion PH y MAIS": "#2E7D32",
    "Coalicion PH-MAIS": "#2E7D32",
    "Coalicion Verde Esperanza": "#2E7D32",
    "Coalicion MAIS-CoR": "#D35F5F",

    "Ahora Colombia": "#9C27B0",
    "Coalicion Ahora Colombia": "#9C27B0",

    "Salvacion Nacional": "#166534",
    "MSN": "#166534",
    "Coalicion PC-MSN": "#166534",
    "Coalicion CR-LAU-MSN-OXI": "#166534",

    "Nos Une Colombia": "#AA4400",
    "Liga Anticorrupcion": "#AA4400",
    "Coalicion Nos Une Colombia": "#AA4400",

    "CJL y MIRA": "#83067B",
    "MIRA": "#83067B",
    "Coalicion CR-CJL-MIRA": "#83067B",
    "Coalicion CR-MIRA": "#83067B",
    "CoR y MIRA": "#83067B",
    "Coalicion CoR-MIRA": "#83067B",

    "Fuerza Ciudadana": "#E65100",
    "Coalicion Fuerza Ciudadana": "#E65100",
    "Movimiento Fuerza Ciudadana": "#E65100",

    "Nuevo Liberalismo": "#FF5722",
    "Coalicion Nuevo Liberalismo": "#FF5722",
    "Partido Nuevo Liberalismo": "#FF5722",

    "Frente Amplio Unitario": "#AD1457",
    "Coalicion Frente Amplio": "#AD1457",
    "Frente Amplio": "#AD1457",

    "Creemos": "#263238",
    "Con Toda Por Colombia": "#4E342E",
    "Partido Oxigeno": "#00BFA5",
    "Patriotas": "#8D6E63",

    "MAIS": "#D35F5F",
    "Coalicion MAIS-CoR": "#D35F5F",
    "Coalicion PH y MAIS": "#D35F5F",
    "Coalicion PH-MAIS": "#D35F5F",
    "Coalicion PH-MAIS-ED": "#D35F5F",

    "AICO": "#78909C",
    "Coalicion AV-AICO": "#78909C",

    "El Naranjo": "#E67E22",
    "La Fuerza": "#E9451E",
    "ASI": "#F9A825",

    "Coalicion PL-CoR": "#D32F2F",
    "Coalicion CoR-MIRA": "#83067B",
    "Coalicion Vamos": "#3498DB",

    "Indigenas Sen": "#607D8B",
    "Indigenas Cam": "#607D8B",
    "Comunes Sen": "#800000",
    "Comunes Cam": "#800000",
    "Comunes": "#800000",
    "CITREP": "#CCCCCC",
    "Poblacion Raizal": "#26A69A",
    "Afrodescendientes": "#795548",
    "Exterior": "#90A4AE",
    "Estatuto Oposicion Sen": "#CCCCCC",
    "Estatuto Oposicion Cam": "#CCCCCC",
    "Estatuto de la Oposicion": "#CCCCCC",
    "Curul Segunda Formula Vicepresidencial": "#CCCCCC",
    "Curul Indigena": "#607D8B",
    "Circunscripcion Indigena": "#607D8B",
    "Circunscripcion Afrodescendiente": "#795548",
    "Circunscripcion Internacional": "#90A4AE",
};


function cleanPartyStr(str) {
    return PARTY_COLORS_COMPONENTS[str] || '#64748b';
}

export function renderAdvancedAnalysis(metrics, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    Object.entries(metrics).forEach(([key, m]) => {
        const trendVal = m.trend ? parseFloat(m.trend) : 0;
        const trendHtml = m.trend ? `
            <div class="adv-trend ${trendVal > 0 ? 'up' : 'down'}">
                <i data-lucide="${trendVal > 0 ? 'trending-up' : 'trending-down'}"></i>
                <span class="trend-num">${Math.abs(trendVal)}</span>
                <span class="trend-text">${m.trendLabel || ''}</span>
            </div>
        ` : '';

        const html = `
            <div class="adv-card">
                <div class="adv-header">
                    <span class="adv-label">${m.label}</span>
                    <div class="metric-status ${m.status}" title="Estado: ${m.status}"></div>
                </div>
                <div class="adv-value-row">
                    <div class="adv-value">${m.val}</div>
                    <div class="adv-interpretation ${m.status}">${m.interpretation}</div>
                </div>
                ${trendHtml}
                <div class="adv-info-badge">
                    <i data-lucide="shield-check" style="width: 12px"></i>
                    ${m.info}
                </div>
                <div class="adv-desc">${m.desc}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
    
    // Re-run lucide for newly added icons
    lucide.createIcons();
}
