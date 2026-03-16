// Main Application Logic
import { renderMacroKPIs, renderPartyCards, renderAdvancedAnalysis } from './components.js';
import { drawHemiciclo, drawIdeologyCharts, drawVotesBarCharts, drawVotesVariationCharts, renderCongressTable, renderIdeologyTable } from './charts.js';
import { calculateAdvancedMetrics } from './analysis.js';
import { drawMaps } from './maps.js';

let electionData = null;

// Initialization
async function initApp() {
    lucide.createIcons();
    setupThemeToggle();

    try {
        // Fetch JSON Data
        const response = await fetch('data/resultados_analisis.json');
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
        }, 100);

    } catch (e) {
        console.error("Initialization error:", e);
        document.querySelector('.dashboard').innerHTML = `<div class="glass-panel"><p>Error cargando los datos del análisis. Asegúrate de ejecutar un servidor local.</p></div>`;
    }
}

function initializeVisualizations(data) {
    // Topojson load for maps
    d3.json('data/colombia.json').then(geoData => {
        drawMaps(data, geoData);
    }).catch(e => {
        console.warn("Could not load geometry for maps, skipping maps.", e);
        document.getElementById('territorial-maps').style.display = 'none';
    });

    // Draw Hemiciclos
    drawHemiciclo(data.partidos.Senado, '#senado-hemiciclo', "Senado");
    renderCongressTable(data.partidos.Senado, '#senado-table-container');

    drawHemiciclo(data.partidos.Cámara, '#camara-hemiciclo', "Cámara");
    renderCongressTable(data.partidos.Cámara, '#camara-table-container');



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
    const camaraIdeoHemicicloData = transformToIdeoHemiciclo(data.ideologia.Cámara);

    drawHemiciclo(senadoIdeoHemicicloData, '#ideology-senado-hemiciclo', "Senado");
    drawHemiciclo(camaraIdeoHemicicloData, '#ideology-camara-hemiciclo', "Cámara");

    renderIdeologyTable(data.ideologia.Senado, '#ideology-senado-table-container');
    renderIdeologyTable(data.ideologia.Cámara, '#ideology-camara-table-container');

    // Draw Ideology Trend Doughnuts (Keep existing)
    drawIdeologyCharts(data.ideologia.Senado);

    // Draw Votes Distribution Bar Charts
    drawVotesBarCharts(data);

    // Draw Votes Variation Charts
    drawVotesVariationCharts(data);

    // Draw Party Cards
    renderPartyCards(data.partidos.Senado, '#party-senado-view');
    renderPartyCards(data.partidos.Cámara, '#party-camara-view');

    // Advanced Analysis
    setupAdvancedAnalysis(data);
}

export function setupAdvancedAnalysis(data) {
    // Render Senado
    const senadoMetrics = calculateAdvancedMetrics(data, 'Senado');
    renderAdvancedAnalysis(senadoMetrics, 'advanced-metrics-senado');
    
    // Render Cámara
    const camaraMetrics = calculateAdvancedMetrics(data, 'Cámara');
    renderAdvancedAnalysis(camaraMetrics, 'advanced-metrics-camara');
}


// Theme Management
function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const html = document.documentElement;

    btn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        
        // Signal charts to re-render or update colors if possible
        window.dispatchEvent(new Event('themeChanged'));
    });
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


// Start App
document.addEventListener('DOMContentLoaded', initApp);
