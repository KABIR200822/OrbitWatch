import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    project: "OrbitWatch",
    message: "Mission control backend is running."
  });
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
