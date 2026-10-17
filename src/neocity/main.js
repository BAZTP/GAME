import { CityScene } from "./scene.js";
import {
  NPCS,
  PICKUPS,
  BUILDINGS,
  DISTRICTS,
  dist,
  districtAt,
} from "./world.js";
import {
  initialCity,
  updateCity,
  objective,
  nearest,
  collectItem,
  meet,
  actions,
  choose,
  serialize,
  restore,
  SAVE_KEY,
  recordChat,
} from "./game.js";
import { Dialogue } from "./dialogue.js";
const $ = (id) => document.getElementById(id),
  canvas = $("world"),
  modal = $("modal"),
  chat = $("conversation");
let state = initialCity(),
  saved = null,
  input = {},
  started = false,
  scene = null,
  failed = false,
  npcId = null,
  saveClock = 0,
  uiClock = 0,
  last = performance.now(),
  noticeUntil = 0,
  mapCanvas = null;
const dialogue = new Dialogue();
try {
  saved = restore(localStorage.getItem(SAVE_KEY));
} catch {}
if (saved) $("continue").hidden = false;
function save() {
  if (!started) return;
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
    $("save-state").textContent = "Historia y memoria guardadas";
  } catch {
    $("save-state").textContent = "El navegador no permite guardar";
  }
  saveClock = 0;
}
function notice(text) {
  $("notice").textContent = text;
  noticeUntil = performance.now() + 5500;
}
function drain() {
  for (const text of state.events.splice(0)) notice(text);
}
function pauseSimulation() {
  state.active = false;
  input = {};
}
function resume() {
  if (failed) return;
  if (modal.open) modal.close();
  if (chat.open) chat.close();
  dialogue.cancel();
  npcId = null;
  mapCanvas = null;
  state.active = started;
  input = {};
  canvas.focus({ preventScroll: true });
  save();
}
function openModal(title) {
  pauseSimulation();
  if (chat.open) chat.close();
  dialogue.cancel();
  npcId = null;
  mapCanvas = null;
  $("modal-title").textContent = title;
  $("modal-body").replaceChildren();
  if (!modal.open) modal.showModal();
  return $("modal-body");
}
function paragraph(parent, text) {
  const p = document.createElement("p");
  p.textContent = text;
  parent.append(p);
  return p;
}
function button(parent, text, handler, cls = "secondary") {
  const b = document.createElement("button");
  b.textContent = text;
  b.className = cls;
  b.onclick = handler;
  parent.append(b);
  return b;
}
function start(useSaved = false) {
  if (failed) return;
  state = useSaved && saved ? saved : initialCity();
  started = true;
  state.active = true;
  saved = null;
  $("intro").hidden = true;
  $("hud").hidden = false;
  $("pause").disabled = false;
  scene.snap(state.player);
  canvas.focus({ preventScroll: true });
  notice("Luna te espera frente a ti. Acércate y pulsa E para hablar.");
  refresh();
  save();
}
function newStory() {
  if (saved || started) {
    const body = openModal("¿Una nueva historia?");
    paragraph(
      body,
      "Esto reemplazará la historia y los recuerdos de NeoCity guardados en este navegador.",
    );
    button(body, "Conservar mi historia", () => {
      if (!started) {
        modal.close();
        return;
      }
      resume();
    });
    button(
      body,
      "Empezar desde cero",
      () => {
        modal.close();
        start(false);
      },
      "primary",
    );
  } else start(false);
}
function showPause() {
  if (!started || failed || modal.open || chat.open) return;
  const body = openModal("La ciudad puede esperar.");
  paragraph(
    body,
    "WASD o flechas: caminar. Shift: correr. E: hablar o recoger. M: mapa. J: recuerdos. C: distancia de cámara.",
  );
  button(body, "Volver a la ciudad →", resume, "primary");
  button(body, "Nueva historia", newStory);
  save();
}
function renderChat() {
  const m = state.memories[npcId],
    npc = NPCS.find((n) => n.id === npcId);
  $("npc-name").textContent = npc.name;
  $("npc-role").textContent = npc.role.toUpperCase();
  $("npc-trust").textContent =
    `Confianza personal: ${m.trust} · Encuentros: ${m.visits}`;
  $("chat-mode").textContent = dialogue.online
    ? "IA generativa conectada"
    : "Diálogo local con memoria";
  $("chat-note").textContent = dialogue.online
    ? "Se envían a tu servidor el mensaje y los últimos recuerdos de este personaje. Las decisiones se toman con los botones."
    : "Motor local: respuestas por temas y recuerdos de tu partida. Las decisiones se toman con los botones.";
  $("chat-log").replaceChildren();
  for (const line of m.chat) {
    const el = document.createElement("div");
    el.className = `bubble ${line.role === "user" ? "user" : ""}`;
    el.textContent = line.text;
    $("chat-log").append(el);
  }
  $("chat-log").scrollTop = $("chat-log").scrollHeight;
  $("choices").replaceChildren();
  for (const option of actions(state, npcId)) {
    const b = button($("choices"), option.text, () => {
      const result = choose(state, npcId, option.id);
      if (result) {
        recordChat(state, npcId, "assistant", result);
        save();
        drain();
        refresh();
        renderChat();
        if (state.ending)
          notice(
            "Historia completada. Puedes seguir conversando y explorando.",
          );
      }
    });
    b.disabled = !option.enabled || dialogue.pending;
  }
  $("send").disabled = dialogue.pending;
  $("send").textContent = dialogue.pending ? "Pensando…" : "Enviar →";
}
function interact() {
  if (!state.active) return;
  const obj = nearest(state);
  if (!obj) return;
  if (obj.type === "item") {
    collectItem(state, obj.id);
    drain();
    refresh();
    save();
    return;
  }
  const greeting = meet(state, obj.id);
  if (!greeting) return;
  pauseSimulation();
  npcId = obj.id;
  recordChat(state, obj.id, "assistant", greeting);
  $("message").value = "";
  renderChat();
  chat.showModal();
  save();
}
$("chat-form").onsubmit = async (e) => {
  e.preventDefault();
  const id = npcId,
    message = $("message").value.trim();
  if (!id || !message || dialogue.pending) return;
  $("message").value = "";
  const pending = dialogue.reply(state, id, message);
  renderChat();
  const result = await pending;
  if (!result || npcId !== id || !chat.open) return;
  renderChat();
  if (result.fallback)
    $("chat-note").textContent =
      "El servicio de IA no respondió. Esta respuesta la generó el motor local con tu memoria.";
  save();
};
function showMap() {
  const body = openModal("Mapa de NeoCity");
  mapCanvas = document.createElement("canvas");
  mapCanvas.width = 600;
  mapCanvas.height = 600;
  mapCanvas.className = "map-canvas";
  mapCanvas.setAttribute(
    "aria-label",
    "Mapa de los distritos, personajes, objetos y tu ubicación.",
  );
  body.append(mapCanvas);
  paragraph(
    body,
    "▲ Tú · círculos: personajes · rombos: objetos · dorado: tu objetivo. El mapa señala lugares; recorre las calles para llegar.",
  );
  drawMap();
}
function drawMap() {
  if (!mapCanvas) return;
  const c = mapCanvas.getContext("2d"),
    scale = 1.65,
    px = (x) => 300 + x * scale,
    pz = (z) => 300 + z * scale;
  c.fillStyle = "#0b1427";
  c.fillRect(0, 0, 600, 600);
  for (const b of BUILDINGS) {
    c.fillStyle = "#233047";
    c.fillRect(px(b.x - b.w / 2), pz(b.z - b.d / 2), b.w * scale, b.d * scale);
  }
  for (const d of DISTRICTS) {
    c.fillStyle = d.color;
    c.font = "12px Arial";
    c.textAlign = "center";
    c.fillText(d.name.toUpperCase(), px(d.x), pz(d.z + 22));
  }
  for (const p of PICKUPS)
    if (!state.collected.includes(p.id)) {
      c.fillStyle = "#f5cd83";
      c.fillRect(px(p.x) - 3, pz(p.z) - 3, 6, 6);
    }
  for (const n of NPCS) {
    c.fillStyle = n.color;
    c.beginPath();
    c.arc(px(n.x), pz(n.z), 5, 0, Math.PI * 2);
    c.fill();
    c.font = "11px Arial";
    c.textAlign = "center";
    c.fillText(n.name, px(n.x), pz(n.z) - 10);
  }
  const target = objective(state).target;
  c.strokeStyle = "#f9d28c";
  c.lineWidth = 2;
  c.beginPath();
  c.arc(px(target.x), pz(target.z), 12, 0, Math.PI * 2);
  c.stroke();
  c.save();
  c.translate(px(state.player.x), pz(state.player.z));
  c.rotate(state.player.heading);
  c.fillStyle = "#fff";
  c.beginPath();
  c.moveTo(0, -7);
  c.lineTo(-5, 5);
  c.lineTo(5, 5);
  c.closePath();
  c.fill();
  c.restore();
}
function showJournal() {
  const body = openModal("La memoria de la ciudad");
  paragraph(
    body,
    "Cada personaje conserva tus decisiones y sus últimas conversaciones. El progreso se guarda en este navegador.",
  );
  const ul = document.createElement("ul");
  ul.className = "memory-list";
  for (const n of NPCS) {
    const m = state.memories[n.id];
    const li = document.createElement("li"),
      strong = document.createElement("strong");
    strong.textContent = `${n.name} · confianza ${m.trust}`;
    li.append(
      strong,
      document.createTextNode(
        m.facts.length
          ? m.facts.join(" ")
          : "Aún no habéis compartido decisiones.",
      ),
    );
    ul.append(li);
  }
  body.append(ul);
  const h = document.createElement("h3");
  h.textContent = "Tu historia";
  body.append(h);
  for (const text of state.log.slice(-12).reverse()) paragraph(body, text);
}
async function showSettings() {
  const body = openModal("Conversaciones de NeoCity");
  paragraph(
    body,
    "El modo local funciona sin conexión y recuerda tus decisiones. La IA generativa permite conversaciones más abiertas cuando hay un servidor conectado.",
  );
  paragraph(
    body,
    "Conecta solo un servidor de confianza: recibirá tus mensajes y los recuerdos de esta partida. No escribas claves de API aquí.",
  );
  const label = document.createElement("label");
  label.textContent = "Dirección de tu servidor de IA (opcional)";
  label.htmlFor = "endpoint";
  body.append(label);
  const endpoint = document.createElement("input");
  endpoint.id = "endpoint";
  endpoint.className = "settings-input";
  endpoint.type = "url";
  endpoint.placeholder = "https://tu-servidor.example";
  endpoint.value = dialogue.endpoint;
  body.append(endpoint);
  const status = paragraph(
    body,
    dialogue.online
      ? "IA generativa conectada."
      : "Activo: diálogo local con memoria.",
  );
  const connect = button(
    body,
    "Comprobar conexión",
    async () => {
      connect.disabled = true;
      status.textContent = "Comprobando…";
      try {
        const available = await dialogue.connect(endpoint.value);
        dialogue.saveEndpoint();
        status.textContent = available
          ? "IA generativa conectada."
          : "El servicio no está disponible o aún no tiene una clave configurada. Continúas en modo local.";
      } catch (e) {
        status.textContent = e.message;
      } finally {
        connect.disabled = false;
        refresh();
      }
    },
    "primary",
  );
  button(body, "Usar diálogo local", () => {
    dialogue.cancel();
    dialogue.endpoint = "";
    dialogue.online = false;
    dialogue.saveEndpoint();
    status.textContent = "Activo: diálogo local con memoria.";
    refresh();
  });
}
function refresh() {
  if (!scene) return;
  const o = objective(state),
    near = nearest(state);
  $("objective").textContent = o.text;
  $("district").textContent = districtAt(state.player).name;
  $("keys").textContent = `${state.completed.length} / 3 claves`;
  $("distance").textContent = `${Math.round(dist(state.player, o.target))} m`;
  $("trust").textContent = state.trust;
  $("credits").textContent = state.credits;
  $("energy").value = state.player.energy;
  $("ai-mode").textContent = dialogue.online ? "IA conectada" : "Diálogo local";
  $("interact").hidden = !near || !state.active;
  $("interact").textContent = near
    ? `${near.type === "npc" ? "Hablar con" : "Recoger"} ${near.name} · E`
    : "";
  if (performance.now() > noticeUntil) $("notice").textContent = "";
  if (mapCanvas) drawMap();
}
function fail() {
  failed = true;
  pauseSimulation();
  dialogue.cancel();
  if (modal.open) modal.close();
  if (chat.open) chat.close();
  $("hud").hidden = true;
  $("intro").hidden = true;
  $("unavailable").hidden = false;
  $("pause").disabled = true;
  save();
}
$("start").onclick = newStory;
$("continue").onclick = () => start(true);
$("pause").onclick = showPause;
$("interact").onclick = interact;
$("map-btn").onclick = showMap;
$("journal-btn").onclick = showJournal;
$("ai-settings").onclick = showSettings;
$("camera-btn").onclick = () => {
  scene.far = !scene.far;
};
$("close-modal").onclick = resume;
$("close-chat").onclick = resume;
for (const d of [modal, chat])
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    resume();
  });
document.querySelector(".logo").onclick = (e) => e.preventDefault();
document.querySelector("nav [aria-current]").onclick = (e) =>
  e.preventDefault();
const keys = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  ShiftLeft: "sprint",
  ShiftRight: "sprint",
};
window.addEventListener("keydown", (e) => {
  if (
    failed ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    ["INPUT", "TEXTAREA"].includes(e.target.tagName)
  )
    return;
  if (e.code === "Escape" && !modal.open && !chat.open) {
    e.preventDefault();
    showPause();
    return;
  }
  if (!started || !state.active) return;
  if (keys[e.code]) {
    e.preventDefault();
    input[keys[e.code]] = true;
  }
  if (!e.repeat) {
    if (e.code === "KeyE") interact();
    if (e.code === "KeyM") showMap();
    if (e.code === "KeyJ") showJournal();
    if (e.code === "KeyC") scene.far = !scene.far;
  }
});
window.addEventListener("keyup", (e) => {
  if (keys[e.code]) input[keys[e.code]] = false;
});
for (const b of document.querySelectorAll("[data-move]")) {
  b.addEventListener("pointerdown", (e) => {
    if (!state.active) return;
    e.preventDefault();
    b.setPointerCapture(e.pointerId);
    input[b.dataset.move] = true;
  });
  const release = () => (input[b.dataset.move] = false);
  b.addEventListener("pointerup", release);
  b.addEventListener("pointercancel", release);
  b.addEventListener("lostpointercapture", release);
}
window.addEventListener("blur", () => {
  input = {};
  save();
  showPause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    save();
    showPause();
  }
});
window.addEventListener("pagehide", save);
canvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  fail();
});
try {
  scene = new CityScene(canvas);
  scene.snap(state.player);
  scene.draw(state, 0, objective(state).target);
  canvas.dataset.rendered = "true";
  $("start").disabled = false;
  $("start").textContent = saved ? "Nueva historia →" : "Entrar en NeoCity →";
} catch (e) {
  console.warn("No se pudo iniciar NeoCity:", e.message);
  fail();
}
new ResizeObserver(() => {
  if (scene && !failed) scene.resize();
}).observe($("city"));
dialogue.connect().then(() => refresh());
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.2);
  last = now;
  if (scene && !failed) {
    for (let remaining = dt; remaining > 0; remaining -= 0.05)
      updateCity(state, Math.min(remaining, 0.05), input);
    drain();
    scene.draw(state, dt, objective(state).target);
    uiClock += dt;
    if (state.active) saveClock += dt;
    if (uiClock > 0.12) {
      refresh();
      uiClock = 0;
    }
    if (saveClock > 4) save();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
