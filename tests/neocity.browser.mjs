import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { initialCity, serialize, SAVE_KEY } from "../src/neocity/game.js";
import { NPCS } from "../src/neocity/world.js";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3111";
const server = process.env.TEST_BASE_URL
  ? null
  : spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, PORT: "3111" },
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
  const context = await browser.newContext({
      viewport: { width: 1360, height: 900 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript((key) => {
    const fixture = localStorage.getItem("__neo_fixture");
    if (fixture) {
      localStorage.setItem(key, fixture);
      localStorage.removeItem("__neo_fixture");
    }
  }, SAVE_KEY);
  await page.goto(`${base}/docs/index.html`);
  await page.click(".city-link");
  await page.waitForSelector('#world[data-rendered="true"]');
  assert.equal(await page.locator("#ai-mode").textContent(), "Diálogo local");
  await page.screenshot({ path: "test-results/neocity-intro.png" });
  await page.click("#start");
  await page.keyboard.down("KeyW");
  await page.waitForSelector("#interact:not([hidden])", { timeout: 20000 });
  await page.keyboard.up("KeyW");
  await page.click("#interact");
  assert.equal(await page.locator("#npc-name").textContent(), "Luna Vex");
  await page
    .getByRole("button", { name: "Ayudar a la ciudad", exact: true })
    .click();
  await page.fill("#message", "¿Qué recuerdas de mí?");
  await page.click("#send");
  await page.waitForFunction(() =>
    document
      .querySelector("#chat-log")
      .lastElementChild.textContent.includes("Recuerdo esto:"),
  );
  assert.match(await page.locator("#chat-log").textContent(), /confió/);
  await page.screenshot({ path: "test-results/neocity-chat.png" });
  await page.click("#close-chat");
  await page.keyboard.press("KeyM");
  assert.ok(await page.locator(".map-canvas").isVisible());
  await page.click("#close-modal");
  await page.keyboard.press("KeyJ");
  assert.match(await page.locator(".memory-list").textContent(), /confió/);
  await page.click("#close-modal");
  await page.reload();
  await page.click("#continue");
  assert.match(await page.locator("#objective").textContent(), /tres celdas/);
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    SAVE_KEY,
  );
  assert.ok(stored.memories.luna.facts.length > 0);
  assert.ok(
    stored.memories.luna.chat.some((c) => c.text.includes("Recuerdo esto")),
  );
  async function fixture(s) {
    await page.evaluate(
      (raw) => localStorage.setItem("__neo_fixture", raw),
      serialize(s),
    );
    await page.reload();
    await page.click("#continue");
    await page.waitForSelector("#interact:not([hidden])");
    await page.click("#interact");
  }
  const betrayed = initialCity();
  betrayed.started = true;
  Object.assign(
    betrayed.player,
    NPCS.find((n) => n.id === "echo"),
  );
  await fixture(betrayed);
  await page.getByRole("button", { name: /Vender el registro/ }).click();
  await page.fill("#message", "hola");
  await page.click("#send");
  await page.waitForFunction(() =>
    document
      .querySelector("#chat-log")
      .lastElementChild.textContent.includes("Vendiste mi registro"),
  );
  await page.click("#close-chat");
  await page.reload();
  await page.click("#continue");
  await page.waitForSelector("#interact:not([hidden])");
  await page.click("#interact");
  assert.match(await page.locator("#chat-log").textContent(), /Vendiste/);
  await page.click("#close-chat");
  const end = initialCity();
  end.started = true;
  end.completed = ["power", "garden", "audit"];
  end.choices = { echo: "protected", evidence: "reveal" };
  Object.assign(
    end.player,
    NPCS.find((n) => n.id === "atlas"),
  );
  await fixture(end);
  await page.getByRole("button", { name: /Consejo ciudadano/ }).click();
  await page.click("#close-chat");
  assert.match(
    await page.locator("#objective").textContent(),
    /Sigue explorando/,
  );
  await page.screenshot({ path: "test-results/neocity-ending.png" });
  // Fake provider tests the integration; it is not a live model verification.
  await page.route("**/api/neocity/status", (r) =>
    r.fulfill({ json: { available: true } }),
  );
  let payload;
  await page.route("**/api/neocity/chat", (r) => {
    payload = r.request().postDataJSON();
    return r.fulfill({
      json: {
        reply: "<img src=x onerror=alert(1)> Recuerdo la decisión del consejo.",
      },
    });
  });
  await page.reload();
  await page.click("#continue");
  await page.waitForFunction(
    () => document.querySelector("#ai-mode").textContent === "IA conectada",
  );
  await page.waitForSelector("#interact:not([hidden])");
  await page.click("#interact");
  await page.fill("#message", "¿Qué cambió?");
  await page.click("#send");
  await page.waitForFunction(() =>
    document
      .querySelector("#chat-log")
      .textContent.includes("Recuerdo la decisión del consejo."),
  );
  assert.equal(await page.locator("#chat-log img").count(), 0);
  assert.equal(payload.npc, "atlas");
  assert.ok(payload.facts.some((x) => x.includes("EL CONSEJO")));
  assert.equal(payload.message, "¿Qué cambió?");
  await page.click("#close-chat");
  await context.setOffline(true);
  await page.keyboard.press("KeyW");
  await page.keyboard.press("KeyM");
  assert.ok(await page.locator(".map-canvas").isVisible());
  await context.setOffline(false);
  await page.close();
  console.log(
    "PASS NeoCity escritorio: ciudad WebGL, movimiento, misión, diálogo local, memoria persistente, traición, final y puente de IA con proveedor simulado.",
  );
  const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 1,
    }),
    phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(`${base}/docs/neocity.html`);
  await phone.waitForSelector('#world[data-rendered="true"]');
  await phone.tap("#start");
  const up = await phone.locator('[data-move="up"]').boundingBox();
  await phone.mouse.move(up.x + up.width / 2, up.y + up.height / 2);
  await phone.mouse.down();
  await phone.waitForSelector("#interact:not([hidden])", { timeout: 20000 });
  await phone.mouse.up();
  await phone.tap("#interact");
  await phone.fill("#message", "hola");
  await phone.tap("#send");
  assert.match(await phone.locator("#chat-log").textContent(), /Bienvenido/);
  await phone.screenshot({ path: "test-results/neocity-mobile.png" });
  await phone.tap("#close-chat");
  await phone.tap("#map-btn");
  assert.ok(await phone.locator(".map-canvas").isVisible());
  await phone.tap("#close-modal");
  for (const width of [320, 390, 700, 850]) {
    await phone.setViewportSize({ width, height: 844 });
    assert.equal(
      await phone.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await phone.close();
  console.log(
    "PASS NeoCity móvil: caminar, conversar, mapa y diseño adaptable.",
  );
  const fallback = await browser.newPage();
  await fallback.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...args) {
      return t.startsWith("webgl") ? null : orig.call(this, t, ...args);
    };
  });
  await fallback.goto(`${base}/docs/neocity.html`);
  assert.ok(await fallback.locator("#unavailable").isVisible());
  await fallback.close();
  assert.deepEqual(errors, []);
  console.log("PASS salida sin WebGL y cero errores JavaScript.");
} finally {
  await browser?.close();
  server?.kill();
}
