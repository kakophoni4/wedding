const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);

loadEnv(path.join(ROOT, ".env"));

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/rsvp") {
      await handleRsvp(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Method not allowed");
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, error: "Server error" });
  }
});

const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`Wedding site (этот компьютер): http://127.0.0.1:${PORT}/`);
  const lanAddresses = getLocalAddresses();
  if (lanAddresses.length) {
    console.log("Wedding site (Wi-Fi, для телефонов):");
    for (const address of lanAddresses) {
      console.log(`  http://${address}:${PORT}/`);
    }
  } else {
    console.log("Локальный IP не найден. Подключитесь к Wi-Fi и перезапустите сервер.");
  }
});

async function handleRsvp(req, res) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    sendJson(res, 500, {
      ok: false,
      error: "Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.",
    });
    return;
  }

  const body = await readJson(req);
  const message = [
    "Подтверждение присутствия на свадьбе Егора и Анастасии",
    `Имя: ${clean(body.name)}`,
    `Контакт: ${clean(body.contact)}`,
    `Гостей: ${clean(body.guests)}`,
    `Комментарий: ${clean(body.comment) || "без комментария"}`,
  ].join("\n");

  let tgResponse;
  try {
    tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        disable_web_page_preview: true,
      }),
    });
  } catch (error) {
    console.error("Telegram request failed:", error);
    sendJson(res, 502, { ok: false, error: "Cannot reach Telegram API" });
    return;
  }

  const tgJson = await tgResponse.json();
  if (!tgJson.ok) {
    sendJson(res, 502, { ok: false, error: tgJson.description || "Telegram error" });
    return;
  }

  sendJson(res, 200, { ok: true });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  const relativePath =
    urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "").replace(/\//g, path.sep);
  const filePath = path.resolve(ROOT, relativePath);

  if (!filePath.startsWith(ROOT)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      send(res, 404, "Not found");
      return;
    }

    res.writeHead(200, { "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    fs.createReadStream(filePath).pipe(res);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 64_000) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function clean(value) {
  return String(value || "").trim().slice(0, 500);
}

function send(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function getLocalAddresses() {
  const addresses = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces) {
      if ((iface.family === "IPv4" || iface.family === 4) && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
