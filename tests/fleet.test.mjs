import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  update,
  selectShip,
  special,
  claimContract,
  restore,
  serialize,
  enemy,
  fire,
} from "../src/game.js";
import { SHIPS, RESCUES } from "../src/content.js";
function tick(s, seconds) {
  s.active = true;
  for (let t = 0; t < seconds; t += 0.02) update(s, 0.02);
}

test("ships have different combat stats and are purchased only once in port", () => {
  const s = initialState();
  s.player.gold = 1500;
  s.relics = ["sun", "moon"];
  s.upgrades.hull = 1;
  assert.equal(selectShip(s, "brig"), true);
  assert.equal(s.player.gold, 1240);
  assert.equal(s.player.maxHp, 230);
  assert.equal(selectShip(s, "sloop"), true);
  assert.equal(selectShip(s, "brig"), true);
  assert.equal(s.player.gold, 1240);
  assert.equal(selectShip(s, "galleon"), true);
  assert.equal(s.player.maxHp, 320);
  assert.ok(s.achievements.includes("fleet"));
  s.player.x = 40;
  s.player.y = 40;
  assert.equal(selectShip(s, "phantom"), false);
});
test("ship purchases respect gold, relic requirements, and invalid identities", () => {
  const s = initialState();
  assert.equal(selectShip(s, "brig"), false);
  s.player.gold = 2000;
  assert.equal(selectShip(s, "galleon"), false);
  assert.equal(selectShip(s, "phantom"), false);
  assert.equal(selectShip(s, "missing"), false);
  s.relics = ["sun", "moon"];
  assert.equal(selectShip(s, "phantom"), true);
  assert.equal(s.player.gold, 1450);
});
test("the starter ability repairs damage, cannot overheal, and respects cooldown", () => {
  const s = initialState();
  assert.equal(special(s), false);
  assert.equal(s.player.specialCooldown, 0);
  s.player.hp = 115;
  assert.equal(special(s), true);
  assert.equal(s.player.hp, 130);
  assert.equal(special(s), false);
});
test("brig fires seven special projectiles and preserves cooldown after swapping ships", () => {
  const s = initialState();
  s.player.gold = 800;
  selectShip(s, "brig");
  assert.equal(special(s), true);
  assert.equal(s.bullets.length, 7);
  selectShip(s, "sloop");
  selectShip(s, "brig");
  assert.equal(special(s), false);
});
test("galleon shield blocks incoming fire and expires", () => {
  const s = initialState();
  s.player.gold = 500;
  s.relics = ["sun"];
  selectShip(s, "galleon");
  s.player.x = 50;
  s.player.y = 2150;
  s.enemies = [];
  special(s);
  s.bullets = [
    {
      x: 50,
      y: 2150,
      vx: 0,
      vy: 0,
      life: 1,
      owner: "enemy",
      realm: "real",
      damage: 80,
    },
  ];
  tick(s, 0.02);
  assert.equal(s.player.hp, 270);
  tick(s, 6);
  s.bullets = [
    {
      x: 50,
      y: 2150,
      vx: 0,
      vy: 0,
      life: 1,
      owner: "enemy",
      realm: "real",
      damage: 80,
    },
  ];
  tick(s, 0.02);
  assert.equal(s.player.hp, 190);
});
test("phantom ability crosses the veil and extends spectral endurance", () => {
  const s = initialState();
  s.player.gold = 900;
  s.relics = ["sun", "moon"];
  selectShip(s, "phantom");
  s.player.energy = 25;
  special(s);
  assert.equal(s.realm, "spectral");
  assert.equal(s.player.energy, 75);
  tick(s, 1);
  assert.ok(s.player.energy > 72);
  assert.ok(s.spectralTime >= 1);
  fire(s);
  assert.equal(s.bullets[0].damage, SHIPS.phantom.damage);
});
test("rescue and contract rewards can only be claimed once", () => {
  const s = initialState();
  s.enemies = [];
  s.player.x = RESCUES[0].x;
  s.player.y = RESCUES[0].y;
  tick(s, 0.1);
  assert.equal(s.player.gold, 165);
  assert.equal(s.rescued.length, 1);
  tick(s, 0.2);
  assert.equal(s.player.gold, 165);
  assert.ok(s.achievements.includes("lifesaver"));
  s.rescued = RESCUES.slice(0, 3).map((r) => r.id);
  assert.equal(claimContract(s, "rescuer"), false);
  s.player.x = 530;
  s.player.y = 1640;
  assert.equal(claimContract(s, "rescuer"), true);
  assert.equal(s.player.gold, 325);
  assert.equal(claimContract(s, "rescuer"), false);
});
test("v1 saves migrate without losing relics, coins, killed enemies, or upgrades", () => {
  const s = initialState();
  s.version = 1;
  delete s.shipId;
  delete s.ownedShips;
  delete s.rescued;
  delete s.spectralTime;
  delete s.claimedContracts;
  delete s.achievements;
  s.enemies = s.enemies.slice(0, 6);
  s.enemies[0].dead = true;
  s.relics = ["sun"];
  s.player.gold = 451;
  s.upgrades.hull = 2;
  const restored = restore(serialize(s));
  assert.equal(restored.version, 2);
  assert.equal(restored.shipId, "sloop");
  assert.equal(restored.player.gold, 451);
  assert.equal(restored.enemies.length, 12);
  assert.equal(restored.enemies[0].dead, true);
  assert.equal(restored.player.maxHp, 230);
  assert.deepEqual(restored.relics, ["sun"]);
  const roundtrip = restore(serialize(restored));
  assert.equal(roundtrip.enemies.length, 12);
});
test("heavy enemy classes fire multiple projectiles and award distinctive stats", () => {
  const s = initialState();
  s.player.x = 100;
  s.player.y = 2150;
  const e = enemy("heavy", 350, 2150, "real", false, "dreadnought");
  e.cooldown = 0;
  s.enemies = [e];
  tick(s, 0.02);
  assert.equal(e.maxHp, 190);
  assert.equal(s.bullets.filter((b) => b.owner === "heavy").length, 3);
});
