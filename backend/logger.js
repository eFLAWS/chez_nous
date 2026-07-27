// logger.js
// Système de logs simple : console + fichier JSONL en ajout seul.
// Ne doit jamais faire planter l'appli : toute erreur d'écriture de log
// est elle-même avalée et signalée sur la console uniquement.
const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch (e) {
    console.error("[logger] impossible de créer le dossier de logs :", e.message);
  }
}
ensureLogDir();

function write(level, action, details) {
  const entry = { ts: new Date().toISOString(), level, action, details: details ?? null };
  const line = JSON.stringify(entry) + "\n";

  if (level === "error") console.error(`[${entry.ts}] [${action}]`, details ?? "");
  else console.log(`[${entry.ts}] [${action}]`, details ?? "");

  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    console.error("[logger] écriture du fichier de log impossible :", e.message);
  }
}

module.exports = {
  logInfo: (action, details) => write("info", action, details),
  logError: (action, details) => write("error", action, details),
};
