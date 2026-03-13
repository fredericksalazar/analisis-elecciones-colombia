// Map Visualization using D3.js
// Renders the maps for Participation, Winning Party, and Ideology

export function drawMaps(electionData, geoData) {
    const features = geoData.features;

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

    // Load CSV to build lookup maps for fast access
    d3.csv('data/eleccione_legislativas_territorio.csv').then(csvData => {
        const deptoData = {}; // Will hold the 2026 map values
        
        let validRows = csvData.filter(d => d.year === "2026" && d.corp === "Senado" && d.dpto);
        
        // If 2026 data is too scarse like 8 states, fallback to 2022 base to populate whole map
        if (validRows.length < 10) {
            console.warn("2026 territory data incomplete, merging with 2022 dataset for visuals.");
            const d22 = csvData.filter(d => d.year === "2022" && d.corp === "Senado" && d.dpto);
            const d26 = validRows;
            
            d22.forEach(row => { deptoData[normalizeName(row.dpto)] = { name: row.dpto, data: { ...row, votos: +row.votos} }; });
            d26.forEach(row => { deptoData[normalizeName(row.dpto)] = { name: row.dpto, data: { ...row, votos: +row.votos} }; }); // overwrite with 2026 
        } else {
             validRows.forEach(row => {
                 deptoData[normalizeName(row.dpto)] = { name: row.dpto, data: { ...row, votos: +row.votos} };
             });
        }


        // Helper to get data by feature
        const getDataForFeature = (feature) => {
            let name = feature.properties.NOMBRE_DPT || feature.properties.DPTO || feature.properties.name || "";
            name = normalizeName(name);
            
            let found = deptoData[name];
            // Hardcoded fallbacks if names mismatch slightly
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

        // Function to draw a single map
        function renderMap(containerId, colorFn, tooltipFn) {
            const container = d3.select(containerId);
            container.selectAll("*").remove(); // clear

            const width = container.node().getBoundingClientRect().width || 300;
            const height = 350;

            const svg = container.append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("viewBox", `0 0 ${width} ${height}`);

            // Projection for Colombia
            const projection = d3.geoMercator()
                 .fitSize([width, height], geoData);

            const path = d3.geoPath().projection(projection);

            let tooltip = d3.select("body").select(".d3-tooltip");
            if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
            
            svg.append("g")
                .selectAll("path")
                .data(features)
                .join("path")
                .attr("d", path)
                .attr("fill", d => {
                    const gData = getDataForFeature(d);
                    if (!gData) return "#334155"; // Empty state
                    return colorFn(gData.data);
                })
                .attr("stroke", "var(--bg-primary)")
                .attr("stroke-width", 1)
                .on("mouseover", (event, d) => {
                    d3.select(event.currentTarget).attr("stroke", "var(--text-primary)").attr("stroke-width", 2);
                    const gData = getDataForFeature(d);
                    if(gData) {
                        tooltip.transition().duration(200).style("opacity", .9);
                        tooltip.html(tooltipFn(gData.name, gData.data))
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    }
                })
                .on("mouseout", (event) => {
                    d3.select(event.currentTarget).attr("stroke", "var(--bg-primary)").attr("stroke-width", 1);
                    tooltip.transition().duration(500).style("opacity", 0);
                });
        }

        // Colors
        function getCSScolor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
        
        // 1. Map: Participation
        // We scale color from dark blue to bright cyan based on voters count
        const maxVoters = d3.max(Object.values(deptoData), d => d.data.votos) || 500000;

        renderMap('#map-participation', 
            (data) => {
               // We override white colors for dark mode visibility, creating a custom scale
               let t = Math.min(1, data.votos / (maxVoters * 0.6));
               // Blend between bg-secondary and accent
               const colorNode = d3.color(getCSScolor('--accent'));
               return d3.interpolateLab("#1e293b", getCSScolor('--accent'))(t);
            },
            (name, data) => `<strong>${name}</strong><br/>Votantes: ${new Intl.NumberFormat('es-CO').format(data.votos)}`
        );

        // 2. Map: Dominant Party (Senado)
        const partyColors = {
            'Pacto Histórico': getCSScolor('--party-ph') || '#E11D48',
            'Partido Conservador': getCSScolor('--party-pc') || '#1E3A8A',
            'Partido Liberal': getCSScolor('--party-pl') || '#EF4444',
            'Centro Democrático': getCSScolor('--party-cd') || '#3B82F6',
            'Cambio Radical': getCSScolor('--party-cr') || '#60A5FA',
            'Partido de la U': getCSScolor('--party-u') || '#F59E0B',
            'Alianza Verde': getCSScolor('--party-av') || '#059669',
            // map other ones to gray
            'default': '#64748b'
        };
        
        const getWinnerCol = (winnerName) => {
            if(!winnerName) return partyColors['default'];
            for (let key in partyColors) {
                if (winnerName.includes(key)) return partyColors[key];
            }
            if (winnerName.includes("Verde")) return partyColors['Alianza Verde'];
            if (winnerName.includes("Conservador")) return partyColors['Partido Conservador'];
            if (winnerName.includes("Liberal")) return partyColors['Partido Liberal'];
            return partyColors['default'];
        };

        renderMap('#map-party',
            (data) => getWinnerCol(data.winner),
            (name, data) => `<strong>${name}</strong><br/>Ganador: ${data.winner}<br/>Votos: ${new Intl.NumberFormat('es-CO').format(data.votos)}`
        );


        // 3. Map: Ideology Dominance
        const ideologyColorScale = d3.scaleOrdinal()
            .domain(["Izquierda", "Centro", "Derecha"])
            .range([getCSScolor('--color-izq'), getCSScolor('--color-cen'), getCSScolor('--color-der')]);

        renderMap('#map-ideology',
             (data) => ideologyColorScale(data.ideo) || '#64748b',
             (name, data) => `<strong>${name}</strong><br/>Tendencia Dominante: <span style="color:${ideologyColorScale(data.ideo)}">${data.ideo}</span>`
        );

    }); // end d3.csv
    
    // Add global theme reflow trigger so maps update colors if theme shifts
    window.addEventListener('themeChanged', () => {
        drawMaps(electionData, geoData);
    });
}
