# 🌍 OSINT Situation Dashboard

A real-time Open Source Intelligence (OSINT) monitoring dashboard that aggregates global news, significant events, and geological data onto an interactive 3D-styled map.

![OSINT Dashboard Screenshot](https://github.com/magaman/OSINT-Dashboard/raw/main/public/vite.svg) *Note: Add a real screenshot here*

## ✨ Features

*   **Real-Time Situation Feed**: Aggregates breaking news from major international sources (BBC, Reuters, Al Jazeera, etc.) and GDELT.
*   **Interactive Global Map**:
    *   **ESRI Dark Gray Canvas** tiles for a professional, English-only labeled interface.
    *   **Geospatial Visualization**: News events are automatically geolocated and mapped as interactive markers.
    *   **Drill-down Capability**: Click markers to view detailed event popups with source links.
*   **Live Earthquake Tracking**:
    *   Integrates with **USGS API** to display significant earthquakes (Magnitude 4.5+).
    *   Distinct `🌋` visual markers for seismic events.
*   **Smart Filtering System**:
    *   Filter events by severity: **Critical**, **High**, **Medium**, **Low**.
    *   Special filters for **Earthquakes** and **Developing** stories.
    *   **Synchronized Views**: Filtering the feed automatically updates the map to show only relevant markers.
*   **Advanced Location Extraction**: Custom NLP logic to extract specific cities and countries from headlines, reducing generic "Global" markers.

## 🛠 Tech Stack

-   **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Mapping**: [Leaflet.js](https://leafletjs.com/)
-   **Data Sources**:
    -   USGS Earthquake Hazards Program API
    -   GDELT Project API
    -   Public RSS Feeds (via AllOrigins CORS Proxy)

## 🚀 Getting Started

1.  **Clone the repository**
    ```bash
    git clone https://github.com/magaman/OSINT-Dashboard.git
    cd OSINT-Dashboard
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    ```

4.  **Open the dashboard**
    Navigate to `http://localhost:5173` in your browser.

## 🔮 Future Roadmap

-   [ ] Twitter/X API integration for social signals
-   [ ] Advanced clustering for high-density event areas
-   [ ] AI-powered sentiment analysis for event severity
-   [ ] User-defined watchlists for specific regions/topics

## 📄 License

MIT
