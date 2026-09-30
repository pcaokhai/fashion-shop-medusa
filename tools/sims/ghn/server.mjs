// Placeholder sim: only /health until the real simulator lands (tools/CLAUDE.md).
import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 9101);
createServer((req, res) => {
  const ok = req.method === "GET" && req.url === "/health";
  res.writeHead(ok ? 200 : 404, { "content-type": "application/json" });
  res.end(JSON.stringify(ok ? { status: "ok", sim: "ghn-placeholder" } : { error: "not_found" }));
}).listen(port) // dual-stack: wget "localhost" resolves to ::1;
