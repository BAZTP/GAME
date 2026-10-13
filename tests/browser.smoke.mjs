import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { initialState, serialize, SAVE_KEY, ISLANDS } from "../src/game.js";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3107";
const server = process.env.TEST_BASE_URL
  ? null
  : spawn(process.execPath, ["server.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, PORT: "3107" },
      stdio: "ignore",
    });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      ready = (await fetch(baseURL)).ok;
      if (ready) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "HTTP server starts");
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  await mkdir(new URL("../test-results/", import.meta.url), {
    recursive: true,
  });
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await desktop.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ key }) => {
      const fixture = localStorage.getItem("__next_fixture");
      if (fixture) {
        localStorage.setItem(key, fixture);
        localStorage.removeItem("__next_fixture");
      }
    },
    { key: SAVE_KEY },
  );
  await page.goto(baseURL);
  await page.waitForTimeout(800);
  await page.screenshot({
    path: "test-results/desktop-intro.png",
    fullPage: true,
  });
  await page.click("#start-btn");
  assert.ok(await page.locator("#intro-overlay").isHidden());
  await page.click("#port-btn");
  await page.click('[data-upgrade="cannons"]');
  assert.equal(await page.locator("#gold-label").textContent(), "30");
  await page.click("#repair-btn");
  assert.match(await page.locator("#repair-btn").textContent(), /reparado/);
  await page.click("#leave-port");
  await page.keyboard.down("KeyD");
  await page.waitForTimeout(900);
  await page.keyboard.up("KeyD");
  await page.keyboard.press("Escape");
  const persisted = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    SAVE_KEY,
  );
  assert.ok(persisted.player.x > 600);
  assert.equal(persisted.upgrades.cannons, 1);
  await page.click("#resume-btn");
  await page.keyboard.press("KeyQ");
  await page.waitForTimeout(200);
  assert.equal(
    await page.locator("#realm-label").textContent(),
    "Mar espectral",
  );
  await page.keyboard.press("KeyQ");
  await page.keyboard.press("KeyM");
  assert.ok(await page.locator("#large-map").isVisible());
  await page.locator("#large-map").click({ position: { x: 300, y: 250 } });
  await page.waitForTimeout(150);
  assert.match(
    await page.locator("#target-text").textContent(),
    /Rumbo marcado/,
  );
  await page.click("#log-btn");
  assert.match(await page.locator("#modal-title").textContent(), /Historias/);
  await page.click("#journal-done");
  await page.reload();
  assert.ok(await page.locator("#continue-btn").isVisible());
  await page.click("#continue-btn");
  assert.equal(await page.locator("#gold-label").textContent(), "30");
  await page.screenshot({
    path: "test-results/desktop-game.png",
    fullPage: true,
  });

  async function fixture(s) {
    await page.evaluate(
      (value) => localStorage.setItem("__next_fixture", value),
      serialize(s),
    );
    await page.reload();
    await page.click("#continue-btn");
  }
  function atIsland(id) {
    const s = initialState(),
      i = ISLANDS.find((i) => i.id === id);
    s.player.x = i.x;
    s.player.y = i.y + i.r + 65;
    return s;
  }
  const fleetState = initialState();
  fleetState.player.gold = 2000;
  fleetState.relics = ["sun", "moon"];
  fleetState.sunk = 4;
  await fixture(fleetState);
  await page.click("#fleet-btn");
  await page.click('[data-ship="brig"]');
  await page.click('[data-ship="galleon"]');
  await page.click('[data-ship="phantom"]');
  assert.equal(await page.locator("#ship-name").textContent(), "Alma Errante");
  await page.screenshot({ path: "test-results/fleet.png", fullPage: true });
  await page.click('[data-port-tab="contracts"]');
  await page.click('[data-contract="hunter"]');
  assert.ok(await page.locator('[data-contract="hunter"]').isDisabled());
  assert.equal(await page.locator("#gold-label").textContent(), "950");
  await page.click("#contracts-done");
  await page.keyboard.press("KeyF");
  await page.waitForTimeout(150);
  assert.equal(
    await page.locator("#realm-label").textContent(),
    "Mar espectral",
  );
  assert.ok(await page.locator("#ability-btn").isDisabled());
  await page.keyboard.press("Escape");
  await page.reload();
  await page.click("#continue-btn");
  assert.equal(await page.locator("#ship-name").textContent(), "Alma Errante");
  assert.equal(await page.locator("#gold-label").textContent(), "950");
  console.log(
    "PASS flota: compra y cambio de barcos, contratos, habilidad F y persistencia.",
  );
  await fixture(atIsland("sun"));
  await page.keyboard.press("KeyE");
  assert.equal(
    await page.locator("#modal-title").textContent(),
    "El oro del sol",
  );
  assert.equal(await page.locator("#quest-count").textContent(), "1 / 3");
  await page.click("#story-done");
  await fixture(atIsland("moon"));
  await page.keyboard.press("KeyE");
  assert.equal(await page.locator("#modal").isVisible(), false);
  await page.keyboard.press("KeyQ");
  await page.keyboard.press("KeyE");
  assert.equal(
    await page.locator("#modal-title").textContent(),
    "La lágrima de luna",
  );
  await page.click("#story-done");
  await page.screenshot({
    path: "test-results/spectral-sea.png",
    fullPage: true,
  });
  const final = initialState();
  final.relics = ["sun", "moon", "tide"];
  final.looted = [...final.relics];
  final.bossAwake = true;
  final.realm = "spectral";
  final.player.x = 2750;
  final.player.y = 1000;
  final.enemies = [
    {
      id: "admiral",
      x: 2750,
      y: 920,
      homeX: 2750,
      homeY: 920,
      angle: 0,
      hp: 28,
      maxHp: 520,
      realm: "spectral",
      boss: true,
      cooldown: 5,
      hit: 0,
      dead: false,
    },
  ];
  await fixture(final);
  await page.keyboard.press("Space");
  await page.waitForSelector("#victory-continue");
  assert.equal(
    await page.locator("#modal-title").textContent(),
    "Ahora eres leyenda.",
  );
  await page.click("#victory-continue");
  await page.reload();
  await page.click("#continue-btn");
  assert.match(await page.locator("#quest-tip").textContent(), /leyenda/);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "PASS escritorio: inicio, navegación, astillero, guardado, mapa, bitácora, reliquias, velo y victoria.",
  );

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const phone = await mobile.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  await phone.goto(baseURL);
  await phone.tap("#start-btn");
  assert.ok(await phone.locator("#touch-controls").isVisible());
  const right = await phone.locator('[data-move="right"]').boundingBox();
  await phone.mouse.move(right.x + right.width / 2, right.y + right.height / 2);
  await phone.mouse.down();
  await phone.waitForTimeout(800);
  await phone.mouse.up();
  await phone.tap("#realm-btn");
  await phone.waitForTimeout(150);
  assert.equal(
    await phone.locator("#realm-label").textContent(),
    "Mar espectral",
  );
  await phone.tap("#touch-fire");
  await phone.tap("#touch-boost");
  await phone.tap("#pause-btn");
  assert.ok(await phone.locator("#resume-btn").isVisible());
  const mobileSave = await phone.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    SAVE_KEY,
  );
  assert.ok(mobileSave.player.x > 590);
  await phone.tap("#resume-btn");
  await phone.tap("#mini-map-btn");
  assert.ok(await phone.locator("#large-map").isVisible());
  await phone.tap("#map-done");
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await phone.screenshot({
    path: "test-results/mobile-game.png",
    fullPage: true,
  });
  await phone.setViewportSize({ width: 320, height: 740 });
  await phone.waitForTimeout(150);
  assert.equal(
    await phone.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "PASS móvil: controles táctiles, navegación, velo, disparo, impulso, pausa y mapa; sin desbordamiento a 390 y 320 px.",
  );
  const offline = await browser.newContext();
  const portable = await offline.newPage();
  portable.on("pageerror", (error) => errors.push(error.message));
  await portable.goto(`${baseURL}/dist/marea-negra.html`);
  await offline.setOffline(true);
  await portable.click("#start-btn");
  await portable.keyboard.press("KeyQ");
  await portable.waitForTimeout(180);
  assert.equal(
    await portable.locator("#realm-label").textContent(),
    "Mar espectral",
  );
  await portable.keyboard.press("Escape");
  await offline.setOffline(false);
  await portable.reload();
  assert.ok(await portable.locator("#continue-btn").isVisible());
  await portable.click("#continue-btn");
  assert.equal(
    await portable.locator("#realm-label").textContent(),
    "Mar espectral",
  );
  console.log(
    "PASS HTML portátil: juego y guardado sin conexión; restauración al recargar por HTTP.",
  );
  assert.deepEqual(errors, []);
  const watch = await desktop.newPage();
  watch.on("pageerror", (error) => errors.push(error.message));
  await watch.goto(`${baseURL}/docs/video.html`);
  await watch.evaluate(async () => {
    const video = document.querySelector("video");
    video.muted = true;
    await video.play();
  });
  await watch.waitForTimeout(1300);
  const playback = await watch.evaluate(() => {
    const video = document.querySelector("video");
    return {
      time: video.currentTime,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      error: video.error?.message,
    };
  });
  assert.ok(playback.time > 0.5);
  assert.ok(playback.duration > 35 && playback.duration < 65);
  assert.equal(playback.width, 1280);
  assert.equal(playback.height, 720);
  assert.equal(playback.error, undefined);
  assert.deepEqual(errors, []);
  console.log(
    "PASS video: página de reproducción y MP4 horizontal reproducidos en Chromium.",
  );
  console.log("PASS cero errores JavaScript del navegador.");
} finally {
  if (browser) await browser.close();
  server?.kill();
}
