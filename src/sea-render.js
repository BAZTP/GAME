const TAU = Math.PI * 2;
const clamp = (v) => Math.max(0, Math.min(1, v));
function texture(inner, outer) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext("2d"),
    g = ctx.createRadialGradient(48, 48, 0, 48, 48, 47);
  g.addColorStop(0, inner);
  g.addColorStop(0.4, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
  return canvas;
}
export class SeaPainter {
  constructor() {
    this.smoke = texture("#b7b5ac99", "#b7b5ac00");
    this.darkSmoke = texture("#424d5099", "#424d5000");
    this.cloud = texture("#071e3255", "#071e3200");
    this.light = texture("#f4d69888", "#f4d69800");
  }
  waves(c, bounds, t, weather) {
    const { left, top, right, bottom } = bounds;
    c.save();
    for (let row = Math.floor(top / 83); row < bottom / 83 + 1; row++) {
      for (
        let col = Math.floor((left - t * 5) / 157) - 1;
        col < (right - t * 5) / 157 + 1;
        col++
      ) {
        const phase = col * 1.9 + row * 2.3,
          x = col * 157 + Math.sin(row * 8) * 35 + t * 5,
          y = row * 83 + Math.sin(t * 0.85 + phase) * 7;
        const crest = (0.5 + 0.5 * Math.sin(phase + t * 0.9)) ** 3;
        c.beginPath();
        c.moveTo(x, y);
        c.bezierCurveTo(
          x + 35,
          y - 12 * weather.waves,
          x + 64,
          y + 8 * weather.waves,
          x + 106,
          y - 4,
        );
        c.strokeStyle = `rgba(154,207,203,${0.045 + crest * 0.08})`;
        c.lineWidth = 7 + weather.waves * 4;
        c.stroke();
        c.strokeStyle = `rgba(211,234,220,${0.045 + crest * (0.12 + weather.rain * 0.11)})`;
        c.lineWidth = 0.7 + weather.rain * 0.5;
        c.stroke();
        if (crest > 0.6) {
          c.beginPath();
          c.moveTo(x + 22, y - 3);
          c.quadraticCurveTo(x + 46, y - 9 * weather.waves, x + 61, y - 1);
          c.strokeStyle = "#e3f0de26";
          c.stroke();
        }
      }
    }
    c.restore();
  }
  effects(c, state) {
    for (const p of state.effects || []) {
      if (p.realm !== state.realm) continue;
      const remain = clamp(p.life / p.maxLife),
        age = 1 - remain;
      c.save();
      c.globalAlpha = remain;
      if (p.type === "smoke") {
        const size = p.size * (1 + age * 2.5);
        c.globalAlpha = remain * 0.72;
        c.drawImage(
          p.color === "#c1bbb0" ? this.smoke : this.darkSmoke,
          p.x - size,
          p.y - size,
          size * 2,
          size * 2,
        );
      } else if (p.type === "splinter") {
        c.translate(p.x, p.y);
        c.rotate(p.angle + age * 5);
        c.fillStyle = p.color;
        c.fillRect(-p.size, -1, p.size * 2, 2);
      } else if (p.type === "splash") {
        const radius = p.size * (0.5 + age * 2);
        c.strokeStyle = p.color;
        c.lineWidth = 1.2;
        c.beginPath();
        c.ellipse(p.x, p.y, radius, radius * 0.45, 0, 0, TAU);
        c.stroke();
        for (let n = 0; n < 3; n++) {
          const a = n * 2.1 + p.angle;
          c.beginPath();
          c.moveTo(
            p.x + Math.cos(a) * radius * 0.5,
            p.y + Math.sin(a) * radius * 0.3,
          );
          c.lineTo(
            p.x + Math.cos(a) * radius * 0.8,
            p.y + Math.sin(a) * radius * 0.3 - 10 * remain,
          );
          c.stroke();
        }
      } else {
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size * remain, 0, TAU);
        c.fill();
      }
      c.restore();
    }
  }
  atmosphere(c, w, h, t, weather, spectral, reduced) {
    c.save();
    const night = spectral ? 0.1 : (1 - weather.daylight) * 0.34;
    c.fillStyle = `rgba(4,17,42,${night})`;
    c.fillRect(0, 0, w, h);
    if (!spectral) {
      const sunset =
        Math.max(0, 1 - Math.abs(weather.daylight - 0.4) * 4) *
        (1 - weather.rain) *
        0.12;
      const glow = c.createLinearGradient(0, 0, w, h);
      glow.addColorStop(0, `rgba(240,161,91,${sunset})`);
      glow.addColorStop(1, "#e4af7600");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
    }
    // Nubes suaves: reutiliza una textura, sin filtros costosos por fotograma.
    c.globalAlpha = 0.12 + weather.cloud * 0.35;
    for (let n = 0; n < 5; n++) {
      const x = ((n * w * 0.31 + t * (8 + n * 2)) % (w + 600)) - 300,
        y = (n * 179) % Math.max(h, 1);
      c.drawImage(this.cloud, x, y - 160, 650, 320);
    }
    c.globalAlpha = 1;
    if (weather.rain > 0.08) {
      const count = Math.round((w < 600 ? 62 : 125) * weather.rain);
      c.strokeStyle = `rgba(190,211,222,${0.12 + weather.rain * 0.14})`;
      c.lineWidth = 0.8;
      c.beginPath();
      for (let n = 0; n < count; n++) {
        const x =
            ((((n * 137.17 - t * 115) % (w + 80)) + w + 80) % (w + 80)) - 40,
          y = (n * 59.37 + t * 520) % (h + 60);
        c.moveTo(x, y);
        c.lineTo(x - 9, y + 17 + weather.storm * 9);
      }
      c.stroke();
    }
    if (!reduced && weather.lightning > 0) {
      const glow = c.createRadialGradient(
        w * 0.7,
        h * 0.18,
        0,
        w * 0.7,
        h * 0.18,
        w * 0.5,
      );
      glow.addColorStop(0, `rgba(195,215,241,${weather.lightning * 0.14})`);
      glow.addColorStop(1, "#bad5ff00");
      c.fillStyle = glow;
      c.fillRect(0, 0, w, h);
      c.strokeStyle = `rgba(220,229,245,${weather.lightning * 0.65})`;
      c.lineWidth = 1.8;
      c.beginPath();
      c.moveTo(w * 0.69, 0);
      c.lineTo(w * 0.66, h * 0.075);
      c.lineTo(w * 0.685, h * 0.065);
      c.lineTo(w * 0.645, h * 0.16);
      c.stroke();
    }
    c.restore();
  }
}
