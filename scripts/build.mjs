import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundled = await build({
  entryPoints: [resolve(root, "src/main.js")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["es2020"],
});
const [template, css, favicon] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "src/style.css"), "utf8"),
  readFile(resolve(root, "favicon.svg"), "utf8"),
]);
const html = template
  .replace(
    /<link\s+rel="stylesheet"\s+href="\/src\/style.css"\s*\/?\s*>/,
    () => `<style>${css}</style>`,
  )
  .replace(
    /<script\s+type="module"\s+src="\/src\/main.js"><\/script>/,
    () =>
      `<script>${bundled.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>`,
  )
  .replace(
    'href="/favicon.svg"',
    `href="data:image/svg+xml,${encodeURIComponent(favicon)}"`,
  )
  .replace('class="brand" href="/"', 'class="brand" href="#"');
if (
  html.includes('src="/src/main.js"') ||
  html.includes('href="/src/style.css"')
) {
  throw new Error(
    "No se pudieron incorporar los recursos al archivo portátil.",
  );
}
await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(
  resolve(root, "dist/marea-negra.html"),
  html.replaceAll('href="./index.html"', 'href="./marea-negra.html"'),
);
await mkdir(resolve(root, "docs"), { recursive: true });
await writeFile(resolve(root, "docs/index.html"), html);
await writeFile(resolve(root, "docs/.nojekyll"), "");
console.log(
  `Versión portátil creada: dist/marea-negra.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB).`,
);
console.log("Publicación de GitHub Pages preparada: docs/index.html.");

// Standalone 3D preview: embeds Three.js and all assets for Pages subpaths and offline play.
const preview = await build({
  entryPoints: [resolve(root, "src/three/main.js")],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: ["es2020"],
  legalComments: "inline",
});
const previewTemplate = await readFile(resolve(root, "3d.html"), "utf8");
const previewCss = await readFile(resolve(root, "src/three/style.css"), "utf8");
const threeLicense = await readFile(
  resolve(root, "node_modules/three/LICENSE"),
  "utf8",
);
const previewHtml = previewTemplate
  .replace(
    "</head>",
    () => `<!-- Three.js license\n${threeLicense}-->\n</head>`,
  )
  .replace(
    '<link rel="stylesheet" href="./src/three/style.css" />',
    () => `<style>${previewCss}</style>`,
  )
  .replace(
    '<script type="module" src="./src/three/main.js"></script>',
    () =>
      `<script>${preview.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>`,
  )
  .replace(
    'href="./favicon.svg"',
    `href="data:image/svg+xml,${encodeURIComponent(favicon)}"`,
  );
if (
  previewHtml.includes('src="./src/three/') ||
  previewHtml.includes('href="./src/three/')
)
  throw new Error("Faltan recursos en la versión 3D.");
await writeFile(resolve(root, "docs/3d.html"), previewHtml);
await writeFile(
  resolve(root, "dist/3d.html"),
  previewHtml.replaceAll('href="./index.html"', 'href="./marea-negra.html"'),
);
console.log(
  `Travesía 3D preparada: docs/3d.html y dist/3d.html (${Math.round(Buffer.byteLength(previewHtml) / 1024)} KiB).`,
);
