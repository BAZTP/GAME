import { seaConditions } from "./sea.js";

export class Sound {
  constructor(button) {
    this.button = button;
    this.enabled = false;
    this.ctx = null;
    this.lastCreak = 0;
    try {
      this.enabled = localStorage.getItem("marea-sound") === "on";
    } catch {}
    this.refresh();
  }
  refresh() {
    const label = this.enabled ? "Desactivar sonido" : "Activar sonido";
    this.button.setAttribute("aria-pressed", String(this.enabled));
    this.button.setAttribute("aria-label", label);
    this.button.title = label;
    this.button.querySelector(".sound-off").hidden = this.enabled;
  }
  init() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const ctx = (this.ctx = new (window.AudioContext ||
          window.webkitAudioContext)());
        this.master = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -14;
        compressor.ratio.value = 6;
        this.master.connect(compressor);
        compressor.connect(ctx.destination);
        const buffer = ctx.createBuffer(2, ctx.sampleRate * 3, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = buffer.getChannelData(ch);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        this.ambient = {};
        for (const [name, type, frequency] of [
          ["sea", "lowpass", 780],
          ["wind", "bandpass", 350],
          ["rain", "highpass", 2100],
        ]) {
          const source = ctx.createBufferSource(),
            filter = ctx.createBiquadFilter(),
            gain = ctx.createGain();
          source.buffer = buffer;
          source.loop = true;
          filter.type = type;
          filter.frequency.value = frequency;
          filter.Q.value = 0.6;
          gain.gain.value = 0;
          source.connect(filter);
          filter.connect(gain);
          gain.connect(this.master);
          source.start();
          this.ambient[name] = gain;
        }
      }
      this.master.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.03);
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch {
      this.enabled = false;
      this.refresh();
    }
  }
  silence() {
    if (this.ctx)
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
  }
  updateScene(state) {
    if (!this.ctx || !this.ambient) return;
    const at = this.ctx.currentTime,
      weather = seaConditions(state);
    const audible = this.enabled && !document.hidden;
    this.master.gain.setTargetAtTime(audible ? 0.7 : 0, at, 0.03);
    const active = audible && state.active;
    const levels = {
      sea:
        (state.realm === "spectral" ? 0.09 : 0.22) *
        (0.65 + 0.35 * Math.sin(state.time * 0.8)),
      wind: 0.035 + weather.waves * 0.08,
      rain: weather.rain * 0.055,
    };
    for (const name of Object.keys(levels))
      this.ambient[name].gain.setTargetAtTime(
        active ? levels[name] : 0,
        at,
        0.18,
      );
    if (
      active &&
      Math.hypot(state.player.vx, state.player.vy) > 45 &&
      at - this.lastCreak > 8
    ) {
      this.lastCreak = at;
      this.play("creak");
    }
  }
  play(name) {
    if (!this.enabled || document.hidden) return;
    this.init();
    if (!this.ctx || !this.master) return;
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
      gain.connect(this.master);
      osc.start(at + start);
      osc.stop(at + start + duration + 0.03);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    };
    if (["cannon", "enemy-cannon", "hit", "sunk", "thunder"].includes(name)) {
      const cannon = name.includes("cannon"),
        thunder = name === "thunder";
      const duration = thunder
        ? 2.3
        : cannon
          ? 0.7
          : name === "sunk"
            ? 1.1
            : 0.24;
      const buffer = ctx.createBuffer(
          1,
          Math.ceil(ctx.sampleRate * duration),
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
      filter.frequency.value = thunder ? 180 : cannon ? 420 : 1100;
      gain.gain.value = name === "enemy-cannon" ? 0.09 : thunder ? 0.2 : 0.16;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      let delay, echo;
      if (cannon) {
        delay = ctx.createDelay();
        echo = ctx.createGain();
        delay.delayTime.value = 0.16;
        echo.gain.value = 0.24;
        gain.connect(delay);
        delay.connect(echo);
        echo.connect(this.master);
      }
      source.onended = () =>
        setTimeout(() => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
          delay?.disconnect();
          echo?.disconnect();
        }, 700);
      source.start();
      tone(
        thunder ? 38 : cannon ? 58 : 110,
        0,
        duration,
        "sine",
        thunder || name === "enemy-cannon" ? 0.035 : 0.07,
      );
      return;
    }
    if (name === "creak") {
      tone(125, 0, 0.6, "triangle", 0.012);
      tone(163, 0.12, 0.45, "sine", 0.009);
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
