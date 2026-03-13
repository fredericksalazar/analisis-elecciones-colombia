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
    let parties = Object.entries(corpData).filter(([_, data]) => data['2026'] !== null);
    
    const orderIdeo = { "Izquierda": 1, "Centro": 2, "Derecha": 3 };
    parties.sort((a, b) => {
        let diff = orderIdeo[a[1].ideologia] - orderIdeo[b[1].ideologia];
        if (diff !== 0) return diff;
        return b[1]['2026'].curules - a[1]['2026'].curules;
    });

    parties.forEach(([pName, pData]) => {
        const curules = pData['2026'].curules;
        const color = getPartyColor(pName, pData.ideologia);
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
    const scale = (containerWidth - padding * 2) / 2; // px per normalized unit
    
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

    // Calculate dot radius to PREVENT overlap, but match sizes between charts.
    // To keep dots the same size in both charts, we calculate size based on
    // the least dense one (Senado ~103 seats) as the reference.
    const rowGapNorm = (1.0 - 0.45) / (numRows - 1); // normalized radial gap
    const rowGapPx = rowGapNorm * scale;
    
    // We use a reference seat count (100 seats) to determine dot size
    // so that Cámara (more crowded) has the same sized dots as Senado.
    const referenceSeats = 100;
    const innerR = 0.45;
    const totalArcNorm = [0, 1, 2, 3].slice(0, numRows).reduce((sum, i) => {
        return sum + Math.PI * (0.45 + (0.55 / (numRows - 1)) * i);
    }, 0);
    const innerSeatsRef = Math.round((Math.PI * innerR / totalArcNorm) * referenceSeats);
    const arcSpacingPxRef = (Math.PI * innerR * scale) / (innerSeatsRef + 1);
    
    // Dot radius = 45% of whichever spacing is tighter in the REFERENCE case
    const maxDotR = Math.min(rowGapPx, arcSpacingPxRef) * 0.45;
    const dotR = Math.max(maxDotR, 3);

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


// Function to map ideology strings to Chart.js global CSS variables
function getIdeologyColorRaw(ideo) {
    const style = getComputedStyle(document.documentElement);
    if(ideo === 'Izquierda') return style.getPropertyValue('--color-izq').trim();
    if(ideo === 'Derecha') return style.getPropertyValue('--color-der').trim();
    if(ideo === 'Centro') return style.getPropertyValue('--color-cen').trim();
    return '#94a3b8';
}

function getPartyColor(name, ideology) {
    // Exact mapping logic to match the reference CNN image
    const map = {
        "Pacto Histórico": "#f472b6", // pink
        "Centro Democrático": "#38bdf8", // light blue
        "Partido Liberal": "#dc2626", // red
        "Partido Conservador": "#2563eb", // royal blue
        "Alianza por Colombia": "#22c55e", // green
        "Partido de la U": "#facc15", // gold/yellow
        "Cambio Radical": "#0f766e", // dark teal
        "Cambio Radical-ALMA": "#0f766e", // dark teal
        "Ahora Colombia": "#6ee7b7", // mint green
        "Salvación Nacional": "#166534", // dark green
        "AICO (Ind.)": "#9ca3af", // gray for Indigenas
        "MAIS (Ind.)": "#9ca3af", // gray for Indigenas
        "Creemos": "#000000", // black for Estatuto
        "Alianza Verde/CE": "#10b981", // emerald fallback
        "MIRA-LIGA": "#4338ca", // indigo fallback
        "MIRA": "#4338ca",
        "Comunes": "#be185d",
        "Frente Amplio": "#fb923c",
        "Liga Anti-corrupción": "#ca8a04",
        "CITREP": "#64748b"
    };

    if(map[name]) return map[name];
    
    // Fallback Default to Ideology color if truly entirely unknown
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
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() } },
        },
        cutout: '65%',
        borderWidth: 0
    };

    if(chart22) chart22.destroy();
    const ctx22 = document.getElementById('ideo-2022-chart').getContext('2d');
    chart22 = new Chart(ctx22, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data22, backgroundColor: colors }] },
        options: { ...commonOptions, plugins: { ...commonOptions.plugins, title: {display: true, text: 'Distribución 2022', color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(), font: {family: 'Outfit', size: 16}} } }
    });

    if(chart26) chart26.destroy();
    const ctx26 = document.getElementById('ideo-2026-chart').getContext('2d');
    chart26 = new Chart(ctx26, {
        type: 'doughnut',
        data: { labels: labels, datasets: [{ data: data26, backgroundColor: colors }] },
        options: { ...commonOptions, plugins: { ...commonOptions.plugins, title: {display: true, text: 'Distribución 2026', color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(), font: {family: 'Outfit', size: 16}} } }
    });

    // Write narrative
    const targetEl = document.querySelector('.insight-ideology');
    
    // Determine winner/loser
    const izqVar = ideoData['Izquierda'].comparativo.variacion_poder_curules_pp;
    const derVar = ideoData['Derecha'].comparativo.variacion_poder_curules_pp;
    const cenVar = ideoData['Centro'].comparativo.variacion_poder_curules_pp;
    
    targetEl.innerHTML = `<strong>Insight Ideológico:</strong> El balance de poderes en el Senado muestra que la <strong>Derecha</strong> mantiene su posición como bloque mayoritario (42%), mientras que la <strong>Izquierda</strong> ganó terreno (${izqVar > 0 ? '+' : ''}${izqVar} pp) a expensas de las fuerzas de <strong>Centro</strong> (${cenVar > 0 ? '+' : ''}${cenVar} pp).`;
}

// Draw horizontal bar charts for votes by party
export function drawVotesBarCharts(electionData) {
    const formatNumber = (num) => new Intl.NumberFormat('es-CO').format(num);

    // Helper function to create bar chart
    const createBarChart = (corpName, corpData, canvasId) => {
        // Get parties with 2026 data, sorted by votes descending
        const parties = Object.entries(corpData)
            .filter(([_, data]) => data['2026'] !== null)
            .sort((a, b) => b[1]['2026'].votos - a[1]['2026'].votos);

        if (parties.length === 0) return null;

        // Prepare data
        const labels = parties.map(([name]) => name);
        const votes = parties.map(([_, data]) => data['2026'].votos);
        const colors = parties.map(([name, data]) => getPartyColor(name, data.ideologia));

        // Get computed text colors
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
        const textSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();

        // Create chart
        const ctx = document.getElementById(canvasId).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Votos 2026',
                    data: votes,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: textSecondary, font: { family: 'Inter' } }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: textSecondary,
                            callback: function(value) {
                                return formatNumber(value);
                            }
                        },
                        grid: {
                            color: 'rgba(128, 128, 128, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: textSecondary,
                            font: { family: 'Inter', size: 12 }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });

        return chart;
    };

    // Create both charts
    senadoVotesChart = createBarChart('Senado', electionData.partidos.Senado, 'senado-votes-chart');
    camaraVotesChart = createBarChart('Cámara', electionData.partidos.Cámara, 'camara-votes-chart');
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
        senadoVotesChart.options.plugins.legend.labels.color = legendColor;
        senadoVotesChart.options.scales.x.ticks.color = legendColor;
        senadoVotesChart.options.scales.y.ticks.color = legendColor;
        senadoVotesChart.update();
    }
    if(camaraVotesChart) {
        camaraVotesChart.options.plugins.legend.labels.color = legendColor;
        camaraVotesChart.options.scales.x.ticks.color = legendColor;
        camaraVotesChart.options.scales.y.ticks.color = legendColor;
        camaraVotesChart.update();
    }
});

// Render the 2026 vs 2022 composition table
export function renderCongressTable(corpData, containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let parties = Object.entries(corpData).filter(([pName, pData]) => {
        return (pData['2026'] !== null && pData['2026'].curules > 0) || (pData['2022'] !== null && pData['2022'].curules > 0);
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
                <th>Nueva<br>composición<br>2026-2030</th>
                <th><br><br>2022-2026</th>
                <th><br><br>Diferencia</th>
            </tr>
        </thead>
        <tbody>
    `;

    parties.forEach(([pName, pData]) => {
        const c2026 = pData['2026'] ? pData['2026'].curules : 0;
        const c2022 = pData['2022'] ? pData['2022'].curules : 0;
        
        let diff = c2026 - c2022;
        let diffStr = diff === 0 ? "=" : diff > 0 ? diff.toString() : diff.toString();
        
        // Exact styling for differences (green positive, red negative, black =)
        let diffColor = "var(--text-primary)";
        if (diff > 0) diffColor = "#0d9488"; // distinct teal/green
        if (diff < 0) diffColor = "#dc2626"; // distinct red
        
        const color = getPartyColor(pName, pData.ideologia);
        
        html += `
            <tr>
                <td class="party-col">
                    <span class="party-dot" style="background-color: ${color};"></span>
                    ${pName}
                </td>
                <td class="col-2026">${c2026 > 0 ? c2026 : 0}</td>
                <td class="col-old">${c2022 > 0 ? c2022 : 0}</td>
                <td class="col-diff" style="color: ${diffColor}; font-weight: 600;">${diffStr}</td>
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
    
    // Formatting numbers for labels
    const fmt = d3.format(",");

    let html = `
    <table class="congress-comp-table">
        <thead>
            <tr>
                <th></th>
                <th>Curules<br>2026</th>
                <th>Votos<br>2026</th>
                <th>Curules<br>2022</th>
                <th>Diferencia<br>Curules</th>
            </tr>
        </thead>
        <tbody>
    `;

    labels.forEach(ideo => {
        const d = ideoData[ideo];
        if (!d) return;

        const c2026 = d['2026'].curules;
        const v2026 = d['2026'].votos;
        const c2022 = d['2022'].curules;
        
        const diff = d.comparativo.curules_adicionales;
        const diffStr = diff === 0 ? "=" : diff > 0 ? `+${diff}` : diff.toString();
        
        let diffColor = "var(--text-primary)";
        if (diff > 0) diffColor = "#0d9488"; 
        if (diff < 0) diffColor = "#dc2626";

        const color = getIdeologyColorRaw(ideo);
        
        html += `
            <tr>
                <td class="party-col">
                    <span class="party-dot" style="background-color: ${color};"></span>
                    ${ideo}
                </td>
                <td class="col-2026">${c2026}</td>
                <td class="col-2026" style="font-size: 0.8em; opacity: 0.8;">${fmt(v2026)}</td>
                <td class="col-old">${c2022}</td>
                <td class="col-diff" style="color: ${diffColor}; font-weight: 600;">${diffStr}</td>
            </tr>
        `;
    });

    html += `
        </tbody>
    </table>
    `;

    container.innerHTML = html;
}
