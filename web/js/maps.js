// Map Visualization using D3.js
// Renders the maps for Participation, Winning Party, and Ideology

// Normalization maps between Topojson/Geojson department strings and our CSV's names
const normalizeName = (name) => {
    if(!name) return "";
    return name.toUpperCase()
               .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
               .replace("SANTAFE DE BOGOTA D.C", "BOGOTA D.C.")
               .replace("BOGOTA, D.C.", "BOGOTA D.C.")
               .replace("BOGOTA", "BOGOTA D.C.")
               .trim();
};

const findKey = (obj, target) => {
    if (!obj) return null;
    return Object.keys(obj).find(k => 
        k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === target
    );
};

function renderMap(containerId, geoData, colorFn, tooltipFn, deptoData) {
    const container = d3.select(containerId);
    container.selectAll("*").remove(); 

    const bbox = container.node().getBoundingClientRect();
    const width = bbox.width || 800;
    const height = Math.max(bbox.height, 650);

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
    const normalizedTarget = corp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const terrKey = findKey(electionData.territorio[year], normalizedTarget);
    const terrData = terrKey ? electionData.territorio[year][terrKey] : null;

    if (!terrData) return;

    const deptoData = {};
    Object.entries(terrData.detalles_departamentos).forEach(([dptoName, d]) => {
        deptoData[normalizeName(dptoName)] = { name: dptoName, data: { votos: d.votos } };
    });

    const values = Object.values(deptoData).map(d => d.data.votos);
    const maxV = d3.max(values);
    const maxDept = Object.values(deptoData).reduce((prev, current) => (prev.data.votos > current.data.votos) ? prev : current);
    const minDept = Object.values(deptoData).reduce((prev, current) => (prev.data.votos < current.data.votos) ? prev : current);

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
        
        container.innerHTML = `
            <div class="stats-card">
                <h4>Radiografía de Densidad Electoral (${corp})</h4>
                <div class="stat-item">
                    <span class="stat-label">Movilización Nacional</span>
                    <span class="stat-value">${behavior.participacion_pct}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Costo Victoria (Prom.)</span>
                    <span class="stat-value">${new Intl.NumberFormat('es-CO').format(terrData.costo_territorial_promedio_victoria / 1000)}k votos</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Epicentro de Poder</span>
                    <span class="stat-value">${maxDept.name}</span>
                </div>
            </div>
            <div class="analysis-text">
                <p><b>Lo que pocos ven:</b> Con una participación del <b>${behavior.participacion_pct}%</b>, el peso de <b>${maxDept.name}</b> es determinante en la configuración del poder nacional.</p>
                <p><b>El dato experto:</b> El costo de victoria promedia <b>${new Intl.NumberFormat('es-CO').format(terrData.costo_territorial_promedio_victoria)} votos</b>, reflejando la alta competencia urbana.</p>
            </div>`;
    }
}

export function drawPartyMap(electionData, geoData, corp = "Senado") {
    const year = "2026";
    const normalizedTarget = corp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const terrKey = findKey(electionData.territorio[year], normalizedTarget);
    const terrData = terrKey ? electionData.territorio[year][terrKey] : null;

    if (!terrData) return;

    const deptoData = {};
    Object.entries(terrData.detalles_departamentos).forEach(([dptoName, d]) => {
        deptoData[normalizeName(dptoName)] = { name: dptoName, data: { winner: d.ganador, votos: d.votos } };
    });

    const partyColors = {
        'Pacto Histórico': '#f472b6', 'Centro Democrático': '#38bdf8', 'Partido Liberal': '#dc2626',
        'Partido Conservador': '#2563eb', 'Alianza por Colombia': '#22c55e', 'Partido de la U': '#facc15',
        'Cambio Radical': '#0f766e', 'Alianza Verde': '#10b981', 'MIRA': '#4338ca', 'default': '#64748b'
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
        const topWinner = Object.entries(winnerCounts).length > 0 ? Object.entries(winnerCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] : "N/A";

        container.innerHTML = `
            <div class="stats-card">
                <h4>Control de Maquinarias (${corp})</h4>
                <div class="stat-item"><span class="stat-label">Hegemonía Territorial</span><span class="stat-value">${topWinner}</span></div>
            </div>
            <div class="analysis-text">
                <p>Este mapa muestra la fragmentación del control territorial. El <b>${topWinner}</b> muestra una nacionalización del voto destacable.</p>
            </div>`;
    }
}

export function drawIdeologyMap(electionData, geoData, corp = "Senado") {
    const year = "2026";
    const normalizedTarget = corp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const terrKey = findKey(electionData.territorio[year], normalizedTarget);
    const terrData = terrKey ? electionData.territorio[year][terrKey] : null;

    if (!terrData) return;

    const deptoData = {};
    Object.entries(terrData.detalles_departamentos).forEach(([dptoName, d]) => {
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
        const dominantIdeo = Object.entries(ideoCounts).length > 0 ? Object.entries(ideoCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] : "Centro";

        container.innerHTML = `
            <div class="stats-card">
                <h4>Eje Ideológico (${corp})</h4>
                <div class="stat-item"><span class="stat-label">Bloque Dominante</span><span class="stat-value">${dominantIdeo}</span></div>
            </div>
            <div class="analysis-text">
                <p>El mapa revela una fosa geográfica profunda entre el bloque de <b>${dominantIdeo}</b> y sus opositores.</p>
            </div>`;
    }
}

export function drawMaps(electionData, geoData, corp = "Senado") {
    // Initializer for all maps
    drawParticipationMap(electionData, geoData, corp);
    drawPartyMap(electionData, geoData, corp);
    drawIdeologyMap(electionData, geoData, corp);
}
