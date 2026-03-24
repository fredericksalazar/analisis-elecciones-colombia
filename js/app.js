// Main Application Logic
import { renderMacroKPIs, renderPartyCards, renderAdvancedAnalysis } from './components.js?v=20260319e';
import { drawHemiciclo, drawIdeologyCharts, drawVotesBarCharts, drawVotesVariationCharts, renderCongressTable, renderIdeologyTable } from './charts.js?v=20260319e';
import { calculateAdvancedMetrics } from './analysis.js';
import { drawParticipationMap, drawPartyMap, drawIdeologyMap, drawVariationMap } from './maps.js?v=20260319e';

let electionData = null;

// Initialization
async function initApp() {
    lucide.createIcons();
    setupThemeToggle();
    initScrollSpy();

    try {
        // Fetch JSON Data with cache-busting
        const response = await fetch(`data/resultados_analisis.json?t=${Date.now()}`);
        if (!response.ok) throw new Error("Could not load data");
        electionData = await response.json();
        
        console.log("Electoral Data Loaded:", electionData);

        // Render Components
        renderMacroKPIs(electionData);
        setupTabs();
        
        // Render Charts & Maps
        // Delaying slightly to allow CSS to paint and get proper widths
        setTimeout(() => {
            initializeVisualizations(electionData);
            initIntersectionObserver();
            // Final icon refresh
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }, 100);

    } catch (e) {
        console.error("Initialization error:", e);
        document.querySelector('.dashboard').innerHTML = `<div class="glass-panel"><p>Error cargando los datos del análisis. Asegúrate de ejecutar un servidor local.</p></div>`;
    }
}

let cachedGeoData = null;

function initializeVisualizations(data) {
    // Topojson load for maps
    if (!cachedGeoData) {
        d3.json('data/colombia.json').then(geoData => {
            cachedGeoData = geoData;
            drawParticipationMap(data, geoData, "Senado");
            drawVariationMap(data, geoData, "Senado");
            drawPartyMap(data, geoData, "Senado");
            drawIdeologyMap(data, geoData, "Senado");
            setupMapTabs(data, geoData);
            renderTablaVariacion(data);
            renderTablaIdeologia(data);
        }).catch(e => {
            console.warn("Could not load geometry for maps, skipping maps.", e);
            document.getElementById('territorial-maps').style.display = 'none';
        });
    } else {
        drawParticipationMap(data, cachedGeoData, "Senado");
        drawVariationMap(data, cachedGeoData, "Senado");
        drawPartyMap(data, cachedGeoData, "Senado");
        drawIdeologyMap(data, cachedGeoData, "Senado");
        setupMapTabs(data, cachedGeoData);
    }

    // Draw Hemiciclos
    drawHemiciclo(data.partidos.Senado, '#senado-hemiciclo', "Senado");
    renderCongressTable(data.partidos.Senado, '#senado-table-container');

    drawHemiciclo(data.partidos.Camara, '#camara-hemiciclo', "Cámara");
    renderCongressTable(data.partidos.Camara, '#camara-table-container');



    // Draw Ideology Hemicircles (Pure ideology view)
    const transformToIdeoHemiciclo = (ideoCorpData) => {
        const result = {};
        Object.entries(ideoCorpData).forEach(([ideo, data]) => {
            result[ideo] = {
                ideologia: ideo,
                2026: { curules: data['2026'].curules }
            };
        });
        return result;
    };

    const senadoIdeoHemicicloData = transformToIdeoHemiciclo(data.ideologia.Senado);
    const camaraIdeoHemicicloData = transformToIdeoHemiciclo(data.ideologia.Camara);

    drawHemiciclo(senadoIdeoHemicicloData, '#ideology-senado-hemiciclo', "Senado");
    drawHemiciclo(camaraIdeoHemicicloData, '#ideology-camara-hemiciclo', "Cámara");

    renderIdeologyTable(data.ideologia.Senado, '#ideology-senado-table-container');
    renderIdeologyTable(data.ideologia.Camara, '#ideology-camara-table-container');

    // Draw Ideology Trend Doughnuts (Keep existing)
    drawIdeologyCharts(data.ideologia.Senado);

    // Draw Votes Distribution Bar Charts
    drawVotesBarCharts(data);

    // Draw Votes Variation Charts
    drawVotesVariationCharts(data);

    // Draw Party Cards
    renderPartyCards(data.partidos.Senado, '#party-senado-view');
    renderPartyCards(data.partidos.Camara, '#party-camara-view');

    // Advanced Analysis
    setupAdvancedAnalysis(data);
}

export function setupAdvancedAnalysis(data) {
    // Render Senado
    const senadoMetrics = calculateAdvancedMetrics(data, 'Senado');
    renderAdvancedAnalysis(senadoMetrics, 'advanced-metrics-senado');
    
    // Render Cámara
    const camaraMetrics = calculateAdvancedMetrics(data, 'Camara');
    renderAdvancedAnalysis(camaraMetrics, 'advanced-metrics-camara');
}


// Theme Management
function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;

    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

    function updateThemeButton() {
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        btn.innerHTML = currentTheme === 'dark' ? sunIcon : moonIcon;
    }

    btn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        updateThemeButton();
        
        window.dispatchEvent(new Event('themeChanged'));
    });

    updateThemeButton();
}

// Tab Management
function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view-container');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
        });
    });
}

function setupMapTabs(data, geoData) {
    const switchers = document.querySelectorAll('.corp-switcher-mini');
    
    switchers.forEach(switcher => {
        const mapType = switcher.dataset.map;
        const tabs = switcher.querySelectorAll('.mini-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const corp = tab.getAttribute('data-corp');
                
                if (mapType === 'participation') {
                    drawParticipationMap(data, geoData, corp);
                } else if (mapType === 'variation') {
                    drawVariationMap(data, geoData, corp);
                } else if (mapType === 'party') {
                    drawPartyMap(data, geoData, corp);
                } else if (mapType === 'ideology') {
                    drawIdeologyMap(data, geoData, corp);
                }
            });
        });
    });
}

// Render Tabla de Variación de Votos por Departamento
let deptosDataGlobal = [];
let currentSort = { field: 'variacion', direction: 'desc' };

function renderTablaVariacion(data) {
    const tbody = document.getElementById('tabla-variacion-body');
    const table = document.getElementById('tabla-variacion-departamentos');
    if (!tbody || !data.territorio) return;

    const territorio2022 = data.territorio['2022'];
    const territorio2026 = data.territorio['2026'];
    
    // Usar datos de Senado para la tabla
    const deptos2022 = territorio2022?.senado?.detalles_departamentos || {};
    const deptos2026 = territorio2026?.senado?.detalles_departamentos || {};

    // Obtener todos los departamentos únicos
    const deptos = new Set([...Object.keys(deptos2022), ...Object.keys(deptos2026)]);
    
    // Filtrar solo departamentos válidos (excluir CONSULADOS) y crear array con datos
    deptosDataGlobal = Array.from(deptos)
        .filter(d => d !== 'CONSULADOS')
        .map(depto => {
            const votos2022 = deptos2022[depto]?.votos || 0;
            const votos2026 = deptos2026[depto]?.votos || 0;
            const diferencia = votos2026 - votos2022;
            const variacion = votos2022 > 0 ? ((diferencia / votos2022) * 100) : 0;
            return { depto, votos2022, votos2026, diferencia, variacion };
        });

    // Initial sort
    sortData('variacion', 'desc');

    // Add click handlers to headers
    const headers = table.querySelectorAll('th.sortable');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            const direction = currentSort.field === field && currentSort.direction === 'desc' ? 'asc' : 'desc';
            sortData(field, direction);
        });
    });
}

function sortData(field, direction) {
    currentSort = { field, direction };
    
    deptosDataGlobal.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        
        if (field === 'depto') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            if (direction === 'asc') {
                return valA.localeCompare(valB);
            } else {
                return valB.localeCompare(valA);
            }
        } else {
            if (direction === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        }
    });

    renderTableBody();
    updateSortIcons();
}

function renderTableBody() {
    const tbody = document.getElementById('tabla-variacion-body');
    let html = '';
    
    deptosDataGlobal.forEach(item => {
        const { depto, votos2022, votos2026, diferencia, variacion } = item;
        const esPositivo = diferencia >= 0;
        const claseVariacion = esPositivo ? 'variacion-positiva' : 'variacion-negativa';
        const icono = esPositivo ? '↑' : '↓';
        
        html += `
            <tr>
                <td>${depto}</td>
                <td class="numero">${votos2022.toLocaleString('es-CO')}</td>
                <td class="numero">${votos2026.toLocaleString('es-CO')}</td>
                <td class="numero ${claseVariacion}">${diferencia >= 0 ? '+' : ''}${diferencia.toLocaleString('es-CO')}</td>
                <td class="numero ${claseVariacion}">
                    <span class="variacion-icon">${icono}</span>
                    ${Math.abs(variacion).toFixed(2)}%
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function updateSortIcons() {
    const headers = document.querySelectorAll('#tabla-variacion-departamentos th.sortable');
    headers.forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentSort.field) {
            th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// Render Tabla de Distribución Ideológica por Departamento
let ideologiaDataGlobal = [];
let currentIdeologiaSort = { field: 'depto', direction: 'asc' };

function renderTablaIdeologia(data) {
    const tbody = document.getElementById('tabla-ideologia-body');
    const table = document.getElementById('tabla-ideologia-departamentos');
    if (!tbody || !data.territorio) return;

    const territorio2026 = data.territorio['2026'];
    const senado2026 = territorio2026?.senado?.detalles_departamentos || {};

    ideologiaDataGlobal = Object.entries(senado2026)
        .filter(([depto]) => depto !== 'CONSULADOS')
        .map(([depto, info]) => ({
            depto: depto,
            ideologia: info.ideologia || 'Centro',
            partido: info.ganador || '',
            votos: info.votos || 0
        }))
        .sort((a, b) => a.depto.localeCompare(b.depto));

    // Add click handlers to headers
    const headers = table.querySelectorAll('th.sortable');
    headers.forEach(th => {
        th.addEventListener('click', () => {
            const field = th.dataset.sort;
            const direction = currentIdeologiaSort.field === field && currentIdeologiaSort.direction === 'asc' ? 'desc' : 'asc';
            sortIdeologiaTable(field, direction);
        });
    });

    sortIdeologiaTable('depto', 'asc');
}

function sortIdeologiaTable(field, direction) {
    currentIdeologiaSort = { field, direction };
    
    ideologiaDataGlobal.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];
        
        if (field === 'depto' || field === 'ideologia' || field === 'partido') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            if (direction === 'asc') {
                return valA.localeCompare(valB);
            } else {
                return valB.localeCompare(valA);
            }
        } else {
            if (direction === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        }
    });

    renderIdeologiaTableBody();
    updateIdeologiaSortIcons();
}

function renderIdeologiaTableBody() {
    const tbody = document.getElementById('tabla-ideologia-body');
    let html = '';
    
    ideologiaDataGlobal.forEach(item => {
        const { depto, ideologia, partido, votos } = item;
        
        let ideoClass = '';
        if (ideologia === 'Izquierda') {
            ideoClass = 'ideologia-izquierda';
        } else if (ideologia === 'Derecha') {
            ideoClass = 'ideologia-derecha';
        } else {
            ideoClass = 'ideologia-centro';
        }
        
        html += `
            <tr>
                <td>${depto}</td>
                <td class="${ideoClass}">${ideologia}</td>
                <td>${partido}</td>
                <td class="numero">${votos.toLocaleString('es-CO')}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function updateIdeologiaSortIcons() {
    const headers = document.querySelectorAll('#tabla-ideologia-departamentos th.sortable');
    headers.forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === currentIdeologiaSort.field) {
            th.classList.add(currentIdeologiaSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

// Scroll Animation
function initIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.slide-up').forEach(el => observer.observe(el));
}

// Active Menu on Scroll
function initScrollSpy() {
    const menuLinks = document.querySelectorAll('.menu-navegacion ul li a');
    const sections = document.querySelectorAll('section[id]');
    const menuList = document.querySelector('.menu-navegacion ul');
    
    if (menuLinks.length === 0 || sections.length === 0) return;

    function updateActiveMenu() {
        const scrollPos = window.scrollY + 150;
        
        let currentSection = 'inicio';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                currentSection = sectionId;
            }
        });
        
        let activeLink = null;
        
        menuLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            
            if (href === '#') {
                if (currentSection === 'inicio' || scrollPos < 200) {
                    link.classList.add('active');
                    activeLink = link;
                }
            } else if (href === `#${currentSection}`) {
                link.classList.add('active');
                activeLink = link;
            }
        });
        
        // Scroll active link into view on mobile
        if (activeLink && window.innerWidth <= 768 && menuList) {
            activeLink.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }

    window.addEventListener('scroll', updateActiveMenu, { passive: true });
    updateActiveMenu();
}

// Start App
document.addEventListener('DOMContentLoaded', initApp);
