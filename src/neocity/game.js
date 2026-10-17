import {
  NPCS,
  PICKUPS,
  BUILDINGS,
  SAVE_KEY,
  dist,
  districtAt,
  limit,
} from "./world.js";
export { SAVE_KEY };
export function initialCity() {
  return {
    version: 1,
    time: 0,
    active: false,
    player: { x: 0, z: 45, heading: 0, energy: 100 },
    credits: 40,
    trust: 0,
    heat: 0,
    started: false,
    collected: [],
    completed: [],
    choices: {},
    visited: ["market"],
    ending: null,
    memories: Object.fromEntries(
      NPCS.map((n) => [n.id, { trust: 0, visits: 0, facts: [], chat: [] }]),
    ),
    log: ["Llegaste a NeoCity. Luna te espera bajo la luz rosa."],
    events: [],
  };
}
export function remember(s, id, fact) {
  const m = s.memories[id];
  if (m && !m.facts.includes(fact)) {
    m.facts.push(fact);
    m.facts = m.facts.slice(-12);
  }
}
export function event(s, text) {
  s.log.push(text);
  s.log = s.log.slice(-35);
  s.events.push(text);
}
export function nearest(s) {
  return (
    [
      ...NPCS.map((n) => ({ ...n, type: "npc" })),
      ...PICKUPS.filter((p) => !s.collected.includes(p.id)).map((p) => ({
        ...p,
        type: "item",
      })),
    ]
      .filter((o) => dist(s.player, o) < 10)
      .sort((a, b) => dist(s.player, a) - dist(s.player, b))[0] || null
  );
}
export function objective(s) {
  if (s.ending)
    return {
      text: "Tu decisión cambió NeoCity. Sigue explorando.",
      target: NPCS[5],
    };
  if (!s.started)
    return { text: "Habla con Luna para conocer el plan.", target: NPCS[0] };
  if (!s.completed.includes("power")) {
    const item = PICKUPS.find(
      (p) => p.kind === "cell" && !s.collected.includes(p.id),
    );
    return {
      text: item
        ? "Recoge las tres celdas para el mercado."
        : "Lleva las celdas a Kai.",
      target: item || NPCS[1],
    };
  }
  if (!s.completed.includes("garden"))
    return {
      text: s.collected.includes("filter")
        ? "Entrega el filtro a Iris."
        : "Encuentra el filtro de los jardines.",
      target: s.collected.includes("filter") ? NPCS[2] : PICKUPS[3],
    };
  if (!s.choices.echo)
    return {
      text: "Decide qué hacer con la memoria de ECHO-9.",
      target: NPCS[3],
    };
  if (!s.completed.includes("audit"))
    return {
      text: s.collected.includes("archive")
        ? "Habla con Vera sobre la prueba."
        : "Busca la prueba del apagón en Núcleo.",
      target: s.collected.includes("archive") ? NPCS[4] : PICKUPS[4],
    };
  return {
    text: "Las tres claves están listas. Habla con ATLAS.",
    target: NPCS[5],
  };
}
export function updateCity(s, dt, input = {}) {
  if (!s.active) return;
  dt = Math.max(0, Math.min(dt, 0.05));
  s.time += dt;
  const p = s.player;
  let dx = Number(!!input.right) - Number(!!input.left),
    dz = Number(!!input.down) - Number(!!input.up),
    m = Math.hypot(dx, dz);
  const sprint = !!input.sprint && p.energy > 5 && m > 0,
    speed = sprint ? 19 : 11;
  p.energy = Math.max(0, Math.min(100, p.energy + dt * (sprint ? -18 : 12)));
  if (m) {
    dx /= m;
    dz /= m;
    p.heading = Math.atan2(dx, -dz);
    p.x += dx * speed * dt;
    p.z += dz * speed * dt;
  }
  for (const b of BUILDINGS) {
    const hw = b.w / 2 + 1.5,
      hd = b.d / 2 + 1.5,
      ax = p.x - b.x,
      az = p.z - b.z;
    if (Math.abs(ax) < hw && Math.abs(az) < hd) {
      if (hw - Math.abs(ax) < hd - Math.abs(az))
        p.x = b.x + (ax < 0 ? -hw : hw);
      else p.z = b.z + (az < 0 ? -hd : hd);
    }
  }
  p.x = Math.max(-limit, Math.min(limit, p.x));
  p.z = Math.max(-limit, Math.min(limit, p.z));
  s.heat = Math.max(0, s.heat - dt * 0.6);
  const area = districtAt(p).id;
  if (!s.visited.includes(area)) {
    s.visited.push(area);
    event(s, `Descubriste ${districtAt(p).name}.`);
  }
}
export function collectItem(s, id) {
  const item = PICKUPS.find((p) => p.id === id);
  if (
    !s.active ||
    !item ||
    dist(s.player, item) > 10 ||
    s.collected.includes(id)
  )
    return false;
  s.collected.push(id);
  if (item.kind === "credits") s.credits += 35;
  event(s, `Recogiste: ${item.name}.`);
  return true;
}
export function meet(s, id) {
  const n = NPCS.find((n) => n.id === id);
  if (!n || dist(s.player, n) > 10) return null;
  const m = s.memories[id];
  m.visits++;
  if (m.visits > 1)
    return `${n.name}: Te recuerdo. ${m.facts.at(-1) || "Ya nos habíamos encontrado por estas calles."}`;
  return n.greeting;
}
export function actions(s, id) {
  const out = [];
  if (id === "luna" && !s.started)
    out.push({ id: "start", text: "Ayudar a la ciudad" });
  if (id === "kai" && !s.completed.includes("power"))
    out.push({
      id: "power",
      text: "Entregar las tres celdas",
      enabled: s.collected.filter((id) => id.startsWith("cell")).length === 3,
    });
  if (id === "iris" && !s.completed.includes("garden"))
    out.push({
      id: "garden",
      text: "Entregar el filtro",
      enabled: s.collected.includes("filter"),
    });
  if (id === "echo" && !s.choices.echo)
    out.push(
      { id: "protect", text: "Proteger su memoria" },
      { id: "sell", text: "Vender el registro a Helix · +80 créditos" },
    );
  if (id === "vera" && !s.completed.includes("audit"))
    out.push(
      {
        id: "reveal",
        text: "Publicar la prueba",
        enabled: s.collected.includes("archive"),
      },
      {
        id: "negotiate",
        text: "Negociar reformas con Helix",
        enabled: s.collected.includes("archive"),
      },
    );
  if (id === "atlas" && !s.ending) {
    const ready =
      ["power", "garden", "audit"].every((x) => s.completed.includes(x)) &&
      !!s.choices.echo;
    out.push(
      {
        id: "free",
        text: "Red libre · Memoria bajo consentimiento",
        enabled: ready,
      },
      {
        id: "council",
        text: "Consejo ciudadano · Supervisión compartida",
        enabled: ready,
      },
      {
        id: "helix",
        text: "Pacto Helix · Control centralizado",
        enabled: ready,
      },
    );
  }
  if (id === "kai")
    out.push({
      id: "gift",
      text: "Apoyar el taller · 15 créditos",
      enabled: s.credits >= 15 && !s.choices.gift,
    });
  return out.map((a) => ({ ...a, enabled: a.enabled !== false }));
}
export function choose(s, id, action) {
  if (dist(s.player, NPCS.find((n) => n.id === id) || { x: 999, z: 999 }) > 10)
    return false;
  const option = actions(s, id).find((a) => a.id === action && a.enabled);
  if (!option) return false;
  let text = "";
  if (action === "start") {
    s.started = true;
    text = "Luna te confió la restauración de la red.";
    s.trust += 3;
  }
  if (action === "power") {
    s.completed.push("power");
    s.credits += 45;
    s.trust += 12;
    text =
      "Devolviste la energía al mercado. Kai recuerda que cumpliste tu palabra.";
    remember(s, "luna", "Restauraste la energía del mercado.");
  }
  if (action === "garden") {
    s.completed.push("garden");
    s.credits += 35;
    s.trust += 12;
    text = "Los jardines vuelven a respirar. Iris confía en ti.";
  }
  if (action === "protect") {
    s.choices.echo = "protected";
    s.trust += 15;
    text = "Protegiste la memoria de ECHO-9. Ahora te considera su aliado.";
    remember(s, "luna", "Elegiste proteger a ECHO-9.");
  }
  if (action === "sell") {
    s.choices.echo = "sold";
    s.credits += 80;
    s.trust -= 18;
    s.heat += 35;
    text = "Vendiste el registro de ECHO-9. Él y Luna recordarán la traición.";
    s.memories.echo.trust -= 25;
    s.memories.luna.trust -= 10;
    remember(s, "luna", "Vendiste la memoria de ECHO-9 a Helix.");
    remember(s, "vera", "Entregaste a Helix el registro de ECHO-9.");
  }
  if (action === "reveal" || action === "negotiate") {
    s.completed.push("audit");
    s.choices.evidence = action;
    s.credits += 30;
    s.trust += action === "reveal" ? 10 : 4;
    s.heat += action === "reveal" ? 25 : 0;
    text =
      action === "reveal"
        ? "Publicaste la prueba: Helix provocó el apagón para imponer su red."
        : "Vera aceptó abrir una auditoría a cambio de una transición ordenada.";
    remember(s, "atlas", text);
  }
  if (action === "gift") {
    s.choices.gift = true;
    s.credits -= 15;
    s.trust += 4;
    text = "Apoyaste el taller de Kai. El barrio no lo olvidará.";
  }
  if (["free", "council", "helix"].includes(action)) {
    s.ending = action;
    const endings = {
      free: "NEOCITY LIBRE: la memoria vuelve a sus habitantes.",
      council: "EL CONSEJO: ciudadanos y sintéticos gobiernan juntos.",
      helix: "EL PACTO: Helix restaura el orden y conserva el control.",
    };
    text = endings[action];
    for (const n of NPCS) remember(s, n.id, text);
  }
  s.trust = Math.max(-100, Math.min(100, s.trust));
  s.memories[id].trust += action === "sell" ? 0 : 5;
  remember(s, id, text);
  event(s, text);
  return text;
}
export function recordChat(s, id, role, text) {
  const m = s.memories[id];
  if (!m || !["user", "assistant"].includes(role) || typeof text !== "string")
    return;
  m.chat.push({ role, text: text.slice(0, 900) });
  m.chat = m.chat.slice(-16);
}
export function localReply(s, id, message) {
  const npc = NPCS.find((n) => n.id === id),
    m = s.memories[id],
    q = message
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  if (!npc) return "No hay conexión con ese personaje.";
  if (/recuerda|recuerdas|memoria|antes|decidi/.test(q))
    return m.facts.length
      ? `Recuerdo esto: ${m.facts.slice(-3).join(" ")}`
      : "Recuerdo que llegaste al barrio. Tus decisiones quedarán en mi memoria.";
  if (id === "echo" && s.choices.echo === "sold")
    return "Vendiste mi registro. Podemos hablar, pero necesito tiempo para volver a confiar en ti.";
  if (/hola|buenas|saludo/.test(q))
    return `${m.visits > 1 ? "Ya nos conocemos." : "Bienvenido a NeoCity."} ${m.trust > 5 ? "Has demostrado que puedo contar contigo." : npc.greeting}`;
  if (/mision|ayud|hacer|objetivo|clave|celda|filtro/.test(q))
    return (
      objective(s).text +
      " Las decisiones importantes se toman con las opciones que ves aquí."
    );
  if (/helix|apagon|prueba/.test(q))
    return s.choices.evidence === "reveal"
      ? "La verdad ya está en la calle. Helix tendrá que responder ante la ciudad."
      : id === "vera"
        ? "Helix prometió estabilidad. Si encuentras pruebas del apagón, tráelas: yo también quiero respuestas."
        : "Helix controla la red de recuerdos. Busca la prueba del apagón en el Distrito Núcleo.";
  if (/ciudad|distrito|donde|lugar/.test(q))
    return "El Mercado Neón está al oeste, los Jardines de Silicio al este y Núcleo al norte. El mapa señala a cada persona y los objetos de tu misión.";
  if (/confia|opina|reputacion/.test(q))
    return `La confianza del barrio está en ${s.trust}. ${m.facts.at(-1) || "Todavía estamos conociéndonos."}`;
  if (/final|futuro|atlas|libre/.test(q))
    return s.ending
      ? `Nuestra ciudad ya eligió un camino. ${s.log.findLast((x) => /NEOCITY LIBRE|EL CONSEJO|EL PACTO/.test(x))}`
      : "ATLAS espera tres claves: energía, vida y transparencia. Al reunirlas podrás elegir el futuro de la red.";
  return `${npc.name}: ${npc.greeting} ${m.facts.at(-1) || "Puedes preguntarme por la ciudad, Helix, tu misión o lo que recuerdo de ti."}`;
}
export function serialize(s) {
  const { active, events, ...data } = s;
  return JSON.stringify(data);
}
export function restore(raw) {
  try {
    const d = JSON.parse(raw),
      s = initialCity();
    if (
      d.version !== 1 ||
      !d.player ||
      !["x", "z", "heading", "energy"].every((k) =>
        Number.isFinite(d.player[k]),
      ) ||
      Math.abs(d.player.x) > limit ||
      Math.abs(d.player.z) > limit
    )
      return null;
    for (const key of ["credits", "trust", "heat", "time"])
      if (!Number.isFinite(d[key])) return null;
    if (
      !Array.isArray(d.collected) ||
      !Array.isArray(d.completed) ||
      !Array.isArray(d.log) ||
      !Array.isArray(d.visited) ||
      !d.choices ||
      typeof d.choices !== "object" ||
      !d.memories
    )
      return null;
    if (
      d.collected.some((id) => !PICKUPS.some((p) => p.id === id)) ||
      d.completed.some((id) => !["power", "garden", "audit"].includes(id)) ||
      d.log.some((x) => typeof x !== "string") ||
      ![null, "free", "council", "helix"].includes(d.ending)
    )
      return null;
    for (const npc of NPCS) {
      const m = d.memories[npc.id];
      if (
        !m ||
        !Number.isFinite(m.trust) ||
        !Number.isInteger(m.visits) ||
        !Array.isArray(m.facts) ||
        !Array.isArray(m.chat) ||
        m.facts.some((f) => typeof f !== "string") ||
        m.chat.some(
          (c) =>
            !["user", "assistant"].includes(c.role) ||
            typeof c.text !== "string",
        )
      )
        return null;
      m.facts = m.facts.slice(-12);
      m.chat = m.chat.slice(-16);
    }
    Object.assign(s, d, { active: false, events: [] });
    s.log = s.log.slice(-35);
    return s;
  } catch {
    return null;
  }
}
