import { defineConfig } from "vite";
import cesium from "vite-plugin-cesium";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "true" ? "/OrbitWatch/" : "/",
  plugins: [cesium()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});