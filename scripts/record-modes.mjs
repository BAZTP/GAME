// Gameplay real, títulos en español y cambio de vista con el selector de la barra.
import { chromium } from "playwright";
import { mkdir, writeFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { initialState, serialize, SAVE_KEY, enemy } from "../src/game.js";
const base = process.env.DEMO_BASE_URL || "http://127.0.0.1:3000";
const root = process.env.MODES_WORK_DIR || "/tmp/marea-modes";
await mkdir(root, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(
  ({ key }) => {
    const next = localStorage.getItem("__modes_fixture");
    if (next) {
      localStorage.setItem(key, next);
      localStorage.removeItem("__modes_fixture");
    }
  },
  { key: SAVE_KEY },
);
await page.goto(base);
const cdp = await context.newCDPSession(page);
const wait = (ms) => page.waitForTimeout(ms);
const shared = `.video-caption{position:fixed;bottom:0;left:0;right:0;height:72px;background:#102d35;z-index:99;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:0 34px;color:#eee4c7;font:18px Arial,sans-serif;border-top:1px solid #dac08355}.video-caption b{color:#d8c28b;font:22px Georgia,serif;white-space:nowrap}.video-caption span{text-align:right;font-size:16px;color:#cbd9ca}.mode-switch{outline:2px solid #bdab74;outline-offset:4px}.video-end{position:fixed;inset:84px 0 72px;z-index:80;background:#102d35de;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#f4e9cd;backdrop-filter:blur(4px)}.video-end small{font:12px Arial;letter-spacing:4px;color:#d5bc7d}.video-end h1{font:65px Georgia;margin:22px 0}.video-end p{font:24px Georgia;color:#cfdbcd}.video-end b{font:23px Arial;color:#e5cd97;padding:18px 28px;border:1px solid #c6b17e;margin-top:18px}`;
async function caption(title, text, two = false) {
  await page.addStyleTag({
    content:
      shared +
      (two
        ? `.dashboard{display:block;padding:12px 24px;max-width:none}.sidebar{display:none!important}.topbar{height:80px}.sea-topline{height:25px}.game-frame{height:510px!important;min-height:0!important;max-height:none}.controls-bar,.sea-bottomline{display:none}.intro-overlay{padding:20px}.toast-stack{max-width:260px}.bottom-hud{bottom:20px}`
        : `.bottom-hud{bottom:89px}.controls-legend{display:none}.notice{top:178px}`),
  });
  await page.evaluate(
    ({ title, text }) => {
      document.querySelector(".video-caption")?.remove();
      const d = document.createElement("div");
      d.className = "video-caption";
      const b = document.createElement("b");
      b.textContent = title;
      const s = document.createElement("span");
      s.textContent = text;
      d.append(b, s);
      document.body.append(d);
    },
    { title, text },
  );
}
async function prepare(s) {
  await page.evaluate(
    (value) => localStorage.setItem("__modes_fixture", value),
    serialize(s),
  );
  await page.goto(base);
  await page.click("#continue-btn");
  await wait(200);
}
async function ffmpeg(args) {
  await new Promise((resolve, reject) => {
    const p = spawn(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", ...args],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let error = "";
    p.stderr.on("data", (d) => (error += d));
    p.on("error", reject);
    p.on("exit", (code) => (code ? reject(new Error(error)) : resolve()));
  });
}
const clips = [];
const selectedScenes = process.env.MODES_SCENES?.split(",");
async function record(name, action) {
  if (selectedScenes && !selectedScenes.includes(name)) {
    await access(`${root}/${name}.mp4`);
    clips.push(`${root}/${name}.mp4`);
    return;
  }
  const dir = `${root}/${name}`;
  await mkdir(dir, { recursive: true });
  const frames = [],
    pending = [];
  let recording = true;
  const handler = (event) => {
    if (recording) {
      const file = `${dir}/${String(frames.length).padStart(5, "0")}.jpg`;
      frames.push({ file, time: event.metadata.timestamp });
      pending.push(writeFile(file, Buffer.from(event.data, "base64")));
    }
    cdp
      .send("Page.screencastFrameAck", { sessionId: event.sessionId })
      .catch(() => {});
  };
  cdp.on("Page.screencastFrame", handler);
  console.log(`Grabando: ${name}`);
  await cdp.send("Page.startScreencast", {
    format: "jpeg",
    quality: 88,
    maxWidth: 1280,
    maxHeight: 720,
    everyNthFrame: 1,
  });
  await action();
  await page.waitForTimeout(100);
  recording = false;
  await cdp.send("Page.stopScreencast");
  cdp.off("Page.screencastFrame", handler);
  await Promise.all(pending);
  if (frames.length < 2)
    throw new Error(`No hay suficientes fotogramas en ${name}`);
  let list = "";
  for (let i = 0; i < frames.length; i++) {
    const duration =
      i + 1 < frames.length
        ? Math.max(0.001, frames[i + 1].time - frames[i].time)
        : 0.04;
    list += `file '${frames[i].file}'\nduration ${duration.toFixed(6)}\n`;
  }
  list += `file '${frames.at(-1).file}'\n`;
  await writeFile(`${dir}/frames.txt`, list);
  await ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    `${dir}/frames.txt`,
    "-vf",
    "fps=30,format=yuv420p",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "20",
    "-threads",
    "2",
    `${dir}.mp4`,
  ]);
  clips.push(`${dir}.mp4`);
}

try {
  const sailing = initialState();
  sailing.player.x = 810;
  sailing.player.y = 1390;
  sailing.player.angle = -Math.PI / 2;
  sailing.enemies = [];
  await prepare(sailing);
  await caption(
    "MAREA NEGRA · 2D + 3D",
    "Dos formas de navegar. Elige tu vista en la barra.",
    true,
  );
  await record("01-selector", () => wait(3000));
  await caption(
    "2D · EXPLORA EL ARCHIPIÉLAGO",
    "WASD o flechas para navegar · Q para cruzar el velo",
    true,
  );
  await record("02-navigate", async () => {
    await page.keyboard.down("KeyW");
    await wait(2400);
    await page.keyboard.up("KeyW");
    await page.keyboard.press("KeyQ");
    await wait(3000);
  });
  const combat = initialState();
  combat.player.x = 2150;
  combat.player.y = 1190;
  combat.player.angle = -Math.PI / 2;
  combat.enemies = [
    enemy("demo-one", 2220, 1020, "real", false, "brig"),
    enemy("demo-two", 2020, 1050, "real", false, "cutter"),
  ];
  combat.upgrades.cannons = 2;
  await prepare(combat);
  await caption(
    "2D · COMBATE NAVAL",
    "Espacio para disparar · Una campaña de islas y tesoros",
    true,
  );
  await record("03-combat-2d", async () => {
    await page.keyboard.down("Space");
    await page.keyboard.down("KeyD");
    await wait(1600);
    await page.keyboard.up("KeyD");
    await wait(3000);
    await page.keyboard.up("Space");
  });
  await caption("CAMBIA DE PERSPECTIVA", "Pulsa 3D en la barra superior", true);
  await record("04-switch", async () => {
    await wait(700);
    await page.click('.mode-switch a[href="./3d.html"]');
    await page.waitForSelector('#ocean[data-rendered="true"]');
    await caption(
      "3D · UNA NUEVA EXPEDICIÓN",
      "Cámara detrás del barco · Tu campaña 2D se conserva",
    );
    await wait(2000);
  });
  await page.click("#start");
  await caption(
    "3D · TOMA EL TIMÓN",
    "Alinea al corsario y dispara con Espacio",
  );
  await record("05-combat-3d", async () => {
    await page.keyboard.down("Space");
    await wait(8500);
    await page.keyboard.up("Space");
  });
  await caption(
    "3D · RUMBO A LA ISLA",
    "W avanza · A / D giran · C cambia la distancia de cámara",
  );
  await record("06-sail-3d", async () => {
    await page.keyboard.down("KeyW");
    await page.keyboard.down("KeyD");
    await wait(500);
    await page.keyboard.up("KeyD");
    await wait(2400);
    await page.keyboard.press("KeyC");
    await wait(2600);
    await page.keyboard.up("KeyW");
  });
  await caption(
    "ELIGE 2D O 3D EN LA BARRA",
    "Computadora y móvil · Gratis en tu navegador",
  );
  await page.evaluate(() => {
    const d = document.createElement("div");
    d.className = "video-end";
    d.innerHTML =
      "<small>IZA LAS VELAS</small><h1>MAREA NEGRA</h1><p>Una aventura. Dos perspectivas.</p><b>baztp.github.io/GAME/</b>";
    document.body.append(d);
  });
  await record("07-outro", () => wait(4000));
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile(
    `${root}/clips.txt`,
    clips.map((p) => `file '${p}'`).join("\n") + "\n",
  );
  await ffmpeg([
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    `${root}/clips.txt`,
    "-c",
    "copy",
    `${root}/silent.mp4`,
  ]);
  console.log(`Video 2D / 3D grabado: ${root}/silent.mp4`);
} finally {
  await browser.close();
}
