import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    port: 5173,
    strictPort: true,
    // Listen on all interfaces, not just localhost, so the dev server is
    // reachable from other devices (a phone) on the same WiFi network.
    host: true,
  },
});