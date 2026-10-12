import { ISLANDS, WORLD, dist, random, nextTarget, clamp } from "./game.js";

const TAU = Math.PI * 2;
function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}
function ellipse(ctx, x, y, rx, ry, color, rotation = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}
function islandPath(ctx, r, seed, factor = 1) {
  ctx.beginPath();
  for (let n = 0; n <= 80; n++) {
    const a = (n / 80) * TAU;
    const k =
      1 +
      Math.sin(a * 3 + seed) * 0.1 +
      Math.cos(a * 5 + seed) * 0.06 +
      Math.sin(a * 7) * 0.035;
    const x = Math.cos(a) * r * k * factor,
      y = Math.sin(a) * r * k * 0.76 * factor;
    n ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function palm(ctx, x, y, scale, seed, spectral) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ellipse(ctx, 13, 16, 28, 10, "#133e3430", 0.4);
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.quadraticCurveTo(-8, -9, 0, -29);
  ctx.strokeStyle = spectral ? "#777580" : "#776745";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, 9);
  ctx.quadraticCurveTo(-5, -9, 1, -29);
  ctx.strokeStyle = spectral ? "#aca0b5" : "#a59460";
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let n = 0; n < 7; n++) {
    const a = (n / 7) * TAU + seed;
    const ex = Math.cos(a) * 29,
      ey = -29 + Math.sin(a) * 17;
    ctx.beginPath();
    ctx.moveTo(0, -29);
    ctx.quadraticCurveTo(ex * 0.6 - 7, ey - 13, ex, ey + 8);
    ctx.quadraticCurveTo(ex * 0.65, ey - 2, 0, -29);
    ctx.fillStyle = spectral
      ? ["#698b89", "#879e98", "#466c76"][n % 3]
      : ["#3e7950", "#598957", "#316845", "#729658"][n % 4];
    ctx.fill();
    line(
      ctx,
      [
        [0, -29],
        [ex * 0.65, ey - 4],
        [ex, ey + 8],
      ],
      spectral ? "#9aaaa170" : "#aac17c70",
      0.7,
    );
  }
  ellipse(ctx, 0, -28, 3, 3, "#574c33");
  ctx.restore();
}
function hut(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ellipse(ctx, 7, 10, 23, 12, "#24452e38");
  ctx.fillStyle = "#c3b184";
  ctx.fillRect(-14, -6, 28, 24);
  ctx.fillStyle = "#4e5140";
  ctx.fillRect(-3, 6, 7, 12);
  ctx.beginPath();
  ctx.moveTo(-21, -5);
  ctx.lineTo(0, -26);
  ctx.lineTo(21, -5);
  ctx.closePath();
  ctx.fillStyle = "#947f58";
  ctx.fill();
  line(
    ctx,
    [
      [-21, -5],
      [0, -26],
      [21, -5],
    ],
    "#d5c397",
    2,
  );
  for (let i = -10; i <= 10; i += 5)
    line(
      ctx,
      [
        [i, -7],
        [i * 0.35, -20],
      ],
      "#baa375",
      1,
    );
  ctx.restore();
}

export class Renderer {
  constructor(canvas, mini) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mini = mini;
    this.camera = { x: 530, y: 1640 };
    this.w = 0;
    this.h = 0;
    this.zoom = 1;
    this.clock = 0;
    this.cache = new Map();
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    this.zoom = this.w < 550 ? 0.69 : 0.91;
  }
  screenToWorld(x, y) {
    return {
      x: (x - this.w / 2) / this.zoom + this.camera.x,
      y: (y - this.h / 2) / this.zoom + this.camera.y,
    };
  }
  snap(p) {
    this.camera.x = p.x;
    this.camera.y = p.y;
  }
  islandSprite(i, spectral) {
    const key = i.id + spectral;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = document.createElement("canvas");
    c.width = 560;
    c.height = 500;
    const ctx = c.getContext("2d");
    ctx.translate(280, 250);
    const rand = random(i.seed);
    const r = i.r;
    islandPath(ctx, r, i.seed, 1.55);
    ctx.fillStyle = spectral ? "#56748e14" : "#64a59822";
    ctx.fill();
    islandPath(ctx, r, i.seed, 1.33);
    ctx.fillStyle = spectral ? "#829db91c" : "#71b09e35";
    ctx.fill();
    islandPath(ctx, r, i.seed, 1.15);
    ctx.fillStyle = spectral ? "#a3bad338" : "#aed2b870";
    ctx.fill();
    ctx.strokeStyle = spectral ? "#bad1da50" : "#d7e6c7aa";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.save();
    ctx.translate(3, 8);
    islandPath(ctx, r, i.seed, 1);
    ctx.fillStyle = spectral ? "#546879" : "#a8ab79";
    ctx.fill();
    ctx.restore();
    islandPath(ctx, r, i.seed, 1);
    ctx.fillStyle = spectral ? "#a1a9b6" : "#dece96";
    ctx.fill();
    islandPath(ctx, r, i.seed, 0.89);
    ctx.strokeStyle = spectral ? "#bdc4ce" : "#efdda8";
    ctx.lineWidth = 7;
    ctx.stroke();
    islandPath(ctx, r, i.seed, 0.77);
    ctx.fillStyle = spectral ? "#637e82" : "#87985d";
    ctx.fill();
    islandPath(ctx, r, i.seed, 0.64);
    ctx.fillStyle = spectral ? "#527176" : "#6c8752";
    ctx.fill();
    for (let n = 0; n < 90; n++) {
      const a = rand() * TAU,
        rr = Math.sqrt(rand()) * r * 0.76,
        x = Math.cos(a) * rr,
        y = Math.sin(a) * rr * 0.69;
      ellipse(
        ctx,
        x,
        y,
        1 + rand() * 3,
        1 + rand() * 2,
        spectral ? "#bbc6bf25" : "#cad09750",
      );
    }
    // Les reliefs et constructions font partie de la carte, sans images distantes.
    const rocks = i.id === "tide" || i.id === "bones";
    if (rocks) {
      for (let n = 0; n < 6; n++) {
        const x = (rand() - 0.5) * r,
          y = (rand() - 0.5) * r * 0.6;
        ctx.beginPath();
        ctx.moveTo(x - 18, y + 15);
        ctx.lineTo(x - 8, y - 20 - rand() * 20);
        ctx.lineTo(x + 8, y - 26);
        ctx.lineTo(x + 22, y + 12);
        ctx.closePath();
        ctx.fillStyle = spectral ? "#657f8b" : "#727c68";
        ctx.fill();
        line(
          ctx,
          [
            [x - 8, y - 20],
            [x + 3, y - 7],
            [x + 22, y + 12],
          ],
          spectral ? "#a7afbb" : "#aaa68b",
          2,
        );
      }
    }
    const palms = i.kind === "port" ? 9 : rocks ? 6 : 13;
    for (let n = 0; n < palms; n++) {
      const a = rand() * TAU,
        rr = Math.sqrt(rand()) * r * 0.64;
      palm(
        ctx,
        Math.cos(a) * rr,
        Math.sin(a) * rr * 0.65,
        0.72 + rand() * 0.55,
        rand() * 6,
        spectral,
      );
    }
    if (i.kind === "port") {
      ctx.save();
      ctx.rotate(-0.1);
      ctx.fillStyle = "#6d6a4c";
      ctx.fillRect(-17, 75, 37, 90);
      ctx.strokeStyle = "#b49b69";
      ctx.lineWidth = 2;
      for (let y = 80; y < 164; y += 7)
        line(
          ctx,
          [
            [-17, y],
            [20, y],
          ],
          "#b59e70",
          2,
        );
      for (let y = 86; y < 165; y += 28) {
        ellipse(ctx, -20, y, 4, 4, "#655d43");
        ellipse(ctx, 23, y, 4, 4, "#655d43");
      }
      ctx.restore();
      hut(ctx, -34, 20, 1.1);
      hut(ctx, 35, 0, 0.9);
      hut(ctx, -3, -39, 0.8);
      line(
        ctx,
        [
          [5, 48],
          [5, 6],
        ],
        "#877d59",
        3,
      );
      ctx.fillStyle = "#ede0b3";
      ctx.beginPath();
      ctx.moveTo(7, 7);
      ctx.lineTo(28, 13);
      ctx.lineTo(7, 24);
      ctx.fill();
      ellipse(ctx, 48, 60, 13, 7, "#8d825744");
      ctx.fillStyle = "#ab9361";
      ctx.fillRect(39, 49, 12, 13);
      line(
        ctx,
        [
          [39, 53],
          [51, 53],
        ],
        "#736a45",
        2,
      );
    } else if (i.kind === "relic") {
      ellipse(ctx, 0, 16, 28, 14, spectral ? "#abc0c52a" : "#d3c793");
      for (const x of [-19, 19]) {
        ctx.fillStyle = spectral ? "#98a6b0" : "#b5ad86";
        ctx.fillRect(x - 5, -17, 10, 35);
        ctx.fillStyle = spectral ? "#bdc6cc" : "#d2c6a0";
        ctx.fillRect(x - 8, -21, 16, 7);
      }
      ctx.fillStyle = spectral ? "#879eae" : "#b1a981";
      ctx.fillRect(-23, 14, 46, 8);
    } else {
      ctx.fillStyle = "#7b633c";
      ctx.fillRect(-12, 3, 25, 17);
      ctx.fillStyle = "#b9a365";
      ctx.fillRect(-13, 2, 27, 5);
      line(
        ctx,
        [
          [-4, 3],
          [-4, 20],
        ],
        "#d4bb72",
        2,
      );
      line(
        ctx,
        [
          [6, 3],
          [6, 20],
        ],
        "#d4bb72",
        2,
      );
    }
    for (let n = 0; n < 9; n++) {
      const a = rand() * TAU,
        rr = r * (1 + rand() * 0.2);
      ellipse(
        ctx,
        Math.cos(a) * rr,
        Math.sin(a) * rr * 0.75,
        3 + rand() * 7,
        3 + rand() * 4,
        spectral ? "#7d8e9d" : "#b5ae84",
        rand(),
      );
    }
    this.cache.set(key, c);
    return c;
  }
  draw(s, dt, intro = false) {
    if (!this.w || !this.h) return;
    this.clock += this.reducedMotion ? 0 : dt;
    const t = this.clock,
      c = this.ctx,
      sp = s.realm === "spectral",
      w = this.w,
      h = this.h;
    let target = intro ? { x: 750, y: 1050 } : s.player;
    const blend = 1 - Math.exp(-dt * 5);
    this.camera.x += (target.x - this.camera.x) * blend;
    this.camera.y += (target.y - this.camera.y) * blend;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const water = c.createLinearGradient(0, 0, w, h);
    water.addColorStop(0, sp ? "#263b56" : "#295962");
    water.addColorStop(0.55, sp ? "#35465e" : "#316c70");
    water.addColorStop(1, sp ? "#172b42" : "#17464e");
    c.fillStyle = water;
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h / 2);
    c.scale(this.zoom, this.zoom);
    c.translate(-this.camera.x, -this.camera.y);
    const left = this.camera.x - w / this.zoom / 2,
      top = this.camera.y - h / this.zoom / 2,
      right = left + w / this.zoom,
      bottom = top + h / this.zoom;
    // Vagues dessinées dans les coordonnées du monde pour donner du relief au déplacement.
    for (let row = Math.floor(top / 46); row < bottom / 46 + 1; row++) {
      for (let col = Math.floor(left / 82); col < right / 82 + 1; col++) {
        const x = col * 82 + (row % 2) * 36,
          y = row * 46;
        const k = Math.sin(col * 83.3 + row * 13.9);
        c.beginPath();
        c.moveTo(x + Math.sin(t * 0.35 + k) * 8, y);
        c.bezierCurveTo(
          x + 12,
          y - 2 - k * 3,
          x + 19,
          y + 3,
          x + 29 + k * 13,
          y,
        );
        c.strokeStyle = sp ? "#b0c1d411" : "#afccba19";
        c.lineWidth = 0.9;
        c.stroke();
        if (k > 0.5) {
          line(
            c,
            [
              [x + 13, y + 5],
              [x + 24, y + 5],
            ],
            "#b0d7cb0d",
            1,
          );
        }
      }
    }
    for (let n = 0; n < 35; n++) {
      const x = (n * 773) % WORLD.width,
        y = (n * 397) % WORLD.height;
      ellipse(c, x, y, 3, 1, sp ? "#9cb8d012" : "#c5d2b513");
    }
    // Limites du monde : lignes cartographiques discrètes.
    c.strokeStyle = "#d8d5ad22";
    c.lineWidth = 2;
    c.setLineDash([10, 15]);
    c.strokeRect(18, 18, WORLD.width - 36, WORLD.height - 36);
    c.setLineDash([]);
    this.drawStorm(c, t, sp);
    for (const i of ISLANDS) {
      if (
        i.x + i.r * 2 < left ||
        i.x - i.r * 2 > right ||
        i.y + i.r * 2 < top ||
        i.y - i.r * 2 > bottom
      )
        continue;
      if (i.kind === "rift") {
        this.drawRift(c, i, t, sp, s);
        continue;
      }
      c.drawImage(this.islandSprite(i, sp), i.x - 280, i.y - 250);
      if (
        i.kind === "relic" &&
        !s.relics.includes(i.id) &&
        i.realm === s.realm
      ) {
        const glow = c.createRadialGradient(
          i.x,
          i.y - 15,
          0,
          i.x,
          i.y - 15,
          49,
        );
        glow.addColorStop(0, sp ? "#dcc9ff65" : "#fff0b866");
        glow.addColorStop(1, "#ffffff00");
        c.fillStyle = glow;
        c.fillRect(i.x - 49, i.y - 64, 98, 98);
        c.font = "28px Georgia";
        c.textAlign = "center";
        c.fillStyle = sp ? "#e5d7ff" : "#fff2ba";
        c.shadowColor = c.fillStyle;
        c.shadowBlur = 14;
        c.fillText(i.glyph, i.x, i.y - 12 + Math.sin(t * 2) * 3);
        c.shadowBlur = 0;
      }
      const known = s.discovered.includes(i.id);
      c.textAlign = "center";
      c.font = "small-caps 14px Georgia";
      c.fillStyle = "#e8e7c5";
      c.shadowColor = "#183c40";
      c.shadowBlur = 4;
      c.fillText(
        known || intro ? i.name : "Costa desconocida",
        i.x,
        i.y + i.r * 0.91 + 35,
      );
      c.shadowBlur = 0;
      if (i.kind === "port") {
        c.font = "8px Arial";
        c.fillStyle = "#b4cfb4";
        c.fillText("⚓  PUERTO SEGURO", i.x, i.y + i.r * 0.91 + 51);
      } else if (s.looted.includes(i.id)) {
        c.font = "8px Arial";
        c.fillStyle = "#b6cdb1";
        c.fillText("EXPLORADA", i.x, i.y + i.r * 0.91 + 51);
      }
    }
    if (s.waypoint) {
      c.strokeStyle = "#ebd69a";
      c.lineWidth = 1.5;
      c.setLineDash([3, 6]);
      c.beginPath();
      c.arc(s.waypoint.x, s.waypoint.y, 22 + Math.sin(t * 2) * 3, 0, TAU);
      c.stroke();
      c.setLineDash([]);
      line(
        c,
        [
          [s.waypoint.x - 9, s.waypoint.y],
          [s.waypoint.x + 9, s.waypoint.y],
        ],
        "#efd8a3",
        1.5,
      );
      line(
        c,
        [
          [s.waypoint.x, s.waypoint.y - 9],
          [s.waypoint.x, s.waypoint.y + 9],
        ],
        "#efd8a3",
        1.5,
      );
    }
    for (const wake of s.trail) {
      c.save();
      c.globalAlpha = (wake.life / 2) * 0.24;
      c.translate(wake.x, wake.y);
      c.rotate(wake.angle);
      line(
        c,
        [
          [0, -13 - (2 - wake.life) * 13],
          [-8, 0],
          [0, 13 + (2 - wake.life) * 13],
        ],
        "#d6e7d8",
        1.5,
      );
      c.restore();
    }
    for (const item of s.loot) {
      if (item.realm !== s.realm) continue;
      const y = item.y + Math.sin(t * 3) * 3;
      ellipse(c, item.x, y + 5, 13, 5, "#152f3935");
      ellipse(c, item.x, y, 8, 6, "#dbc080");
      ellipse(c, item.x, y - 2, 5, 3, "#f3da9c");
      c.font = "10px Arial";
      c.textAlign = "center";
      c.fillStyle = "#ead9a1";
      c.fillText("+" + item.amount, item.x, y - 13);
    }
    for (const e of s.enemies) {
      if (e.dead) continue;
      if (e.realm !== s.realm) {
        if (sp) this.ship(c, e, t, false, true);
        continue;
      }
      this.ship(c, e, t, false);
      if (dist(e, s.player) < 700) {
        const bw = e.boss ? 95 : 44;
        c.fillStyle = "#152d3980";
        c.fillRect(e.x - bw / 2, e.y - 58, bw, 3);
        c.fillStyle = e.boss ? "#c2a1db" : "#c8947f";
        c.fillRect(e.x - bw / 2, e.y - 58, bw * Math.max(0, e.hp / e.maxHp), 3);
        if (e.boss) {
          c.fillStyle = "#e0ccea";
          c.font = "10px Georgia";
          c.textAlign = "center";
          c.fillText("EL ALMIRANTE HUECO", e.x, e.y - 70);
        }
      }
    }
    this.ship(c, { ...s.player, realm: s.realm }, t, true);
    for (const b of s.bullets) {
      if (b.realm !== s.realm) continue;
      line(
        c,
        [
          [b.x - b.vx * 0.045, b.y - b.vy * 0.045],
          [b.x, b.y],
        ],
        b.owner === "player" ? "#ffe5a77a" : "#e6a78b80",
        3,
      );
      ellipse(
        c,
        b.x,
        b.y,
        b.owner === "player" ? 3.5 : 4,
        b.owner === "player" ? 3.5 : 4,
        b.owner === "player" ? "#ffe4a0" : "#e8a08c",
      );
    }
    for (const p of s.particles) {
      c.globalAlpha = Math.max(0, p.life / p.maxLife);
      ellipse(c, p.x, p.y, p.size, p.size, p.color);
    }
    c.globalAlpha = 1;
    if (!this.reducedMotion)
      for (let n = 0; n < 6; n++) {
        const bx = 790 + n * 26 + Math.sin(t * 0.17) * 150,
          by = 920 + Math.sin(n) * 24 + Math.cos(t * 0.2) * 80;
        const flap = Math.sin(t * 4 + n) * 4;
        line(
          c,
          [
            [bx - 6, by + flap],
            [bx, by],
            [bx + 6, by + flap],
          ],
          sp ? "#b2bfd559" : "#cbd8c594",
          1.3,
        );
      }
    c.restore();
    // Vignette douce et gravure de compas.
    const vignette = c.createRadialGradient(
      w * 0.5,
      h * 0.4,
      h * 0.15,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.7,
    );
    vignette.addColorStop(0, "#06293500");
    vignette.addColorStop(1, sp ? "#0e172e88" : "#052e3b77");
    c.fillStyle = vignette;
    c.fillRect(0, 0, w, h);
    if (!intro) this.drawBearing(c, s);
    this.drawCompass(c, w - 49, h * 0.48, sp);
    if (s.player.hp < s.player.maxHp * 0.3 && !intro) {
      c.strokeStyle = `rgba(197,95,72,${0.28 + Math.sin(t * 3) * 0.1})`;
      c.lineWidth = 7;
      c.strokeRect(3, 3, w - 6, h - 6);
    }
    this.drawMap(s, this.mini, false);
  }
  drawStorm(c, t, sp) {
    c.save();
    c.translate(1610, 1200);
    const g = c.createRadialGradient(0, 0, 20, 0, 0, 205);
    g.addColorStop(0, sp ? "#8894ac10" : "#172d4aa0");
    g.addColorStop(1, "#142d4900");
    c.fillStyle = g;
    c.fillRect(-210, -210, 420, 420);
    for (let n = 0; n < 7; n++) {
      const a = n * 0.9 + t * 0.06;
      c.beginPath();
      c.ellipse(
        Math.cos(a) * 35,
        Math.sin(a) * 25,
        85 + n * 6,
        50 + n * 4,
        a,
        0,
        TAU,
      );
      c.strokeStyle = sp ? "#b6b4d50c" : "#a4acbd10";
      c.lineWidth = 7;
      c.stroke();
    }
    if (!sp) {
      for (let n = 0; n < 22; n++) {
        const x = Math.sin(n * 13) * 120,
          y = ((t * 85 + n * 24) % 240) - 120;
        line(
          c,
          [
            [x, y],
            [x - 6, y + 15],
          ],
          "#b9c8d03b",
          1,
        );
      }
      c.font = "italic 12px Georgia";
      c.textAlign = "center";
      c.fillStyle = "#c2ced09a";
      c.fillText("El ojo de la tormenta", 0, 160);
    }
    c.restore();
  }
  drawRift(c, i, t, sp, s) {
    c.save();
    c.translate(i.x, i.y);
    const g = c.createRadialGradient(0, 0, 5, 0, 0, 170);
    g.addColorStop(0, sp ? "#100c30ee" : "#122738d0");
    g.addColorStop(0.45, sp ? "#8676b94f" : "#17394b9f");
    g.addColorStop(1, "#22333b00");
    c.fillStyle = g;
    c.fillRect(-170, -170, 340, 340);
    for (let n = 0; n < 9; n++) {
      c.beginPath();
      c.ellipse(
        0,
        0,
        15 + n * 13,
        8 + n * 8,
        t * 0.13 + n * 0.35,
        0,
        TAU * 0.83,
      );
      c.strokeStyle = sp
        ? `rgba(185,170,222,${0.12 + n * 0.012})`
        : `rgba(168,197,188,${0.05 + n * 0.01})`;
      c.lineWidth = 1.5;
      c.stroke();
    }
    c.font = "27px Georgia";
    c.textAlign = "center";
    c.fillStyle = sp ? "#d7c4ee" : "#b0c6be80";
    c.fillText(s.won ? "✧" : "⌾", 0, 6);
    c.font = "14px Georgia";
    c.fillStyle = "#d5daca";
    c.fillText(i.name, 0, 156);
    c.font = "8px Arial";
    c.fillStyle = "#a5b7b4";
    c.fillText(
      s.won ? "EL MAR ES LIBRE" : "TRES RELIQUIAS · UNA PUERTA",
      0,
      173,
    );
    c.restore();
  }
  ship(c, e, t, player = false, ghost = false) {
    c.save();
    c.translate(e.x, e.y);
    c.rotate(e.angle + Math.PI / 2);
    const scale = e.boss ? 1.8 : player ? 1 : 0.92;
    c.scale(scale, scale);
    if (ghost) c.globalAlpha = 0.12;
    else if (player && e.invulnerable > 0)
      c.globalAlpha = 0.65 + Math.sin(t * 20) * 0.25;
    const spectral = e.realm === "spectral";
    ellipse(c, 7, 12, 17, 37, "#08293850", -0.12);
    c.beginPath();
    c.moveTo(0, -38);
    c.bezierCurveTo(17, -22, 18, 17, 10, 32);
    c.quadraticCurveTo(0, 37, -10, 32);
    c.bezierCurveTo(-18, 17, -17, -22, 0, -38);
    c.fillStyle = spectral ? "#46677a" : player ? "#65523b" : "#4e443b";
    c.fill();
    c.strokeStyle = spectral ? "#afc7cc" : "#c6aa71";
    c.lineWidth = 1.5;
    c.stroke();
    c.beginPath();
    c.moveTo(0, -31);
    c.bezierCurveTo(11, -17, 12, 13, 7, 27);
    c.lineTo(-7, 27);
    c.bezierCurveTo(-12, 13, -11, -17, 0, -31);
    c.fillStyle = spectral ? "#6f8190" : "#9a7d52";
    c.fill();
    for (let y = -17; y < 27; y += 6)
      line(
        c,
        [
          [-9, y],
          [9, y],
        ],
        spectral ? "#adbec344" : "#4c49395c",
        1,
      );
    line(
      c,
      [
        [0, -48],
        [0, 35],
      ],
      spectral ? "#bed6d4" : "#ceba87",
      2,
    );
    for (const side of [-1, 1])
      for (const y of [-8, 9]) {
        c.fillStyle = "#303e3c";
        c.fillRect(side < 0 ? -20 : 12, y, 8, 4);
      }
    c.beginPath();
    c.moveTo(-27, -18);
    c.quadraticCurveTo(0, -10, 27, -18);
    c.quadraticCurveTo(22, 1, 26, 10);
    c.quadraticCurveTo(0, 17, -26, 10);
    c.quadraticCurveTo(-22, 0, -27, -18);
    c.fillStyle =
      e.hit > 0
        ? "#fff5d8"
        : spectral
          ? "#c4d4d5"
          : player
            ? "#e9dfbc"
            : "#a96c56";
    c.fill();
    c.strokeStyle = spectral ? "#e0ddec" : "#f3e8c84f";
    c.lineWidth = 1;
    c.stroke();
    line(
      c,
      [
        [0, -17],
        [0, 13],
      ],
      spectral ? "#a0b4bd" : "#c4b48c",
      1,
    );
    line(
      c,
      [
        [-26, -18],
        [26, -18],
      ],
      "#716d5877",
      1.5,
    );
    c.beginPath();
    c.moveTo(-18, 17);
    c.quadraticCurveTo(0, 21, 18, 17);
    c.lineTo(15, 31);
    c.quadraticCurveTo(0, 34, -15, 31);
    c.closePath();
    c.fillStyle = spectral ? "#a8bdc4" : player ? "#d8ccaa" : "#955c4c";
    c.fill();
    if (player) {
      c.strokeStyle = "#677060";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, -6);
      c.lineTo(4, 0);
      c.lineTo(0, 6);
      c.lineTo(-4, 0);
      c.closePath();
      c.stroke();
    } else {
      ellipse(c, 0, -1, 4, 4, spectral ? "#52667b" : "#e1c8a8");
      line(
        c,
        [
          [-5, 7],
          [5, 3],
        ],
        "#e1c8a8",
        1,
      );
      line(
        c,
        [
          [-5, 3],
          [5, 7],
        ],
        "#e1c8a8",
        1,
      );
    }
    c.beginPath();
    c.moveTo(0, -42);
    c.lineTo(13 + Math.sin(t * 4) * 2, -38);
    c.lineTo(0, -33);
    c.fillStyle = player ? "#c7b277" : spectral ? "#bac7dc" : "#bf7159";
    c.fill();
    c.restore();
  }
  drawBearing(c, s) {
    const target = nextTarget(s);
    if (!target) return;
    const dx = (target.x - this.camera.x) * this.zoom,
      dy = (target.y - this.camera.y) * this.zoom;
    if (Math.abs(dx) < this.w / 2 - 80 && Math.abs(dy) < this.h / 2 - 100)
      return;
    const a = Math.atan2(dy, dx),
      rx = this.w / 2 - 36,
      ry = this.h / 2 - 95;
    const m =
      1 / Math.max(Math.abs(Math.cos(a)) / rx, Math.abs(Math.sin(a)) / ry);
    const x = this.w / 2 + Math.cos(a) * m,
      y = this.h / 2 + Math.sin(a) * m;
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.beginPath();
    c.moveTo(9, 0);
    c.lineTo(-5, -5);
    c.lineTo(-2, 0);
    c.lineTo(-5, 5);
    c.closePath();
    c.fillStyle = "#e5ca8dbb";
    c.fill();
    c.restore();
  }
  drawCompass(c, x, y, sp) {
    c.save();
    c.translate(x, y);
    c.globalAlpha = 0.45;
    c.strokeStyle = sp ? "#c5c4d0" : "#c6d2b8";
    c.lineWidth = 0.7;
    c.beginPath();
    c.arc(0, 0, 19, 0, TAU);
    c.stroke();
    for (let n = 0; n < 8; n++) {
      const a = (n / 8) * TAU;
      line(
        c,
        [
          [Math.cos(a) * 16, Math.sin(a) * 16],
          [Math.cos(a) * 21, Math.sin(a) * 21],
        ],
        c.strokeStyle,
        0.7,
      );
    }
    c.beginPath();
    c.moveTo(0, -15);
    c.lineTo(4, 4);
    c.lineTo(0, 1);
    c.lineTo(-4, 4);
    c.closePath();
    c.fillStyle = "#e4dab1";
    c.fill();
    c.font = "8px Arial";
    c.textAlign = "center";
    c.fillText("N", 0, -27);
    c.restore();
  }
  drawMap(s, canvas, large = false) {
    if (!canvas) return;
    const c = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height,
      sc = Math.min((w - 20) / WORLD.width, (h - 20) / WORLD.height),
      ox = (w - WORLD.width * sc) / 2,
      oy = (h - WORLD.height * sc) / 2;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#ddd4b2";
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(ox, oy);
    c.scale(sc, sc);
    c.strokeStyle = "#9a9f7830";
    c.lineWidth = 1 / sc;
    for (let x = 0; x < WORLD.width; x += 400)
      line(
        c,
        [
          [x, 0],
          [x, WORLD.height],
        ],
        "#9a9f782a",
        1 / sc,
      );
    for (let y = 0; y < WORLD.height; y += 400)
      line(
        c,
        [
          [0, y],
          [WORLD.width, y],
        ],
        "#9a9f782a",
        1 / sc,
      );
    c.setLineDash([4 / sc, 5 / sc]);
    c.beginPath();
    c.moveTo(s.player.x, s.player.y);
    const target = nextTarget(s);
    c.lineTo(target.x, target.y);
    c.strokeStyle = "#9a805777";
    c.lineWidth = 1 / sc;
    c.stroke();
    c.setLineDash([]);
    if (large) {
      ellipse(c, 1610, 1200, 155, 120, "#777e7040");
      c.textAlign = "center";
      c.font = `${9 / sc}px Georgia`;
      c.fillStyle = "#727762";
      c.fillText("Tormenta", 1610, 1380);
    }
    for (const i of ISLANDS) {
      const known = s.discovered.includes(i.id);
      c.save();
      c.translate(i.x, i.y);
      if (i.kind === "rift") {
        c.beginPath();
        c.arc(0, 0, i.r * 0.7, 0, TAU);
        c.strokeStyle = "#716a8366";
        c.lineWidth = 1 / sc;
        c.stroke();
      } else {
        islandPath(c, i.r, i.seed);
        c.fillStyle = known ? "#8a9970" : "#9b9c7980";
        c.fill();
        c.strokeStyle = "#70855d";
        c.lineWidth = 0.5 / sc;
        c.stroke();
      }
      if (large) {
        c.textAlign = "center";
        c.font = `${10 / sc}px Georgia`;
        c.fillStyle = "#4d5c48";
        c.fillText(i.name, 0, i.r + 95);
        c.font = `${13 / sc}px Georgia`;
        c.fillStyle =
          i.kind === "port"
            ? "#496858"
            : i.realm === "spectral"
              ? "#827395"
              : "#987746";
        const mark = s.looted.includes(i.id)
          ? "✓"
          : i.kind === "port"
            ? "⚓"
            : i.glyph || (i.kind === "rift" ? "⌾" : "◇");
        c.fillText(mark, 0, 12 / sc);
      }
      c.restore();
    }
    if (large)
      for (const e of s.enemies)
        if (!e.dead && e.realm === s.realm) {
          ellipse(c, e.x, e.y, 4 / sc, 4 / sc, "#a95e4c");
        }
    if (s.waypoint) {
      line(
        c,
        [
          [s.waypoint.x - 7 / sc, s.waypoint.y - 7 / sc],
          [s.waypoint.x + 7 / sc, s.waypoint.y + 7 / sc],
        ],
        "#a27846",
        1.5 / sc,
      );
      line(
        c,
        [
          [s.waypoint.x + 7 / sc, s.waypoint.y - 7 / sc],
          [s.waypoint.x - 7 / sc, s.waypoint.y + 7 / sc],
        ],
        "#a27846",
        1.5 / sc,
      );
    }
    c.save();
    c.translate(s.player.x, s.player.y);
    c.rotate(s.player.angle + Math.PI / 2);
    c.beginPath();
    c.moveTo(0, -6 / sc);
    c.lineTo(4 / sc, 5 / sc);
    c.lineTo(0, 3 / sc);
    c.lineTo(-4 / sc, 5 / sc);
    c.closePath();
    c.fillStyle = "#1c5656";
    c.fill();
    c.restore();
    c.restore();
    if (large) {
      c.font = "11px Georgia";
      c.fillStyle = "#667258";
      c.fillText("N", w - 25, 23);
      line(
        c,
        [
          [w - 22, 29],
          [w - 22, 55],
        ],
        "#667258",
        1,
      );
      line(
        c,
        [
          [w - 26, 34],
          [w - 22, 29],
          [w - 18, 34],
        ],
        "#667258",
        1,
      );
    }
    return { sc, ox, oy };
  }
}
