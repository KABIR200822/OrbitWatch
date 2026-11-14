import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

app.use(express.json());

const CELESTRAK_STATIONS_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=STATIONS&FORMAT=JSON";
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;
let stationsCache = null;
let stationsFetchedAt = null;

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    project: "OrbitWatch",
    message: "Mission control backend is running."
  });
});

app.get("/api/satellites", async (req, res) => {
  const cacheIsFresh =
    stationsCache && stationsFetchedAt &&
    Date.now() - stationsFetchedAt < CACHE_DURATION_MS;

  if (cacheIsFresh) {
    return res.json({
      source: "CelesTrak",
      group: "STATIONS",
      cached: true,
      fetchedAt: new Date(stationsFetchedAt).toISOString(),
      count: stationsCache.length,
      satellites: stationsCache
    });
  }

  try {
    const response = await fetch(CELESTRAK_STATIONS_URL, {
      headers: { "User-Agent": "OrbitWatch/1.0 educational project" },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`CelesTrak returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Unexpected data format received from CelesTrak.");
    }

    stationsCache = data;
    stationsFetchedAt = Date.now();

    res.json({
      source: "CelesTrak",
      group: "STATIONS",
      cached: false,
      fetchedAt: new Date(stationsFetchedAt).toISOString(),
      count: stationsCache.length,
      satellites: stationsCache
    });
  } catch (error) {
    console.error("Satellite catalogue error:", error.message);
    res.status(502).json({
      error: "Could not retrieve satellite data from CelesTrak.",
      details: error.message
    });
  }
});

if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(currentDirectory, "../dist");
  app.use(express.static(clientPath));

  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`OrbitWatch server running at http://localhost:${PORT}`);
});
