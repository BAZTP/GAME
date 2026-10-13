// Graba controles reales del juego sobre partidas de demostración preparadas.
// Requisitos opcionales: Chromium, FFmpeg y Playwright. El servidor debe estar iniciado.
import { chromium } from "playwright";
import { mkdir, writeFile, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { initialState, serialize, SAVE_KEY, enemy } from "../src/game.js";
import { RESCUES } from "../src/content.js";

const base = process.env.DEMO_BASE_URL || "http://127.0.0.1:3000";
const root = process.env.DEMO_WORK_DIR || "/tmp/marea-recording";
await mkdir(root, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("pageerror", (error) => {
  throw error;
});
await page.addInitScript(
  ({ key }) => {
    const fixture = localStorage.getItem("__demo_next");
    if (fixture) {
      localStorage.setItem(key, fixture);
      localStorage.removeItem("__demo_next");
    }
  },
  { key: SAVE_KEY },
);
await page.goto(base);
const cdp = await context.newCDPSession(page);

const css = `dialog::backdrop{background:transparent;backdrop-filter:none!important}.fleet-dialog .fleet-art{height:82px;margin-bottom:8px}.fleet-dialog .fleet-card p{min-height:30px;font-size:9px;margin-bottom:7px!important}.fleet-dialog .fleet-card h3{font-size:18px}.fleet-dialog .fleet-stats{padding:5px 0}.fleet-dialog .fleet-ability{min-height:65px;padding:7px}.fleet-dialog .fleet-ability small{font-size:8px;line-height:1.4}.fleet-dialog .fleet-card>button{padding:8px;margin-top:8px}.fleet-dialog .modal-heading h2{font-size:23px}.fleet-dialog .modal-heading{margin-bottom:8px}.fleet-dialog .port-tabs button{padding:7px}.fleet-dialog .port-balance{padding-bottom:6px;line-height:1.2}.fleet-dialog #modal-body>p{line-height:1.3}.fleet-dialog .modal-actions .primary-button{padding:8px 12px}dialog #modal-body{line-height:1.5}
body{background:#112830;overflow:hidden}.topbar,.sidebar,.sea-topline,.controls-bar,.sea-bottomline{display:none!important}.dashboard{display:block;padding:0;max-width:none}.game-frame{height:568px!important;min-height:0!important;max-height:568px!important;margin-top:76px;border:0;border-radius:0}.intro-caption{display:none}.demo-head{position:fixed;top:0;left:0;right:0;height:76px;background:#112830;display:flex;align-items:center;justify-content:space-between;padding:0 40px;z-index:20;color:#efe7ca;font-family:Georgia,serif}.demo-head strong{font-weight:400;font-size:30px;letter-spacing:.2px}.demo-head span{font-family:Arial,sans-serif;font-size:10px;letter-spacing:2.5px;color:#bfa875}.demo-foot{position:fixed;bottom:0;left:0;right:0;height:76px;background:#112830;display:flex;justify-content:center;align-items:center;color:#d5dfcc;font:19px Arial,sans-serif;z-index:20;border-top:1px solid #c7b98b22}.toast-stack{max-width:300px}.intro-card{margin-left:50px}dialog{max-height:540px;width:780px;margin:auto;padding:22px}.modal-heading{margin-bottom:12px}.modal-heading h2{font-size:27px}.fleet-dialog{width:1180px}.fleet-grid{grid-template-columns:repeat(4,1fr);gap:12px}.fleet-card{padding:12px}.fleet-card h3{font-size:21px}.fleet-card p{font-size:10px;min-height:44px}.fleet-art{height:105px}.fleet-art canvas{height:120px;width:199px}.fleet-ability{min-height:97px}.fleet-stats{font-size:8px;gap:5px}.fleet-card>button{font-size:10px}.fleet-dialog .modal-actions{margin-top:10px}.fleet-dialog .port-balance{margin-bottom:9px}.fleet-dialog .port-tabs{margin-bottom:12px}.fleet-dialog #modal-body>p{margin-bottom:9px;font-size:11px}.contract-list{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.contract-card{padding:12px}.contract-card h3{font-size:17px}.contract-card p{font-size:10px}.contract-card>button{padding:7px}.contract-card>div>span{font-size:10px}.demo-end{position:fixed;inset:76px 0;background:#102b36d9;z-index:15;color:#f3edda;display:flex;flex-direction:column;align-items:center;justify-content:center;backdrop-filter:blur(4px)}.demo-end small{color:#d0b67c;font:12px Arial;letter-spacing:4px}.demo-end h1{font:76px Georgia;margin:24px 0 10px;letter-spacing:3px}.demo-end p{font:25px Georgia;color:#b7cabb;margin:10px}.demo-end b{margin-top:35px;padding:18px 35px;border:1px solid #d1b782;color:#e4cc98;font:25px Arial;letter-spacing:1px}
`;
async function setup(s, title, subtitle, intro = false) {
  if (intro) {
    await page.evaluate((key) => {
      localStorage.removeItem(key);
      localStorage.removeItem("__demo_next");
    }, SAVE_KEY);
    s = null;
  }
  if (s)
    await page.evaluate(
      (value) => localStorage.setItem("__demo_next", value),
      serialize(s),
    );
  await page.reload();
  await page.addStyleTag({ content: css });
  await page.evaluate(
    ({ title, subtitle }) => {
      const header = document.createElement("div");
      header.className = "demo-head";
      const strong = document.createElement("strong");
      strong.textContent = title;
      const span = document.createElement("span");
      span.textContent = "MAREA NEGRA · ECOS DEL ABISMO";
      header.append(strong, span);
      const footer = document.createElement("div");
      footer.className = "demo-foot";
      footer.textContent = subtitle;
      document.body.append(header, footer);
    },
    { title, subtitle },
  );
  if (!intro) await page.click("#continue-btn");
  await page.waitForTimeout(250);
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
const selectedScenes = process.env.DEMO_SCENES?.split(",");
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
const wait = (ms) => page.waitForTimeout(ms);
function prepared(shipId = "sloop") {
  const s = initialState();
  s.shipId = shipId;
  s.ownedShips = ["sloop", "brig", "galleon", "phantom"];
  s.player.gold = 1200;
  s.relics = ["sun", "moon"];
  s.looted = ["sun", "moon"];
  s.discovered = ["port", "sun", "moon", "palms", "haven"];
  return s;
}

try {
  await setup(
    initialState(),
    "Tu próxima aventura empieza en el mar",
    "Explora un archipiélago. Descubre dos mundos. Escribe tu leyenda.",
    true,
  );
  await record("01-intro", () => wait(4500));

  const sailing = initialState();
  sailing.player.x = 810;
  sailing.player.y = 1390;
  sailing.enemies = sailing.enemies.filter((e) => e.id !== "warbrig-2");
  await setup(
    sailing,
    "01 / Navega, explora y rescata",
    "WASD o flechas para navegar · Acércate a las balsas para rescatar náufragos",
  );
  await record("02-explore", async () => {
    await page.keyboard.down("KeyW");
    await wait(1450);
    await page.keyboard.up("KeyW");
    await wait(1100);
    await page.keyboard.down("KeyD");
    await wait(800);
    await page.keyboard.up("KeyD");
    await page.keyboard.press("KeyM");
    await wait(1900);
    await page.click("#map-done");
    await wait(500);
  });

  const fleet = prepared();
  fleet.ownedShips = ["sloop"];
  fleet.player.gold = 2200;
  await setup(
    fleet,
    "02 / Elige el barco que define tu estilo",
    "Cuatro navíos · Compra en puerto · Tus mejoras se conservan",
  );
  await page.keyboard.press("KeyE");
  await page.click('[data-port-tab="fleet"]');
  await record("03-fleet", async () => {
    await wait(2100);
    await page.click('[data-ship="brig"]');
    await wait(1000);
    await page.click('[data-ship="galleon"]');
    await wait(1000);
    await page.click('[data-ship="phantom"]');
    await wait(1900);
  });

  const combat = prepared("brig");
  combat.player.x = 2150;
  combat.player.y = 1190;
  combat.player.angle = -Math.PI / 2;
  combat.upgrades.cannons = 1;
  combat.player.hp = 180;
  combat.player.maxHp = 180;
  combat.enemies = [
    enemy("demo-brig", 2240, 1000, "real", false, "brig"),
    enemy("demo-cutter", 2020, 1010, "real", false, "cutter"),
    enemy("demo-heavy", 2390, 1160, "real", false, "dreadnought"),
  ];
  await setup(
    combat,
    "03 / Domina los combates navales",
    "ESPACIO dispara al rival cercano · F activa la habilidad de tu barco",
  );
  await record("04-combat", async () => {
    await page.keyboard.down("Space");
    await wait(800);
    await page.keyboard.press("KeyF");
    await page.keyboard.down("KeyA");
    await wait(1800);
    await page.keyboard.up("KeyA");
    await page.keyboard.down("KeyD");
    await wait(2300);
    await page.keyboard.up("KeyD");
    await page.keyboard.up("Space");
    await wait(1200);
  });

  const spectral = prepared("phantom");
  spectral.player.x = 1860;
  spectral.player.y = 625;
  spectral.relics = ["sun", "tide"];
  spectral.looted = ["sun", "tide"];
  spectral.player.energy = 35;
  spectral.enemies = [];
  await setup(
    spectral,
    "04 / Cruza al otro lado del velo",
    "Q cambia de mundo · E explora la costa · Hay tesoros que solo existen al otro lado",
  );
  await record("05-spectral", async () => {
    await wait(700);
    await page.keyboard.press("KeyF");
    await wait(1800);
    await page.keyboard.press("KeyE");
    await wait(2800);
  });

  const contracts = prepared();
  contracts.sunk = 4;
  contracts.rescued = RESCUES.slice(0, 3).map((r) => r.id);
  contracts.spectralTime = 65;
  await setup(
    contracts,
    "05 / Completa contratos y forma tu flota",
    "Explora, combate y ayuda · Cobra tus recompensas en cualquier puerto",
  );
  await page.keyboard.press("KeyE");
  await page.click('[data-port-tab="contracts"]');
  await record("06-contracts", async () => {
    await wait(1500);
    await page.click('[data-contract="explorer"]');
    await wait(700);
    await page.click('[data-contract="hunter"]');
    await wait(700);
    await page.click('[data-contract="rescuer"]');
    await wait(700);
    await page.click('[data-contract="veil"]');
    await wait(1500);
  });

  const boss = prepared("galleon");
  boss.relics = ["sun", "moon", "tide"];
  boss.looted = [...boss.relics];
  boss.bossAwake = true;
  boss.realm = "spectral";
  boss.player.x = 2640;
  boss.player.y = 920;
  boss.player.hp = 270;
  boss.player.maxHp = 270;
  boss.upgrades.cannons = 2;
  boss.enemies = [enemy("admiral", 2770, 820, "spectral", true)];
  await setup(
    boss,
    "06 / Desafía al guardián del abismo",
    "Tres reliquias abren el último desafío · Activa el escudo del galeón con F",
  );
  await record("07-boss", async () => {
    await page.keyboard.press("KeyF");
    await page.keyboard.down("Space");
    await wait(5500);
    await page.keyboard.up("Space");
    await wait(900);
  });

  const end = prepared("galleon");
  end.player.x = 1150;
  end.player.y = 1020;
  end.enemies = [];
  await setup(
    end,
    "Una aventura gratis, directamente en tu navegador",
    "Disponible para computadora y móvil · Sin cuentas ni instalaciones",
  );
  await page.evaluate(() => {
    const end = document.createElement("div");
    end.className = "demo-end";
    end.innerHTML =
      "<small>IZA LAS VELAS</small><h1>MAREA NEGRA</h1><p>Ecos del Abismo · La nueva flota</p><b>baztp.github.io/GAME/</b>";
    document.body.append(end);
  });
  await record("08-outro", () => wait(5000));
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
  console.log(`Gameplay grabado: ${root}/silent.mp4`);
} finally {
  await browser.close();
}
