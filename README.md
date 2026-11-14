# OrbitWatch 🛰️

**A space-awareness platform for exploring satellites, orbital activity, and the space environment.**

OrbitWatch is an educational project designed to make orbital information easier to explore through a futuristic mission-control interface.

## Planned modules

- **Mission Overview** — platform status and orbital-environment snapshot.
- **Satellite Explorer** — search and inspect satellites and orbital data.
- **Orbital Visualizer** — explore Earth and satellite orbits in 3D.
- **Debris Monitor** — inspect catalogued orbital debris and congestion.
- **Space Intelligence** — explore launches, missions, and space-related insights.

## Technology

- HTML, CSS, and JavaScript
- Vite
- Node.js and Express
- CesiumJS (planned for the 3D globe)
- satellite.js (planned for orbital propagation)
- CelesTrak (planned primary source for orbital element data)

## Current status

The initial project foundation is in place:
- Mission Overview dashboard UI
- Responsive layout
- Express health-check endpoint
- Frontend/backend development scripts

Satellite data integration and the 3D orbital visualizer are the next development stages.

> OrbitWatch will display the source and epoch of orbital data. Satellite positions calculated from orbital elements are estimates, not live telemetry.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

1. Clone the repository:
   ```bash
   git clone https://github.com/KABIR200822/OrbitWatch.git
   cd OrbitWatch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend and backend:
   ```bash
   npm run dev
   ```

4. Open the local Vite address shown in your terminal (normally `http://localhost:5173`).

The backend health endpoint runs at `http://localhost:3000/api/health`.

## Project structure

```text
OrbitWatch/
├── server/
│   └── server.js
├── src/
│   ├── main.js
│   └── style.css
├── .env.example
├── .gitignore
├── index.html
└── package.json
```

## Data sources

- [CelesTrak](https://celestrak.org/)
- [NASA APIs](https://api.nasa.gov/)
- [NASA EONET](https://eonet.gsfc.nasa.gov/)

## Disclaimer

OrbitWatch is an educational and informational project. Orbital calculations and catalogue data have limitations and should not be treated as operational space-traffic guidance.
