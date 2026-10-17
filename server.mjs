import http from "node:http";
import { createAiHandler } from "./src/neocity/ai-server.mjs";
const handleAI = createAiHandler();
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
};
const server = http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (await handleAI(req, res, path)) return;
    const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
    if (
      !file.startsWith(root + sep) ||
      path.split("/").some((p) => p.startsWith(".")) ||
      ![".html", ".css", ".js", ".svg", ".mp4", ".jpg"].includes(extname(file))
    ) {
      res.writeHead(403).end("Acceso denegado");
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("No encontrado");
  }
});
server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log(`Marea Negra disponible en el puerto ${server.address().port}`),
);
