import {
  initialState,
  update,
  fire,
  boost,
  toggleRealm,
  interact,
  buyUpgrade,
  upgradeCost,
  repair,
  inPort,
  nearbyIsland,
  nearestIsland,
  nextTarget,
  dist,
  emit,
  serialize,
  restore,
  SAVE_KEY,
  ISLANDS,
  WORLD,
} from "./game.js";
import { Renderer } from "./render.js";

const $ = (id) => document.getElementById(id);
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const canvas = $("game"),
  modal = $("modal");
let state = initialState(),
  started = false,
  input = {},
  saved = null,
  mapCanvas = null,
  uiClock = 0,
  saveAvailable = true;
try {
  saved = restore(localStorage.getItem(SAVE_KEY));
} catch {
  saveAvailable = false;
}
if (saved) {
  $("continue-btn").hidden = false;
  $("start-btn").innerHTML = "Nueva travesía <span>→</span>";
}
const renderer = new Renderer(canvas, $("minimap"));

class Sound {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    try {
      this.enabled = localStorage.getItem("marea-sound") === "on";
    } catch {}
    this.refresh();
  }
  refresh() {
    $("sound-btn").setAttribute("aria-pressed", String(this.enabled));
    $("sound-btn").setAttribute(
      "aria-label",
      this.enabled ? "Desactivar sonido" : "Activar sonido",
    );
    $("sound-btn").title = this.enabled
      ? "Desactivar sonido"
      : "Activar sonido";
    $("sound-btn").querySelector(".sound-off").hidden = this.enabled;
  }
  init() {
    if (!this.enabled) return;
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch {
      this.enabled = false;
      this.refresh();
    }
  }
  play(name) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const ctx = this.ctx,
      at = ctx.currentTime;
    const tone = (freq, start, duration, type = "sine", volume = 0.05) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, at + start);
      gain.gain.setValueAtTime(0, at + start);
      gain.gain.linearRampToValueAtTime(volume, at + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, at + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(at + start);
      osc.stop(at + start + duration + 0.03);
    };
    if (name === "cannon" || name === "hit" || name === "sunk") {
      const duration = name === "cannon" ? 0.25 : name === "sunk" ? 0.55 : 0.12;
      const buffer = ctx.createBuffer(
          1,
          ctx.sampleRate * duration,
          ctx.sampleRate,
        ),
        data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++)
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.value = name === "cannon" ? 520 : 1100;
      gain.gain.value = 0.11;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      tone(name === "cannon" ? 70 : 110, 0, duration, "sine", 0.06);
      return;
    }
    const notes = {
      coin: [660, 880],
      treasure: [330, 440, 554, 660, 880],
      discovery: [392, 494, 587],
      realm: [220, 330, 440, 554],
      boost: [180, 260],
      boss: [110, 130, 147],
      victory: [330, 440, 554, 660, 554, 660, 880],
    }[name] || [440];
    notes.forEach((n, i) => tone(n, i * 0.1, 0.55, "sine", 0.045));
  }
}
const sound = new Sound();

function save() {
  if (!started) return;
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
    saveAvailable = true;
    $("save-status").innerHTML = "<i></i> Travesía guardada";
  } catch {
    saveAvailable = false;
    $("save-status").textContent = "Guardado no disponible";
  }
  state.autosave = 0;
}
function toast(text, type = "info") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = text;
  $("toasts").appendChild(el);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
  setTimeout(() => el.remove(), 5200);
}
function drainEvents() {
  const events = state.events.splice(0);
  for (const event of events) {
    if (event.text) toast(event.text, event.type);
    if (event.sound) sound.play(event.sound);
    if (event.kind === "respawn") {
      renderer.snap(state.player);
      save();
    }
    if (event.kind === "victory") {
      save();
      showVictory();
    }
  }
}
function openModal(title, body, eyebrow = "MAREA NEGRA", className = "") {
  state.active = false;
  input = {};
  mapCanvas = null;
  $("modal-title").textContent = title;
  $("modal-eyebrow").textContent = eyebrow;
  $("modal-body").innerHTML = body;
  modal.className = className;
  if (!modal.open) modal.showModal();
  $("pause-btn").textContent = "▶";
  $("pause-btn").setAttribute("aria-label", "Reanudar juego");
}
function closeModal() {
  if (modal.open) modal.close();
  mapCanvas = null;
  state.active = started;
  input = {};
  $("pause-btn").textContent = "II";
  $("pause-btn").setAttribute("aria-label", "Pausar juego");
  if (started) canvas.focus({ preventScroll: true });
}
function start(resume = false) {
  state = resume && saved ? saved : initialState();
  started = true;
  state.active = true;
  saved = null;
  $("intro-overlay").hidden = true;
  renderer.snap(state.player);
  sound.init();
  save();
  refreshUI();
  canvas.focus({ preventScroll: true });
  toast(
    resume
      ? "Bienvenido a bordo, capitán. Tu travesía continúa."
      : "Rumbo al noreste: la Isla del Sol guarda la primera reliquia.",
  );
  if (!saveAvailable)
    toast(
      "El navegador no permite guardar. Mantén esta pestaña abierta para conservar tu travesía.",
      "danger",
    );
}
function confirmNew() {
  openModal(
    "Una nueva historia",
    '<p>Empezarás de nuevo en Puerto Bruma. Se reemplazará la travesía guardada, incluidas sus reliquias y mejoras.</p><div class="modal-actions"><button class="secondary-button" id="cancel-new">Conservar mi travesía</button><button class="primary-button" id="confirm-new">Empezar de nuevo <span>→</span></button></div>',
    "NUEVA TRAVESÍA",
  );
  $("cancel-new").onclick = closeModal;
  $("confirm-new").onclick = () => {
    closeModal();
    start(false);
  };
}

function refreshUI() {
  const p = state.player;
  $("hp-label").textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $("hp-bar").style.width = `${(p.hp / p.maxHp) * 100}%`;
  $("hp-bar").style.background = p.hp / p.maxHp < 0.3 ? "#b9735b" : "#688d75";
  $("gold-label").textContent = p.gold;
  $("sunk-label").textContent = state.sunk;
  $("islands-label").textContent = `${state.discovered.length} / 8`;
  $("quest-count").textContent = `${state.relics.length} / 3`;
  $("ship-level").textContent =
    `NIV. ${1 + Object.values(state.upgrades).reduce((a, b) => a + b, 0)}`;
  for (const li of document.querySelectorAll("[data-relic]"))
    li.classList.toggle("done", state.relics.includes(li.dataset.relic));
  const sp = state.realm === "spectral";
  $("realm-label").textContent = sp ? "Mar espectral" : "Mar de los vivos";
  $("world-name").textContent = sp
    ? "AL OTRO LADO DEL VELO"
    : "MAR DE LOS VIVOS";
  $("world-desc").textContent = sp
    ? "No todas las leyendas descansan en paz"
    : "La calma nunca es para siempre";
  $("world-icon").textContent = sp ? "☾" : "☀";
  $("energy-bar").style.width = `${p.energy}%`;
  $("energy-bar").style.background = sp ? "#c6afd9" : "#b1cfb3";
  $("energy-label").textContent = sp
    ? `${Math.ceil(p.energy / 4)} s al otro lado`
    : p.energy < 22
      ? "Recuperando la brújula…"
      : "Listo para cruzar";
  $("realm-btn").style.background = sp ? "#726187b0" : "";
  const near = nearestIsland(state);
  $("region-label").textContent =
    dist(p, near) < near.r + 400 ? near.name : "Mar abierto";
  $("coordinates").textContent =
    `${18 + Math.floor(p.y / 450)}° ${String(Math.floor(p.y / 7) % 60).padStart(2, "0")}′ N   ${64 + Math.floor(p.x / 550)}° ${String(Math.floor(p.x / 9) % 60).padStart(2, "0")}′ O`;
  const target = nextTarget(state);
  $("target-text").innerHTML =
    `${escape(target.name)}<small>${target.custom ? "Tu rumbo" : state.won ? "De vuelta a casa" : state.relics.length < 3 ? "Próxima reliquia" : "El último desafío"}</small>`;
  $("target-distance").textContent = `${Math.round(dist(p, target))} m`;
  const nearby = nearbyIsland(state);
  $("interact-prompt").hidden = !started || !nearby || modal.open;
  if (nearby)
    $("interact-prompt").querySelector("span").textContent =
      nearby.kind === "port"
        ? "Atracar en el astillero"
        : nearby.kind === "rift"
          ? "Investigar el abismo"
          : state.looted.includes(nearby.id)
            ? "Visitar la isla"
            : "Desembarcar y explorar";
  $("quest-tip").querySelector("p").textContent = state.won
    ? "El mar es libre. Tu nombre ya es leyenda."
    : state.relics.length === 3
      ? "Cruza el velo en la Boca del Abismo."
      : state.relics.includes("sun") && !state.relics.includes("moon")
        ? "Pulsa Q cerca de Velo de Luna para revelar su reliquia."
        : "Tu brújula señala la próxima reliquia.";
  $("touch-boost").disabled = p.boostCooldown > 0;
  $("touch-boost").textContent =
    p.boostCooldown > 0 ? Math.ceil(p.boostCooldown) : "➤";
  if (mapCanvas) renderer.drawMap(state, mapCanvas, true);
}

function showHelp() {
  openModal(
    "El mar es tuyo.",
    `<p>Recupera las reliquias del Sol, la Luna y la Marea. Llévalas a la Boca del Abismo, cruza el velo e invoca al Almirante Hueco para liberar los dos mares.</p><div class="control-grid"><div><kbd>WASD / ↑↓←→</kbd> Navegar</div><div><kbd>ESPACIO</kbd> Disparar al rival cercano</div><div><kbd>CLIC</kbd> Apuntar y disparar</div><div><kbd>SHIFT</kbd> Impulso · recarga 6 s</div><div><kbd>Q</kbd> Alternar los dos mundos</div><div><kbd>E</kbd> Explorar o atracar</div><div><kbd>M</kbd> Carta náutica</div><div><kbd>ESC</kbd> Pausar / reanudar</div></div><p class="modal-note">En móvil, usa las flechas y los botones sobre el mar. Toca la luna para cruzar el velo y el aviso de la costa para desembarcar.</p><p><strong>El velo:</strong> dura hasta 25 segundos. Su energía se recupera en el mundo real. Solo puedes atacar y recibir ataques de barcos en tu mismo mundo.</p><p><strong>Puertos:</strong> reparan gratis y ofrecen mejores cañones, casco y velas. Si naufragas, pierdes el 15 % de tus doblones y vuelves al puerto conservando tus reliquias y mejoras.</p><p><strong>Tu brújula:</strong> sigue el objetivo de la campaña. En el mapa puedes marcar otro rumbo. La tormenta daña el casco, pero no te alcanza en el mar espectral.</p><button class="primary-button" id="help-done">Entendido, capitán <span>→</span></button>`,
    "MANUAL DE NAVEGACIÓN",
  );
  $("help-done").onclick = closeModal;
}
function showMap() {
  openModal(
    "Archipiélago de las Ánimas",
    '<canvas id="large-map" class="big-map" width="1000" height="730" aria-label="Mapa del archipiélago. Toca una ubicación para marcar el rumbo."></canvas><div class="map-legend"><span>▲ La Peregrina</span><span>⚓ Puerto seguro</span><span>✧ Reliquia</span><span>● Navío hostil</span></div><p class="map-help">Toca el mapa para marcar tu rumbo. Las costas tenues aún están por descubrir.</p><div class="modal-actions"><button class="secondary-button" id="clear-waypoint">Seguir la misión</button><button class="primary-button" id="map-done">Volver al mar <span>→</span></button></div>',
    "CARTA NÁUTICA",
    "map-dialog",
  );
  mapCanvas = $("large-map");
  const transform = renderer.drawMap(state, mapCanvas, true);
  mapCanvas.onclick = (event) => {
    const rect = mapCanvas.getBoundingClientRect(),
      x =
        (((event.clientX - rect.left) * mapCanvas.width) / rect.width -
          transform.ox) /
        transform.sc,
      y =
        (((event.clientY - rect.top) * mapCanvas.height) / rect.height -
          transform.oy) /
        transform.sc;
    if (x < 0 || x > WORLD.width || y < 0 || y > WORLD.height) return;
    state.waypoint = { x, y };
    closeModal();
    toast("Rumbo marcado. Sigue la flecha dorada.");
    save();
  };
  $("clear-waypoint").onclick = () => {
    state.waypoint = null;
    renderer.drawMap(state, mapCanvas, true);
    toast("La brújula vuelve a señalar tu misión.");
    save();
  };
  $("map-done").onclick = closeModal;
}
function showJournal() {
  openModal(
    "Historias de sal y viento",
    `<div class="port-balance"><span>${Math.floor(state.time / 60)} minutos de travesía</span><span>${state.discovered.length} de 8 islas descubiertas</span></div>${state.journal.map((entry) => `<div class="journal-entry"><span>${String(Math.floor(entry.time / 60)).padStart(2, "0")}:${String(Math.floor(entry.time % 60)).padStart(2, "0")}</span><p>${escape(entry.text)}</p></div>`).join("")}<div class="modal-actions"><button class="primary-button" id="journal-done">Seguir escribiendo mi historia <span>→</span></button></div>`,
    "BITÁCORA DEL CAPITÁN",
  );
  $("journal-done").onclick = closeModal;
}
function showPort() {
  if (!started) {
    showHelp();
    return;
  }
  if (!inPort(state)) {
    const ports = ISLANDS.filter((i) => i.kind === "port").sort(
      (a, b) => dist(a, state.player) - dist(b, state.player),
    );
    state.waypoint = { x: ports[0].x, y: ports[0].y };
    toast(
      `Pon rumbo a ${ports[0].name} para reparar o mejorar. El puerto está marcado.`,
    );
    save();
    return;
  }
  const upgrades = [
    {
      key: "hull",
      name: "Casco reforzado",
      desc: "+50 puntos de integridad por nivel.",
    },
    {
      key: "cannons",
      name: "Batería de cañones",
      desc: "Más daño, mejor recarga y hasta 3 proyectiles.",
    },
    {
      key: "sails",
      name: "Velas de contrabandista",
      desc: "+25 de velocidad por nivel. El viento es tu aliado.",
    },
  ];
  openModal(
    nearbyIsland(state)?.name || "Astillero",
    `<div class="port-balance"><span>ASTILLERO · PUERTO SEGURO</span><strong>◈ ${state.player.gold} doblones</strong></div><p>Un barco cuidado siempre encuentra el camino de vuelta. Aquí las reparaciones corren por nuestra cuenta.</p><div class="upgrade-list">${upgrades
      .map((u) => {
        const level = state.upgrades[u.key],
          cost = upgradeCost(state, u.key);
        return `<div class="upgrade-item"><div><h3>${u.name}</h3><p>${u.desc}<br>Nivel ${level} / 3</p></div><button data-upgrade="${u.key}" ${level >= 3 || state.player.gold < cost ? "disabled" : ""}>${level >= 3 ? "Al máximo" : `◈ ${cost} · Mejorar`}</button></div>`;
      })
      .join(
        "",
      )}</div><div class="modal-actions"><button class="secondary-button" id="repair-btn">⚓ Reparar gratis</button><button class="primary-button" id="leave-port">Volver a navegar <span>→</span></button></div>`,
    "EL HOGAR DE LA PEREGRINA",
  );
  for (const button of document.querySelectorAll("[data-upgrade]"))
    button.onclick = () => {
      if (buyUpgrade(state, button.dataset.upgrade)) {
        save();
        refreshUI();
        showPort();
        drainEvents();
      }
    };
  $("repair-btn").onclick = () => {
    repair(state);
    save();
    refreshUI();
    drainEvents();
    $("repair-btn").textContent = "✓ Barco reparado";
  };
  $("leave-port").onclick = closeModal;
}
function doInteract() {
  if (!started || modal.open) return;
  const result = interact(state);
  drainEvents();
  if (!result) return;
  save();
  refreshUI();
  if (result.kind === "port") {
    showPort();
    return;
  }
  if (result.kind === "boss") return;
  openModal(
    result.title,
    `<div class="modal-art ${result.island.realm === "spectral" ? "spectral" : ""}">${result.island.glyph || "◈"}</div><p>${escape(result.text)}</p>${result.amount ? `<p class="modal-note">+${result.amount} doblones${result.island.kind === "relic" ? ` · Reliquias recuperadas: ${state.relics.length} / 3` : ""}</p>` : ""}${state.relics.length === 3 && !state.bossAwake ? "<p>La brújula gira hacia la Boca del Abismo. Abre la carta náutica y prepárate para el último viaje.</p>" : ""}<button class="primary-button" id="story-done">El horizonte me espera <span>→</span></button>`,
    result.island.name.toUpperCase(),
  );
  $("story-done").onclick = closeModal;
}
function showPause() {
  if (!started) return;
  openModal(
    "El mar puede esperar.",
    '<div class="pause-copy"><div class="modal-art">⚓</div><p>Tu tripulación guarda el rumbo.<br>La travesía está pausada y tu progreso, guardado en este navegador.</p></div><button class="primary-button" id="resume-btn">Volver a bordo <span>→</span></button><div class="modal-actions"><button class="secondary-button" id="pause-help">Cómo jugar</button><button class="secondary-button" id="new-game-btn">Nueva travesía</button></div>',
    "UN RESPIRO EN ALTA MAR",
  );
  save();
  if (!saveAvailable)
    $("modal-body").querySelector(".pause-copy p").textContent =
      "La travesía está pausada. El guardado no está disponible en este navegador.";
  $("resume-btn").onclick = closeModal;
  $("pause-help").onclick = showHelp;
  $("new-game-btn").onclick = confirmNew;
}
function showVictory() {
  openModal(
    "Ahora eres leyenda.",
    `<div class="modal-art">✧</div><p>El Almirante Hueco se desvanece. Las tres reliquias se unen y el Corazón del Abismo vuelve a latir. Por primera vez en siglos, los dos mares respiran en paz.</p><p>En cada puerto contarán la historia de <strong>La Peregrina</strong> y de su capitán: aquel que se atrevió a navegar más allá del horizonte.</p><div class="summary-grid"><div><strong>${state.sunk}</strong><span>VICTORIAS NAVALES</span></div><div><strong>${state.discovered.length}/8</strong><span>ISLAS DESCUBIERTAS</span></div><div><strong>${Math.floor(state.time / 60)} min</strong><span>DE AVENTURA</span></div></div><p class="modal-note">+500 doblones · Campaña completada. Puedes seguir explorando y mejorar tu navío.</p><button class="primary-button" id="victory-continue">El mar aún tiene historias <span>→</span></button>`,
    "EL CORAZÓN DEL ABISMO",
  );
  $("victory-continue").onclick = closeModal;
}

$("start-btn").onclick = () => (saved ? confirmNew() : start(false));
$("continue-btn").onclick = () => start(true);
$("close-modal").onclick = closeModal;
modal.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeModal();
});
$("map-btn").onclick = showMap;
$("mini-map-btn").onclick = showMap;
$("log-btn").onclick = showJournal;
$("help-btn").onclick = showHelp;
$("controls-help").onclick = showHelp;
$("voyage-btn").onclick = () => {
  if (modal.open) closeModal();
  else if (started) canvas.focus({ preventScroll: true });
};
$("pause-btn").onclick = () => (modal.open ? closeModal() : showPause());
$("port-btn").onclick = showPort;
$("interact-prompt").onclick = doInteract;
$("realm-btn").onclick = () => {
  if (started && !modal.open) {
    toggleRealm(state);
    drainEvents();
    refreshUI();
  }
};
$("sound-btn").onclick = () => {
  sound.enabled = !sound.enabled;
  sound.refresh();
  sound.init();
  sound.play("coin");
  try {
    localStorage.setItem("marea-sound", sound.enabled ? "on" : "off");
  } catch {}
};
$("fullscreen-btn").onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($("game-frame").requestFullscreen)
      await $("game-frame").requestFullscreen();
    else
      toast(
        "Tu navegador no admite pantalla completa. Puedes girar el dispositivo.",
      );
  } catch {
    toast("La pantalla completa no está disponible en este navegador.");
  }
};
const keymap = {
  KeyW: "up",
  ArrowUp: "up",
  KeyS: "down",
  ArrowDown: "down",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  Space: "fire",
  ShiftLeft: "boost",
  ShiftRight: "boost",
};
document.addEventListener("keydown", (event) => {
  if (modal.open) return;
  if (!started) {
    return;
  }
  if (keymap[event.code]) {
    event.preventDefault();
    input[keymap[event.code]] = true;
    if (!event.repeat && keymap[event.code] === "fire") fire(state);
    if (!event.repeat && keymap[event.code] === "boost") boost(state);
  }
  if (event.repeat) return;
  if (event.code === "KeyQ") {
    event.preventDefault();
    toggleRealm(state);
    drainEvents();
  }
  if (event.code === "KeyE") {
    event.preventDefault();
    doInteract();
  }
  if (event.code === "KeyM") {
    event.preventDefault();
    showMap();
  }
  if (event.code === "Escape") {
    event.preventDefault();
    showPause();
  }
});
document.addEventListener("keyup", (event) => {
  if (keymap[event.code]) input[keymap[event.code]] = false;
});
window.addEventListener("blur", () => {
  input = {};
  if (started && !modal.open) showPause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started) {
    input = {};
    save();
    if (!modal.open) showPause();
  }
});
window.addEventListener("pagehide", save);
canvas.addEventListener("pointerdown", (event) => {
  if (!started || modal.open || event.button !== 0) return;
  canvas.focus({ preventScroll: true });
  const rect = canvas.getBoundingClientRect();
  const point = renderer.screenToWorld(
    event.clientX - rect.left,
    event.clientY - rect.top,
  );
  fire(state, point);
  drainEvents();
});
function holdButton(button, key) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!started || modal.open) return;
    button.setPointerCapture(event.pointerId);
    input[key] = true;
    if (key === "fire") fire(state);
  });
  const release = () => {
    input[key] = false;
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
for (const button of document.querySelectorAll("[data-move]"))
  holdButton(button, button.dataset.move);
holdButton($("touch-fire"), "fire");
$("touch-boost").addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (started && !modal.open) {
    boost(state);
    drainEvents();
  }
});
new ResizeObserver(() => renderer.resize()).observe($("game-frame"));
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  update(state, dt, input);
  drainEvents();
  renderer.draw(state, dt, !started);
  uiClock += dt;
  if (uiClock > 0.12) {
    refreshUI();
    uiClock = 0;
  }
  if (state.autosave > 5) save();
  requestAnimationFrame(frame);
}
refreshUI();
requestAnimationFrame(frame);
