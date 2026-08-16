# SENTRY — AI-Based Emergency Crowd Risk Predictor

A browser-only command-center dashboard that simulates a live AI crowd-safety
monitoring system: an interactive venue map, a heuristic "AI" risk-scoring
engine, real-time alerts, and a risk trend chart. Pure **HTML / CSS / JS** —
JavaScript plays the role of the backend, running entirely in the browser.

## Run it

No build step, no server required.

1. Unzip the project.
2. Open `index.html` in any modern browser (Chrome, Edge, Firefox).
3. Click **▶ Start Feed** to begin the simulated live sensor feed.

An internet connection is needed only to load the map tiles (OpenStreetMap),
the Leaflet library, and the Google Fonts used for styling — all via CDN.

## What it does

- **Live venue map** (Leaflet + OpenStreetMap) with each monitored area shown
  as a circle. Circle size scales with crowd population, and color reflects
  the AI-predicted risk level (low / medium / high / critical).
- **Click the map** to drop a new monitoring zone anywhere, name it, and set
  its safe capacity.
- **AI risk engine** (`js/ai-engine.js`) scores every zone every tick from:
  - **density** — population vs. safe capacity
  - **growth rate** — how fast the crowd is building
  - **bottleneck factor** — number of exits and how freely the crowd can flow
  It returns a 0–100 risk score, a classification, and a plain-language
  recommended action — the same shape a real prediction API would return.
- **Simulated live feed** (`js/simulation.js`) generates new "sensor" readings
  every tick, including organic micro-surges and a manual **⚡ Trigger Surge**
  button to demo an escalating-emergency scenario.
- **Dashboard sidebar** lists every zone with a live capacity bar, risk badge,
  trend arrow, and the AI's recommended action.
- **AI Alert Log** fires an event whenever a zone crosses a risk threshold
  (into medium/high/critical, or back down).
- **Aggregate risk trend chart** — a dependency-free canvas line chart of the
  venue-wide average risk score over time.

## Project structure

```
crowd-risk-predictor/
├── index.html          Dashboard shell / layout
├── css/
│   └── style.css        Command-center visual theme
├── js/
│   ├── zones.js          Venue + initial zone (sensor) definitions
│   ├── ai-engine.js       The "AI backend": risk scoring + recommendations
│   ├── simulation.js      Simulated live sensor feed / tick loop
│   ├── map.js             Leaflet map rendering
│   ├── charts.js          Canvas trend chart
│   └── app.js             Main controller: wires everything to the UI
└── README.md
```

## Notes for extending this into a real system

- Swap `simulation.js`'s random-walk generator for a real data source
  (CCTV people-counting, Wi-Fi/BLE probe density, turnstile counters) sent
  over WebSocket or polling to `Simulation.stepZone`-equivalent code.
- `ai-engine.js` is a transparent, explainable heuristic model by design —
  it can be swapped for a trained ML model served from a real backend
  without changing anything else in the app, as long as it returns the same
  `{ score, level, recommendation }` shape.
- Risk thresholds, weights, and alert rules are centralized in
  `AIEngine.WEIGHTS` / `AIEngine.THRESHOLDS` for easy tuning.
