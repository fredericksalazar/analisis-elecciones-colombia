// Helpers for rendering DOM components based on data

export function renderMacroKPIs(data) {
    const comp26 = data.comportamiento_electoral.anuales['2026'].Senado;
    const cmp = data.comportamiento_electoral.comparativo_2026_vs_2022.Senado;

    const kpiContainer = document.getElementById('macro-kpis');
    
    // Format numbers
    const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

    const kpis = [
        {
            label: "Total Votantes (2026)",
            val: formatNumber(comp26.votantes),
            trendVal: `${cmp.variacion_votantes_abs > 0 ? '+' : ''}${formatNumber(cmp.variacion_votantes_abs)} desde 2022`,
            trendClass: cmp.variacion_votantes_abs > 0 ? 'up' : 'down'
        },
        {
            label: "Participación",
            val: `${comp26.participacion_pct}%`,
            trendVal: `${cmp.variacion_participacion_pp > 0 ? '+' : ''}${cmp.variacion_participacion_pp} pp`,
            trendClass: cmp.variacion_participacion_pp > 0 ? 'up' : 'down'
        },
        {
            label: "Abstención",
            val: `${comp26.abstencion_pct}%`,
            trendVal: `${cmp.variacion_participacion_pp > 0 ? '-' : '+'}${Math.abs(cmp.variacion_participacion_pp)} pp`,
            trendClass: cmp.variacion_participacion_pp > 0 ? 'down' : 'up' // Less abstention is good (blue/green usually, but here up means more)
        },
        {
            label: "Votos Nulos/Inválidos",
            val: `${comp26.nulos_invalidos_pct}%`,
            trendVal: `${cmp.variacion_nulos_invalidos_pp > 0 ? '+' : ''}${cmp.variacion_nulos_invalidos_pp} pp`,
            trendClass: cmp.variacion_nulos_invalidos_pp < 0 ? 'up' : 'down' // Reduction is good
        }
    ];

    kpis.forEach(k => {
        kpiContainer.insertAdjacentHTML('beforeend', `
            <div class="kpi-card">
                <div class="kpi-label">${k.label}</div>
                <div class="kpi-value">${k.val}</div>
                <div class="kpi-trend ${k.trendClass}">${k.trendVal}</div>
            </div>
        `);
    });

    // Write narrative
    const insightBox = document.querySelector('.insight-macro');
    let dirParticipation = cmp.variacion_participacion_pp > 0 ? "aumento" : "caída";
    insightBox.innerHTML = `<strong>Insight:</strong> En las elecciones de 2026 observamos un(a) ${dirParticipation} en la participación cívica, sumando <strong>${formatNumber(cmp.variacion_votantes_abs)}</strong> votantes respecto a 2022. Sorpresivamente, los errores de votación (nulos e inválidos) bajaron, lo cual indica un electorado más informado y un proceso electoral depurado.`;
}

export function renderPartyCards(partyData, containerId) {
    const container = document.querySelector(containerId);
    container.innerHTML = ''; // Clear

    // Filter out parties that don't have 2026 data and sort by 2026 curules
    const partiesList = Object.entries(partyData)
        .filter(([_, data]) => data['2026'] !== null)
        .sort((a, b) => b[1]['2026'].curules - a[1]['2026'].curules);

    const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

    partiesList.forEach(([partyName, pData]) => {
        const d26 = pData['2026'];
        const cmp = pData.comparativo;
        const color = pData['2026'].color || getComputedStyle(document.documentElement).getPropertyValue(`--party-${cleanPartyStr(partyName)}`).trim() || '#64748b'; // default gray

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

function cleanPartyStr(str) {
    // Quick mapper for css variables
    if(str.includes("Histórico")) return "ph";
    if(str.includes("Conservador")) return "pc";
    if(str.includes("Liberal")) return "pl";
    if(str.includes("Centro Democrático")) return "cd";
    if(str.includes("Cambio")) return "cr";
    if(str.includes("U")) return "u";
    if(str.includes("Verde")) return "av";
    return "default";
}
