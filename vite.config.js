import { defineConfig } from "vite";

export default defineConfig({
  // configure-pages supplies the repository path in CI; local development uses /.
  base: process.env.VITE_BASE_PATH || "/",
});
