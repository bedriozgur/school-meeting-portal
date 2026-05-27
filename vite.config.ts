import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

function getGitHash() {
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_GIT_HASH__: JSON.stringify(getGitHash()),
    __BUILD_TIMESTAMP__: JSON.stringify(new Date().toISOString()),
  },
});
