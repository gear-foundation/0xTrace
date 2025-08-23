import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [tanstackRouter({ autoCodeSplitting: true }), react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
