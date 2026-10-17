import { localReply, recordChat } from "./game.js";
export class Dialogue {
  constructor() {
    this.endpoint = "";
    this.online = false;
    this.pending = false;
    this.controller = null;
    try {
      this.endpoint = localStorage.getItem("neocity-ai-endpoint") || "";
    } catch {}
  }
  async connect(endpoint = this.endpoint) {
    let base = endpoint.trim().replace(/\/$/, "");
    if (base) {
      const url = new URL(base);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/" ||
        !(
          url.protocol === "https:" ||
          (url.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(url.hostname))
        )
      )
        throw new Error(
          "Usa la dirección HTTPS del servidor, sin rutas, claves ni parámetros.",
        );
      base = url.origin;
    }
    this.cancel();
    this.endpoint = base;
    this.online = false;
    try {
      const r = await fetch(`${base}/api/neocity/status`, {
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) this.online = (await r.json()).available === true;
    } catch {}
    return this.online;
  }
  saveEndpoint() {
    try {
      if (this.endpoint)
        localStorage.setItem("neocity-ai-endpoint", this.endpoint);
      else localStorage.removeItem("neocity-ai-endpoint");
    } catch {}
  }
  cancel() {
    this.controller?.abort();
    this.controller = null;
    this.pending = false;
  }
  async reply(s, id, message) {
    if (this.pending) return null;
    this.pending = true;
    const controller = (this.controller = new AbortController());
    const timer = setTimeout(() => controller.abort("timeout"), 17000);
    const m = s.memories[id],
      history = m.chat.slice(-8);
    recordChat(s, id, "user", message);
    let reply,
      generated = false,
      fallback = false;
    try {
      if (this.online) {
        try {
          const r = await fetch(`${this.endpoint}/api/neocity/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              npc: id,
              message,
              facts: m.facts,
              history,
              trust: m.trust,
            }),
            signal: controller.signal,
          });
          if (!r.ok) throw new Error("unavailable");
          const data = await r.json();
          if (typeof data.reply !== "string" || !data.reply.trim())
            throw new Error("invalid");
          reply = data.reply;
          generated = true;
        } catch {
          if (
            controller.signal.aborted &&
            controller.signal.reason !== "timeout"
          )
            return null;
          fallback = true;
        }
      }
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return null;
      reply ??= localReply(s, id, message);
      recordChat(s, id, "assistant", reply);
      return { reply, generated, fallback };
    } finally {
      clearTimeout(timer);
      if (this.controller === controller) {
        this.controller = null;
        this.pending = false;
      }
    }
  }
}
