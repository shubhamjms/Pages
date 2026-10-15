import { defineConfig } from "vite";
import { generateContent } from "./scripts/generate-content.mjs";

export default defineConfig({
  base: "/Pages/",
  plugins: [
    {
      name: "fieldnotes-content",
      buildStart() {
        generateContent();
      },
      configureServer(server) {
        let timer;

        server.watcher.add(["content/**/*", "templates/blogs/*.html"]);
        server.watcher.on("all", (_event, changedPath) => {
          if (!changedPath.includes("content") && !changedPath.includes("templates")) return;

          clearTimeout(timer);
          timer = setTimeout(() => {
            generateContent();
            server.ws.send({ type: "full-reload" });
          }, 80);
        });
      },
    },
  ],
});