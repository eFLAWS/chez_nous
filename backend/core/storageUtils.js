// core/storageUtils.js
// Point d'accès unique aux utilitaires partagés par tous les services :
// genId, ok/fail, et readStore/writeStore.
//
// Choix assumé : readStore/writeStore ne sont pas réimplémentées ici —
// elles sont réexportées telles quelles depuis ../store.js, qui garde
// l'implémentation robuste (écriture atomique, sauvegarde automatique,
// file d'attente sérialisant les écritures concurrentes) et sa propre
// suite de tests dédiée (tests/store.test.js), inchangée par ce
// refactor. Dupliquer cette logique ici aurait été plus risqué que de
// simplement la relayer.
const crypto = require("crypto");
const { readStore, writeStore } = require("../store");
const { logInfo, logError } = require("../logger");

function genId() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fail(action, error) {
  logError(action, error);
  return { success: false, error };
}

function ok(action, data, details) {
  logInfo(action, details ?? data);
  return { success: true, data };
}

module.exports = { readStore, writeStore, genId, ok, fail };
