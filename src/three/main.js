import { OceanScene } from "./scene.js";
import {
  initialVoyage,
  updateVoyage,
  shoot,
  collect,
  targetAhead,
  ISLANDS,
  TREASURE,
  distance,
  forward,
} from "./simulation.js";
import { Sound } from "../sound.js";

const $ = (id) => document.getElementById(id),
  canvas = $("ocean");
let state = initialVoyage(),
  input = {},
  scene = null,
  started = false,
  failed = false,
  noticeUntil = 0,
  last = performance.now(),
  uiTime = 0;
const sound = new Sound($("sound"));
function audioState() {
  return {
    active: state.active,
    time: state.time,
    realm: "real",
    player: {
      x: state.player.x,
      y: state.player.z,
      vx: state.player.speed,
      vy: 0,
    },
  };
}
function notify(text) {
  $("notice").textContent = text;
  noticeUntil = performance.now() + 5500;
}
function fail(contextLost = false) {
  failed = true;
  state.active = false;
  input = {};
  sound.silence();
  $("intro").hidden = true;
  $("hud").hidden = true;
  $("unavailable").hidden = false;
  $("pause").disabled = true;
  if ($("dialog").open) $("dialog").close();
  if (contextLost)
    $("error-copy").textContent =
      "Se interrumpió la conexión con la tarjeta gráfica. Puedes reintentar o seguir jugando en 2D.";
}
function start() {
  if (failed) return;
  state = initialVoyage();
  state.active = true;
  started = true;
  input = {};
  $("intro").hidden = true;
  $("hud").hidden = false;
  $("pause").disabled = false;
  scene.snap(state.player);
  sound.init();
  canvas.focus({ preventScroll: true });
  notify(
    "W para izar las velas. A y D giran el timón. Alinea un corsario y dispara con Espacio.",
  );
  refresh();
}
function pause() {
  if (!started || failed || $("dialog").open) return;
  state.active = false;
  input = {};
  sound.updateScene(audioState());
  $("dialog-eyebrow").textContent = state.won
    ? "LA PRIMERA EXPEDICIÓN"
    : "A RESGUARDO DEL MAR";
  $("dialog-title").textContent = state.won
    ? "El oro del Sol es tuyo."
    : "Una pausa en la travesía.";
  $("dialog-copy").textContent = state.won
    ? "Derrotaste a los dos corsarios y recuperaste el tesoro. Puedes seguir navegando por el archipiélago o empezar otra expedición."
    : "W o ↑: avanzar. A/D o ←/→: girar. S o ↓: frenar. Alinea el barco con un corsario y dispara con Espacio. C cambia la distancia de la cámara.";
  $("dialog").showModal();
  $("pause").textContent = "▶";
  $("pause").setAttribute("aria-label", "Reanudar");
}
function resume() {
  if (failed) return;
  $("dialog").close();
  state.active = true;
  input = {};
  $("pause").textContent = "Ⅱ";
  $("pause").setAttribute("aria-label", "Pausar");
  canvas.focus({ preventScroll: true });
}
function collectTreasure() {
  if (collect(state)) {
    events();
    refresh();
    pause();
  }
}
function events() {
  for (const e of state.events.splice(0)) {
    if (e.sound) sound.play(e.sound);
    if (e.text) notify(e.text);
    if (e.respawn) scene.snap(state.player);
  }
}
function toggleCamera() {
  if (!scene || failed) return;
  scene.far = !scene.far;
  $("camera").textContent = `Cámara · ${scene.far ? "panorámica" : "cercana"}`;
}
function chart() {
  const c = $("chart").getContext("2d"),
    w = 240,
    scale = 0.47,
    ox = 112,
    oz = 149;
  c.clearRect(0, 0, w, w);
  c.fillStyle = "#eee8ce";
  c.fillRect(0, 0, w, w);
  c.strokeStyle = "#a5b3a42c";
  c.lineWidth = 1;
  for (let n = 16; n < w; n += 26) {
    c.beginPath();
    c.moveTo(n, 0);
    c.lineTo(n, w);
    c.moveTo(0, n);
    c.lineTo(w, n);
    c.stroke();
  }
  const point = (o) => [ox + o.x * scale, oz + o.z * scale];
  for (const i of ISLANDS) {
    const [x, z] = point(i);
    c.beginPath();
    c.arc(x, z, i.r * scale, 0, Math.PI * 2);
    c.fillStyle = "#b6bd95";
    c.fill();
    c.strokeStyle = "#959f79";
    c.stroke();
  }
  if (!state.won) {
    const [x, z] = point(TREASURE);
    c.fillStyle = "#b89040";
    c.fillRect(x - 3, z - 3, 6, 6);
  }
  for (const e of state.enemies)
    if (e.hp > 0) {
      const [x, z] = point(e);
      c.fillStyle = "#aa6050";
      c.beginPath();
      c.arc(x, z, 3.4, 0, Math.PI * 2);
      c.fill();
    }
  const [x, z] = point(state.player);
  c.save();
  c.translate(Math.max(5, Math.min(235, x)), Math.max(5, Math.min(235, z)));
  c.rotate(state.player.heading);
  c.beginPath();
  c.moveTo(0, -6);
  c.lineTo(-4, 5);
  c.lineTo(0, 3);
  c.lineTo(4, 5);
  c.closePath();
  c.fillStyle = "#245555";
  c.fill();
  c.restore();
  c.fillStyle = "#8c997c";
  c.font = "10px Georgia";
  c.fillText("N", 218, 18);
}
function refresh() {
  if (!scene) return;
  const p = state.player,
    target = targetAhead(state);
  $("hp").textContent = `${p.hp} / ${p.maxHp}`;
  $("hp-fill").style.width = `${(p.hp / p.maxHp) * 100}%`;
  $("hp-fill").style.background = p.hp < 45 ? "#ac6554" : "#668e77";
  $("speed").textContent = Math.abs(p.speed / 2).toFixed(1);
  $("kills").textContent = `${state.sunk} / 2`;
  $("distance").textContent = `TESORO · ${Math.round(distance(p, TREASURE))} m`;
  $("cannon-status").textContent =
    p.reload > 0
      ? `RECARGA · ${p.reload.toFixed(1)} s`
      : target
        ? "ENEMIGO A TIRO"
        : "CAÑÓN LISTO";
  $("objective").textContent = state.won
    ? "El mar es tuyo."
    : state.sunk === 2
      ? "El tesoro te espera."
      : "La costa tiene guardianes.";
  $("mission-detail").textContent = state.won
    ? "Expedición completada. Sigue explorando."
    : state.sunk === 2
      ? "Acércate al cofre dorado y pulsa E."
      : "Derrota a los dos corsarios.";
  const degrees = ((p.heading * 180) / Math.PI + 360) % 360;
  const names = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  $("bearing").textContent =
    `${names[Math.round(degrees / 45) % 8]} · ${Math.round(degrees)}°`;
  $("collect").hidden =
    state.won || state.sunk < 2 || distance(p, TREASURE) > 27;
  const markerTarget =
    target || (state.sunk === 2 && !state.won ? TREASURE : null);
  if (markerTarget) {
    const point = scene.screenPoint(markerTarget);
    $("target-marker").hidden = !point.visible;
    $("target-marker").style.left = `${point.x}px`;
    $("target-marker").style.top = `${point.y}px`;
    $("target-range").textContent =
      `${Math.round(distance(p, markerTarget))} m${target ? " · " + target.hp + " PV" : ""}`;
  } else $("target-marker").hidden = true;
  if (performance.now() > noticeUntil) $("notice").textContent = "";
  chart();
}
$("start").onclick = start;
$("pause").onclick = () => {
  if ($("dialog").open) resume();
  else pause();
};
$("resume").onclick = resume;
$("restart").onclick = () => {
  $("dialog").close();
  $("pause").textContent = "Ⅱ";
  start();
};
$("dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  resume();
});
$("camera").onclick = toggleCamera;
$("collect").onclick = collectTreasure;
$("sound").onclick = () => {
  sound.enabled = !sound.enabled;
  sound.refresh();
  if (sound.enabled) {
    sound.init();
    sound.play("coin");
  } else sound.silence();
  try {
    localStorage.setItem("marea-sound", sound.enabled ? "on" : "off");
  } catch {}
};
const keys = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "brake",
  ArrowDown: "brake",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "fire",
};
window.addEventListener("keydown", (e) => {
  if (!started || failed || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === "Escape") {
    e.preventDefault();
    if ($("dialog").open) resume();
    else pause();
    return;
  }
  if (!state.active) return;
  if (e.target instanceof HTMLButtonElement && e.code === "Space") return;
  if (keys[e.code]) {
    e.preventDefault();
    input[keys[e.code]] = true;
  }
  if (e.code === "KeyC" && !e.repeat) toggleCamera();
  if (e.code === "KeyE" && !e.repeat) collectTreasure();
});
window.addEventListener("keyup", (e) => {
  if (keys[e.code]) input[keys[e.code]] = false;
});
const held = new Map();
for (const button of document.querySelectorAll("[data-key]")) {
  button.addEventListener("pointerdown", (e) => {
    if (!state.active) return;
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    held.set(e.pointerId, button.dataset.key);
    input[button.dataset.key] = true;
  });
  const release = (e) => {
    const key = held.get(e.pointerId);
    held.delete(e.pointerId);
    if (key) input[key] = [...held.values()].includes(key);
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
canvas.addEventListener("pointerdown", (e) => {
  if (state.active && e.button === 0) {
    canvas.focus({ preventScroll: true });
    shoot(state);
    events();
  }
});
window.addEventListener("blur", () => {
  held.clear();
  input = {};
  pause();
  sound.silence();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pause();
    sound.silence();
  }
});
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  fail(true);
});
try {
  scene = new OceanScene(canvas);
  scene.snap(state.player);
  scene.draw(state, 0);
  canvas.dataset.rendered = "true";
  $("start").disabled = false;
  $("start").textContent = "Tomar el timón →";
} catch (error) {
  console.warn("No se pudo iniciar la escena 3D:", error.message);
  fail();
}
new ResizeObserver(() => {
  if (scene && !failed) scene.resize();
}).observe($("voyage"));
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!failed && scene) {
    updateVoyage(state, dt, input);
    events();
    scene.draw(state, dt);
    uiTime += dt;
    if (uiTime > 0.1) {
      refresh();
      sound.updateScene(audioState());
      uiTime = 0;
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
