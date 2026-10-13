export const ISLANDS = [
  { x: -80, z: 90, r: 38, name: "Puerto Bruma", seed: 3 },
  { x: 62, z: -185, r: 58, name: "Isla del Sol", seed: 8 },
  { x: -145, z: -235, r: 28, name: "Los Farallones", seed: 13 },
];
export const TREASURE = { x: 62, z: -112 };
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const forward = (heading) => ({
  x: Math.sin(heading),
  z: -Math.cos(heading),
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
export function initialVoyage() {
  return {
    active: false,
    time: 0,
    won: false,
    sunk: 0,
    shots: 0,
    deaths: 0,
    player: {
      x: 0,
      z: 65,
      heading: 0,
      speed: 0,
      hp: 140,
      maxHp: 140,
      reload: 0,
      invulnerable: 0,
    },
    enemies: [
      {
        id: 1,
        x: -2,
        z: -58,
        heading: Math.PI,
        hp: 96,
        maxHp: 96,
        cooldown: 3,
        sink: 0,
      },
      {
        id: 2,
        x: 112,
        z: -87,
        heading: -0.8,
        hp: 96,
        maxHp: 96,
        cooldown: 5,
        sink: 0,
      },
    ],
    bullets: [],
    particles: [],
    events: [],
  };
}
export function targetAhead(s) {
  const p = s.player,
    dir = forward(p.heading);
  return (
    s.enemies
      .filter(
        (e) =>
          e.hp > 0 &&
          distance(e, p) < 155 &&
          ((e.x - p.x) * dir.x + (e.z - p.z) * dir.z) /
            Math.max(1, distance(e, p)) >
            0.72,
      )
      .sort((a, b) => distance(a, p) - distance(b, p))[0] || null
  );
}
export function spray(s, x, z, kind, count = 12) {
  for (let n = 0; n < count; n++) {
    const a = Math.random() * Math.PI * 2,
      speed = 2 + Math.random() * 6;
    s.particles.push({
      x,
      y: kind === "smoke" ? 2.7 : 0.8,
      z,
      vx: Math.cos(a) * speed,
      vz: Math.sin(a) * speed,
      vy: 2 + Math.random() * 4,
      life: kind === "smoke" ? 1.6 : 0.9,
      kind,
    });
  }
  if (s.particles.length > 180) s.particles.splice(0, s.particles.length - 180);
}
export function shoot(s) {
  if (!s.active || s.player.reload > 0) return false;
  const p = s.player,
    target = targetAhead(s),
    dir = forward(p.heading);
  // A small aim assist keeps keyboard and touch combat usable from behind the sails.
  const aim = target
    ? Math.atan2(target.x - p.x, -(target.z - p.z))
    : p.heading;
  const shot = forward(aim);
  s.bullets.push({
    x: p.x + dir.x * 8,
    z: p.z + dir.z * 8,
    y: 2.8,
    vx: shot.x * 100,
    vz: shot.z * 100,
    life: 1.7,
    owner: "player",
  });
  p.reload = 1.05;
  s.shots++;
  spray(s, p.x + dir.x * 7, p.z + dir.z * 7, "smoke");
  s.events.push({ sound: "cannon" });
  return true;
}
function collide(ship) {
  for (const island of ISLANDS) {
    const min = island.r + 5,
      d = distance(ship, island);
    if (d < min) {
      const dx = (ship.x - island.x) / (d || 1),
        dz = (ship.z - island.z) / (d || 1);
      ship.x = island.x + (d ? dx : 1) * min;
      ship.z = island.z + dz * min;
      if ("speed" in ship) ship.speed *= 0.92;
    }
  }
  ship.x = clamp(ship.x, -420, 420);
  ship.z = clamp(ship.z, -410, 300);
}
export function collect(s) {
  if (!s.active || s.won || s.sunk < 2 || distance(s.player, TREASURE) > 27)
    return false;
  s.won = true;
  s.events.push({
    sound: "treasure",
    text: "¡El tesoro del Sol es tuyo! Travesía completada.",
  });
  return true;
}
export function updateVoyage(s, dt, input = {}) {
  if (!s.active) return;
  dt = clamp(dt, 0, 0.05);
  s.time += dt;
  const p = s.player;
  p.reload = Math.max(0, p.reload - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  const turn = Number(!!input.right) - Number(!!input.left);
  p.heading += turn * dt * (0.7 + Math.min(Math.abs(p.speed) / 25, 1) * 0.45);
  p.heading = Math.atan2(Math.sin(p.heading), Math.cos(p.heading));
  const targetSpeed = input.forward ? 31 : input.brake ? -7 : 0;
  p.speed +=
    (targetSpeed - p.speed) *
    (1 - Math.exp(-dt * (input.brake ? 2.2 : input.forward ? 0.9 : 0.32)));
  const dir = forward(p.heading);
  p.x += dir.x * p.speed * dt;
  p.z += dir.z * p.speed * dt;
  collide(p);
  if (input.fire) shoot(s);
  for (const e of s.enemies) {
    if (e.hp <= 0) {
      e.sink = Math.min(1, e.sink + dt / 3);
      continue;
    }
    const d = distance(e, p);
    e.cooldown -= dt;
    const desired = Math.atan2(p.x - e.x, -(p.z - e.z));
    const bearing = d < 44 ? desired + 1.3 : desired;
    e.heading += clamp(angleDelta(e.heading, bearing), -dt * 0.55, dt * 0.55);
    if (d < 240 && d > 25) {
      const f = forward(e.heading);
      e.x += f.x * 9 * dt;
      e.z += f.z * 9 * dt;
      collide(e);
    }
    if (d < 130 && e.cooldown <= 0 && distance(p, { x: 0, z: 65 }) > 28) {
      const f = forward(desired);
      s.bullets.push({
        x: e.x + f.x * 8,
        z: e.z + f.z * 8,
        y: 2.8,
        vx: f.x * 48,
        vz: f.z * 48,
        life: 3,
        owner: "enemy",
      });
      spray(s, e.x, e.z, "smoke", 7);
      e.cooldown = 3.7;
      s.events.push({ sound: "enemy-cannon" });
    }
  }
  for (const b of s.bullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    if (b.life <= 0) {
      spray(s, b.x, b.z, "water", 5);
      continue;
    }
    if (ISLANDS.some((i) => distance(i, b) < i.r)) {
      b.life = 0;
      spray(s, b.x, b.z, "water", 5);
      continue;
    }
    if (b.owner === "player") {
      const hit = s.enemies.find((e) => e.hp > 0 && distance(e, b) < 6.5);
      if (hit) {
        b.life = 0;
        hit.hp = Math.max(0, hit.hp - 32);
        spray(s, b.x, b.z, "fire", 15);
        s.events.push({ sound: "hit" });
        if (!hit.hp) {
          s.sunk++;
          spray(s, hit.x, hit.z, "smoke", 25);
          s.events.push({
            sound: "sunk",
            text:
              s.sunk === 2
                ? "La costa está libre. Acércate al cofre dorado."
                : "¡Corsario hundido! Queda otro protegiendo la isla.",
          });
        }
      }
    } else if (distance(p, b) < 5) {
      b.life = 0;
      if (p.invulnerable <= 0) {
        p.hp = Math.max(0, p.hp - 12);
        p.invulnerable = 0.5;
        spray(s, p.x, p.z, "fire", 10);
        s.events.push({ sound: "hit" });
      }
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);
  if (!p.hp) {
    Object.assign(p, {
      x: 0,
      z: 65,
      speed: 0,
      heading: 0,
      hp: 140,
      invulnerable: 5,
    });
    s.deaths++;
    s.bullets = [];
    s.events.push({
      sound: "sunk",
      text: "La tripulación te rescató en Puerto Bruma. Tu misión continúa.",
      respawn: true,
    });
  }
  for (const part of s.particles) {
    part.life -= dt;
    part.x += part.vx * dt;
    part.z += part.vz * dt;
    part.y += part.vy * dt;
    part.vy -= dt * 3;
  }
  s.particles = s.particles.filter((part) => part.life > 0);
}
