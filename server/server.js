import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

app.use(express.json());

const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;
const ALLOWED_GROUPS = new Set(["STATIONS", "ACTIVE", "STARLINK", "WEATHER", "GPS-OPS"]);
const groupCache = new Map();

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    project: "OrbitWatch",
    message: "Mission control backend is running."
  });
});

app.get("/api/satellites", async (req, res) => {
  const requestedGroup = String(req.query.group || "STATIONS").toUpperCase();
  if (!ALLOWED_GROUPS.has(requestedGroup)) {
    return res.status(400).json({
      error: "Unsupported CelesTrak group.",
      allowedGroups: [...ALLOWED_GROUPS]
    });
  }

  const cachedEntry = groupCache.get(requestedGroup);
  const cacheIsFresh = cachedEntry &&
    Date.now() - cachedEntry.fetchedAt < CACHE_DURATION_MS;

  if (cacheIsFresh) {
    return res.json({
      source: "CelesTrak",
      group: requestedGroup,
      cached: true,
      fetchedAt: new Date(cachedEntry.fetchedAt).toISOString(),
      count: cachedEntry.satellites.length,
      satellites: cachedEntry.satellites
    });
  }

  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(requestedGroup)}&FORMAT=JSON`;
    const response = await fetch(url, {
      headers: { "User-Agent": "OrbitWatch/1.0 educational project" },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`CelesTrak returned HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected data format received from CelesTrak.");

    const entry = { satellites: data, fetchedAt: Date.now() };
    groupCache.set(requestedGroup, entry);
    res.json({
      source: "CelesTrak",
      group: requestedGroup,
      cached: false,
      fetchedAt: new Date(entry.fetchedAt).toISOString(),
      count: data.length,
      satellites: data
    });
  } catch (error) {
    console.error(`Satellite catalogue error (${requestedGroup}):`, error.message);
    res.status(502).json({
      error: `Could not retrieve the ${requestedGroup} catalogue from CelesTrak.`,
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
