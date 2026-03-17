// Helpers for rendering DOM components based on data

export function renderMacroKPIs(data) {
    const comp26 = data.comportamiento_electoral.anuales['2026'].Senado;
    const cmp = data.comportamiento_electoral.comparativo_2026_vs_2022.Senado;

    const kpiContainer = document.getElementById('macro-kpis');
    
    // Format numbers
    const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

    const kpis = [
        {
            label: "TOTAL VOTANTES (El Tamaño de la Democracia)",
            val: formatNumber(comp26.votantes),
            trendVal: `${cmp.variacion_votantes_abs > 0 ? '+' : ''}${formatNumber(cmp.variacion_votantes_abs)} desde 2022`,
            trendClass: cmp.variacion_votantes_abs > 0 ? 'up' : 'down'
        },
        {
            label: "PARTICIPACIÓN EFECTIVA",
            val: `${comp26.participacion_pct}%`,
            trendVal: `${cmp.variacion_participacion_pp > 0 ? '+' : ''}${cmp.variacion_participacion_pp} pp`,
            trendClass: cmp.variacion_participacion_pp > 0 ? 'up' : 'down'
        },
        {
            label: "ABSTENCIÓN (El Gigante Silencioso)",
            val: `${comp26.abstencion_pct}%`,
            trendVal: `${cmp.variacion_participacion_pp > 0 ? '-' : '+'}${Math.abs(cmp.variacion_participacion_pp)} pp`,
            trendClass: cmp.variacion_participacion_pp > 0 ? 'down' : 'up'
        },
        {
            label: "VOTOS NULOS / INVÁLIDOS (Barrera Pedagógica)",
            val: `${comp26.nulos_invalidos_pct}%`,
            trendVal: `${cmp.variacion_nulos_invalidos_pp > 0 ? '+' : ''}${cmp.variacion_nulos_invalidos_pp} pp`,
            trendClass: cmp.variacion_nulos_invalidos_pp < 0 ? 'up' : 'down'
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
    insightBox.innerHTML = `<strong>Insight Político:</strong> Aunque la participación creció sumando más de 2.5 millones de votantes respecto a 2022, la abstención sigue rozando el 50%, recordando que el 'partido' más grande de Colombia sigue siendo la apatía. La notable caída en votos nulos y no marcados (-1.87 pp) refleja una maduración del electorado y una mejor comprensión frente a la complejidad del tarjetón legislativo.`;
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
