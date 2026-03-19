// Map Visualization using D3.js
// Renders the maps for Participation, Winning Party, and Ideology

// Normalization maps between Topojson/Geojson department strings and our CSV's names
const normalizeName = (name) => {
    if(!name) return "";
    return name.toUpperCase()
               .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
               .replace("SANTAFE DE BOGOTA D.C", "BOGOTA D.C.")
               .replace("BOGOTA, D.C.", "BOGOTA D.C.")
               .replace("BOGOTA", "BOGOTA D.C.")
               .trim();
};

const normalizeCorp = (corp) => {
    if (!corp) return "";
    return corp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const findKey = (obj, target) => {
    if (!obj) return null;
    return Object.keys(obj).find(k => 
        normalizeCorp(k) === target
    );
};

function renderMap(containerId, geoData, colorFn, tooltipFn, deptoData) {
    const container = d3.select(containerId);
    container.selectAll("*").remove(); 

    const width = container.node().clientWidth || 800;
    const height = 650; // Use a fixed height for stability

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const projection = d3.geoMercator().fitSize([width, height], geoData);
    const path = d3.geoPath().projection(projection);

    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    
    // Helper to get data by feature
    const getDataForFeature = (feature) => {
        let name = feature.properties.NOMBRE_DPT || feature.properties.DPTO || feature.properties.name || "";
        name = normalizeName(name);
        let found = deptoData[name];
        if(!found) {
             if(name.includes('BOGOTA')) found = deptoData["BOGOTA D.C."];
             if(name.includes('VALLE')) found = deptoData["VALLE DEL CAUCA"] || deptoData["VALLE"];
             if(name.includes('NARI')) found = deptoData["NARINO"];
             if(name.includes('BOYACA')) found = deptoData["BOYACA"];
             if(name.includes('QUINDIO')) found = deptoData["QUINDIO"];
             if(name.includes('SAN ANDRES')) found = deptoData["SAN ANDRES"];
        }
        return found;
    };

    svg.append("g")
        .selectAll("path")
        .data(geoData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const gData = getDataForFeature(d);
            if (!gData) return "var(--bg-primary)";
            return colorFn(gData.data);
        })
        .attr("stroke", "var(--bg-primary)")
        .attr("stroke-width", 0.5)
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("stroke", "var(--accent)").attr("stroke-width", 2).raise();
            const gData = getDataForFeature(d);
            if(gData) {
                tooltip.transition().duration(200).style("opacity", .9);
                tooltip.html(tooltipFn(gData.name, gData.data))
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget).attr("stroke", "var(--bg-primary)").attr("stroke-width", 0.5);
            tooltip.transition().duration(500).style("opacity", 0);
        });
}

function getCSScolor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

export function drawParticipationMap(electionData, geoData, corp = "Senado") {
    const year = "2026";
    const normalizedTarget = normalizeCorp(corp);
    const terrKey = findKey(electionData.territorio[year], normalizedTarget);
    const terrData = terrKey ? electionData.territorio[year][terrKey] : null;

    if (!terrData) return;

    const deptoData = {};
    Object.entries(terrData.detalles_departamentos).forEach(([dptoName, d]) => {
        const normalized = dptoName.toUpperCase();
        if (normalized === "CONSULADOS" || normalized === "EXTERIOR") return;
        deptoData[normalizeName(dptoName)] = { name: dptoName, data: { votos: d.votos } };
    });

    const values = Object.values(deptoData).map(d => d.data.votos);
    const maxV = d3.max(values);
    const maxDept = Object.values(deptoData).reduce((prev, current) => (prev.data.votos > current.data.votos) ? prev : current);

    renderMap('#map-participation', geoData, 
        (data) => d3.interpolateLab("#cbd5e1", "#020617")(data.votos / maxV),
        (name, data) => `<strong>${name}</strong><br/>Votantes: ${new Intl.NumberFormat('es-CO').format(data.votos)}`,
        deptoData
    );

    const container = document.getElementById('analysis-participation');
    if (container) {
        const behaviorYear = electionData.comportamiento_electoral.anuales[year];
        const behaviorKey = findKey(behaviorYear, normalizedTarget);
        const behavior = behaviorKey ? behaviorYear[behaviorKey] : { participacion_pct: 'N/A' };
        
        // Calculate Top 7
        const sortedTop7 = Object.values(deptoData)
            .sort((a, b) => b.data.votos - a.data.votos)
            .slice(0, 7);

        let rankingHtml = `<div class="ranking-chart-container" style="margin-top: 20px;">
                            <h5 style="font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 10px;">Top 7 Epicentros Electorales</h5>`;
        sortedTop7.forEach(dept => {
            const percentage = (dept.data.votos / maxV) * 100;
            rankingHtml += `
                <div class="ranking-item">
                    <div class="ranking-header">
                        <span class="ranking-party-name">${dept.name}</span>
                        <span>${new Intl.NumberFormat('es-CO').format(dept.data.votos / 1000)}k</span>
                    </div>
                    <div class="ranking-bar-wrapper">
                        <div class="ranking-bar" style="width: ${percentage}%; background: #475569"></div>
                    </div>
                </div>`;
        });
        rankingHtml += `</div>`;
        
        container.innerHTML = `
            <div class="stats-card">
                <h4>Radiografía de Densidad Electoral (${corp})</h4>
                <div class="stat-item">
                    <span class="stat-label">Movilización Nacional</span>
                    <span class="stat-value">${behavior.participacion_pct}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Epicentro de Poder</span>
                    <span class="stat-value">${maxDept.name}</span>
                </div>
                
                ${rankingHtml}

                <div class="analysis-text" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
                    <p><b>El peso del voto:</b> Con una participación del <b>${behavior.participacion_pct}%</b>, el Top 7 de departamentos concentra la mayoría del volumen electoral nacional.</p>
                </div>
            </div>`;
    }
}

export function drawPartyMap(electionData, geoData, corp = "Senado") {
    const year = "2026";
    const normalizedTarget = normalizeCorp(corp);
    const terrKey = findKey(electionData.territorio[year], normalizedTarget);
    const terrData = terrKey ? electionData.territorio[year][terrKey] : null;

    if (!terrData) return;

    const deptoData = {};
    Object.entries(terrData.detalles_departamentos).forEach(([dptoName, d]) => {
        const normalized = dptoName.toUpperCase();
        if (normalized === "CONSULADOS" || normalized === "EXTERIOR") return;
        deptoData[normalizeName(dptoName)] = { name: dptoName, data: { winner: d.ganador, votos: d.votos } };
    });

    const partyColors = {
        // Pacto Historico variants
        'Pacto Historico': '#9F3A86',
        'PACTO HISTÓRICO': '#9F3A86',
        'MOVIMIENTO POLÍTICO PACTO HISTÓRICO': '#9F3A86',
        'PACTO HISTÓRICO SENADO': '#9F3A86',
        'PACTO HISTÓRICO ALIANZA VERDE': '#9F3A86',
        'PACTO VERDE PUTUMAYO': '#9F3A86',
        'PACTO POR RISARALDA': '#9F3A86',
        'Coalicion Pacto Historico': '#9F3A86',
        // Centro Democratico
        'Centro Democratico': '#0393F7',
        'PARTIDO CENTRO DEMOCRÁTICO': '#0393F7',
        'CENTRO DEMOCRÁTICO - PARTIDO CONSERVADOR': '#0393F7',
        // Partido Liberal
        'Partido Liberal': '#FF0318',
        'PARTIDO LIBERAL COLOMBIANO': '#FF0318',
        // Partido Conservador
        'Partido Conservador': '#0A62AD',
        'PARTIDO CONSERVADOR COLOMBIANO': '#0A62AD',
        // Cambio Radical
        'Cambio Radical': '#E96316',
        'PARTIDO CAMBIO RADICAL': '#E96316',
        'COALICIÓN CAMBIO RADICAL - ALMA': '#E96316',
        'CR y ALMA': '#E96316',
        // Alianza Verde / APC
        'Alianza Verde': '#32CD32',
        'Alianza por Colombia': '#008000',
        'PARTIDO ALIANZA VERDE': '#32CD32',
        'COALICIÓN ALIANZA VERDE Y CENTRO ESPERANZA': '#32CD32',
        'A.V.': '#32CD32',
        // Partido de la U
        'Partido de la U': '#FFA339',
        'PARTIDO DE LA U': '#FFA339',
        // MIRA
        'CJL y MIRA': '#8322A8',
        'MIRA': '#8322A8',
        // Ahora Colombia
        'Ahora Colombia': '#FF00FF',
        // Salvacion Nacional
        'Salvacion Nacional': '#7A9FB7',
        // Mais, AICO
        'MAIS': '#D35F5F',
        'AICO': '#78909C',
        // Fuerza Ciudadana
        'Fuerza Ciudadana': '#5B4B8A',
        // Nuevo Liberalismo
        'Nuevo Liberalismo': '#FFCC0C',
        // LIGA
        'LIGA': '#FED141',
        'Liga de Gobernantes Anticorrupción': '#FED141',
        // Creemos
        'Creemos': '#8F114F',
        // La Fuerza
        'La Fuerza': '#E42520',
        // Others
        'Frente Amplio Unitario': '#32CD32',
        'Frente Amplio': '#32CD32',
        'GENTE EN MOVIMIENTO': '#5B4B8A',
        'LA VOZ DEL AMAZONAS': '#9F3A86',
        'COALICIÓN CAQUETÁ': '#9F3A86',
        'PRIMERO CÓRDOBA': '#0A62AD',
        'default': '#64748b'
    };
    
    const getWinnerCol = (winnerName) => {
        if(!winnerName) return partyColors['default'];
        const normalized = winnerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        for (let key in partyColors) {
            const keyNorm = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (normalized.includes(keyNorm)) return partyColors[key];
        }
        return partyColors['default'];
    };

    renderMap('#map-party', geoData,
        (data) => getWinnerCol(data.winner),
        (name, data) => `<strong>${name}</strong><br/>Ganador: ${data.winner}<br/>Votos: ${new Intl.NumberFormat('es-CO').format(data.votos)}`,
        deptoData
    );

    const container = document.getElementById('analysis-party');
    if (container) {
        const winners = Object.values(deptoData).map(d => d.data.winner);
        const winnerCounts = {};
        winners.forEach(w => { if(w) winnerCounts[w] = (winnerCounts[w] || 0) + 1; });
        
        // Ranking sorting
        const sortedRanking = Object.entries(winnerCounts)
            .sort((a, b) => b[1] - a[1]);
        
        const topWinner = sortedRanking.length > 0 ? sortedRanking[0][0] : "N/A";
        const maxDepts = sortedRanking.length > 0 ? sortedRanking[0][1] : 1;

        let rankingHtml = `<div class="ranking-chart-container">`;
        sortedRanking.forEach(([party, count]) => {
            const percentage = (count / maxDepts) * 100;
            rankingHtml += `
                <div class="ranking-item">
                    <div class="ranking-header">
                        <span class="ranking-party-name">${party}</span>
                        <span>${count} Deptos</span>
                    </div>
                    <div class="ranking-bar-wrapper">
                        <div class="ranking-bar" style="width: ${percentage}%; background: ${getWinnerCol(party)}"></div>
                    </div>
                </div>`;
        });
        rankingHtml += `</div>`;

        container.innerHTML = `
            <div class="stats-card">
                <h4>Ranking Territorial (${corp})</h4>
                <div class="stat-item">
                    <span class="stat-label">Líder Nacional</span>
                    <span class="stat-value">${topWinner}</span>
                </div>
                ${rankingHtml}
                <div class="analysis-text">
                    <p>El <b>${topWinner}</b> consolida su hegemonía con presencia en <b>${maxDepts}</b> departamentos. Este ranking refleja la eficacia de la estructura territorial frente a la opinión nacional.</p>
                </div>
            </div>`;
    }
}

export function drawIdeologyMap(electionData, geoData, corp = "Senado") {
    const year = "2026";
    const normalizedTarget = normalizeCorp(corp);
    const terrKey = findKey(electionData.territorio[year], normalizedTarget);
    const terrData = terrKey ? electionData.territorio[year][terrKey] : null;

    if (!terrData) return;

    const deptoData = {};
    Object.entries(terrData.detalles_departamentos).forEach(([dptoName, d]) => {
        const normalized = dptoName.toUpperCase();
        if (normalized === "CONSULADOS" || normalized === "EXTERIOR") return;
        deptoData[normalizeName(dptoName)] = { name: dptoName, data: { ideo: d.ideologia } };
    });

    const ideologyColorScale = (ideo) => {
        if (!ideo) return '#64748b';
        const normalized = ideo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalized.includes("izq")) return getCSScolor('--color-izq');
        if (normalized.includes("der")) return getCSScolor('--color-der');
        if (normalized.includes("cen")) return getCSScolor('--color-cen');
        return '#64748b';
    };

    renderMap('#map-ideology', geoData,
         (data) => ideologyColorScale(data.ideo),
         (name, data) => `<strong>${name}</strong><br/>Tendencia: <span style="color:${ideologyColorScale(data.ideo)}">${data.ideo}</span>`,
         deptoData
    );

    const container = document.getElementById('analysis-ideology');
    if (container) {
        const ideos = Object.values(deptoData).map(d => d.data.ideo);
        const ideoCounts = {};
        ideos.forEach(i => { if(i) ideoCounts[i] = (ideoCounts[i] || 0) + 1; });
        
        // Ranking sorting
        const sortedRanking = Object.entries(ideoCounts)
            .sort((a, b) => b[1] - a[1]);
        
        const topIdeo = sortedRanking.length > 0 ? sortedRanking[0][0] : "N/A";
        const maxDepts = sortedRanking.length > 0 ? sortedRanking[0][1] : 1;

        let rankingHtml = `<div class="ranking-chart-container">`;
        sortedRanking.forEach(([ideo, count]) => {
            const percentage = (count / maxDepts) * 100;
            rankingHtml += `
                <div class="ranking-item">
                    <div class="ranking-header">
                        <span class="ranking-party-name">${ideo}</span>
                        <span>${count} Deptos</span>
                    </div>
                    <div class="ranking-bar-wrapper">
                        <div class="ranking-bar" style="width: ${percentage}%; background: ${ideologyColorScale(ideo)}"></div>
                    </div>
                </div>`;
        });
        rankingHtml += `</div>`;

        container.innerHTML = `
            <div class="stats-card">
                <h4>Ranking Territorial por Bloques (${corp})</h4>
                <div class="stat-item">
                    <span class="stat-label">Tendencia Predominante</span>
                    <span class="stat-value">${topIdeo}</span>
                </div>
                ${rankingHtml}
                <div class="analysis-text">
                    <p>El mapa revela una configuración territorial liderada por el bloque de <b>${topIdeo}</b>, con presencia en <b>${maxDepts}</b> departamentos. Este equilibrio define la gobernabilidad legislativa regional.</p>
                </div>
            </div>`;
    }
}

export function drawVariationMap(electionData, geoData, corp = "Senado") {
    const year = "2026";
    const normalizedTarget = normalizeCorp(corp);
    const terrKey = findKey(electionData.territorio[year], normalizedTarget);
    const terrData = terrKey ? electionData.territorio[year][terrKey] : null;

    if (!terrData) return;

    const deptoData = {};
    Object.entries(terrData.detalles_departamentos).forEach(([dptoName, d]) => {
        const normalized = dptoName.toUpperCase();
        if (normalized === "CONSULADOS" || normalized === "EXTERIOR") return;
        deptoData[normalizeName(dptoName)] = { name: dptoName, data: { variacion: d.variacion_participacion_pct, votos: d.votos } };
    });

    const values = Object.values(deptoData).map(d => d.data.variacion).filter(v => v !== null && v !== undefined);
    const maxV = d3.max(values) || 1;
    const minV = d3.min(values) || -1;

    const getVariationColor = (variacion) => {
        if (variacion === null || variacion === undefined) return "#64748b";
        if (variacion >= 0) {
            return d3.interpolateLab("#d1fae5", "#10b981")(variacion / maxV);
        } else {
            return d3.interpolateLab("#fee2e2", "#ef4444")(Math.abs(variacion) / Math.abs(minV));
        }
    };

    renderMap('#map-variation', geoData,
        (data) => getVariationColor(data.variacion),
        (name, data) => {
            const v = data.variacion;
            const sign = v > 0 ? '+' : '';
            const color = v > 0 ? '#10b981' : (v < 0 ? '#ef4444' : '#64748b');
            const label = v > 0 ? '↑ Crecimiento' : (v < 0 ? '↓ Decrecimiento' : 'Sin cambio');
            return `<strong>${name}</strong><br/>Variación: <span style="color:${color}">${sign}${v}%</span><br/><small>${label}</small>`;
        },
        deptoData
    );

    const container = document.getElementById('analysis-variation');
    if (container) {
        const sortedGrowth = Object.values(deptoData)
            .filter(d => d.data.variacion !== null && d.data.variacion !== undefined && d.data.variacion > 0)
            .sort((a, b) => b.data.variacion - a.data.variacion)
            .slice(0, 5);

        const sortedDrop = Object.values(deptoData)
            .filter(d => d.data.variacion !== null && d.data.variacion !== undefined && d.data.variacion < 0)
            .sort((a, b) => a.data.variacion - b.data.variacion)
            .slice(0, 5);

        const avgVar = values.length > 0
            ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
            : 'N/A';
        const maxDept = sortedGrowth.length > 0 ? sortedGrowth[0] : null;
        const minDept = sortedDrop.length > 0 ? sortedDrop[0] : null;

        let rankingGrowthHtml = '';
        if (sortedGrowth.length > 0) {
            const maxGrowth = sortedGrowth[0].data.variacion;
            rankingGrowthHtml += `<div class="ranking-chart-container" style="margin-top: 12px;"><h5 style="font-size: 0.7rem; color: #10b981; text-transform: uppercase; margin-bottom: 8px;">↑ Departamentos con Mayor Crecimiento</h5>`;
            sortedGrowth.forEach(dept => {
                const percentage = (dept.data.variacion / maxGrowth) * 100;
                rankingGrowthHtml += `
                    <div class="ranking-item">
                        <div class="ranking-header">
                            <span class="ranking-party-name">${dept.name}</span>
                            <span style="color: #10b981">+${dept.data.variacion}%</span>
                        </div>
                        <div class="ranking-bar-wrapper">
                            <div class="ranking-bar" style="width: ${percentage}%; background: #10b981"></div>
                        </div>
                    </div>`;
            });
            rankingGrowthHtml += `</div>`;
        }

        let rankingDropHtml = '';
        if (sortedDrop.length > 0) {
            const minDrop = sortedDrop[0].data.variacion;
            rankingDropHtml += `<div class="ranking-chart-container" style="margin-top: 12px;"><h5 style="font-size: 0.7rem; color: #ef4444; text-transform: uppercase; margin-bottom: 8px;">↓ Departamentos con Mayor Decrecimiento</h5>`;
            sortedDrop.forEach(dept => {
                const percentage = (Math.abs(dept.data.variacion) / Math.abs(minDrop)) * 100;
                rankingDropHtml += `
                    <div class="ranking-item">
                        <div class="ranking-header">
                            <span class="ranking-party-name">${dept.name}</span>
                            <span style="color: #ef4444">${dept.data.variacion}%</span>
                        </div>
                        <div class="ranking-bar-wrapper">
                            <div class="ranking-bar" style="width: ${percentage}%; background: #ef4444"></div>
                        </div>
                    </div>`;
            });
            rankingDropHtml += `</div>`;
        }

        container.innerHTML = `
            <div class="stats-card">
                <h4>Dinámica de la Movilización (${corp})</h4>
                <div class="stat-item">
                    <span class="stat-label">Variación Promedio</span>
                    <span class="stat-value" style="color: ${avgVar > 0 ? '#10b981' : '#ef4444'}">${avgVar > 0 ? '+' : ''}${avgVar}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mayor Crecimiento</span>
                    <span class="stat-value" style="color: #10b981">${maxDept ? maxDept.name + ' (+' + maxDept.data.variacion + '%)' : 'N/A'}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Mayor Decrecimiento</span>
                    <span class="stat-value" style="color: #ef4444">${minDept ? minDept.name + ' (' + minDept.data.variacion + '%)' : 'N/A'}</span>
                </div>
                ${rankingGrowthHtml}
                ${rankingDropHtml}
                <div class="analysis-text" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
                    <p>La <b>variación porcentual</b> mide el cambio en la cantidad de votos entre 2022 y 2026 por departamento. El verde oscuro indica regiones con mayor activación electoral, mientras que el rojo oscuro señala zonas donde la participación se contrajo significativamente.</p>
                </div>
            </div>`;
    }
}

export function drawMaps(electionData, geoData, corp = "Senado") {
    drawParticipationMap(electionData, geoData, corp);
    drawVariationMap(electionData, geoData, corp);
    drawPartyMap(electionData, geoData, corp);
    drawIdeologyMap(electionData, geoData, corp);
}
