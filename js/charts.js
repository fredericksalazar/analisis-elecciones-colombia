// Register Global Bar Labels Plugin
Chart.register({
    id: 'customBarLabels',
    afterDatasetsDraw(chart) {
        if (chart.config.type !== 'bar') return;
        // Only for votes charts
        if (chart.canvas && !chart.canvas.id.includes('votes')) return;

        const { ctx, data } = chart;
        const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';
        
        ctx.save();
        ctx.font = '600 12px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textSecondary;

        chart.getDatasetMeta(0).data.forEach((bar, index) => {
            const val = data.datasets[0].data[index];
            const value = new Intl.NumberFormat('es-CO').format(val);
            ctx.fillText(value, bar.x + 10, bar.y);
        });
        ctx.restore();
    }
});

// Visualization Logic for Charts and Hemiciclos

// Function to generate the coordinates for a semicircular seating arrangement
// All coordinates are normalized: the outermost row has radius = 1.0
// So the caller can scale them to any pixel size needed.
function generateHemicicloPoints(totalSeats, radiusNum = 4) {
    const points = [];
    // Normalized radii: innermost row ~0.45, outermost = 1.0
    const minR = 0.45;
    const maxR = 1.0;
    
    // Distribute seats among rows proportionally to arc length
    let seatsPerRow = [];
    let totalLength = 0;
    for (let i = 0; i < radiusNum; i++) {
        const r = minR + (maxR - minR) * (i / (radiusNum - 1));
        const arcLen = Math.PI * r;
        seatsPerRow.push(arcLen);
        totalLength += arcLen;
    }
    
    let actualSeats = seatsPerRow.map(val => Math.round((val / totalLength) * totalSeats));
    
    // Fix rounding errors
    let sum = actualSeats.reduce((a, b) => a + b, 0);
    while (sum < totalSeats) { actualSeats[actualSeats.length - 1]++; sum++; }
    while (sum > totalSeats) { actualSeats[actualSeats.length - 1]--; sum--; }

    for (let rIdx = 0; rIdx < radiusNum; rIdx++) {
        const r = minR + (maxR - minR) * (rIdx / (radiusNum - 1));
        const numSeats = actualSeats[rIdx];
        
        for (let i = 0; i < numSeats; i++) {
            const angle = Math.PI - (Math.PI / (numSeats + 1)) * (i + 1);
            const x = r * Math.cos(angle);
            const y = -r * Math.sin(angle);
            points.push({ x, y, r, angle });
        }
    }
    
    points.sort((a, b) => b.angle - a.angle);
    return points;
}

export function drawHemiciclo(corpData, containerSelector, corpName) {
    const container = d3.select(containerSelector);
    container.selectAll("*").remove();

    // Build seats array
    let seats = [];
    let parties = Object.entries(corpData).filter(([_, data]) => data['2026'] !== null && (data['2026'].votos || 0) >= 0);
    
    const orderIdeo = { "Izquierda": 1, "Centro": 2, "Derecha": 3 };
    parties.sort((a, b) => {
        let diff = orderIdeo[a[1].ideologia] - orderIdeo[b[1].ideologia];
        if (diff !== 0) return diff;
        return b[1]['2026'].curules - a[1]['2026'].curules;
    });

    parties.forEach(([pName, pData]) => {
        const curules = pData['2026'].curules;
        const color = pData.color || getPartyColor(pName, pData.ideologia);
        for (let i = 0; i < curules; i++) {
            seats.push({ party: pName, ideology: pData.ideologia, color: color });
        }
    });

    const totalSeats = seats.length;
    if (totalSeats === 0) return;

    // ============================================================
    // DYNAMIC SIZING: Measure the actual container width in pixels
    // and calculate everything from that.
    // ============================================================
    const containerNode = container.node();
    let containerWidth = containerNode.getBoundingClientRect().width;
    // Fallback: if container is hidden (display:none), width is 0.
    // Walk up the DOM to find a visible ancestor, or use a generous default.
    if (containerWidth <= 0) {
        let parent = containerNode.parentElement;
        while (parent && parent.getBoundingClientRect().width <= 0) {
            parent = parent.parentElement;
        }
        containerWidth = parent ? parent.getBoundingClientRect().width - 80 : 1200;
    }
    
    // The semicircle spans from -maxR to +maxR horizontally (normalized: -1 to +1).
    // We want the outermost arc to nearly touch the container edges.
    const padding = 40; // px left+right breathing room
    const scale = (containerWidth - padding * 2) / 2 * 1.3; // 1.3x scale factor gives more room for dot spacing
    
    // SVG height: the semicircle goes from y=0 (bottom) up to y=-maxR (top)
    // In our normalized coords, the max height is maxR = 1.0
    const svgHeight = scale * 1.1 + 80; // extra space for label below
    const svgWidth = containerWidth;

    const svg = container.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .style("display", "block")
        .style("margin", "0 auto");

    // Center group: origin at center-bottom of the SVG
    const g = svg.append("g")
        .attr("transform", `translate(${svgWidth / 2}, ${svgHeight - 60})`);

    const numRows = 5; // Both Cámara and Senado use 5 rows for identical visual style
    const points = generateHemicicloPoints(totalSeats, numRows);

    const rowGapNorm = (1.0 - 0.45) / (numRows - 1); // normalized radial gap
    const rowGapPx = rowGapNorm * scale;

    // Calculate dot radius to PREVENT overlap.
    // We use a reference seat count (160 = near Camara's max) so both
    // charts get appropriately sized dots for the densest case.
    const referenceSeats = 160;
    const innerR = 0.45;
    const totalArcNorm = [0, 1, 2, 3].slice(0, numRows).reduce((sum, i) => {
        return sum + Math.PI * (0.45 + (0.55 / (numRows - 1)) * i);
    }, 0);
    const innerSeatsRef = Math.round((Math.PI * innerR / totalArcNorm) * referenceSeats);
    const arcSpacingPxRef = (Math.PI * innerR * scale) / (innerSeatsRef + 1);
    
    // Dot radius = 50% of whichever spacing is tighter
    const maxDotR = Math.min(rowGapPx, arcSpacingPxRef) * 0.50;
    const dotR = Math.max(maxDotR, 4);

    // Tooltip setup
    let tooltip = d3.select("body").select(".d3-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
    }

    const hoverR = dotR * 1.15;

    // Draw seats
    g.selectAll(".seat")
        .data(seats)
        .enter()
        .append("circle")
        .attr("class", "seat")
        .attr("cx", (d, i) => points[i].x * scale)
        .attr("cy", (d, i) => points[i].y * scale)
        .attr("r", dotR)
        .attr("fill", d => d.color)
        .on("mouseover", function(event, d) {
            d3.select(this).transition().duration(150)
                .attr("r", hoverR)
                .attr("stroke", "var(--text-primary)")
                .attr("stroke-width", 4);
            tooltip.transition().duration(200).style("opacity", .9);
            const tooltipContent = d.party === d.ideology 
                ? `<strong>${d.party}</strong>`
                : `<strong>${d.party}</strong><br/><span style="font-weight:normal; font-size:0.8em">${d.ideology}</span>`;
            tooltip.html(tooltipContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 45) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).transition().duration(150)
                .attr("r", dotR)
                .attr("stroke", "none");
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Total label at center-bottom
    g.append("text")
        .attr("x", 0)
        .attr("y", 25)
        .attr("text-anchor", "middle")
        .style("font-family", "var(--font-display)")
        .style("font-size", "28px")
        .style("font-weight", "700")
        .style("fill", "var(--text-primary)")
        .text(totalSeats);
        
    g.append("text")
        .attr("x", 0)
        .attr("y", 48)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "var(--text-secondary)")
        .text("Curules");
}


// Comprehensive distinct color palette for all parties
const PARTY_COLORS = {
    // MAGENTA/PINK FAMILY - Pacto Historico and variants
    "PactoHistorico": "#FF00FF",
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
    "PHVerde": "#FF00FF",
    "PHMAIS": "#FF00FF",
    "PHRisaralda": "#FF00FF",
    "PHAVerde": "#FF00FF",
    "PVTMG": "#FF00FF",
    "FernandoRios": "#FF00FF",
    "RunnerUp": "#FF00FF",
    "VozAmazonas": "#FF00FF",
    "Putumayo": "#FF00FF",

    // BLUE FAMILY - Centro Democratico and coalitions
    "CentroDemocratico": "#0393F7",
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
    "Coalicion Partido Democrata Colombiano": "#0393F7",
    "CDMIRA": "#0393F7",
    "CoRMIRA": "#0393F7",
    "CDPC": "#0393F7",
    "CDPU": "#0393F7",
    "CDAPDC": "#0393F7",
    "CoR": "#0393F7",
    "CD": "#0393F7",

    // RED FAMILY - Partido Liberal and coalitions
    "PartidoLiberal": "#D32F2F",
    "Partido Liberal": "#D32F2F",
    "Coalicion PL-CoR": "#D32F2F",
    "PL y CoR": "#D32F2F",
    "PL-CJL": "#D32F2F",
    "Coalicion PL-CJL": "#D32F2F",
    "PLCCJL": "#D32F2F",
    "LiberalColombiaReborn": "#D32F2F",
    "PL": "#D32F2F",

    // ROYAL BLUE - Partido Conservador
    "PartidoConservador": "#1565C0",
    "Partido Conservador": "#1565C0",
    "Coalicion PC-MSN": "#1565C0",
    "Coalicion CD-PC": "#1565C0",
    "Coalicion PC-CD": "#1565C0",
    "PCMSN": "#1565C0",
    "PC": "#1565C0",
    "CRCJLLIGA": "#1565C0",
    "CRCJLMIRA": "#1565C0",

    // GOLD/AMBER - Partido de la U
    "PartidodelaU": "#F9A825",
    "Partido de la U": "#F9A825",
    "LAU-CR": "#F9A825",
    "Coalicion LAU-CR": "#F9A825",
    "PUCR": "#F9A825",
    "U": "#F9A825",
    "PU": "#F9A825",

    // TEAL/GREEN - Cambio Radical and allies
    "CambioRadical": "#00897B",
    "Cambio Radical": "#00897B",
    "CR y ALMA": "#00897B",
    "CR-CJL-LIGA": "#00897B",
    "CR-MIRA": "#00897B",
    "Coalicion CR y ALMA": "#00897B",
    "Coalicion CR-CJL-LIGA": "#00897B",
    "Coalicion CR-MIRA": "#00897B",
    "Coalicion CR-LAU-MSN-OXI": "#00897B",
    "CRyALMA": "#00897B",
    "CRPUGMSN": "#00897B",
    "CRMV": "#00897B",
    "CR": "#00897B",

    // DARK GREEN - Alianza Verde and allies
    "A.V.": "#2E7D32",
    "GreenAlliance": "#2E7D32",
    "Alianza Verde": "#2E7D32",
    "A.V. y Centro Esperanza": "#00695C",
    "AlianzaporColombia": "#2E7D32",
    "AVCentroEsperanza": "#2E7D32",
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
    "AVEnMarcha": "#2E7D32",
    "AVAICO": "#2E7D32",
    "NLASI": "#2E7D32",
    "A.V": "#2E7D32",
    "AV": "#2E7D32",
    "Alianza por Colombia": "#2E7D32",
    "ConTodoporColombia": "#2E7D32",

    // PURPLE - Ahora Colombia
    "AhoraColombia": "#9C27B0",
    "Ahora Colombia": "#9C27B0",
    "Coalicion Ahora Colombia": "#9C27B0",
    "Ahora": "#9C27B0",

    // DARK GREEN-BLUE - Salvacion Nacional
    "SalvacionNacional": "#166534",
    "Salvacion Nacional": "#166534",
    "MSN": "#166534",
    "Coalicion PC-MSN": "#166534",
    "Coalicion CR-LAU-MSN-OXI": "#166534",

    // ORANGE - Nos Une Colombia / Liga
    "NosUneColombia": "#AA4400",
    "Nos Une Colombia": "#AA4400",
    "LIGA": "#AA4400",
    "Liga Anticorrupcion": "#AA4400",
    "Coalicion Nos Une Colombia": "#AA4400",
    "LigaAnticorrupcion": "#AA4400",

    // PURPLE-BLUE - MIRA / CJL
    "CJL y MIRA": "#83067B",
    "MIRA": "#83067B",
    "Coalicion CR-CJL-MIRA": "#83067B",
    "Coalicion CR-MIRA": "#83067B",
    "CoR y MIRA": "#83067B",
    "Coalicion CoR-MIRA": "#83067B",
    "CJLMIRA": "#83067B",
    "MIRACJL": "#83067B",
    "CRMIRA": "#83067B",
    "UnionPUCJL": "#83067B",
    "CJL": "#83067B",
    "MIRA-CJL": "#83067B",
    "CJL-MIRA": "#83067B",
    "ColombiaRenaciente": "#83067B",
    "CCE": "#83067B",
    "CC E": "#83067B",
    "CentroEsperanza": "#83067B",

    // ORANGE-RED - Fuerza Ciudadana
    "FuerzaCiudadana": "#E65100",
    "Fuerza Ciudadana": "#E65100",
    "Coalicion Fuerza Ciudadana": "#E65100",
    "Movimiento Fuerza Ciudadana": "#E65100",
    "CoalicionFuerzaCiudadana": "#E65100",
    "FC": "#E65100",
    "FuerzaCauca": "#E65100",

    // DEEP ORANGE - Nuevo Liberalismo
    "NuevoLiberalismo": "#FF5722",
    "Nuevo Liberalismo": "#FF5722",
    "Coalicion Nuevo Liberalismo": "#FF5722",
    "Partido Nuevo Liberalismo": "#FF5722",
    "NL": "#FF5722",

    // DARK PINK - Frente Amplio Unitario
    "FrenteAmplio": "#AD1457",
    "FrenteAmplioUnitario": "#AD1457",
    "Frente Amplio Unitario": "#AD1457",
    "Coalicion Frente Amplio": "#AD1457",
    "Frente Amplio": "#AD1457",
    "FAU": "#AD1457",

    // DARK GRAY - Creemos
    "Creemos": "#263238",

    // BROWN - Con Toda Por Colombia
    "ConTodoporColombia": "#4E342E",
    "Con Toda Por Colombia": "#4E342E",

    // TEAL - Partido Oxigeno
    "PartidoOxigeno": "#00BFA5",
    "Partido Oxigeno": "#00BFA5",
    "Oxigeno": "#00BFA5",
    "Oxi": "#00BFA5",

    // BROWN-GRAY - Patriotas
    "Patriotas": "#8D6E63",
    "Patri": "#8D6E63",

    // RED-PINK - MAIS
    "MAIS": "#D35F5F",
    "Coalicion MAIS-CoR": "#D35F5F",
    "Coalicion PH y MAIS": "#D35F5F",
    "Coalicion PH-MAIS": "#D35F5F",
    "Coalicion PH-MAIS-ED": "#D35F5F",
    "Coalicion MAIS-CoR": "#D35F5F",

    // GRAY-BLUE - AICO
    "AICO": "#78909C",
    "Coalicion MAIS-CoR": "#D35F5F",
    "Coalicion AV-AICO": "#78909C",
    "Coalicion A.V. y AICO": "#78909C",

    // ORANGE - El Naranjo
    "El Naranjo": "#E67E22",

    // RED-ORANGE - La Fuerza
    "LaFuerza": "#E9451E",
    "La Fuerza": "#E9451E",
    "LF": "#E9451E",

    // YELLOW - ASI
    "ASI": "#F9A825",
    "AS": "#F9A825",

    // COALITION VARIANTS
    "Coalicion PL-CoR": "#D32F2F",
    "Coalicion CoR-MIRA": "#83067B",
    "Coalicion Vamos": "#3498DB",
    "PCCU": "#1565C0",
    "PCCD": "#0393F7",
    "GenteenMovimiento": "#00897B",
    "JuntosporCaldas": "#00897B",
    "Alternativos": "#2E7D32",
    "AltAVPDA": "#2E7D32",
    "AVPDA": "#2E7D32",
    "EstamosListas": "#D32F2F",
    "GenteNueva": "#1565C0",
    "MovimientoNacionalSOS": "#78909C",
    "Salvacion": "#166534",
    "Movimiento Nacional SOS": "#78909C",

    // SPECIAL SEATS (gray tones)
    "Indigenas Sen": "#607D8B",
    "IndigenasCam": "#607D8B",
    "IndigenasSen": "#607D8B",
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
    "EstatutoOposicion": "#CCCCCC",
    "Estatuto de la Oposicion": "#CCCCCC",
    "Curul Segunda Formula Vicepresidencial": "#CCCCCC",
    "Curul Indigena": "#607D8B",
    "Circunscripcion Indigena": "#607D8B",
    "Circunscripcion Afrodescendiente": "#795548",
    "Circunscripcion Internacional": "#90A4AE",
    "PoblacionRaizal": "#26A69A",
    "PVTMG": "#795548",
    "FernandoRios": "#795548",
    "RunnerUp": "#CCCCCC",
    "PartidoDemocratico": "#0393F7",
};


// Function to map ideology strings to Chart.js global CSS variables
function getIdeologyColorRaw(ideo) {
    const style = getComputedStyle(document.documentElement);
    if(ideo === 'Izquierda') return style.getPropertyValue('--color-izq').trim();
    if(ideo === 'Derecha') return style.getPropertyValue('--color-der').trim();
    if(ideo === 'Centro') return style.getPropertyValue('--color-cen').trim();
    return '#94a3b8';
}

function getPartyColor(name, ideology) {
    if(!name) return '#94a3b8';
    const key = name.trim();
    if(PARTY_COLORS[key]) return PARTY_COLORS[key];
    // Try normalized key (no spaces)
    const normalized = key.replace(/\s+/g, '');
    if(PARTY_COLORS[normalized]) return PARTY_COLORS[normalized];
    return getIdeologyColorRaw(ideology);
}




// Draw ChartJS Donuts for Ideology representation
let chart22 = null;
let chart26 = null;

// Horizontal bar charts for votes by party
let senadoVotesChart = null;
let camaraVotesChart = null;

export function drawIdeologyCharts(ideoData) {
    // ideoData contains { Izquierda: {2022, 2026}, Derecha: {..}, Centro: {..} }
    
    const labels = ["Izquierda", "Centro", "Derecha"];
    const colors = labels.map(l => getIdeologyColorRaw(l));
    
    const data22 = labels.map(l => ideoData[l]?.['2022']?.curules || 0);
    const data26 = labels.map(l => ideoData[l]?.['2026']?.curules || 0);

    // Chart configs
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { 
                    color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
                    font: { family: 'Inter', size: 12 }
                } 
            },
        },
        cutout: '65%',
        borderWidth: 0
    };

    if(chart22) chart22.destroy();
    const canvas22 = document.getElementById('ideo-2022-chart');
    if (canvas22) {
        const ctx22 = canvas22.getContext('2d');
        chart22 = new Chart(ctx22, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: data22, backgroundColor: colors }] },
            options: { 
                ...commonOptions, 
                plugins: { 
                    ...commonOptions.plugins, 
                    title: {
                        display: true, 
                        text: 'Distribución 2022', 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(), 
                        font: {family: 'Inter', size: 18, weight: '700'}
                    } 
                } 
            }
        });
    }

    if(chart26) chart26.destroy();
    const canvas26 = document.getElementById('ideo-2026-chart');
    if (canvas26) {
        const ctx26 = canvas26.getContext('2d');
        chart26 = new Chart(ctx26, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: data26, backgroundColor: colors }] },
            options: { 
                ...commonOptions, 
                plugins: { 
                    ...commonOptions.plugins, 
                    title: {
                        display: true, 
                        text: 'Distribución 2026', 
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(), 
                        font: {family: 'Inter', size: 18, weight: '700'}
                    } 
                } 
            }
        });
    }

    // Write narrative
    const targetEl = document.querySelector('.insight-ideology');
    
    // Determine winner/loser
    const izqVar = ideoData['Izquierda'].comparativo.variacion_poder_curules_pp;
    const derVar = ideoData['Derecha'].comparativo.variacion_poder_curules_pp;
    const cenVar = ideoData['Centro'].comparativo.variacion_poder_curules_pp;
    
    targetEl.innerHTML = `<strong>Insight Ideológico:</strong> El balance de poderes en el Senado muestra que la <strong>Derecha</strong> mantiene su posición como bloque mayoritario (42%), mientras que la <strong>Izquierda</strong> ganó terreno (${izqVar > 0 ? '+' : ''}${izqVar} pp) a expensas de las fuerzas de <strong>Centro</strong> (${cenVar > 0 ? '+' : ''}${cenVar} pp).`;
}

// Draw horizontal bar charts for votes by party (optimized: top 20 + Otros)
export function drawVotesBarCharts(electionData) {
    const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);
    const TOP_N = 20;

    const createBarChart = (corpName, corpData, canvasId) => {
        const parties = Object.entries(corpData)
            .filter(([_, data]) => data['2026'] !== null && (data['2026'].votos || 0) > 0)
            .sort((a, b) => b[1]['2026'].votos - a[1]['2026'].votos);

        if (parties.length === 0) return null;

        const topParties = parties.slice(0, TOP_N);
        const restParties = parties.slice(TOP_N);

        const labels = topParties.map(([name]) => name);
        const votes = topParties.map(([_, data]) => data['2026'].votos);
        const colors = topParties.map(([name, data]) => data.color || getPartyColor(name, data.ideologia));

        if (restParties.length > 0) {
            const otrosVotes = restParties.reduce((sum, [_, data]) => sum + (data['2026']?.votos || 0), 0);
            const otrosCurules = restParties.reduce((sum, [_, data]) => sum + (data['2026']?.curules || 0), 0);
            labels.push(`Otros (${restParties.length} fuerzas)`);
            votes.push(otrosVotes);
            colors.push('#94a3b8');
        }

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
        const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

        const ctx = document.getElementById(canvasId).getContext('2d');

        const totalVotes = votes.reduce((a, b) => a + b, 0);
        const otrosIdx = labels.length - 1;

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votos 2026',
                    data: votes,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: (items) => {
                                const idx = items[0].dataIndex;
                                const pct = ((votes[idx] / totalVotes) * 100).toFixed(1);
                                return `${items[0].label} (${pct}%)`;
                            },
                            label: (context) => {
                                return `${formatNumber(context.raw)} votos`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grace: '10%',
                        ticks: {
                            color: textSecondary,
                            callback: (value) => formatNumber(value)
                        },
                        grid: { color: 'rgba(128, 128, 128, 0.1)' }
                    },
                    y: {
                        ticks: {
                            color: textSecondary,
                            font: { family: 'Inter', size: 11 },
                            crossAlign: 'far'
                        },
                        grid: { display: false }
                    }
                }
            }
        });

        return chart;
    };

    if (senadoVotesChart) senadoVotesChart.destroy();
    if (camaraVotesChart) camaraVotesChart.destroy();

    senadoVotesChart = createBarChart('Senado', electionData.partidos.Senado, 'senado-votes-chart');
    camaraVotesChart = createBarChart('Cámara', electionData.partidos.Camara, 'camara-votes-chart');
}

// Global variables for variation charts
let senadoVariationChart = null;
let camaraVariationChart = null;

// Draw horizontal bar charts for vote variation (%) — optimized top N
export function drawVotesVariationCharts(electionData) {
    const formatPercent = (num) => (num > 0 ? '+' : '') + num.toFixed(2) + '%';
    const TOP_N = 25;

    const createVariationChart = (corpName, corpData, canvasId) => {
        const parties = Object.entries(corpData)
            .filter(([_, data]) => data && data.comparativo && typeof data.comparativo.variacion_votos_pct === 'number' && (data['2026']?.votos || 0) > 0)
            .sort((a, b) => b[1].comparativo.variacion_votos_pct - a[1].comparativo.variacion_votos_pct);

        if (parties.length === 0) return null;

        const topParties = parties.slice(0, TOP_N);

        const labels = topParties.map(([name]) => name);
        const variations = topParties.map(([_, data]) => data.comparativo.variacion_votos_pct);

        const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();

        const ctx = document.getElementById(canvasId).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Variación %',
                    data: variations,
                    backgroundColor: variations.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)'),
                    borderColor: variations.map(v => v >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'),
                    borderWidth: 0
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Variación: ${formatPercent(context.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textSecondary,
                            callback: (value) => value + '%'
                        },
                        grid: { color: 'rgba(128, 128, 128, 0.1)' }
                    },
                    y: {
                        ticks: { color: textSecondary, font: { family: 'Inter', size: 11 } },
                        grid: { display: false }
                    }
                }
            }
        });
        return chart;
    };

    if (senadoVariationChart) senadoVariationChart.destroy();
    if (camaraVariationChart) camaraVariationChart.destroy();

    senadoVariationChart = createVariationChart('Senado', electionData.partidos.Senado, 'senado-variation-chart');
    camaraVariationChart = createVariationChart('Cámara', electionData.partidos.Camara, 'camara-variation-chart');
}

// Global listener for theme toggles to update Chart.js colors
window.addEventListener('themeChanged', () => {
    // If we have live charts, we need to update their text colors
    const color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
    const legendColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();

    if(chart22) {
        chart22.options.plugins.title.color = color;
        chart22.options.plugins.legend.labels.color = legendColor;
        chart22.update();
    }
    if(chart26) {
        chart26.options.plugins.title.color = color;
        chart26.options.plugins.legend.labels.color = legendColor;
        chart26.update();
    }
    if(senadoVotesChart) {
        senadoVotesChart.options.scales.x.ticks.color = legendColor;
        senadoVotesChart.options.scales.y.ticks.color = legendColor;
        senadoVotesChart.update();
    }
    if(camaraVotesChart) {
        camaraVotesChart.options.scales.x.ticks.color = legendColor;
        camaraVotesChart.options.scales.y.ticks.color = legendColor;
        camaraVotesChart.update();
    }
    if(senadoVariationChart) {
        senadoVariationChart.options.scales.x.ticks.color = legendColor;
        senadoVariationChart.options.scales.y.ticks.color = legendColor;
        senadoVariationChart.update();
    }
    if(camaraVariationChart) {
        camaraVariationChart.options.scales.x.ticks.color = legendColor;
        camaraVariationChart.options.scales.y.ticks.color = legendColor;
        camaraVariationChart.update();
    }
});

// Render the 2026 vs 2022 composition table
export function renderCongressTable(corpData, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let parties = Object.entries(corpData).filter(([pName, pData]) => {
        return (pData['2026'] !== null && (pData['2026'].votos || 0) > 0 && pData['2026'].curules > 0) || (pData['2022'] !== null && pData['2022'].curules > 0);
    });

    // Sort by 2026 curules descending
    parties.sort((a, b) => {
        const cA = a[1]['2026'] ? a[1]['2026'].curules : 0;
        const cB = b[1]['2026'] ? b[1]['2026'].curules : 0;
        return cB - cA;
    });

    let html = `
    <table class="congress-comp-table">
        <thead>
            <tr>
                <th></th>
                <th>Curules<br>2022</th>
                <th>Curules<br>2026</th>
                <th>Diferencia</th>
            </tr>
        </thead>
        <tbody>
    `;

    parties.forEach(([pName, pData]) => {
        const c2026 = pData['2026'] ? pData['2026'].curules : 0;
        const c2022 = pData['2022'] ? pData['2022'].curules : 0;
        
        const diff = c2026 - c2022;
        
        let diffHtml = '<span style="color: var(--text-secondary)">=</span>';
        if (diff > 0) {
            diffHtml = `<span class="diff-indicator diff-up">+${diff}</span>`;
        } else if (diff < 0) {
            diffHtml = `<span class="diff-indicator diff-down">${diff}</span>`;
        }
        
        const color = pData.color || getPartyColor(pName, pData.ideologia);
        
        html += `
            <tr>
                <td>
                    <span class="party-dot" style="background-color: ${color};"></span>
                    ${pName}
                </td>
                <td>${c2022 > 0 ? c2022 : 0}</td>
                <td>${c2026 > 0 ? c2026 : 0}</td>
                <td class="col-diff">${diffHtml}</td>
            </tr>
        `;
    });

    html += `
        </tbody>
    </table>
    `;

    container.innerHTML = html;
}
// Render the ideology comparison table (2026 vs 2022)
export function renderIdeologyTable(ideoData, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const labels = ["Izquierda", "Centro", "Derecha"];
    
    // Calculate total 2026 curules for percentage
    const total2026 = labels.reduce((sum, ideo) => {
        const d = ideoData[ideo];
        return sum + (d && d['2026'] ? d['2026'].curules : 0);
    }, 0);
    
    const fmt = d3.format(",");
    const fmtPct = (v) => {
        const pct = total2026 > 0 ? ((v / total2026) * 100).toFixed(1) : '0.0';
        return pct + '%';
    };

    let html = `
    <table class="congress-comp-table ideology-table">
        <thead>
            <tr>
                <th></th>
                <th>% 2026</th>
                <th>Curules<br>2026</th>
                <th>Curules<br>2022</th>
                <th>Diferencia</th>
            </tr>
        </thead>
        <tbody>
    `;

    labels.forEach(ideo => {
        const d = ideoData[ideo];
        if (!d) return;

        const c2026 = d['2026'] ? d['2026'].curules : 0;
        const c2022 = d['2022'] ? d['2022'].curules : 0;
        
        const diff = c2026 - c2022;
        const diffStr = diff === 0 ? "=" : diff > 0 ? `+${diff}` : diff.toString();
        
        let diffColor = "var(--text-primary)";
        if (diff > 0) diffColor = "#16a34a"; 
        if (diff < 0) diffColor = "#dc2626";

        const color = getIdeologyColorRaw(ideo);
        
        html += `
            <tr>
                <td>
                    <span class="party-dot" style="background-color: ${color};"></span>
                    ${ideo}
                </td>
                <td class="data-number" style="color: var(--text-primary); font-weight: 600;">${fmtPct(c2026)}</td>
                <td class="data-number">${c2026}</td>
                <td class="data-number">${c2022}</td>
                <td class="data-number" style="color: ${diffColor}; font-weight: 600;">${diffStr}</td>
            </tr>
        `;
    });

    html += `
        </tbody>
    </table>
    `;

    container.innerHTML = html;
}
