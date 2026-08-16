# AI-Based Emergency Crowd Risk Predictor

A browser-only command-center dashboard that simulates a live AI crowd-safety monitoring system: an interactive venue map, a heuristic "AI" risk-scoring engine, real-time alerts, and a risk trend chart. Pure HTML, CSS, and JavaScript — the logic runs entirely in the browser.

## Run it

No build step is required.

1. Open the project folder.
2. Open `index.html` in a modern browser.
3. Log in with a username, email, and password.
4. Click **▶ Start Feed** to begin the simulated live sensor feed.

An internet connection is needed only to load the map tiles and the CDN libraries used by the UI.

## Features

- Live venue map with interactive monitoring zones
- AI-based risk scoring using density, growth rate, and bottleneck data
- Real-time alert log and warning thresholds
- Aggregate risk trend chart
- User login screen with username, email, and password
- Browser geolocation support to center the map on the user’s location

## Project structure

```text
AI-Based-Emergency-Crowd-Risk-Predictor/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── ai-engine.js
│   ├── app.js
│   ├── charts.js
│   ├── map.js
│   ├── simulation.js
│   └── zones.js
├── README.md
└── .gitignore
```

## Notes

This project is designed for front-end demo purposes and can be expanded into a real-time emergency monitoring system by replacing the simulated sensor feed with live data from cameras, turnstiles, IoT devices, or APIs.
