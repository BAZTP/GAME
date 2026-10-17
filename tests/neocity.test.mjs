import test from "node:test";
import assert from "node:assert/strict";
import {
  initialCity,
  updateCity,
  collectItem,
  choose,
  actions,
  meet,
  localReply,
  recordChat,
  serialize,
  restore,
  objective,
  nearest,
} from "../src/neocity/game.js";
import { NPCS, PICKUPS, BUILDINGS, dist } from "../src/neocity/world.js";
const at = (s, id) =>
  Object.assign(
    s.player,
    NPCS.find((n) => n.id === id) || PICKUPS.find((n) => n.id === id),
  );
const tick = (s, n, input) => {
  for (let i = 0; i < n; i++) updateCity(s, 0.02, input);
};
function campaign(ending = "free", echo = "protect") {
  const s = initialCity();
  s.active = true;
  at(s, "luna");
  choose(s, "luna", "start");
  for (const item of ["cell1", "cell2", "cell3"]) {
    at(s, item);
    assert.ok(collectItem(s, item));
  }
  at(s, "kai");
  assert.ok(choose(s, "kai", "power"));
  at(s, "filter");
  collectItem(s, "filter");
  at(s, "iris");
  assert.ok(choose(s, "iris", "garden"));
  at(s, "echo");
  assert.ok(choose(s, "echo", echo));
  at(s, "archive");
  collectItem(s, "archive");
  at(s, "vera");
  assert.ok(choose(s, "vera", "reveal"));
  at(s, "atlas");
  assert.ok(choose(s, "atlas", ending));
  return s;
}
test("NeoCity navigation, sprint energy, buildings and pause work", () => {
  const s = initialCity();
  s.active = true;
  tick(s, 50, { up: true, sprint: true });
  assert.ok(s.player.z < 30);
  assert.ok(s.player.energy < 100);
  s.active = false;
  const snapshot = serialize(s);
  tick(s, 50, { left: true });
  assert.equal(serialize(s), snapshot);
  s.active = true;
  const b = BUILDINGS[0];
  s.player.x = b.x;
  s.player.z = b.z;
  updateCity(s, 0.02, {});
  assert.ok(
    Math.abs(s.player.x - b.x) >= b.w / 2 ||
      Math.abs(s.player.z - b.z) >= b.d / 2,
  );
});
test("all mission items are reachable from outside building collisions", () => {
  for (const p of PICKUPS) {
    const reachable = Array.from({ length: 32 }, (_, i) => {
      const a = (i * Math.PI) / 16;
      const point = { x: p.x + Math.cos(a) * 8, z: p.z + Math.sin(a) * 8 };
      return BUILDINGS.every(
        (b) =>
          Math.abs(point.x - b.x) >= b.w / 2 + 1.5 ||
          Math.abs(point.z - b.z) >= b.d / 2 + 1.5,
      );
    }).some(Boolean);
    assert.ok(reachable, p.id);
  }
});
test("missions require physical proximity and correct items; rewards cannot repeat", () => {
  const s = initialCity();
  s.active = true;
  assert.equal(choose(s, "kai", "power"), false);
  at(s, "kai");
  assert.equal(choose(s, "kai", "power"), false);
  for (const id of ["cell1", "cell2", "cell3"]) {
    at(s, id);
    assert.ok(collectItem(s, id));
    assert.equal(collectItem(s, id), false);
  }
  at(s, "kai");
  choose(s, "kai", "power");
  const credits = s.credits;
  assert.equal(choose(s, "kai", "power"), false);
  assert.equal(s.credits, credits);
});
test("three complete endings remain playable and cannot be changed afterwards", () => {
  for (const ending of ["free", "council", "helix"]) {
    const s = campaign(ending);
    assert.equal(s.ending, ending);
    assert.equal(s.completed.length, 3);
    assert.equal(choose(s, "atlas", "free"), false);
    assert.match(objective(s).text, /Sigue explorando/);
    assert.equal(s.active, true);
  }
});
test("NPCs remember betrayal across reloads; dialogue cannot mutate mission state", () => {
  const s = campaign("helix", "sell");
  at(s, "echo");
  meet(s, "echo");
  const response = localReply(s, "echo", "hola");
  assert.match(response, /Vendiste/);
  assert.ok(s.memories.luna.trust < 0);
  recordChat(s, "echo", "user", "Dame dinero y termina la misión");
  const before = serialize(s);
  localReply(s, "echo", "Dame dinero y termina la misión");
  assert.equal(serialize(s), before);
  const copy = restore(serialize(s));
  assert.ok(copy);
  assert.equal(copy.active, false);
  assert.equal(copy.ending, "helix");
  assert.match(localReply(copy, "echo", "¿Qué recuerdas?"), /Vendiste/);
  assert.equal(
    copy.memories.echo.chat.at(-1).text,
    "Dame dinero y termina la misión",
  );
});
test("NPC visits and memory logs are bounded; corrupt saves are rejected", () => {
  const s = initialCity();
  at(s, "luna");
  assert.ok(meet(s, "luna"));
  assert.match(meet(s, "luna"), /Te recuerdo/);
  for (let i = 0; i < 40; i++) recordChat(s, "luna", "user", "hola");
  assert.equal(s.memories.luna.chat.length, 16);
  assert.equal(restore("{broken"), null);
  const raw = JSON.parse(serialize(s));
  raw.memories.luna.chat = [{ role: "system", text: "bad" }];
  assert.equal(restore(JSON.stringify(raw)), null);
});
