import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const app = express();
const PORT = process.env.PORT || 3000;
const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const cacheDirectory = path.join(currentDirectory, ".cache");

app.use(express.json());

// The GitHub Pages frontend is static and calls this read-only public API.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;
const ERROR_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const UPDATE_BUFFER_MS = 60 * 1000;
const ALLOWED_GROUPS = new Set(["STATIONS", "ACTIVE", "STARLINK", "WEATHER", "GPS-OPS"]);
const groupCache = new Map();
const inFlightRequests = new Map();
const groupCooldowns = new Map();
const GROUP_COOLDOWNS_FILE = path.join(cacheDirectory, "celestrak-group-cooldowns.json");

async function readDiskCache(group) {
  if (groupCache.has(group)) return groupCache.get(group);

  try {
    const raw = await readFile(path.join(cacheDirectory, `${group}.json`), "utf8");
    const entry = JSON.parse(raw);
    if (Array.isArray(entry.satellites) && Number.isFinite(entry.fetchedAt)) {
      groupCache.set(group, entry);
      return entry;
    }
  } catch {
    // No saved cache is available yet.
  }
  return null;
}

async function readGroupCooldowns() {
  try {
    const saved = JSON.parse(await readFile(GROUP_COOLDOWNS_FILE, "utf8"));
    for (const [group, until] of Object.entries(saved)) {
      if (ALLOWED_GROUPS.has(group) && Number.isFinite(until) && until > Date.now()) {
        groupCooldowns.set(group, until);
      }
    }
  } catch {
    // No saved per-group cooldowns yet.
  }
}

async function saveGroupCooldown(group, until) {
  await mkdir(cacheDirectory, { recursive: true });
  groupCooldowns.set(group, until);
  const saved = Object.fromEntries(groupCooldowns);
  await writeFile(GROUP_COOLDOWNS_FILE, JSON.stringify(saved, null, 2), "utf8");
}

function getNextAllowedTime(errorMessage) {
  const match = errorMessage.match(/at (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC/i);
  if (match) {
    const lastDownload = Date.parse(`${match[1].replace(" ", "T")}Z`);
    if (Number.isFinite(lastDownload)) {
      return lastDownload + ERROR_COOLDOWN_MS + UPDATE_BUFFER_MS;
    }
  }
  return Date.now() + ERROR_COOLDOWN_MS + UPDATE_BUFFER_MS;
}

async function saveDiskCache(group, entry) {
  await mkdir(cacheDirectory, { recursive: true });
  const filePath = path.join(cacheDirectory, `${group}.json`);
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(entry), "utf8");
  const { rename } = await import("node:fs/promises");
  await rename(temporaryPath, filePath);
}

function sendCatalogue(res, group, entry, cached, stale = false) {
  return res.json({
    source: "CelesTrak",
    group,
    cached,
    stale,
    fetchedAt: new Date(entry.fetchedAt).toISOString(),
    count: entry.satellites.length,
    satellites: entry.satellites
  });
}

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

  await readGroupCooldowns();
  const cachedEntry = await readDiskCache(requestedGroup);
  const cacheIsFresh = cachedEntry &&
    Date.now() - cachedEntry.fetchedAt < CACHE_DURATION_MS;

  if (cacheIsFresh) return sendCatalogue(res, requestedGroup, cachedEntry, true);

  const cooldownUntil = groupCooldowns.get(requestedGroup) || 0;
  if (Date.now() < cooldownUntil) {
    if (cachedEntry) return sendCatalogue(res, requestedGroup, cachedEntry, true, true);
    return res.status(503).json({
      error: `${requestedGroup} is waiting for the next CelesTrak data update.`,
      retryAfter: new Date(cooldownUntil).toISOString(),
      details: "OrbitWatch will wait until CelesTrak's next update window before requesting this catalogue again."
    });
  }

  if (inFlightRequests.has(requestedGroup)) {
    try {
      const entry = await inFlightRequests.get(requestedGroup);
      return sendCatalogue(res, requestedGroup, entry, true);
    } catch (error) {
      if (cachedEntry) return sendCatalogue(res, requestedGroup, cachedEntry, true);
      return res.status(502).json({
        error: `Could not retrieve the ${requestedGroup} catalogue from CelesTrak.`,
        details: error.message
      });
    }
  }

  const requestPromise = (async () => {
    const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(requestedGroup)}&FORMAT=JSON`;
    const response = await fetch(url, {
      headers: { "User-Agent": "OrbitWatch/1.0 educational project" },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const responseDetails = (await response.text()).slice(0, 1200).trim();
      const error = new Error(
        `CelesTrak returned HTTP ${response.status}${responseDetails ? `: ${responseDetails}` : ""}`
      );
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected data format received from CelesTrak.");

    const entry = { satellites: data, fetchedAt: Date.now() };
    await saveDiskCache(requestedGroup, entry);
    groupCache.set(requestedGroup, entry);
    return entry;
  })();

  inFlightRequests.set(requestedGroup, requestPromise);

  try {
    const entry = await requestPromise;
    return sendCatalogue(res, requestedGroup, entry, false);
  } catch (error) {
    console.error(`Satellite catalogue error (${requestedGroup}):`, error.message);

    if (error.status === 403) {
      const until = getNextAllowedTime(error.message);
      try {
        await saveGroupCooldown(requestedGroup, until);
        console.error(`${requestedGroup} catalogue paused until ${new Date(until).toISOString()}.`);
      } catch (saveError) {
        groupCooldowns.set(requestedGroup, until);
        console.error("Could not persist CelesTrak cooldown:", saveError.message);
      }
    }

    if (cachedEntry) return sendCatalogue(res, requestedGroup, cachedEntry, true, true);

    return res.status(502).json({
      error: `Could not retrieve the ${requestedGroup} catalogue from CelesTrak.`,
      details: error.message
    });
  } finally {
    inFlightRequests.delete(requestedGroup);
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
  console.log("OrbitWatch satellite catalogue cache is enabled (two-hour refresh interval).");
  console.log(`OrbitWatch server running at http://localhost:${PORT}`);
});
