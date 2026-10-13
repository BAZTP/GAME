import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3108";
const server = process.env.TEST_BASE_URL
  ? null
  : spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, PORT: "3108" },
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
  const errors = [],
    shaderErrors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") shaderErrors.push(m.text());
  });
  await page.goto(`${base}/docs/index.html`);
  assert.equal(
    await page.locator(".preview-3d-link").getAttribute("href"),
    "./3d.html",
  );
  await page.evaluate(() =>
    localStorage.setItem("marea-negra-v1", "preserve-campaign"),
  );
  await page.click(".preview-3d-link");
  await page.waitForSelector('#ocean[data-rendered="true"]');
  assert.ok(await page.locator("#unavailable").isHidden());
  await page.screenshot({ path: "test-results/3d-intro.png" });
  await context.setOffline(true); // Published preview carries its renderer and all resources.
  await page.click("#start");
  assert.ok(await page.locator(".mission").isVisible());
  assert.ok(await page.locator("#intro").isHidden());
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () => document.querySelector("#kills").textContent === "2 / 2",
    {},
    { timeout: 30000 },
  );
  await page.keyboard.up("Space");
  await page.keyboard.down("KeyD");
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector("#bearing").textContent.match(/(\d+)°/)[1],
      ) >= 19,
  );
  await page.keyboard.up("KeyD");
  await page.keyboard.down("KeyW");
  await page.waitForSelector("#collect:not([hidden])", { timeout: 30000 });
  await page.keyboard.up("KeyW");
  await page.keyboard.press("KeyE");
  assert.match(
    await page.locator("#dialog-title").textContent(),
    /El oro del Sol/,
  );
  await page.screenshot({ path: "test-results/3d-victory.png" });
  await page.click("#resume");
  await page.keyboard.down("KeyW");
  await page.waitForFunction(
    () => Number(document.querySelector("#speed").textContent) > 5,
  );
  await page.keyboard.up("KeyW");
  const bearing = await page.locator("#bearing").textContent();
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(650);
  await page.keyboard.up("KeyD");
  assert.notEqual(await page.locator("#bearing").textContent(), bearing);
  await page.keyboard.press("KeyC");
  assert.match(await page.locator("#camera").textContent(), /panorámica/);
  await page.keyboard.press("Escape");
  assert.ok(await page.locator("#dialog").isVisible());
  await page.waitForTimeout(250);
  const speed = await page.locator("#speed").textContent();
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#speed").textContent(), speed);
  await page.keyboard.press("Escape");
  assert.ok(await page.locator("#dialog").isHidden());
  await page.screenshot({ path: "test-results/3d-game.png" });
  await page.click("#pause");
  await page.click("#restart");
  await page.waitForTimeout(180);
  assert.equal(await page.locator("#kills").textContent(), "0 / 2");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("marea-negra-v1")),
    "preserve-campaign",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "PASS 3D escritorio: WebGL real, combate y hundimiento, navegación, cámara, pausa, reinicio, HTML sin conexión y campaña 2D intacta.",
  );
  await context.setOffline(false);
  await page.close();
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(`${base}/3d.html`);
  await phone.waitForSelector('#ocean[data-rendered="true"]');
  await phone.tap("#start");
  assert.ok(await phone.locator("#touch-controls").isVisible());
  const button = await phone.locator('[data-key="forward"]').boundingBox();
  await phone.mouse.move(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
  await phone.mouse.down();
  await phone.waitForFunction(
    () => Number(document.querySelector("#speed").textContent) > 4,
  );
  await phone.mouse.up();
  await phone.tap("#touch-fire");
  await phone.tap("#camera");
  assert.match(await phone.locator("#camera").textContent(), /panorámica/);
  await phone.tap("#pause");
  assert.ok(await phone.locator("#dialog").isVisible());
  await phone.tap("#resume");
  await phone.screenshot({ path: "test-results/3d-mobile.png" });
  await phone.setViewportSize({ width: 320, height: 740 });
  await phone.waitForTimeout(200);
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const overlap = await phone.evaluate(() => {
    const a = document.querySelector(".helm").getBoundingClientRect(),
      b = document.querySelector("#touch-fire").getBoundingClientRect();
    return a.right > b.left;
  });
  assert.equal(overlap, false);
  await phone.close();
  console.log(
    "PASS 3D móvil: avance táctil, disparo, cámara, pausa y controles a 390 y 320 px.",
  );
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  await fallback.goto(`${base}/docs/3d.html`);
  assert.ok(await fallback.locator("#unavailable").isVisible());
  assert.equal(
    await fallback.locator("#unavailable a").getAttribute("href"),
    "./index.html",
  );
  await fallback.close();
  console.log("PASS 3D sin WebGL: mensaje y acceso a la aventura 2D.");
  assert.deepEqual(errors, []);
  assert.deepEqual(shaderErrors, []);
  console.log("PASS cero errores de JavaScript o shaders.");
} finally {
  await browser?.close();
  server?.kill();
}
