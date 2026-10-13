import test from "node:test";
import assert from "node:assert/strict";
import { initialState, update, fire, serialize, restore } from "../src/game.js";
import { navigate, seaConditions, combatEffect, sinkShip } from "../src/sea.js";

test("a reverse command turns gradually without reversing momentum instantly", () => {
  const p = { angle: 0, vx: 150, vy: 0 };
  navigate(p, 0.05, { left: true }, 155, "sloop");
  assert.ok(p.angle > 0 && p.angle < 0.2);
  assert.ok(p.vx > 100);
  for (let n = 0; n < 60; n++) navigate(p, 0.05, { left: true }, 155, "sloop");
  assert.ok(p.vx < -140);
  assert.ok(Math.abs(p.angle - Math.PI) < 0.001);
});
test("ships coast after release and heavy ships turn more slowly", () => {
  const light = { angle: 0, vx: 100, vy: 0 },
    heavy = { ...light };
  navigate(light, 0.05, { down: true }, 155, "sloop");
  navigate(heavy, 0.05, { down: true }, 125, "galleon");
  assert.ok(light.angle > heavy.angle);
  const speed = Math.hypot(light.vx, light.vy);
  navigate(light, 0.1, {}, 155, "sloop");
  assert.ok(Math.hypot(light.vx, light.vy) < speed);
  assert.ok(Math.hypot(light.vx, light.vy) > speed * 0.8);
  for (let n = 0; n < 200; n++) navigate(light, 0.05, {}, 155, "sloop");
  assert.equal(light.vx, 0);
  assert.equal(light.vy, 0);
});
test("diagonal navigation has the same top speed as cardinal navigation", () => {
  const p = { angle: Math.PI / 4, vx: 0, vy: 0 };
  for (let n = 0; n < 160; n++)
    navigate(p, 0.05, { right: true, down: true }, 155, "sloop");
  assert.ok(Math.abs(Math.hypot(p.vx, p.vy) - 155) < 0.001);
});
test("weather cycles through noon, night and storms; spectral weather stays dry", () => {
  const s = initialState();
  assert.equal(seaConditions(s).hour, "12:00");
  assert.equal(seaConditions(s).daylight, 1);
  assert.equal(seaConditions(s).rain, 0);
  s.time = 240;
  assert.equal(seaConditions(s).hour, "00:00");
  assert.equal(seaConditions(s).daylight, 0);
  s.time = 105;
  assert.equal(seaConditions(s).label, "Tormenta");
  s.time = 0;
  s.player.x = 1610;
  s.player.y = 1200;
  assert.equal(seaConditions(s).storm, 1);
  s.realm = "spectral";
  assert.equal(seaConditions(s).rain, 0);
  assert.equal(seaConditions(s).lightning, 0);
});
test("weather and effects freeze on pause; saves retain weather but omit debris", () => {
  const s = initialState();
  s.time = 112;
  fire(s);
  sinkShip(s, s.enemies[0]);
  assert.ok(s.effects.length && s.wrecks.length);
  const snapshot = JSON.stringify(s);
  update(s, 0.05, { fire: true });
  assert.equal(JSON.stringify(s), snapshot);
  const copy = restore(serialize(s));
  assert.deepEqual(seaConditions(copy), seaConditions(s));
  assert.equal(copy.effects.length, 0);
  assert.equal(copy.wrecks.length, 0);
});
test("combat sinks once, creates debris, and all transient effects expire", () => {
  const s = initialState();
  s.active = true;
  s.player.x = 100;
  s.player.y = 2100;
  s.player.angle = 0;
  s.enemies = [
    {
      ...s.enemies[0],
      x: 350,
      y: 2100,
      homeX: 350,
      homeY: 2100,
      hp: 1,
      cooldown: 100,
      realm: "real",
    },
  ];
  fire(s);
  assert.ok(s.effects.some((p) => p.type === "smoke"));
  for (let n = 0; n < 20; n++) update(s, 0.05, {});
  assert.equal(s.sunk, 1);
  assert.equal(s.wrecks.length, 1);
  assert.ok(s.effects.some((p) => p.type === "splinter"));
  for (let n = 0; n < 100; n++) update(s, 0.05, {});
  assert.equal(s.wrecks.length, 0);
  assert.equal(s.effects.length, 0);
  assert.equal(s.sunk, 1);
  assert.equal(s.loot.length, 1);
  for (let n = 0; n < 100; n++) combatEffect(s, 100, 100, "sink");
  assert.ok(s.effects.length <= 240);
});
