import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const tipos = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pdf": "application/pdf",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/favicon.ico") {
        res.writeHead(204);
        res.end();
        return;
      }
      const rel =
        decodeURIComponent(url.pathname) === "/"
          ? "index.html"
          : decodeURIComponent(url.pathname).slice(1);
      if (
        !/^(index\.html|src\/[a-z-]+\.(js|css)|datos\/[a-z-]+\.json|docs\/manual-uso\.pdf)$/.test(rel)
      ) {
        res.writeHead(404);
        res.end();
        return;
      }
      const data = await readFile(path.join(root, rel));
      res.writeHead(200, {
        "Content-Type": tipos[path.extname(rel)],
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://cima.aemps.es; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("No encontrado");
    }
  })
  .listen(Number(process.env.PORT || 5173), "0.0.0.0", () =>
    console.log(
      "vihconectados iniciado en puerto " + (process.env.PORT || 5173),
    ),
  );
