import "./style.css";

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
        <a class="nav-link active" href="#dashboard"><span>◈</span> Overview</a>
        <a class="nav-link" href="#satellites"><span>◉</span> Satellite Explorer</a>
        <a class="nav-link" href="#visualizer"><span>◎</span> Orbital Visualizer</a>
        <a class="nav-link" href="#debris"><span>✧</span> Debris Monitor</a>
        <a class="nav-link" href="#intelligence"><span>⌁</span> Space Intelligence</a>
      </nav>

      <div class="sidebar-bottom">
        <div class="system-indicator"><span class="status-dot"></span> SYSTEMS NOMINAL</div>
        <div class="sidebar-version">ORBITWATCH / BUILD 0.1</div>
      </div>
    </aside>

    <main class="main-content" id="dashboard">
      <header class="topbar">
        <div>
          <div class="eyebrow">EARTH ORBITAL ENVIRONMENT</div>
          <h1>Mission Overview</h1>
        </div>
        <div class="topbar-right">
          <div class="live-label"><span class="status-dot"></span> PLATFORM ONLINE</div>
          <div class="avatar">OW</div>
        </div>
      </header>

      <section class="welcome-panel">
        <div class="welcome-copy">
          <div class="eyebrow">ORBITAL AWARENESS PLATFORM</div>
          <h2>Eyes on orbit.<br /><span>Clarity beyond Earth.</span></h2>
          <p>Explore satellites, understand orbital activity, and monitor the increasingly crowded space environment.</p>
          <a class="primary-button" href="#visualizer">Explore the platform <span>↗</span></a>
        </div>
        <div class="orbit-art" aria-hidden="true">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <div class="planet"><div class="planet-glow"></div></div>
          <div class="satellite satellite-one">✦</div>
          <div class="satellite satellite-two">✧</div>
        </div>
        <div class="panel-coordinate">EARTH / LOW EARTH ORBIT</div>
      </section>

      <section class="section-heading">
        <div>
          <div class="eyebrow">ORBITAL SNAPSHOT</div>
          <h2>Environment at a glance</h2>
        </div>
        <span class="data-note">LIVE DATA CONNECTION — INTEGRATION PENDING</span>
      </section>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">TRACKED OBJECTS</div>
          <div class="stat-value">—</div>
          <div class="stat-foot">Catalogue connection pending</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">ACTIVE SATELLITES</div>
          <div class="stat-value">—</div>
          <div class="stat-foot">Awaiting orbital data</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">DEBRIS OBJECTS</div>
          <div class="stat-value">—</div>
          <div class="stat-foot">Catalogue connection pending</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">DATA SOURCE</div>
          <div class="stat-value source-value">CELESTRAK</div>
          <div class="stat-foot">Planned primary orbital feed</div>
        </article>
      </section>

      <section class="modules-section">
        <div class="section-heading">
          <div>
            <div class="eyebrow">PLATFORM MODULES</div>
            <h2>Explore OrbitWatch</h2>
          </div>
        </div>
        <div class="module-grid">
          <article class="module-card"><span class="module-icon">◉</span><h3>Satellite Explorer</h3><p>Search and inspect satellites and their orbital information.</p><span class="module-status">IN DEVELOPMENT</span></article>
          <article class="module-card"><span class="module-icon">◎</span><h3>Orbital Visualizer</h3><p>View Earth, satellite positions, and orbital paths in 3D.</p><span class="module-status">IN DEVELOPMENT</span></article>
          <article class="module-card"><span class="module-icon">✧</span><h3>Debris Monitor</h3><p>Understand catalogued space debris and orbital congestion.</p><span class="module-status">IN DEVELOPMENT</span></article>
          <article class="module-card"><span class="module-icon">⌁</span><h3>Space Intelligence</h3><p>Explore launches, mission information, and orbital insights.</p><span class="module-status">IN DEVELOPMENT</span></article>
        </div>
      </section>

      <footer>ORBITWATCH <span>•</span> BUILT FOR A CLEARER VIEW OF EARTH ORBIT</footer>
    </main>
  </div>
`;

async function checkBackend() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    const indicator = document.querySelector(".live-label");
    if (data.status === "online") {
      indicator.innerHTML = '<span class="status-dot"></span> BACKEND CONNECTED';
    }
  } catch {
    // The frontend can still be previewed while the backend is offline.
  }
}

checkBackend();
