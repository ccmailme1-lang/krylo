import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@ablinq-nooma/shared-kinetic": path.resolve(
        __dirname, "../../packages/shared-kinetic/index.js"
      ),
      "@ablinq-nooma/shared-ui": path.resolve(
        __dirname, "../../packages/shared-ui/index.js"
      ),
    },
  },
  server: {
    port: 3002,
  },
  build: {
    outDir: "dist",
  },
});