import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3109";
const server = process.env.TEST_BASE_URL
  ? null
  : spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, PORT: "3109" },
      stdio: "ignore",
    });
let browser;
try {
  let ready = false;
  for (let n = 0; n < 40; n++) {
    try {
      ready = (await fetch(base)).ok;
      if (ready) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready);
  await mkdir("test-results", { recursive: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/docs/index.html`);
  assert.equal(
    await page.locator('.mode-switch [aria-current="page"]').textContent(),
    "2D",
  );
  await page.click("#start-btn");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(950);
  await page.keyboard.up("KeyD");
  await page.click('.mode-switch [aria-current="page"]');
  assert.ok(await page.locator("#intro-overlay").isHidden());
  await page.click('.mode-switch a[href="./3d.html"]');
  await page.waitForSelector('#ocean[data-rendered="true"]');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("marea-negra-v1")),
  );
  assert.ok(saved.player.x > 600, "leaving 2D saves recent movement");
  assert.equal(
    await page.locator('.mode-switch [aria-current="page"]').textContent(),
    "3D",
  );
  await page.click("#start");
  await page.click('.mode-switch [aria-current="page"]');
  assert.ok(await page.locator("#intro").isHidden());
  await page.click('.mode-switch a[href="./index.html"]');
  await page.click("#continue-btn");
  await page.keyboard.press("Escape");
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("marea-negra-v1")),
  );
  assert.equal(restored.player.x, saved.player.x);
  await page.click("#resume-btn");
  for (const file of ["index.html", "3d.html"]) {
    await page.goto(`${base}/docs/${file}`);
    if (file === "3d.html")
      await page.waitForSelector('#ocean[data-rendered="true"]');
    for (const width of [320, 390, 700, 701, 850, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(120);
      const layout = await page.evaluate(() => {
        const nodes = [...document.querySelector(".topbar").children].filter(
          (e) => getComputedStyle(e).display !== "none",
        );
        const rects = nodes.map((e) => e.getBoundingClientRect());
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlap: rects.some((a, i) =>
            rects
              .slice(i + 1)
              .some(
                (b) =>
                  Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
                  Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
              ),
          ),
          selectorVisible: [
            ...document.querySelectorAll(".mode-switch a"),
          ].every((a) => {
            const r = a.getBoundingClientRect();
            return (
              r.left >= 0 &&
              r.right <= innerWidth &&
              r.width >= 35 &&
              r.height >= 30
            );
          }),
        };
      });
      assert.equal(layout.overflow, false, `${file} overflow at ${width}`);
      assert.equal(
        layout.overlap,
        false,
        `${file} topbar overlaps at ${width}`,
      );
      assert.equal(
        layout.selectorVisible,
        true,
        `${file} selector visible at ${width}`,
      );
      if (width === 390 || width === 1440)
        await page.screenshot({
          path: `test-results/modes-${file.replace(".html", "")}-${width}.png`,
        });
    }
  }
  await page.goto(`${base}/dist/marea-negra.html`);
  assert.equal(
    await page.locator(".mode-switch a").first().getAttribute("href"),
    "./marea-negra.html",
  );
  await page.click('.mode-switch a[href="./3d.html"]');
  await page.waitForSelector('#ocean[data-rendered="true"]');
  assert.equal(
    await page.locator(".mode-switch a").first().getAttribute("href"),
    "./marea-negra.html",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS selector 2D / 3D: navegación de ida y vuelta, guardado, vista activa, barras sin solapamientos a siete tamaños y enlaces portátiles.",
  );
} finally {
  await browser?.close();
  server?.kill();
}
