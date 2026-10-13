import {
  SHIPS,
  ENEMY_TYPES,
  CONTRACTS,
  ACHIEVEMENTS,
  RESCUES,
} from "./content.js";
import { navigate, seaConditions, combatEffect, sinkShip } from "./sea.js";
export const WORLD = { width: 3200, height: 2400 };
export const SAVE_KEY = "marea-negra-v1";
export const ISLANDS = [
  {
    id: "port",
    name: "Puerto Bruma",
    x: 530,
    y: 1390,
    r: 152,
    kind: "port",
    seed: 3,
    subtitle: "Un refugio entre mareas",
    lore: "Aquí nadie pregunta de dónde vienes. Solo si tu barco volverá a salir. El viejo astillero mantiene a La Peregrina a flote.",
  },
  {
    id: "sun",
    name: "Isla del Sol",
    x: 1020,
    y: 730,
    r: 143,
    kind: "relic",
    realm: "real",
    seed: 12,
    glyph: "☀",
    treasure: 85,
    lore: "Bajo las raíces de una palmera centenaria brilla un disco de oro. Su calor no viene del sol: es el primer latido del Corazón del Abismo.",
  },
  {
    id: "palms",
    name: "Las Dos Palmas",
    x: 370,
    y: 490,
    r: 102,
    kind: "treasure",
    seed: 29,
    treasure: 65,
    lore: "Dos palmeras entrelazadas marcan el escondite de un contrabandista. Sus doblones siguen aquí. Él tuvo menos suerte.",
  },
  {
    id: "moon",
    name: "Velo de Luna",
    x: 1860,
    y: 410,
    r: 125,
    kind: "relic",
    realm: "spectral",
    seed: 17,
    glyph: "☾",
    treasure: 110,
    lore: "Al otro lado del velo, las piedras cantan. Una lágrima de plata flota sobre el altar: el recuerdo de una luna que cayó al mar.",
  },
  {
    id: "tide",
    name: "Colmillo Rojo",
    x: 2280,
    y: 1520,
    r: 155,
    kind: "relic",
    realm: "real",
    seed: 37,
    glyph: "≋",
    treasure: 130,
    lore: "La flota del Diente Rojo custodiaba una caracola de cristal. Acércala al oído: escucharás las coordenadas de un mar que todavía no existe.",
  },
  {
    id: "haven",
    name: "Refugio del Náufrago",
    x: 1350,
    y: 1890,
    r: 118,
    kind: "port",
    seed: 41,
    subtitle: "Astillero del sur",
    lore: "Un carpintero retirado convirtió este arrecife en un hogar para barcos perdidos. Repara el casco y prepara tu próxima expedición.",
  },
  {
    id: "bones",
    name: "Isla de los Huesos",
    x: 2840,
    y: 2020,
    r: 122,
    kind: "treasure",
    seed: 53,
    treasure: 100,
    lore: "El cofre estaba bajo una bandera que el viento olvidó. Una nota dice: «Gástalo en algo que te haga sentir vivo».",
  },
  {
    id: "rift",
    name: "La Boca del Abismo",
    x: 2770,
    y: 580,
    r: 122,
    kind: "rift",
    seed: 71,
    lore: "Tres reliquias. Una puerta. El Almirante Hueco lleva siglos esperando a alguien capaz de llegar hasta aquí.",
  },
];

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function random(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

export function enemy(
  id,
  x,
  y,
  realm = "real",
  boss = false,
  type = realm === "spectral" ? "shade" : "raider",
) {
  const stats = ENEMY_TYPES[type] || ENEMY_TYPES.raider;
  return {
    id,
    x,
    y,
    homeX: x,
    homeY: y,
    angle: -1,
    hp: boss ? 520 : stats.hp,
    maxHp: boss ? 520 : stats.hp,
    type,
    realm,
    boss,
    cooldown: boss ? 2.5 : 1.8,
    dead: false,
    hit: 0,
  };
}
export function initialState() {
  return {
    version: 2,
    time: 0,
    active: false,
    realm: "real",
    player: {
      x: 530,
      y: 1640,
      angle: -Math.PI / 2,
      vx: 0,
      vy: 0,
      hp: 130,
      maxHp: 130,
      energy: 100,
      gold: 120,
      reload: 0,
      boost: 0,
      boostCooldown: 0,
      invulnerable: 0,
      specialCooldown: 0,
      shield: 0,
    },
    shipId: "sloop",
    ownedShips: ["sloop"],
    claimedContracts: [],
    achievements: [],
    rescued: [],
    spectralTime: 0,
    upgrades: { hull: 0, cannons: 0, sails: 0 },
    relics: [],
    discovered: ["port"],
    looted: [],
    sunk: 0,
    deaths: 0,
    won: false,
    bossAwake: false,
    enemies: [
      enemy("corsair-1", 1280, 1040),
      enemy("corsair-2", 2020, 1450),
      enemy("corsair-3", 2490, 1710),
      enemy("corsair-4", 800, 420),
      enemy("shade-1", 2090, 650, "spectral"),
      enemy("shade-2", 2720, 1840, "spectral"),
      enemy("interceptor-1", 1360, 430, "real", false, "cutter"),
      enemy("warbrig-1", 2200, 1010, "real", false, "brig"),
      enemy("ironclad-1", 2840, 1460, "real", false, "dreadnought"),
      enemy("interceptor-2", 720, 2100, "real", false, "cutter"),
      enemy("shade-3", 1720, 2100, "spectral"),
      enemy("warbrig-2", 1100, 1310, "real", false, "brig"),
    ],
    bullets: [],
    particles: [],
    effects: [],
    wrecks: [],
    loot: [],
    trail: [],
    events: [],
    journal: [
      {
        time: 0,
        text: "La Peregrina zarpa de Puerto Bruma. Tres reliquias nos esperan más allá del horizonte.",
      },
    ],
    waypoint: null,
    damageClock: 0,
    autosave: 0,
  };
}

export function emit(state, text, type = "info", sound = null) {
  state.events.push({ text, type, sound });
}
export const currentShip = (s) => SHIPS[s.shipId] || SHIPS.sloop;
export function progress(s, metric) {
  return (
    {
      islands: s.discovered.length,
      sunk: s.sunk,
      rescued: s.rescued.length,
      spectralTime: Math.floor(s.spectralTime),
      ships: s.ownedShips.length,
      won: Number(s.won),
    }[metric] || 0
  );
}
export function checkAchievements(s) {
  for (const a of ACHIEVEMENTS)
    if (!s.achievements.includes(a.id) && progress(s, a.metric) >= a.target) {
      s.achievements.push(a.id);
      journal(s, `Logro desbloqueado: ${a.title}.`);
      emit(s, `Logro: ${a.title}`, "success", "treasure");
    }
}
export function selectShip(s, id) {
  const ship = SHIPS[id];
  if (!ship || !inPort(s)) return false;
  if (!s.ownedShips.includes(id)) {
    if (s.player.gold < ship.cost || s.relics.length < ship.relics)
      return false;
    s.player.gold -= ship.cost;
    s.ownedShips.push(id);
    journal(s, `${ship.name} se une a nuestra flota.`);
  }
  s.shipId = id;
  s.player.maxHp = ship.hp + s.upgrades.hull * 50;
  s.player.hp = s.player.maxHp;
  // Los tiempos de recarga se conservan al cambiar de barco.
  s.player.shield = 0;
  emit(s, `Ahora navegas a bordo de ${ship.name}.`, "success", "discovery");
  checkAchievements(s);
  return true;
}
export function claimContract(s, id) {
  const contract = CONTRACTS.find((c) => c.id === id);
  if (
    !contract ||
    !inPort(s) ||
    s.claimedContracts.includes(id) ||
    progress(s, contract.metric) < contract.target
  )
    return false;
  s.claimedContracts.push(id);
  s.player.gold += contract.reward;
  journal(
    s,
    `Contrato completado: ${contract.title}. +${contract.reward} doblones.`,
  );
  emit(s, `Contrato cobrado: +${contract.reward} doblones.`, "success", "coin");
  return true;
}
export function special(s) {
  const p = s.player,
    ship = currentShip(s);
  if (p.specialCooldown > 0) return false;
  if (ship.id === "sloop" && p.hp >= p.maxHp) {
    emit(s, "El casco ya está intacto. Guarda la reparación para el combate.");
    return false;
  }
  p.specialCooldown = ship.cooldown;
  if (ship.id === "sloop") p.hp = Math.min(p.maxHp, p.hp + 40);
  if (ship.id === "galleon") p.shield = 5;
  if (ship.id === "phantom") {
    s.realm = "spectral";
    p.energy = Math.min(100, p.energy + 50);
    p.invulnerable = Math.max(3, p.invulnerable);
  }
  if (ship.id === "brig") {
    const target = s.enemies
      .filter((e) => !e.dead && e.realm === s.realm && dist(e, p) < 750)
      .sort((a, b) => dist(a, p) - dist(b, p))[0];
    const aim = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
    for (let n = 0; n < 7; n++) {
      const angle = aim + (n - 3) * 0.1;
      s.bullets.push({
        x: p.x + Math.cos(angle) * 35,
        y: p.y + Math.sin(angle) * 35,
        vx: Math.cos(angle) * 570,
        vy: Math.sin(angle) * 570,
        life: 1.4,
        damage: 24 + s.upgrades.cannons * 5,
        owner: "player",
        realm: s.realm,
      });
    }
  }
  burst(s, p.x, p.y, ship.color, 24);
  emit(
    s,
    `${ship.ability} activada.`,
    "success",
    ship.id === "brig" ? "cannon" : "realm",
  );
  return true;
}
function journal(state, text) {
  state.journal.unshift({ time: state.time, text });
  state.journal = state.journal.slice(0, 60);
}
export function nextTarget(s) {
  if (s.waypoint) return { ...s.waypoint, name: "Rumbo marcado", custom: true };
  const id = ["sun", "moon", "tide"].find((id) => !s.relics.includes(id));
  return ISLANDS.find((i) => i.id === (id || (s.won ? "port" : "rift")));
}
export function nearestIsland(s) {
  return [...ISLANDS].sort(
    (a, b) => dist(a, s.player) - a.r - (dist(b, s.player) - b.r),
  )[0];
}
export function nearbyIsland(s) {
  const i = nearestIsland(s);
  return dist(i, s.player) < i.r + 125 ? i : null;
}
export function inPort(s) {
  return ISLANDS.some(
    (i) => i.kind === "port" && dist(i, s.player) < i.r + 150,
  );
}
export function threatAt(s, island) {
  return s.enemies.some(
    (e) =>
      !e.dead &&
      !e.boss &&
      e.realm === s.realm &&
      dist(e, island) < island.r + 290,
  );
}

export function toggleRealm(s) {
  if (s.realm === "real" && s.player.energy < 22) {
    emit(
      s,
      "Le falta energía a la brújula. Deja que el velo se recupere.",
      "danger",
    );
    return false;
  }
  s.realm = s.realm === "real" ? "spectral" : "real";
  s.player.invulnerable = Math.max(s.player.invulnerable, 0.8);
  burst(
    s,
    s.player.x,
    s.player.y,
    s.realm === "spectral" ? "#bda5ed" : "#f2d792",
    32,
  );
  emit(
    s,
    s.realm === "spectral"
      ? "Has cruzado el velo. Aquí navegan los olvidados."
      : "Vuelves al mar de los vivos.",
    "info",
    "realm",
  );
  return true;
}
export function boost(s) {
  if (s.player.boostCooldown > 0) return false;
  s.player.boost = 1.2;
  s.player.boostCooldown = 6;
  emit(s, "¡Todo el trapo al viento!", "info", "boost");
  return true;
}
export function fire(s, point) {
  const p = s.player;
  if (p.reload > 0) return false;
  const targets = s.enemies
    .filter((e) => !e.dead && e.realm === s.realm && dist(e, p) < 650)
    .sort((a, b) => dist(a, p) - dist(b, p));
  const target = point || targets[0];
  const a = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
  const number = s.upgrades.cannons >= 2 ? 3 : s.upgrades.cannons >= 1 ? 2 : 1;
  for (let n = 0; n < number; n++) {
    const offset = (n - (number - 1) / 2) * 0.085;
    s.bullets.push({
      x: p.x + Math.cos(a) * 30,
      y: p.y + Math.sin(a) * 30,
      vx: Math.cos(a + offset) * 550,
      vy: Math.sin(a + offset) * 550,
      life: 1.3,
      damage: currentShip(s).damage + s.upgrades.cannons * 5,
      owner: "player",
      realm: s.realm,
    });
  }
  p.reload = 0.72 - s.upgrades.cannons * 0.07;
  burst(s, p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, "#ffdb93", 8);
  combatEffect(s, p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, "cannon", a);
  p.recoil = 0.18;
  s.events.push({ sound: "cannon" });
  return true;
}
export function burst(s, x, y, color, count = 12) {
  for (let n = 0; n < count; n++) {
    const a = Math.random() * Math.PI * 2,
      speed = 25 + Math.random() * 95;
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.35 + Math.random() * 0.7,
      maxLife: 1.05,
      color,
      size: 1 + Math.random() * 4,
    });
  }
}

function collideLand(entity, radius = 22) {
  for (const i of ISLANDS) {
    if (i.kind === "rift") continue;
    const d = dist(entity, i),
      min = i.r * 0.86 + radius;
    if (d < min) {
      const a = Math.atan2(entity.y - i.y, entity.x - i.x);
      entity.x = i.x + Math.cos(a) * min;
      entity.y = i.y + Math.sin(a) * min;
      if (Number.isFinite(entity.vx) && Number.isFinite(entity.vy)) {
        const inward = entity.vx * Math.cos(a) + entity.vy * Math.sin(a);
        if (inward < 0) {
          entity.vx -= Math.cos(a) * inward;
          entity.vy -= Math.sin(a) * inward;
        }
      }
    }
  }
}
function hurt(s, amount) {
  if (s.player.invulnerable > 0 || s.player.shield > 0 || s.won) return;
  s.player.hp = Math.max(0, s.player.hp - amount);
  s.player.invulnerable = 0.45;
  burst(s, s.player.x, s.player.y, "#d98864", 12);
  combatEffect(s, s.player.x, s.player.y, "impact");
  s.events.push({ sound: "hit" });
  if (s.player.hp <= 0) {
    sinkShip(s, s.player, true);
    const lost = Math.ceil(s.player.gold * 0.15);
    s.player.gold -= lost;
    s.deaths++;
    Object.assign(s.player, {
      x: 530,
      y: 1640,
      angle: -Math.PI / 2,
      vx: 0,
      vy: 0,
      hp: s.player.maxHp,
      energy: 100,
      invulnerable: 5,
    });
    s.realm = "real";
    s.bullets = [];
    s.trail = [];
    s.waypoint = null;
    for (const e of s.enemies)
      if (!e.dead) {
        e.x = e.homeX;
        e.y = e.homeY;
        e.hp = e.maxHp;
      }
    const message = `La tripulación te rescató. Pierdes ${lost} doblones, pero conservas tus reliquias y mejoras.`;
    journal(s, message);
    emit(s, message, "danger", "sunk");
    s.events.push({ kind: "respawn" });
  }
}

export function update(s, dt, input = {}) {
  dt = Math.min(dt, 0.05);
  if (!s.active || dt <= 0) return;
  s.time += dt;
  s.autosave += dt;
  const p = s.player;
  p.reload = Math.max(0, p.reload - dt);
  p.recoil = Math.max(0, (p.recoil || 0) - dt);
  p.boost = Math.max(0, p.boost - dt);
  p.boostCooldown = Math.max(0, p.boostCooldown - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  p.specialCooldown = Math.max(0, p.specialCooldown - dt);
  p.shield = Math.max(0, p.shield - dt);
  if (s.realm === "spectral") {
    s.spectralTime += dt;
    p.energy = Math.max(0, p.energy - dt * (s.shipId === "phantom" ? 2.6 : 4));
    if (!p.energy) toggleRealm(s);
  } else p.energy = Math.min(100, p.energy + dt * 6);
  if (input.boost) boost(s);
  const speed =
    (currentShip(s).speed + s.upgrades.sails * 25) * (p.boost > 0 ? 2.15 : 1);
  navigate(p, dt, input, speed, s.shipId);
  p.x = clamp(p.x + p.vx * dt, 35, WORLD.width - 35);
  p.y = clamp(p.y + p.vy * dt, 35, WORLD.height - 35);
  collideLand(p);
  if (input.fire) fire(s);
  if (
    Math.hypot(p.vx, p.vy) > 15 &&
    Math.floor(s.time * 15) !== Math.floor((s.time - dt) * 15)
  )
    s.trail.push({
      x: p.x - Math.cos(p.angle) * 27,
      y: p.y - Math.sin(p.angle) * 27,
      life: 2,
      angle: p.angle,
    });
  for (const trail of s.trail) trail.life -= dt;
  s.trail = s.trail.filter((t) => t.life > 0);
  for (const i of ISLANDS)
    if (!s.discovered.includes(i.id) && dist(i, p) < i.r + 390) {
      s.discovered.push(i.id);
      journal(s, `Descubrimos ${i.name}.`);
      emit(s, `Tierra a la vista: ${i.name}`, "success", "discovery");
    }
  if (s.waypoint && dist(p, s.waypoint) < 85) {
    s.waypoint = null;
    emit(s, "Has llegado al rumbo marcado. La brújula vuelve a tu misión.");
  }
  const safe = inPort(s);
  if (safe) p.hp = Math.min(p.maxHp, p.hp + dt * 7);
  for (const e of s.enemies) {
    if (e.dead) continue;
    const enemyStats = ENEMY_TYPES[e.type] || ENEMY_TYPES.raider;
    e.hit = Math.max(0, e.hit - dt);
    e.recoil = Math.max(0, (e.recoil || 0) - dt);
    e.cooldown -= dt;
    if (e.realm !== s.realm) continue;
    const d = dist(p, e),
      engaged = d < (e.boss ? 900 : 620) && !safe;
    let tx = engaged ? p.x : e.homeX + Math.sin(s.time * 0.14 + e.homeY) * 90;
    let ty = engaged ? p.y : e.homeY + Math.cos(s.time * 0.14 + e.homeX) * 90;
    let a = Math.atan2(ty - e.y, tx - e.x);
    if (engaged && d < (e.boss ? 290 : 215)) a += Math.PI / 2;
    e.angle += angleDelta(e.angle, a) * Math.min(1, dt * 1.7);
    const es = e.boss ? 73 : enemyStats.speed;
    e.x = clamp(e.x + Math.cos(e.angle) * es * dt, 30, WORLD.width - 30);
    e.y = clamp(e.y + Math.sin(e.angle) * es * dt, 30, WORLD.height - 30);
    collideLand(e, e.boss ? 35 : 21);
    if (engaged && d < (e.boss ? 670 : 480) && e.cooldown <= 0) {
      const aim = Math.atan2(p.y + p.vy * 0.28 - e.y, p.x + p.vx * 0.28 - e.x),
        shots = e.boss ? 5 : enemyStats.shots;
      for (let n = 0; n < shots; n++) {
        const ba = aim + (n - (shots - 1) / 2) * 0.18;
        s.bullets.push({
          x: e.x + Math.cos(ba) * 30,
          y: e.y + Math.sin(ba) * 30,
          vx: Math.cos(ba) * 215,
          vy: Math.sin(ba) * 215,
          life: 3,
          damage: e.boss ? 19 : enemyStats.damage,
          owner: e.id,
          realm: e.realm,
        });
      }
      e.cooldown = e.boss ? 2.2 : enemyStats.reload;
      e.recoil = 0.18;
      combatEffect(
        s,
        e.x + Math.cos(aim) * 30,
        e.y + Math.sin(aim) * 30,
        "cannon",
        aim,
      );
      if (d < 600) s.events.push({ sound: "enemy-cannon" });
    }
    if (engaged && d < (e.boss ? 55 : 40)) hurt(s, 10);
  }
  for (const b of s.bullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0) {
      if (b.realm === s.realm) combatEffect(s, b.x, b.y, "splash");
      continue;
    }
    if (b.realm !== s.realm) continue;
    if (b.owner === "player") {
      for (const e of s.enemies)
        if (
          !e.dead &&
          e.realm === b.realm &&
          dist(e, b) < (e.boss ? 43 : 27 * (ENEMY_TYPES[e.type]?.scale || 1))
        ) {
          b.life = 0;
          e.hp -= b.damage;
          e.hit = 0.18;
          combatEffect(s, b.x, b.y, "impact");
          burst(s, b.x, b.y, e.realm === "spectral" ? "#b1e3d5" : "#ecc28b", 9);
          s.events.push({ sound: "hit" });
          if (e.hp <= 0) {
            sinkShip(s, e);
            e.dead = true;
            s.sunk++;
            burst(s, e.x, e.y, e.boss ? "#ccb4ff" : "#efbc74", 38);
            if (e.boss) {
              s.won = true;
              p.gold += 500;
              s.realm = "real";
              s.bullets = [];
              p.hp = p.maxHp;
              journal(
                s,
                "El Almirante Hueco ha caído. El Corazón del Abismo vuelve a latir. Los dos mares son libres.",
              );
              s.events.push({ kind: "victory", sound: "victory" });
            } else {
              s.loot.push({
                x: e.x,
                y: e.y,
                amount: (ENEMY_TYPES[e.type] || ENEMY_TYPES.raider).reward,
                life: 90,
                realm: e.realm,
              });
              emit(
                s,
                "¡Navío hundido! Recoge los doblones flotantes.",
                "success",
                "sunk",
              );
              journal(
                s,
                `Derrotamos ${e.realm === "spectral" ? "un navío espectral" : "un corsario del Diente Rojo"}.`,
              );
            }
          }
          break;
        }
    } else if (!safe && dist(p, b) < 24) {
      b.life = 0;
      hurt(s, b.damage);
    }
    if (
      b.life > 0 &&
      ISLANDS.some((i) => i.kind !== "rift" && dist(i, b) < i.r * 0.77)
    ) {
      b.life = 0;
      burst(s, b.x, b.y, "#ceb991", 4);
      combatEffect(s, b.x, b.y, "splash");
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);
  for (const item of s.loot) {
    item.life -= dt;
    if (item.realm !== s.realm) continue;
    const d = dist(p, item);
    if (d < 130 && d > 1) {
      item.x += ((p.x - item.x) / d) * 145 * dt;
      item.y += ((p.y - item.y) / d) * 145 * dt;
    }
    if (d < 32) {
      p.gold += item.amount;
      item.life = 0;
      emit(s, `+${item.amount} doblones recuperados.`, "success", "coin");
    }
  }
  s.loot = s.loot.filter((l) => l.life > 0);
  for (const particle of s.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }
  s.particles = s.particles.filter((p) => p.life > 0);
  for (const effect of s.effects) {
    effect.life -= dt;
    effect.x += effect.vx * dt;
    effect.y += effect.vy * dt;
    if (effect.type === "smoke") {
      effect.x += 9 * dt;
      effect.y -= 5 * dt;
    }
    if (effect.type === "splinter") effect.vy += 24 * dt;
  }
  s.effects = s.effects.filter((effect) => effect.life > 0);
  for (const wreck of s.wrecks) wreck.life -= dt;
  s.wrecks = s.wrecks.filter((wreck) => wreck.life > 0);
  if (Math.floor(s.time * 3) !== Math.floor((s.time - dt) * 3)) {
    for (const vessel of [p, ...s.enemies]) {
      if (
        !vessel.dead &&
        vessel.hp / vessel.maxHp < 0.32 &&
        (!vessel.realm || vessel.realm === s.realm)
      )
        combatEffect(s, vessel.x, vessel.y, "damage");
    }
  }
  const weather = seaConditions(s);
  if (
    weather.storm > 0.65 &&
    Math.floor((s.time + 3) / 17) !== Math.floor((s.time - dt + 3) / 17)
  )
    s.events.push({ sound: "thunder" });
  // La tormenta puede evitarse navegando alrededor o cruzando el velo.
  if (s.realm === "real" && Math.hypot(p.x - 1610, p.y - 1200) < 145 && !safe) {
    s.damageClock += dt;
    if (s.damageClock > 1.4) {
      s.damageClock = 0;
      hurt(s, 6);
      emit(
        s,
        "¡Tormenta! Sal de las nubes o cruza al mar espectral.",
        "danger",
      );
    }
  } else s.damageClock = 0;
  if (s.realm === "real")
    for (const rescue of RESCUES) {
      if (!s.rescued.includes(rescue.id) && dist(p, rescue) < 65) {
        s.rescued.push(rescue.id);
        p.gold += 45;
        journal(
          s,
          "Un náufrago vuelve a casa. Su familia recompensa a la tripulación con 45 doblones.",
        );
        emit(s, "¡Náufrago a salvo! +45 doblones.", "success", "discovery");
      }
    }
  checkAchievements(s);
}

export function interact(s) {
  const island = nearbyIsland(s);
  if (!island) {
    emit(s, "Acércate a la costa de una isla para explorar.");
    return null;
  }
  if (island.kind === "port") return { kind: "port", island };
  if (island.kind === "rift") {
    if (s.won)
      return {
        kind: "story",
        island,
        title: "El mar vuelve a ser libre",
        text: "El Corazón del Abismo late en calma. Tu tripulación ya es leyenda. Aún quedan costas que explorar.",
      };
    if (s.relics.length < 3) {
      emit(
        s,
        "La grieta exige las tres reliquias. Sigue la brújula.",
        "danger",
      );
      return null;
    }
    if (s.realm !== "spectral") {
      emit(s, "El guardián espera al otro lado. Cruza el velo con Q.", "info");
      return null;
    }
    if (s.bossAwake) {
      emit(s, "El Almirante Hueco ya ha despertado. ¡A los cañones!");
      return null;
    }
    s.bossAwake = true;
    s.enemies.push(
      enemy("admiral", island.x - 80, island.y + 280, "spectral", true),
    );
    s.player.energy = 100;
    journal(
      s,
      "Las reliquias abrieron la Boca del Abismo. El Almirante Hueco ha despertado.",
    );
    emit(s, "¡El Almirante Hueco emerge del abismo!", "danger", "boss");
    return { kind: "boss" };
  }
  if (s.looted.includes(island.id))
    return {
      kind: "story",
      island,
      title: island.name,
      text: "Esta costa ya te entregó su secreto. Consulta la carta náutica para trazar tu próximo rumbo.",
    };
  if (island.realm && island.realm !== s.realm) {
    emit(
      s,
      island.realm === "spectral"
        ? "El altar está al otro lado del velo. Pulsa Q para encontrarlo."
        : "Este tesoro pertenece a los vivos. Regresa con Q.",
      "info",
    );
    return null;
  }
  if (island.id === "tide" && threatAt(s, island)) {
    emit(
      s,
      "Los corsarios vigilan la costa. Húndelos o aléjalos de la isla.",
      "danger",
    );
    return null;
  }
  s.looted.push(island.id);
  s.player.gold += island.treasure;
  if (island.kind === "relic") {
    s.relics.push(island.id);
    s.waypoint = null;
  }
  journal(
    s,
    `${island.kind === "relic" ? "Recuperamos una reliquia en" : "Encontramos un tesoro en"} ${island.name}. +${island.treasure} doblones.`,
  );
  burst(s, s.player.x, s.player.y, "#f0d193", 35);
  s.events.push({ sound: "treasure" });
  return {
    kind: "treasure",
    island,
    title:
      island.kind === "relic"
        ? {
            sun: "El oro del sol",
            moon: "La lágrima de luna",
            tide: "La voz de la marea",
          }[island.id]
        : "Un secreto bien guardado",
    text: island.lore,
    amount: island.treasure,
  };
}
export function upgradeCost(s, type) {
  return 90 + s.upgrades[type] * 85;
}
export function buyUpgrade(s, type) {
  if (!["hull", "cannons", "sails"].includes(type) || !inPort(s)) return false;
  const cost = upgradeCost(s, type);
  if (s.upgrades[type] >= 3 || s.player.gold < cost) return false;
  s.player.gold -= cost;
  s.upgrades[type]++;
  if (type === "hull") {
    s.player.maxHp = currentShip(s).hp + s.upgrades.hull * 50;
    s.player.hp = s.player.maxHp;
  }
  journal(
    s,
    `El astillero mejora ${{ hull: "el casco", cannons: "los cañones", sails: "las velas" }[type]} al nivel ${s.upgrades[type]}.`,
  );
  emit(s, "Mejora instalada. ¡La Peregrina está lista!", "success", "coin");
  return true;
}
export function repair(s) {
  if (!inPort(s)) return false;
  s.player.hp = s.player.maxHp;
  s.player.energy = 100;
  emit(
    s,
    "Casco reparado y brújula recargada. Invita la casa.",
    "success",
    "coin",
  );
  return true;
}

export function serialize(s) {
  const {
    active,
    events,
    particles,
    trail,
    bullets,
    effects,
    wrecks,
    ...saved
  } = s;
  return JSON.stringify({
    ...saved,
    player: { ...saved.player, vx: 0, vy: 0, boost: 0 },
  });
}
export function restore(raw) {
  try {
    const saved = JSON.parse(raw);
    if (
      ![1, 2].includes(saved.version) ||
      !saved.player ||
      !Array.isArray(saved.relics) ||
      !Array.isArray(saved.enemies)
    )
      return null;
    const s = initialState(),
      p = saved.player;
    for (const key of ["x", "y", "hp", "maxHp", "energy", "gold", "angle"])
      if (!Number.isFinite(p[key])) return null;
    if (
      !saved.upgrades ||
      !["hull", "cannons", "sails"].every(
        (k) =>
          Number.isInteger(saved.upgrades[k]) &&
          saved.upgrades[k] >= 0 &&
          saved.upgrades[k] <= 3,
      )
    )
      return null;
    if (
      !["real", "spectral"].includes(saved.realm) ||
      !Array.isArray(saved.discovered) ||
      !Array.isArray(saved.looted) ||
      !Array.isArray(saved.journal)
    )
      return null;
    if (
      !saved.enemies.every(
        (e) =>
          Number.isFinite(e.x) &&
          Number.isFinite(e.y) &&
          Number.isFinite(e.hp) &&
          ["real", "spectral"].includes(e.realm),
      )
    )
      return null;
    Object.assign(s, saved, {
      active: false,
      particles: [],
      effects: [],
      wrecks: [],
      events: [],
      bullets: [],
      trail: [],
      autosave: 0,
    });
    s.player = {
      ...initialState().player,
      ...p,
      x: clamp(p.x, 35, WORLD.width - 35),
      y: clamp(p.y, 35, WORLD.height - 35),
      vx: 0,
      vy: 0,
      invulnerable: 3,
    };
    s.shipId = Object.hasOwn(SHIPS, saved.shipId) ? saved.shipId : "sloop";
    s.ownedShips = [
      ...new Set([
        "sloop",
        ...(Array.isArray(saved.ownedShips)
          ? saved.ownedShips.filter((id) => Object.hasOwn(SHIPS, id))
          : []),
      ]),
    ];
    if (!s.ownedShips.includes(s.shipId)) s.shipId = "sloop";
    s.claimedContracts = Array.isArray(saved.claimedContracts)
      ? saved.claimedContracts.filter((id) =>
          CONTRACTS.some((c) => c.id === id),
        )
      : [];
    s.achievements = Array.isArray(saved.achievements)
      ? saved.achievements.filter((id) => ACHIEVEMENTS.some((a) => a.id === id))
      : [];
    s.rescued = Array.isArray(saved.rescued)
      ? [
          ...new Set(
            saved.rescued.filter((id) => RESCUES.some((r) => r.id === id)),
          ),
        ]
      : [];
    s.spectralTime = Number.isFinite(saved.spectralTime)
      ? Math.max(0, saved.spectralTime)
      : 0;
    s.player.specialCooldown = Number.isFinite(p.specialCooldown)
      ? Math.max(0, p.specialCooldown)
      : 0;
    s.player.shield = 0;
    if (saved.version === 1) {
      const existingIds = new Set(s.enemies.map((e) => e.id));
      s.enemies.push(
        ...initialState().enemies.filter((e) => !existingIds.has(e.id)),
      );
    }
    s.version = 2;
    s.player.maxHp = currentShip(s).hp + s.upgrades.hull * 50;
    s.player.hp = clamp(s.player.hp, 1, s.player.maxHp);
    s.player.energy = clamp(s.player.energy, 0, 100);
    s.loot = Array.isArray(s.loot) ? s.loot : [];
    return s;
  } catch {
    return null;
  }
}
