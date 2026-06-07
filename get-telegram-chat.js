const fs = require("fs");
const path = require("path");

loadEnv(path.join(__dirname, ".env"));

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not set in .env");
  process.exit(1);
}

fetch(`https://api.telegram.org/bot${token}/getUpdates`)
  .then((response) => response.json())
  .then((data) => {
    if (!data.ok) {
      console.error(data.description || "Telegram error");
      process.exit(1);
    }

    if (!data.result.length) {
      console.log("Нет сообщений. Напиши боту /start, потом запусти команду еще раз.");
      return;
    }

    for (const update of data.result) {
      const message = update.message || update.channel_post;
      const chat = message?.chat;
      if (!chat) continue;
      console.log(`chat_id=${chat.id} (${chat.type}${chat.username ? ", @" + chat.username : ""})`);
    }
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });

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
