import test from "node:test";
import assert from "node:assert/strict";
import {
  initialVoyage,
  updateVoyage,
  shoot,
  collect,
  targetAhead,
  ISLANDS,
  TREASURE,
  distance,
} from "../src/three/simulation.js";
const tick = (s, seconds, input = {}) => {
  for (let n = 0; n < Math.ceil(seconds / 0.02); n++)
    updateVoyage(s, 0.02, input);
};
test("3D helm turns relative to the bow, coasts and brakes; pause freezes everything", () => {
  const s = initialVoyage();
  s.active = true;
  tick(s, 1, { forward: true });
  assert.ok(s.player.z < 55);
  assert.ok(s.player.speed > 15);
  const speed = s.player.speed;
  tick(s, 0.2);
  assert.ok(s.player.speed > speed * 0.8 && s.player.speed < speed);
  tick(s, 1, { right: true, forward: true });
  assert.ok(s.player.heading > 0.7);
  assert.ok(s.player.x > 5);
  tick(s, 2, { brake: true });
  assert.ok(s.player.speed < 0);
  s.active = false;
  const snapshot = JSON.stringify(s);
  tick(s, 1, { fire: true });
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(shoot(s), false);
});
test("3D coast and world edges prevent ships escaping navigable water", () => {
  const s = initialVoyage();
  s.active = true;
  s.enemies = [];
  const i = ISLANDS[1];
  s.player.x = i.x;
  s.player.z = i.z;
  tick(s, 0.02);
  assert.ok(distance(s.player, i) >= i.r + 5 - 0.001);
  s.player.x = 419;
  s.player.z = 0;
  s.player.heading = Math.PI / 2;
  tick(s, 10, { forward: true });
  assert.ok(s.player.x <= 420);
  assert.ok(Number.isFinite(s.player.speed));
});
test("3D cannons aim only ahead, honor reload and award one sinking per enemy", () => {
  const s = initialVoyage();
  s.active = true;
  s.enemies = [{ ...s.enemies[0], x: 0, z: 5, cooldown: 100 }];
  assert.equal(targetAhead(s)?.id, 1);
  assert.equal(shoot(s), true);
  assert.equal(shoot(s), false);
  tick(s, 1.2);
  assert.equal(s.enemies[0].hp, 64);
  tick(s, 3, { fire: true });
  assert.equal(s.sunk, 1);
  assert.equal(s.enemies[0].hp, 0);
  tick(s, 4, { fire: true });
  assert.equal(s.sunk, 1);
  assert.equal(s.enemies[0].sink, 1);
  s.enemies = [{ ...s.enemies[0], hp: 96, z: s.player.z + 50 }];
  assert.equal(targetAhead(s), null);
});
test("3D islands stop projectiles and a wreck respawns the player safely", () => {
  const s = initialVoyage();
  s.active = true;
  s.enemies = [];
  const i = ISLANDS[0];
  s.bullets = [
    { x: i.x, z: i.z, vx: 0, vz: 0, y: 2, life: 1, owner: "player" },
  ];
  tick(s, 0.02);
  assert.equal(s.bullets.length, 0);
  s.player.x = 0;
  s.player.z = -20;
  s.player.hp = 1;
  s.bullets = [{ x: 0, z: -20, vx: 0, vz: 0, y: 2, life: 1, owner: "enemy" }];
  tick(s, 0.02);
  assert.equal(s.deaths, 1);
  assert.equal(s.player.hp, 140);
  assert.equal(s.player.z, 65);
  assert.ok(s.player.invulnerable > 0);
});
test("3D treasure requires both corsairs and proximity, and is collected only once", () => {
  const s = initialVoyage();
  s.active = true;
  Object.assign(s.player, TREASURE);
  assert.equal(collect(s), false);
  s.sunk = 2;
  s.player.x = 300;
  assert.equal(collect(s), false);
  Object.assign(s.player, TREASURE);
  assert.equal(collect(s), true);
  assert.equal(collect(s), false);
  assert.equal(s.events.filter((e) => e.sound === "treasure").length, 1);
});
