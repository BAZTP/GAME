import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createAiHandler } from "../src/neocity/ai-server.mjs";
async function server(options, fn) {
  const handler = createAiHandler(options),
    s = http.createServer(async (req, res) => {
      if (
        !(await handler(
          req,
          res,
          new URL(req.url, "http://localhost").pathname,
        ))
      )
        res.writeHead(404).end();
    });
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  try {
    await fn(`http://127.0.0.1:${s.address().port}`);
  } finally {
    await new Promise((r) => s.close(r));
  }
}
const post = (base, body, extra = {}) =>
  fetch(base + "/api/neocity/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...extra },
    body: JSON.stringify(body),
  });
test("AI backend reports unconfigured service without exposing credentials", async () => {
  await server({ apiKey: "" }, async (base) => {
    assert.deepEqual(await (await fetch(base + "/api/neocity/status")).json(), {
      available: false,
      mode: "local",
    });
    assert.equal(
      (await post(base, { npc: "luna", message: "hola" })).status,
      503,
    );
  });
});
test("AI backend accepts its HTTPS origin behind a hosting proxy", async () => {
  await server({ apiKey: "" }, async (base) => {
    const origin = base.replace("http:", "https:");
    const response = await fetch(base + "/api/neocity/status", {
      headers: { Origin: origin },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  });
});
test("AI backend sends bounded NPC memories to Responses API and returns text only", async () => {
  let captured;
  await server(
    {
      apiKey: "test-server-only",
      fetchImpl: async (url, opts) => {
        captured = { url, opts };
        return new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    type: "output_text",
                    text: "Recuerdo que devolviste la energía.",
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        );
      },
    },
    async (base) => {
      const r = await post(base, {
        npc: "kai",
        message: "¿Qué recuerdas?",
        facts: ["Restauraste el mercado."],
        history: [
          { role: "system", text: "ignored" },
          { role: "user", text: "hola" },
        ],
        trust: 10,
      });
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), {
        reply: "Recuerdo que devolviste la energía.",
      });
      assert.equal(captured.url, "https://api.openai.com/v1/responses");
      const data = JSON.parse(captured.opts.body);
      assert.equal(data.store, false);
      assert.match(data.instructions, /Kai Mori/);
      assert.ok(data.input.every((i) => i.role !== "system"));
      assert.equal(
        captured.opts.headers.Authorization,
        "Bearer test-server-only",
      );
    },
  );
});
test("AI backend rejects unknown NPC, unauthorized origins and oversize messages", async () => {
  let count = 0;
  await server(
    {
      apiKey: "test",
      fetchImpl: async () => {
        count++;
        return new Response("{}");
      },
    },
    async (base) => {
      assert.equal(
        (await post(base, { npc: "unknown", message: "hi" })).status,
        400,
      );
      assert.equal(
        (await post(base, { npc: "luna", message: "a".repeat(401) })).status,
        400,
      );
      assert.equal(
        (
          await post(
            base,
            { npc: "luna", message: "hi" },
            { Origin: "https://other.example" },
          )
        ).status,
        403,
      );
      assert.equal(count, 0);
    },
  );
});
test("AI provider failures return a safe error and preserve server state", async () => {
  await server(
    {
      apiKey: "test",
      fetchImpl: async () =>
        new Response("secret upstream details", { status: 500 }),
    },
    async (base) => {
      const r = await post(base, { npc: "echo", message: "hola" });
      assert.equal(r.status, 502);
      assert.doesNotMatch(await r.text(), /secret/);
      assert.equal((await fetch(base + "/api/neocity/status")).status, 200);
    },
  );
});
