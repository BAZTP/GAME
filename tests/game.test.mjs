import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  update,
  fire,
  boost,
  toggleRealm,
  interact,
  buyUpgrade,
  repair,
  serialize,
  restore,
  ISLANDS,
  inPort,
} from "../src/game.js";

const sailTo = (s, id) => {
  const i = ISLANDS.find((i) => i.id === id);
  s.player.x = i.x;
  s.player.y = i.y + i.r + 65;
  return i;
};
const tick = (s, seconds, input = {}) => {
  s.active = true;
  for (let t = 0; t < seconds; t += 0.02) update(s, 0.02, input);
};

test("navigation moves the ship; pause freezes position, timers and enemies", () => {
  const s = initialState(),
    before = s.player.x;
  tick(s, 1, { right: true });
  assert.ok(s.player.x > before + 100);
  s.active = false;
  const snapshot = serialize(s);
  update(s, 0.05, { left: true, fire: true });
  assert.equal(serialize(s), snapshot);
});
test("island collision keeps the ship out of solid land", () => {
  const s = initialState(),
    i = ISLANDS[0];
  s.player.x = i.x;
  s.player.y = i.y;
  tick(s, 0.1);
  assert.ok(Math.hypot(s.player.x - i.x, s.player.y - i.y) >= i.r * 0.86 + 21);
});
test("the spectral veil drains and returns the ship to the living sea", () => {
  const s = initialState();
  assert.equal(toggleRealm(s), true);
  assert.equal(s.realm, "spectral");
  s.player.energy = 0.04;
  tick(s, 0.1);
  assert.equal(s.realm, "real");
  s.player.energy = 10;
  assert.equal(toggleRealm(s), false);
  tick(s, 3);
  assert.ok(s.player.energy >= 22);
  assert.equal(toggleRealm(s), true);
});
test("boost has a cooldown and increases travel speed", () => {
  const s = initialState(),
    normal = initialState();
  assert.equal(boost(s), true);
  assert.equal(boost(s), false);
  tick(s, 0.9, { right: true });
  tick(normal, 0.9, { right: true });
  assert.ok(s.player.x - normal.player.x > 80);
  tick(s, 6);
  assert.equal(boost(s), true);
});
test("treasure is collected exactly once and requires proximity", () => {
  const s = initialState();
  s.player.x = 20;
  s.player.y = 2200;
  assert.equal(interact(s), null);
  sailTo(s, "sun");
  const result = interact(s);
  assert.equal(result.kind, "treasure");
  assert.deepEqual(s.relics, ["sun"]);
  const gold = s.player.gold;
  assert.equal(interact(s).kind, "story");
  assert.equal(s.player.gold, gold);
});
test("moon relic is accessible only in the spectral world", () => {
  const s = initialState();
  sailTo(s, "moon");
  assert.equal(interact(s), null);
  toggleRealm(s);
  assert.equal(interact(s).kind, "treasure");
  assert.deepEqual(s.relics, ["moon"]);
});
test("corsairs guard the tide relic until defeated or lured away", () => {
  const s = initialState();
  sailTo(s, "tide");
  assert.equal(interact(s), null);
  s.enemies.forEach((e) => (e.dead = true));
  assert.equal(interact(s).kind, "treasure");
  assert.ok(s.relics.includes("tide"));
});
test("port repairs are free, upgrades charge coins and cannot be bought at sea", () => {
  const s = initialState();
  assert.equal(inPort(s), true);
  assert.equal(buyUpgrade(s, "hull"), true);
  assert.equal(s.player.gold, 30);
  assert.equal(s.player.maxHp, 180);
  assert.equal(buyUpgrade(s, "cannons"), false);
  s.player.hp = 2;
  assert.equal(repair(s), true);
  assert.equal(s.player.hp, 180);
  s.player.x = 100;
  s.player.y = 2300;
  s.player.gold = 999;
  assert.equal(buyUpgrade(s, "hull"), false);
  assert.equal(repair(s), false);
});
test("cannon projectiles sink an enemy, then nearby loot is collected", () => {
  const s = initialState();
  s.player.x = 100;
  s.player.y = 2100;
  s.player.angle = 0;
  s.enemies = [
    {
      id: "test",
      x: 250,
      y: 2100,
      homeX: 250,
      homeY: 2100,
      angle: Math.PI,
      hp: 28,
      maxHp: 28,
      realm: "real",
      boss: false,
      cooldown: 10,
      dead: false,
      hit: 0,
    },
  ];
  fire(s);
  tick(s, 0.5);
  assert.equal(s.enemies[0].dead, true);
  assert.equal(s.sunk, 1);
  assert.equal(s.loot.length, 1);
  s.player.x = s.loot[0].x;
  s.player.y = s.loot[0].y;
  tick(s, 0.1);
  assert.equal(s.player.gold, 180);
  assert.equal(s.loot.length, 0);
});
test("projectiles cannot damage a ship in the other world", () => {
  const s = initialState();
  s.player.x = 100;
  s.player.y = 2100;
  s.enemies = [];
  s.bullets = [
    {
      x: 100,
      y: 2100,
      vx: 0,
      vy: 0,
      life: 2,
      damage: 99,
      owner: "enemy",
      realm: "spectral",
    },
  ];
  tick(s, 0.1);
  assert.equal(s.player.hp, 130);
});
test("sinking respawns at port and preserves relics and upgrades", () => {
  const s = initialState();
  s.player.x = 100;
  s.player.y = 2100;
  s.player.hp = 1;
  s.relics = ["sun"];
  s.bullets = [
    {
      x: 100,
      y: 2100,
      vx: 0,
      vy: 0,
      life: 2,
      damage: 14,
      owner: "enemy",
      realm: "real",
    },
  ];
  tick(s, 0.02);
  assert.equal(s.deaths, 1);
  assert.ok(inPort(s));
  assert.equal(s.player.gold, 102);
  assert.deepEqual(s.relics, ["sun"]);
  assert.equal(s.player.hp, s.player.maxHp);
});
test("full campaign progression opens the boss and defeating it wins", () => {
  const s = initialState();
  s.enemies.forEach((e) => (e.dead = true));
  sailTo(s, "rift");
  assert.equal(interact(s), null);
  sailTo(s, "sun");
  interact(s);
  sailTo(s, "moon");
  toggleRealm(s);
  interact(s);
  toggleRealm(s);
  sailTo(s, "tide");
  interact(s);
  assert.equal(s.relics.length, 3);
  sailTo(s, "rift");
  assert.equal(interact(s), null);
  toggleRealm(s);
  assert.equal(interact(s).kind, "boss");
  assert.equal(s.bossAwake, true);
  assert.equal(interact(s), null);
  assert.equal(s.enemies.filter((e) => e.boss).length, 1);
  const boss = s.enemies.find((e) => e.boss);
  boss.hp = 1;
  s.bullets.push({
    x: boss.x,
    y: boss.y,
    vx: 0,
    vy: 0,
    life: 1,
    damage: 28,
    owner: "player",
    realm: "spectral",
  });
  tick(s, 0.02);
  assert.equal(s.won, true);
  assert.ok(s.events.some((e) => e.kind === "victory"));
  assert.equal(s.realm, "real");
});
test("saved game restores progression and clears transient projectiles", () => {
  const s = initialState();
  sailTo(s, "sun");
  interact(s);
  fire(s);
  const result = restore(serialize(s));
  assert.deepEqual(result.relics, ["sun"]);
  assert.equal(result.player.gold, 205);
  assert.equal(result.bullets.length, 0);
  assert.equal(result.active, false);
  assert.equal(result.player.vx, 0);
});
test("invalid or incompatible saves are rejected safely", () => {
  assert.equal(restore("{broken"), null);
  assert.equal(restore(null), null);
  assert.equal(restore("{}"), null);
  const s = initialState();
  s.player.x = "invalid";
  assert.equal(restore(serialize(s)), null);
});
test("storm damage can be avoided by crossing the veil", () => {
  const s = initialState();
  s.player.x = 1610;
  s.player.y = 1200;
  s.enemies = [];
  tick(s, 2);
  assert.ok(s.player.hp < 130);
  toggleRealm(s);
  const hp = s.player.hp;
  tick(s, 2);
  assert.equal(s.player.hp, hp);
});
