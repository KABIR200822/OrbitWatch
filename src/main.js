import "./style.css";
import "cesium/Build/Cesium/Widgets/widgets.css";

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="OrbitWatch home">
        <span class="brand-mark">◎</span>
        <span>ORBIT<span class="brand-accent">WATCH</span></span>
      </a>
      <div class="sidebar-label">MISSION CONTROL</div>
      <nav class="navigation" aria-label="Main navigation">
        <a class="nav-link active" href="#dashboard" data-page="dashboard"><span>◈</span> Overview</a>
        <a class="nav-link" href="#satellites" data-page="satellites"><span>◉</span> Satellite Explorer</a>
        <a class="nav-link" href="#visualizer" data-page="visualizer"><span>◎</span> Orbital Visualizer</a>
        <a class="nav-link" href="#debris" data-page="debris"><span>✧</span> Debris Monitor</a>
        <a class="nav-link" href="#intelligence" data-page="intelligence"><span>⌁</span> Space Intelligence</a>
      </nav>
      <div class="sidebar-bottom">
        <div class="system-indicator"><span class="status-dot"></span> SYSTEMS NOMINAL</div>
        <div class="sidebar-version">ORBITWATCH / BUILD 0.2</div>
      </div>
    </aside>
    <main class="main-content" id="dashboard">
      <header class="topbar">
        <div><div class="eyebrow">EARTH ORBITAL ENVIRONMENT</div><h1>Mission Overview</h1></div>
        <div class="topbar-right"><div class="live-label"><span class="status-dot"></span> PLATFORM ONLINE</div><div class="avatar">OW</div></div>
      </header>
      <div id="module-view" class="module-view" hidden></div>
      <section class="welcome-panel">
        <div class="welcome-copy">
          <div class="eyebrow">ORBITAL AWARENESS PLATFORM</div>
          <h2>Eyes on orbit.<br /><span>Clarity beyond Earth.</span></h2>
          <p>Explore satellites, understand orbital activity, and monitor the increasingly crowded space environment.</p>
          <a class="primary-button" href="#visualizer" data-open-page="visualizer">Explore the platform <span>↗</span></a>
        </div>
        <div class="orbit-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="planet"><div class="planet-glow"></div></div><div class="satellite satellite-one">✦</div><div class="satellite satellite-two">✧</div></div>
        <div class="panel-coordinate">EARTH / LOW EARTH ORBIT</div>
      </section>
      <section class="section-heading"><div><div class="eyebrow">ORBITAL SNAPSHOT</div><h2>Environment at a glance</h2></div><span class="data-note">LIVE DATA CONNECTION — INTEGRATION PENDING</span></section>
      <section class="stats-grid">
        <article class="stat-card"><div class="stat-label">TRACKED OBJECTS</div><div class="stat-value">—</div><div class="stat-foot">Catalogue connection pending</div></article>
        <article class="stat-card"><div class="stat-label">ACTIVE SATELLITES</div><div class="stat-value">—</div><div class="stat-foot">Awaiting orbital data</div></article>
        <article class="stat-card"><div class="stat-label">DEBRIS OBJECTS</div><div class="stat-value">—</div><div class="stat-foot">Catalogue connection pending</div></article>
        <article class="stat-card"><div class="stat-label">DATA SOURCE</div><div class="stat-value source-value">CELESTRAK</div><div class="stat-foot">Primary orbital feed</div></article>
      </section>
      <section class="modules-section">
        <div class="section-heading"><div><div class="eyebrow">PLATFORM MODULES</div><h2>Explore OrbitWatch</h2></div></div>
        <div class="module-grid">
          <article class="module-card"><span class="module-icon">◉</span><h3>Satellite Explorer</h3><p>Search and inspect satellites and their orbital information.</p><span class="module-status">AVAILABLE</span></article>
          <article class="module-card"><span class="module-icon">◎</span><h3>Orbital Visualizer</h3><p>View Earth, satellite positions, and orbital trajectories in 3D.</p><span class="module-status">NEW MODULE</span></article>
          <article class="module-card"><span class="module-icon">✧</span><h3>Debris Monitor</h3><p>Understand catalogued space debris and orbital congestion.</p><span class="module-status">PLANNED</span></article>
          <article class="module-card"><span class="module-icon">⌁</span><h3>Space Intelligence</h3><p>Explore launches, mission information, and orbital insights.</p><span class="module-status">PLANNED</span></article>
        </div>
      </section>
      <footer>ORBITWATCH <span>•</span> BUILT FOR A CLEARER VIEW OF EARTH ORBIT</footer>
    </main>
  </div>
`;

const pages = {
  dashboard: { title: "Mission Overview", eyebrow: "EARTH ORBITAL ENVIRONMENT" },
  satellites: { title: "Satellite Explorer", eyebrow: "OBJECT CATALOGUE" },
  visualizer: { title: "Orbital Visualizer", eyebrow: "THREE-DIMENSIONAL ORBITAL VIEW" },
  debris: { title: "Debris Monitor", eyebrow: "ORBITAL ENVIRONMENT", icon: "✧", description: "Explore catalogued debris objects and understand how human-made objects populate Earth's orbital environment.", items: ["Browse catalogued debris objects", "Compare orbital regions", "View catalogue counts and data freshness"] },
  intelligence: { title: "Space Intelligence", eyebrow: "MISSIONS AND LAUNCH ACTIVITY", icon: "⌁", description: "Explore mission information, launch activity, and useful context about objects in orbit.", items: ["Mission and spacecraft information", "Launch and event summaries", "Contextual insights with linked data sources"] }
};

const dashboardSections = [
  document.querySelector(".welcome-panel"),
  document.querySelector(".stats-grid"),
  document.querySelector(".modules-section"),
  document.querySelector("main footer")
];
const moduleView = document.querySelector("#module-view");
const pageTitle = document.querySelector(".topbar h1");
let satelliteRecords = [];
let visualizerInstance = null;

function escapeHTML(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatNumber(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

async function checkBackend() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    if (data.status === "online") {
      document.querySelector(".live-label").innerHTML = '<span class="status-dot"></span> BACKEND CONNECTED';
    }
  } catch { /* The frontend can still be previewed without the backend. */ }
}
checkBackend();

function renderSatelliteResults(records) {
  const results = document.querySelector("#satellite-results");
  const count = document.querySelector("#satellite-count");
  if (!results || !count) return;
  count.textContent = `${records.length.toLocaleString()} objects found`;
  const visibleRecords = records.slice(0, 100);
  if (!records.length) {
    results.innerHTML = '<div class="empty-state">No matching objects in this catalogue. Try another name or NORAD ID.</div>';
    return;
  }
  results.innerHTML = visibleRecords.map((satellite, index) => `
    <button class="satellite-result" type="button" data-satellite-index="${index}">
      <span class="satellite-result-symbol">◉</span>
      <span class="satellite-result-name"><strong>${escapeHTML(satellite.OBJECT_NAME)}</strong><small>NORAD ID: ${escapeHTML(satellite.NORAD_CAT_ID)}</small></span>
      <span class="satellite-result-meta"><small>INCLINATION</small><strong>${formatNumber(satellite.INCLINATION)}°</strong></span>
      <span class="satellite-result-meta"><small>ECCENTRICITY</small><strong>${formatNumber(satellite.ECCENTRICITY, 4)}</strong></span>
      <span class="satellite-result-arrow">↗</span>
    </button>`).join("");
  results.querySelectorAll(".satellite-result").forEach((button, index) => {
    button.addEventListener("click", () => showSatelliteDetails(visibleRecords[index]));
  });
  if (records.length > visibleRecords.length) {
    results.insertAdjacentHTML("beforeend", '<div class="catalogue-limit-note">Showing the first 100 results. Use search to narrow the catalogue.</div>');
  }
}

function showSatelliteDetails(satellite) {
  const details = document.querySelector("#satellite-detail");
  if (!details) return;
  details.innerHTML = `
    <div class="eyebrow">OBJECT PROFILE / ORBITAL ELEMENTS</div><h3>${escapeHTML(satellite.OBJECT_NAME)}</h3>
    <div class="detail-grid">
      <div><small>NORAD CATALOG ID</small><strong>${escapeHTML(satellite.NORAD_CAT_ID)}</strong></div>
      <div><small>INTERNATIONAL DESIGNATOR</small><strong>${escapeHTML(satellite.INTLDES)}</strong></div>
      <div><small>DATA EPOCH (UTC)</small><strong>${escapeHTML(satellite.EPOCH)}</strong></div>
      <div><small>INCLINATION</small><strong>${formatNumber(satellite.INCLINATION)}°</strong></div>
      <div><small>ECCENTRICITY</small><strong>${formatNumber(satellite.ECCENTRICITY, 6)}</strong></div>
      <div><small>MEAN MOTION</small><strong>${formatNumber(satellite.MEAN_MOTION, 5)} rev/day</strong></div>
      <div><small>RAAN</small><strong>${formatNumber(satellite.RA_OF_ASC_NODE)}°</strong></div>
      <div><small>ARGUMENT OF PERICENTER</small><strong>${formatNumber(satellite.ARG_OF_PERICENTER)}°</strong></div>
    </div><p class="module-note">Published orbital elements, not live telemetry. These elements describe the orbit at the data epoch shown above.</p>`;
  details.hidden = false;
  details.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadSatelliteExplorer(group) {
  const results = document.querySelector("#satellite-results");
  const selector = document.querySelector("#satellite-group");
  if (!results || !selector) return;
  const selectedGroup = group || selector.value;
  results.innerHTML = '<div class="loading-state"><span class="loading-spinner"></span> Contacting CelesTrak catalogue…</div>';
  try {
    const response = await fetch(`/api/satellites?group=${encodeURIComponent(selectedGroup)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.details || payload.error || "Satellite data request failed.");
    satelliteRecords = payload.satellites || [];
    const search = document.querySelector("#satellite-search");
    const sourceNote = document.querySelector("#satellite-source-note");
    if (sourceNote) sourceNote.textContent = `Source: CelesTrak · ${payload.group} group · Retrieved: ${new Date(payload.fetchedAt).toLocaleString()} · ${payload.cached ? "cached" : "freshly fetched"}`;
    const heading = document.querySelector("#satellite-group-title");
    if (heading) heading.textContent = selector.options[selector.selectedIndex].text;
    const renderSearch = () => {
      const term = search.value.trim().toLowerCase();
      renderSatelliteResults(satelliteRecords.filter(s =>
        String(s.OBJECT_NAME || "").toLowerCase().includes(term) ||
        String(s.NORAD_CAT_ID || "").includes(term)
      ));
    };
    search.oninput = renderSearch;
    renderSearch();
  } catch (error) {
    results.innerHTML = `<div class="error-state">Unable to load the catalogue. ${escapeHTML(error.message)}<br><span>Check your internet connection and try again.</span><button id="retry-satellites" class="secondary-button" type="button">Retry connection</button></div>`;
    document.querySelector("#retry-satellites")?.addEventListener("click", () => loadSatelliteExplorer(selectedGroup));
  }
}

async function initOrbitalVisualizer() {
  const container = document.querySelector("#orbit-globe");
  if (!container || container.dataset.initialized === "true") return;
  container.dataset.initialized = "true";
  const status = document.querySelector("#orbit-status");
  const count = document.querySelector("#orbit-object-count");
  const selected = document.querySelector("#orbit-selected");
  try {
    status.textContent = "INITIALIZING 3D GLOBE…";
    const [Cesium, Satellite] = await Promise.all([import("cesium"), import("satellite.js")]);
    const viewer = new Cesium.Viewer(container, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      shouldAnimate: true
    });
    viewer.imageryLayers.addImageryProvider(new Cesium.UrlTemplateImageryProvider({
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      credit: "© OpenStreetMap contributors"
    }));
    viewer.scene.globe.enableLighting = true;
    // Ensure orbit lines are occluded by the Earth's surface on the far side.
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#050914");
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(15, 18, 24500000),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
    });
    viewer.clock.shouldAnimate = true;
    viewer.clock.multiplier = 1;

    const selectedGroup = document.querySelector("#orbit-group")?.value || "STATIONS";
    const response = await fetch(`/api/satellites?group=${encodeURIComponent(selectedGroup)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.details || payload.error || "Could not retrieve orbital elements.");
    const records = (payload.satellites || []).filter(item =>
      item.EPOCH && Number.isFinite(Number(item.MEAN_MOTION)) &&
      Number.isFinite(Number(item.MEAN_ANOMALY))
    ).slice(0, 80);
    if (!records.length) throw new Error("The catalogue did not return usable orbital elements.");

    const tracked = [];
    const palette = [
      Cesium.Color.fromCssColorString("#64e5f5"),
      Cesium.Color.fromCssColorString("#a996ff"),
      Cesium.Color.fromCssColorString("#7df0b5")
    ];
    for (const record of records) {
      try {
        const satrec = Satellite.json2satrec(record);
        const propagated = Satellite.propagate(satrec, new Date());
        if (!propagated?.position) continue;
        const gmst = Satellite.gstime(new Date());
        const geo = Satellite.eciToGeodetic(propagated.position, gmst);
        const longitude = Satellite.degreesLong(geo.longitude);
        const latitude = Satellite.degreesLat(geo.latitude);
        const altitude = Math.max(0, geo.height * 1000);
        const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude);
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(0, 0, 0)
        );
        const entity = viewer.entities.add({
          name: record.OBJECT_NAME,
          position,
          orientation,
          model: {
            uri: "/models/orbitwatch-satellite.gltf",
            scale: 1,
            minimumPixelSize: 18,
            maximumScale: 100000,
            runAnimations: false
          },
          label: {
            text: record.OBJECT_NAME,
            font: "10px monospace",
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.fromCssColorString("#081323").withAlpha(0.8),
            pixelOffset: new Cesium.Cartesian2(10, -10),
            scale: 0.8,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 9000000)
          }
        });
        tracked.push({ record, satrec, entity, paletteIndex: tracked.length });
      } catch (error) {
        console.warn("Skipping an orbital record:", record.OBJECT_NAME, error);
      }
    }
    if (!tracked.length) throw new Error("Could not calculate positions from the current orbital elements.");

    const orbitSamples = 36;
    for (const item of tracked.slice(0, 12)) {
      const periodMinutes = 1440 / Number(item.record.MEAN_MOTION);
      const path = [];
      for (let step = 0; step <= orbitSamples; step++) {
        const sampleDate = new Date(Date.now() + (periodMinutes * 60000 * step / orbitSamples));
        const sample = Satellite.propagate(item.satrec, sampleDate);
        if (!sample?.position) continue;
        const sampleGeo = Satellite.eciToGeodetic(sample.position, Satellite.gstime(sampleDate));
        path.push(Cesium.Cartesian3.fromDegrees(
          Satellite.degreesLong(sampleGeo.longitude),
          Satellite.degreesLat(sampleGeo.latitude),
          Math.max(0, sampleGeo.height * 1000)
        ));
      }
      if (path.length > 1) {
        viewer.entities.add({
          name: `${item.record.OBJECT_NAME} orbit`,
          polyline: {
            positions: path,
            width: 1.5,
            material: palette[item.paletteIndex % palette.length].withAlpha(0.48)
          }
        });
      }
    }

    let selectedItem = null;
    const renderSelectedDetails = () => {
      if (!selectedItem?.currentGeo) return;
      const geo = selectedItem.currentGeo;
      const period = 1440 / Number(selectedItem.record.MEAN_MOTION);
      selected.innerHTML = `
        <div class="orbit-selected-heading"><strong>${escapeHTML(selectedItem.record.OBJECT_NAME)}</strong><span>NORAD ID: ${escapeHTML(selectedItem.record.NORAD_CAT_ID)}</span></div>
        <div class="orbit-selected-metrics">
          <span><small>ALTITUDE</small><b>${formatNumber(geo.height, 1)} km</b></span>
          <span><small>LATITUDE</small><b>${formatNumber(Satellite.degreesLat(geo.latitude), 2)}°</b></span>
          <span><small>LONGITUDE</small><b>${formatNumber(Satellite.degreesLong(geo.longitude), 2)}°</b></span>
          <span><small>INCLINATION</small><b>${formatNumber(selectedItem.record.INCLINATION)}°</b></span>
          <span><small>ORBITAL PERIOD</small><b>${formatNumber(period, 1)} min</b></span>
          <span><small>DATA EPOCH</small><b>${escapeHTML(selectedItem.record.EPOCH)}</b></span>
        </div>`;
    };

    const updatePositions = () => {
      const now = new Date();
      const gmst = Satellite.gstime(now);
      for (const item of tracked) {
        const state = Satellite.propagate(item.satrec, now);
        if (!state?.position) continue;
        const geo = Satellite.eciToGeodetic(state.position, gmst);
        item.currentGeo = geo;
        const position = Cesium.Cartesian3.fromDegrees(
          Satellite.degreesLong(geo.longitude),
          Satellite.degreesLat(geo.latitude),
          Math.max(0, geo.height * 1000)
        );
        item.entity.position = position;
        item.entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(0, 0, 0)
        );
      }
      renderSelectedDetails();
    };
    let lastUpdate = 0;
    viewer.clock.onTick.addEventListener(() => {
      if (Date.now() - lastUpdate >= 1000) {
        lastUpdate = Date.now();
        updatePositions();
      }
    });
    viewer.selectedEntityChanged.addEventListener(entity => {
      if (!entity) return;
      selectedItem = tracked.find(candidate => candidate.entity === entity) || null;
      renderSelectedDetails();
    });
    count.textContent = `${tracked.length} objects plotted`;
    status.textContent = `${payload.group} DATA LOADED · ${payload.cached ? "CACHED" : "FRESH"}`;
    document.querySelector("#orbit-refresh").addEventListener("click", updatePositions);
    const groupSelector = document.querySelector("#orbit-group");
    groupSelector.onchange = () => {
      if (visualizerInstance && !visualizerInstance.isDestroyed()) visualizerInstance.destroy();
      visualizerInstance = null;
      const globe = document.querySelector("#orbit-globe");
      globe.dataset.initialized = "false";
      globe.innerHTML = "";
      document.querySelector("#orbit-selected").textContent = "Select a satellite marker on the globe to inspect it.";
      initOrbitalVisualizer();
    };
    const playButton = document.querySelector("#orbit-play");
    const speedButton = document.querySelector("#orbit-speed");
    const speeds = [1, 5, 20];
    let speedIndex = 0;
    playButton.addEventListener("click", () => {
      viewer.clock.shouldAnimate = !viewer.clock.shouldAnimate;
      playButton.textContent = viewer.clock.shouldAnimate ? "Pause" : "Resume";
      playButton.setAttribute("aria-pressed", String(!viewer.clock.shouldAnimate));
    });
    speedButton.addEventListener("click", () => {
      speedIndex = (speedIndex + 1) % speeds.length;
      viewer.clock.multiplier = speeds[speedIndex];
      speedButton.textContent = `Speed: ${speeds[speedIndex]}×`;
    });
    updatePositions();
    visualizerInstance = viewer;
  } catch (error) {
    console.error("Orbital visualizer failed:", error);
    status.textContent = "VISUALIZER ERROR";
    container.innerHTML = `<div class="globe-error">Unable to initialize the orbital view.<br><span>${escapeHTML(error.message)}</span><br><button id="retry-orbit" class="secondary-button">Retry visualizer</button></div>`;
    document.querySelector("#retry-orbit")?.addEventListener("click", () => {
      container.dataset.initialized = "false";
      initOrbitalVisualizer();
    });
  }
}

function showPage(pageName) {
  const page = pages[pageName] || pages.dashboard;
  const isDashboard = pageName === "dashboard";
  pageTitle.textContent = page.title;
  document.querySelector(".topbar .eyebrow").textContent = page.eyebrow;
  dashboardSections.forEach(section => { if (section) section.hidden = !isDashboard; });
  moduleView.hidden = isDashboard;

  if (!isDashboard) {
    if (pageName === "satellites") {
      moduleView.innerHTML = `
        <section class="module-hero satellite-hero"><div class="module-hero-icon">◉</div><div class="eyebrow">CELESTRAK / GP ORBITAL DATA</div><h2>Satellite Explorer</h2><p>Search a starter catalogue of space stations and inspect their published orbital elements.</p><span class="module-status-pill">LIVE CATALOGUE CONNECTION</span></section>
        <section class="module-details satellite-browser"><div class="satellite-toolbar"><div><div class="eyebrow">OBJECT DATABASE</div><h3 id="satellite-group-title">Space Stations</h3></div><span id="satellite-count" class="data-count">Loading catalogue…</span></div>
        <label class="catalogue-label" for="satellite-group">CATALOGUE GROUP</label><select id="satellite-group" class="catalogue-select"><option value="STATIONS">Space Stations</option><option value="ACTIVE">Active Satellites</option><option value="STARLINK">Starlink</option><option value="WEATHER">Weather Satellites</option><option value="GPS-OPS">GPS Operational</option></select>
        <input id="satellite-search" class="satellite-search" type="search" placeholder="Search by satellite name or NORAD ID…" autocomplete="off" />
        <div id="satellite-source-note" class="satellite-source-note">Waiting for catalogue response…</div><div id="satellite-results" class="satellite-results"></div></section>
        <section id="satellite-detail" class="module-details satellite-detail" hidden></section>`;
      document.querySelector("#satellite-group").addEventListener("change", event => {
        document.querySelector("#satellite-detail").hidden = true;
        loadSatelliteExplorer(event.target.value);
      });
      loadSatelliteExplorer("STATIONS");
    } else if (pageName === "visualizer") {
      moduleView.innerHTML = `
        <section class="module-hero satellite-hero visualizer-heading"><div><div class="eyebrow">CESIUMJS / SGP4 ORBIT PROPAGATION</div><h2>Orbital Visualizer</h2><p>Explore catalogue satellites around a 3D Earth. Positions are calculated estimates based on published orbital elements.</p></div><span class="module-status-pill">3D VIEW</span></section>
        <section class="orbit-workspace">
          <div class="orbit-catalogue-bar"><label for="orbit-group">CATALOGUE</label><select id="orbit-group" class="catalogue-select"><option value="STATIONS">Space Stations</option><option value="ACTIVE">Active Satellites</option><option value="STARLINK">Starlink</option><option value="WEATHER">Weather Satellites</option><option value="GPS-OPS">GPS Operational</option></select></div>
          <div class="orbit-toolbar"><div><span class="status-dot"></span><span id="orbit-status">CONNECTING TO ORBITAL DATA…</span></div><div class="orbit-toolbar-right"><span id="orbit-object-count">Loading objects…</span><button id="orbit-play" class="secondary-button" aria-pressed="false">Pause</button><button id="orbit-speed" class="secondary-button">Speed: 1×</button><button id="orbit-refresh" class="secondary-button">Refresh</button></div></div>
          <div id="orbit-globe" class="orbit-globe"></div>
          <div class="orbit-legend"><span><i class="legend-dot cyan"></i> Tracked satellite</span><span><i class="legend-line"></i> Estimated orbital path</span><span>Source: CelesTrak · selectable GP groups</span></div>
          <div id="orbit-selected" class="orbit-selected">Select a satellite marker on the globe to inspect it.</div>
        </section>
        <p class="module-note">Important: this is an educational visualization, not live spacecraft telemetry. SGP4 positions are estimates from the latest available orbital elements. The selected feed is a CelesTrak catalogue group. Only the first 80 usable objects are plotted at once for performance.</p>`;
      initOrbitalVisualizer();
    } else {
      moduleView.innerHTML = `
        <section class="module-hero"><div class="module-hero-icon">${page.icon}</div><div class="eyebrow">${page.eyebrow}</div><h2>${page.title}</h2><p>${page.description}</p><span class="module-status-pill">PLANNED</span></section>
        <section class="module-details"><div class="eyebrow">PLANNED CAPABILITIES</div><h3>What this module will do</h3><ul>${page.items.map(item => `<li>${item}</li>`).join("")}</ul><p class="module-note">This module will be implemented in a later development stage.</p></section>`;
    }
  }
  document.querySelectorAll(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === pageName));
}

function navigate(pageName) {
  history.replaceState(null, "", `#${pageName}`);
  showPage(pageName);
}
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", event => { event.preventDefault(); navigate(link.dataset.page); });
});
document.querySelector(".brand").addEventListener("click", event => { event.preventDefault(); navigate("dashboard"); });
document.querySelector("[data-open-page='visualizer']").addEventListener("click", event => { event.preventDefault(); navigate("visualizer"); });
showPage("dashboard");
