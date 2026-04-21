import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const coopHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
};

export default defineConfig({
  plugins: [react()],
  server: {
    headers: coopHeaders,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    headers: coopHeaders,
  },
});
