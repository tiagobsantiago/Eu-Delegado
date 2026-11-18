// Servidor do Eu Delegado. Uso: node serve.js  (porta 8765)
// - Escuta só em localhost e em IPs de rede privada (192.168.x, 10.x, 172.16-31.x); nunca em IP público.
// - /api/state guarda o estado do app em estado.json, para computador e celular compartilharem os dados.
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const ROOT = __dirname, STATE = path.join(ROOT, "estado.json"), PORT = 8765;
const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json", ".pdf": "application/pdf" };
const PUBLIC = new Set(["index.html", "style.css", "data.js", "tec.js", "app.js", "sw.js", "manifest.webmanifest", "icon.svg"]);
const priv = (a) => /^(::1|127\.|::ffff:127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::ffff:(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.))/.test(a || "");

function handler(q, r) {
  if (!priv(q.socket.remoteAddress)) { r.writeHead(403); return r.end(); }
  const url = q.url.split("?")[0];
  if (url === "/api/state") {
    if (q.method === "GET") {
      return fs.readFile(STATE, (e, d) => { r.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); r.end(e ? "{}" : d); });
    }
    if (q.method === "PUT") {
      let n = 0, b = [];
      q.on("data", (c) => { n += c.length; if (n > 1e6) { r.writeHead(413); r.end(); q.destroy(); } else b.push(c); });
      return q.on("end", () => {
        try { const s = JSON.parse(Buffer.concat(b).toString()); if (s.v !== 2) throw 0; fs.writeFileSync(STATE, JSON.stringify(s)); r.writeHead(204); r.end(); }
        catch (e) { r.writeHead(400); r.end(); }
      });
    }
    r.writeHead(405); return r.end();
  }
  const name = url === "/" ? "index.html" : url.slice(1);
  if (!PUBLIC.has(name) && !/^banco\/(const|adm|penal|ppenal)\.json$/.test(name)) { r.writeHead(404); return r.end("não encontrado"); }
  fs.readFile(path.join(ROOT, name), (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "Content-Type": T[path.extname(name)] || "application/octet-stream", "Cache-Control": "no-cache" }); r.end(d);
  });
}

const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i.family === "IPv4" && !i.internal && priv(i.address)).map((i) => i.address);
const bound = [];
for (const host of ["127.0.0.1", ...ips]) {
  http.createServer(handler).listen(PORT, host, () => bound.push(host)).on("error", (e) => console.log("erro em " + host + ": " + e.code));
}
setTimeout(() => console.log("Eu Delegado no ar:\n  computador: http://localhost:" + PORT + "\n" + ips.map((i) => "  celular (mesmo Wi-Fi): http://" + i + ":" + PORT).join("\n")), 400);
