// store.js
// Lecture/écriture robuste du fichier JSON de stockage.
// - Gère les fichiers corrompus (JSON invalide, structure inattendue) avec repli sur une sauvegarde.
// - Écriture atomique (fichier temporaire + rename) pour ne jamais laisser un fichier à moitié écrit.
// - Sérialise les écritures pour éviter qu'un accès concurrent (async) ne corrompe le fichier.
// - Ne lève jamais d'exception : chaque fonction retourne { success, data?, error? }.
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { logInfo, logError } = require("./logger");

const DATA_DIR = path.join(__dirname, "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const BACKUP_FILE = path.join(DATA_DIR, "store.json.bak");
const TMP_FILE = path.join(DATA_DIR, "store.json.tmp");

const EMPTY_STORE = {
  users: [],
  projects: [],
  tasks: [],
  households: [],
  invitations: [],
  occupants: [],
  rooms: [],
  floors: [],
};

function ensureDataDir() {
  if (!fsSync.existsSync(DATA_DIR)) fsSync.mkdirSync(DATA_DIR, { recursive: true });
}
ensureDataDir();

function cloneEmptyStore() {
  return typeof structuredClone === "function"
    ? structuredClone(EMPTY_STORE)
    : JSON.parse(JSON.stringify(EMPTY_STORE));
}

/* File d'attente en mémoire : sérialise toutes les écritures pour ce process.
   Sans ça, deux écritures async lancées presque simultanément pourraient
   s'entrelacer (l'une écrasant les changements de l'autre) puisque
   fs.promises n'offre aucune garantie d'atomicité entre deux appels. */
let writeQueue = Promise.resolve();
function serialize(task) {
  const run = writeQueue.then(task, task); // s'exécute même si la tâche précédente a échoué
  writeQueue = run.catch(() => {}); // une écriture en échec ne doit pas bloquer la suivante
  return run;
}

const REQUIRED_ARRAYS = ["users", "projects", "tasks"];
const OPTIONAL_ARRAYS = ["households", "invitations", "occupants", "rooms", "floors"];

function isValidShape(data) {
  if (!data || typeof data !== "object") return false;
  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(data[key])) return false;
  }
  for (const key of OPTIONAL_ARRAYS) {
    if (data[key] !== undefined && !Array.isArray(data[key])) return false;
  }
  return true;
}

/* remplit les collections optionnelles absentes (compatibilité avec un
   fichier de stockage écrit avant leur introduction) */
function withDefaults(data) {
  const filled = { ...data };
  for (const key of OPTIONAL_ARRAYS) {
    if (!Array.isArray(filled[key])) filled[key] = [];
  }
  return filled;
}

async function tryReadJSON(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw); // peut lever : ENOENT (absent) ou SyntaxError (corrompu)
}

/**
 * Lit le fichier de stockage.
 * Ne lève jamais : retourne toujours { success, data, error?, warning? }.
 */
async function readStore() {
  try {
    const data = await tryReadJSON(STORE_FILE);
    if (!isValidShape(data)) {
      throw new Error("Structure inattendue : users/projects/tasks doivent être des tableaux.");
    }
    return { success: true, data: withDefaults(data) };
  } catch (err) {
    if (err.code === "ENOENT") {
      // Premier lancement : pas un fichier corrompu, juste absent. On initialise à vide.
      logInfo("store.read.init", "Aucun fichier de stockage trouvé, initialisation à vide.");
      return { success: true, data: cloneEmptyStore() };
    }

    logError("store.read.primary_failed", err.message);

    // Fichier principal corrompu ou illisible : on tente la sauvegarde.
    try {
      const backup = await tryReadJSON(BACKUP_FILE);
      if (!isValidShape(backup)) throw new Error("La sauvegarde a une structure invalide.");
      logInfo("store.read.backup_used", "Fichier principal corrompu : lecture depuis la sauvegarde.");
      return { success: true, data: withDefaults(backup), warning: "Fichier principal corrompu : sauvegarde utilisée." };
    } catch (backupErr) {
      logError("store.read.backup_failed", backupErr.message);
      return {
        success: false,
        data: null,
        error: `Fichier de stockage corrompu ou illisible, et aucune sauvegarde exploitable (${err.message}).`,
      };
    }
  }
}

/**
 * Écrit le fichier de stockage de façon atomique et sérialisée.
 * Conserve l'état précédent dans un fichier de sauvegarde avant d'écraser.
 * Ne lève jamais : retourne toujours { success, error? }.
 */
async function writeStore(nextData) {
  if (!isValidShape(nextData)) {
    const msg = "Écriture refusée : structure invalide (users/projects/tasks doivent être des tableaux).";
    logError("store.write.rejected", msg);
    return { success: false, error: msg };
  }

  return serialize(async () => {
    try {
      if (fsSync.existsSync(STORE_FILE)) {
        await fs.copyFile(STORE_FILE, BACKUP_FILE);
      }
      // Écriture atomique : fichier temporaire puis rename (opération atomique sur un même volume).
      await fs.writeFile(TMP_FILE, JSON.stringify(nextData, null, 2), "utf8");
      await fs.rename(TMP_FILE, STORE_FILE);

      logInfo(
        "store.write.success",
        `${nextData.users.length} utilisateur(s), ${nextData.projects.length} projet(s), ${nextData.tasks.length} tâche(s).`
      );
      return { success: true };
    } catch (err) {
      logError("store.write.failed", err.message);
      return { success: false, error: `Échec de l'écriture du stockage : ${err.message}` };
    }
  });
}

module.exports = { readStore, writeStore, EMPTY_STORE };
