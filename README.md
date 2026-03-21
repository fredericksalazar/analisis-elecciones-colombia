# Análisis Electoral Colombia 2022-2026

<!-- Badges -->
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/es/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/es/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![D3.js](https://img.shields.io/badge/D3.js-FF9A00?style=flat&logo=d3.js&logoColor=white)](https://d3js.org/)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chart.js&logoColor=white)](https://www.chartjs.org/)
[![Responsive](https://img.shields.io/badge/Responsive-Ready-4CAF50?style=flat)](https://developer.mozilla.org/es/docs/Learn/CSS/CSS_layout/Responsive_Design)

> Plataforma de visualización interactiva de datos electorales legislativos de Colombia (2022-2026), construida con un enfoque de ingeniería de datos.

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Arquitectura](#-arquitectura)
- [API de Datos](#-api-de-datos)
- [Contribución](#-contribución)
- [Licencia](#-licencia)
- [Autor](#-autor)

---

## 📖 Descripción

Este proyecto es una plataforma web interactiva que permite visualizar y analizar los resultados electorales del Congreso de Colombia para los años 2022 y 2026. Utiliza técnicas de ingeniería de datos para transformar datos electorales crudos en visualizaciones comprensibles.

### Objetivos

- **Democratizar el acceso** a la información electoral colombiana
- **Visualizar tendencias** de participación y comportamiento electoral
- **Facilitar el análisis** comparativo entre períodos electorales
- **Presentar datos complejos** de manera accesible y atractiva

---

## ✨ Características

### Visualizaciones Interactivas

| Característica | Descripción |
|----------------|-------------|
| **Mapas Coropléticos** | Visualización geográfica de resultados por departamento |
| **Gráficos de Barras** | Comparativa de votación por partido político |
| **Gráficos de Dona** | Distribución porcentual de curules y votos |
| **Hemiciclos** | Representación visual de la composición del Congreso |
| **Mapas de Variación** | Cambios en participación entre elecciones |

### Análisis Electoral

- Comparación 2022 vs 2026
- Distribución ideológica (Izquierda, Centro, Derecha)
- Ranking de partidos por región
- Métricas avanzadas de participación
- Análisis territorial por departamento

### Características Técnicas

- 🌙 **Modo Oscuro/Claro**: Cambio dinámico de tema
- 📱 **Diseño Responsivo**: Adaptación a dispositivos móviles y tablets
- ♿ **Accesibilidad**: Soporte para navegación por teclado y lectores de pantalla
- ⚡ **Rendimiento**: Renderizado optimizado de visualizaciones
- 📊 **Datos Reales**: Información basada en datos oficiales de la Registraduría

---

## 🛠️ Tecnologias

### Stack Principal

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **HTML5** | - | Estructura semántica del documento |
| **CSS3** | - | Estilos y diseño responsivo |
| **JavaScript** | ES6+ | Lógica de aplicación y visualizaciones |
| **D3.js** | v7 | Mapas y visualizaciones geoespaciales |
| **Chart.js** | v4 | Gráficos de barras y dona |

### Bibliotecas Externas

| Librería | Proveedor | Uso |
|----------|-----------|-----|
| **Lucide Icons** | unpkg | Iconografía vectorial |
| **Google Sans** | Google Fonts | Tipografía principal |
| **TopoJSON** | jsDelivr | Datos geográficos de Colombia |

### Herramientas de Desarrollo

- Git (control de versiones)
- Editor de código (VS Code recomendado)
- Chrome DevTools / Firefox Developer Edition

---

## 📁 Estructura del Proyecto

```
analisis-elecciones-colombia/
├── index.html              # Punto de entrada principal
├── css/
│   └── styles.css         # Estilos globales y responsivos
├── js/
│   ├── app.js             # Lógica principal de la aplicación
│   ├── charts.js          # Configuración de gráficos Chart.js
│   ├── maps.js            # Renderizado de mapas D3.js
│   └── data.js            # Gestión de datos electorales
├── data/
│   ├── colombia.json      # Datos geográficos (TopoJSON)
│   └── election-data.json  # Datos electorales procesados
├── AUDITORIA-RESPONSIVIDAD.md  # Informe de auditoría móvil
├── LICENSE                # Licencia MIT
└── README.md              # Este archivo
```

### Descripción de Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Documento HTML principal con estructura semántica |
| `styles.css` | ~2200 líneas de CSS con 6 breakpoints responsivos |
| `app.js` | Inicialización, carga de datos, gestión de tabs |
| `charts.js` | 1000+ líneas de configuración de visualizaciones |
| `maps.js` | Renderizado D3 con debounce y aspect-ratio adaptativo |
| `data.js` | Transformación y normalización de datos electorales |

---

## 🚀 Instalación

### Requisitos Previos

- Navegador web moderno (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Servidor local (opcional, para desarrollo)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/frederick2/analisis-elecciones-colombia.git
   cd analisis-elecciones-colombia
   ```

2. **Abrir en navegador**
   
   Opción A - Directamente:
   ```bash
   # En macOS
   open index.html
   
   # En Linux
   xdg-open index.html
   
   # En Windows
   start index.html
   ```
   
   Opción B - Servidor local (recomendado):
   ```bash
   # Con Python 3
   python -m http.server 8000
   
   # Con Node.js (npx)
   npx serve .
   
   # Con PHP
   php -S localhost:8000
   ```

3. **Acceder a la aplicación**
   ```
   http://localhost:8000
   ```

---

## 📖 Uso

### Navegación

1. **Selección de Corporación**: Usa los tabs "Senado" / "Cámara" para cambiar entre corporaciones
2. **Visualización de Mapas**: Cambia entre mapas con los mini-tabs (Participación, Partidos, Ideología, Variación)
3. **Cambio de Tema**: Usa el botón de alternar tema (sol/luna) en la esquina superior derecha

### Secciones de la Página

| Sección | Descripción |
|---------|-------------|
| **Hero** | Título principal y descripción del proyecto |
| **KPIs** | Métricas clave de participación electoral |
| **Gráficos de Votos** | Barras horizontales con votación por partido |
| **Gráficos de Distribución** | Tortas con distribución porcentual |
| **Composición del Congreso** | Hemiciclos y tablas comparativas |
| **Mapas Territoriales** | Visualizaciones geográficas interactivas |
| **Análisis** | Notas analíticas y contextualización |
| **Metodología** | Información sobre fuentes de datos |

### Atalajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Tab` | Navegar entre elementos interactivos |
| `Enter` | Activar elemento seleccionado |
| `Escape` | Cerrar tooltips/modales |

---

## 🏗️ Arquitectura

### Patrón de Diseño

```
┌─────────────────────────────────────────────────────┐
│                     index.html                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │
│  │  Hero   │  │  KPIs   │  │   Charts Section    │ │
│  └─────────┘  └─────────┘  └─────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐│
│  │              Congress Layout                    ││
│  │   ┌───────────┐        ┌───────────────┐      ││
│  │   │Hemiciclo  │        │  Comparative   │      ││
│  │   │   D3.js   │        │    Table      │      ││
│  │   └───────────┘        └───────────────┘      ││
│  └─────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────┐│
│  │                 Maps Container                  ││
│  │   ┌─────────────────┐  ┌───────────────────┐   ││
│  │   │   D3 Map SVG    │  │   Analysis Panel  │   ││
│  │   └─────────────────┘  └───────────────────┘   ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
election-data.json
        │
        ▼
    ┌────────┐
    │ data.js │ ─── Transforma y normaliza datos
    └────┬───┘
         │
         ▼
┌─────────────────────────────────────┐
│            app.js                     │
│  ┌─────────────────────────────────┐ │
│  │  Carga datos y pasa a módulos   │ │
│  └─────────────────────────────────┘ │
└──────────────┬────────────────────────┘
               │
     ┌─────────┼─────────┐
     ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ charts │ │  maps  │ │ tables │
│  .js   │ │  .js   │ │        │
└────────┘ └────────┘ └────────┘
     │         │         │
     ▼         ▼         ▼
┌─────────────────────────────────────┐
│        Renderizado en DOM            │
│   (Chart.js)  (D3.js)  (HTML)      │
└─────────────────────────────────────┘
```

### Responsividad

Breakpoints implementados:

| Breakpoint | Ancho | Dispositivos |
|------------|-------|--------------|
| Desktop | >1100px | Escritorios |
| Tablet L | 900-1100px | Tablets landscape |
| Tablet | 768-900px | Tablets portrait, laptops pequeños |
| Mobile L | 600-768px | Móviles grandes, iPad |
| Mobile M | 480-600px | Móviles medianos |
| Mobile S | <480px | iPhone SE, móviles pequeños |

### Optimizaciones de Performance

1. **Debounce en resize**: Previene re-renderizados excesivos
2. **Aspect-ratio adaptativo**: Mapas se ajustan según ancho disponible
3. **Lazy rendering**: Elementos fuera de viewport no se renderizan
4. **CSS containment**: Aislamiento de repaints
5. **will-change**: Optimización de animaciones

---

## 📊 API de Datos

### Estructura de Datos Electorales

```javascript
{
  "partidos": {
    "Senado": {
      "Partido Liberal": {
        "2022": { "votos": 1500000, "curules": 15 },
        "2026": { "votos": 1800000, "curules": 18 },
        "comparativo": {
          "variacion_votos_pct": 20.5,
          "variacion_poder_curules_pp": 2.1
        },
        "color": "#D32F2F",
        "ideologia": "Centro"
      }
    }
  },
  "territorio": {
    "2026": {
      "Senado": {
        "detalles_departamentos": {
          "Bogotá D.C.": {
            "ganador": "Partido Liberal",
            "votos": 500000,
            "ideologia": "Centro"
          }
        }
      }
    }
  },
  "ideologia": {
    "Izquierda": {
      "2022": { "curules": 25 },
      "2026": { "curules": 30 }
    }
  }
}
```

### Fuentes de Datos

- **Registraduría Nacional del Estado Civil** - Resultados electorales oficiales
- **DANE** - División territorial y proyecciones demográficas
- **TopoJSON Colombia** - Datos geográficos del territorio colombiano
- **Wikipedia** - datos electorales de 2022 y 2026

---

## 🤝 Contribución

### Guía para Contribuidores

1. **Fork** el repositorio
2. **Clone** tu fork localmente
   ```bash
   git clone https://github.com/TU_USUARIO/analisis-elecciones-colombia.git
   ```
3. **Crea una rama** para tu funcionalidad
   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
4. **Realiza tus cambios** siguiendo las guías de estilo
5. **Commit** tus cambios
   ```bash
   git commit -m "feat: agregar nueva visualización"
   ```
6. **Push** a tu fork
   ```bash
   git push origin feature/nueva-funcionalidad
   ```
7. **Crea un Pull Request** en GitHub

### Estándares de Código

- **CSS**: Metodología BEM para nomenclatura de clases
- **JavaScript**: ES6+ con módulos ES
- **HTML**: Semántico con tags apropiados (article, section, nav)
- **Responsividad**: Mobile-first approach

### Reporte de Bugs

Usa los [Issues de GitHub](https://github.com/frederick2/analisis-elecciones-colombia/issues) con la etiqueta `bug` e incluye:
- Navegador y versión
- Pasos para reproducir
- Comportamiento esperado vs actual
- Capturas de pantalla si es posible

---

## 👤 Autor

### Frederick Salazar

- **GitHub**: [@fredericksalazar](https://github.com/fredericksalazar)
- **LinkedIn**: [Perfil LinkedIn](https://www.linkedin.com/in/fredericksalazar/)
- **Email**: fredefass01@gmail.com

---

## 🙏 Agradecimientos

- [D3.js](https://d3js.org/) - Por la librería de visualización líder en la industria
- [Chart.js](https://www.chartjs.org/) - Por simplificar la creación de gráficos
- [Registraduría Nacional del Estado Civil](https://www.registraduria.gov.co/) - Por proporcionar los datos electorales
- [TopoJSON](https://github.com/topojson) - Por los datos geográficos de Colombia

---

## 📌 Notas de Versión

### v1.0.0 (2026-03-22)
- ✅ Auditoría completa de responsividad
- ✅ Optimización de gráficos para móvil
- ✅ Implementación de breakpoints 1200px, 1024px, 900px, 768px, 600px, 480px
- ✅ Mejoras de accesibilidad (focus states, touch targets)
- ✅ Documentación técnica completa

### v0.9.0 (2026-03-19)
- 🚧 Versión inicial con visualizaciones D3 y Chart.js
- 🚧 Modo oscuro/claro
- 🚧 Mapas territoriales interactivos

---

<div align="center">

**Construido con 💙 para Colombia**

*Este proyecto es de código abierto y está disponible para la comunidad.*

</div>
