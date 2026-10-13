const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const smooth = (v) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};

// El reloj de la partida conserva el clima al guardar y lo congela al pausar.
export function seaConditions(state) {
  const time = state.time || 0;
  const daylight = 0.5 + 0.5 * Math.cos((time / 480) * Math.PI * 2);
  const front = 0.5 + 0.5 * Math.sin((time / 210) * Math.PI * 2 - Math.PI / 2);
  const localStorm = smooth(
    (490 - Math.hypot(state.player.x - 1610, state.player.y - 1200)) / 350,
  );
  const spectral = state.realm === "spectral";
  const rain = spectral
    ? 0
    : Math.max(smooth((front - 0.48) / 0.5), localStorm);
  const storm = spectral
    ? 0
    : Math.max(smooth((front - 0.86) / 0.14), localStorm);
  const minutes = Math.floor((12 * 60 + time * 3) % (24 * 60));
  return {
    daylight,
    rain,
    storm,
    cloud: spectral ? 0.3 : Math.max(front * 0.8, localStorm),
    waves: spectral ? 0.45 : 0.35 + rain * 0.8,
    hour: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    label: spectral
      ? "Bruma espectral"
      : storm > 0.65
        ? "Tormenta"
        : rain > 0.25
          ? "Lluvia"
          : front > 0.35
            ? "Cielo cubierto"
            : "Mar en calma",
    icon: spectral ? "☾" : rain > 0.25 ? "☂" : daylight < 0.3 ? "☾" : "☀",
    lightning:
      storm > 0.65 ? Math.max(0, 1 - ((time + 3) % 17) / 0.45) * storm : 0,
  };
}

export const HANDLING = {
  sloop: { turn: 3.6, acceleration: 3.8, drag: 1.25 },
  brig: { turn: 3, acceleration: 3.2, drag: 1.1 },
  galleon: { turn: 1.9, acceleration: 2.1, drag: 0.85 },
  phantom: { turn: 3.8, acceleration: 3.8, drag: 1.2 },
};

export function navigate(player, dt, input, speed, shipId) {
  const dx = Number(!!input.right) - Number(!!input.left);
  const dy = Number(!!input.down) - Number(!!input.up);
  const sailing = !!(dx || dy);
  const handling = HANDLING[shipId] || HANDLING.sloop;
  if (sailing) {
    const target = Math.atan2(dy, dx);
    const delta = Math.atan2(
      Math.sin(target - player.angle),
      Math.cos(target - player.angle),
    );
    player.angle += clamp(delta, -handling.turn * dt, handling.turn * dt);
    player.angle = Math.atan2(Math.sin(player.angle), Math.cos(player.angle));
    const throttle = 0.55 + 0.45 * Math.max(0, Math.cos(delta));
    const response = 1 - Math.exp(-handling.acceleration * dt);
    player.vx +=
      (Math.cos(player.angle) * speed * throttle - player.vx) * response;
    player.vy +=
      (Math.sin(player.angle) * speed * throttle - player.vy) * response;
  } else {
    const drag = Math.exp(-handling.drag * dt);
    player.vx *= drag;
    player.vy *= drag;
    if (Math.hypot(player.vx, player.vy) < 0.5) {
      player.vx = 0;
      player.vy = 0;
    }
  }
  return sailing;
}

export function combatEffect(state, x, y, kind, angle = 0) {
  state.effects ||= [];
  const add = (type, count, color, life, speed, size) => {
    for (let n = 0; n < count; n++) {
      const direction =
        type === "smoke"
          ? angle + (Math.random() - 0.5) * 1.1
          : Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.6);
      state.effects.push({
        x,
        y,
        vx: Math.cos(direction) * velocity,
        vy: Math.sin(direction) * velocity,
        type,
        color,
        life,
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        angle: direction,
        realm: state.realm,
      });
    }
  };
  if (kind === "cannon") {
    add("smoke", 7, "#c1bbb0", 1.5, 32, 12);
    add("flash", 2, "#ffe2a1", 0.16, 12, 13);
  }
  if (kind === "impact" || kind === "sink") {
    add("splinter", kind === "sink" ? 20 : 9, "#d1ae76", 1.5, 95, 5);
    add("smoke", kind === "sink" ? 12 : 4, "#626669", 2.6, 18, 14);
    add("flash", 3, "#ffbc69", 0.28, 22, 15);
  }
  if (kind === "splash" || kind === "sink")
    add("splash", kind === "sink" ? 9 : 4, "#d3eae0", 1.1, 45, 11);
  if (kind === "damage") add("smoke", 1, "#484e50", 2.2, 14, 10);
  if (state.effects.length > 240)
    state.effects.splice(0, state.effects.length - 240);
}

export function sinkShip(state, ship, player = false) {
  state.wrecks ||= [];
  state.wrecks.push({
    ...ship,
    shipId: player ? state.shipId : null,
    realm: ship.realm || state.realm,
    player,
    life: 3.4,
    maxLife: 3.4,
    invulnerable: 0,
  });
  if (state.wrecks.length > 10) state.wrecks.shift();
  combatEffect(state, ship.x, ship.y, "sink");
}
