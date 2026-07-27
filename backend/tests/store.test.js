// tests/store.test.js
// Tests du moteur de persistance JSON : garantit le bon format de retour
// dans tous les cas (succès, absence de fichier, corruption), et la
// robustesse face à des écritures concurrentes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const BACKUP_FILE = path.join(DATA_DIR, "store.json.bak");

function resetStoreFiles() {
  for (const f of [STORE_FILE, BACKUP_FILE]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  delete require.cache[require.resolve("../store")];
  return require("../store");
}

test("readStore : fichier absent -> succès, structure vide (pas une erreur)", async () => {
  const { readStore } = resetStoreFiles();
  const res = await readStore();
  assert.equal(res.success, true);
  assert.deepEqual(res.data, {
    users: [], projects: [], tasks: [], households: [], invitations: [], occupants: [], rooms: [], floors: [],
  });
});

test("readStore : fichier vide (chaîne vide) -> échec propre, pas d'exception", async () => {
  const { readStore } = resetStoreFiles();
  fs.writeFileSync(STORE_FILE, "");
  const res = await readStore();
  assert.equal(res.success, false);
  assert.equal(typeof res.error, "string");
  assert.ok(res.error.length > 0);
});

test("readStore : JSON corrompu sans sauvegarde -> échec propre, ne plante pas le process", async () => {
  const { readStore } = resetStoreFiles();
  fs.writeFileSync(STORE_FILE, "{ ceci n'est pas du JSON valide");
  const res = await readStore();
  assert.equal(res.success, false);
  assert.equal(res.data, null);
  assert.match(res.error, /corrompu/i);
});

test("readStore : JSON principal corrompu MAIS sauvegarde valide -> repli automatique", async () => {
  const { readStore, writeStore } = resetStoreFiles();
  const good = { users: [{ id: "u1", name: "Test", createdAt: "2026-01-01" }], projects: [], tasks: [] };
  await writeStore(good); // crée store.json
  await writeStore(good); // la 2e écriture copie store.json -> store.json.bak avant d'écraser

  fs.writeFileSync(STORE_FILE, "{{{ corrompu"); // on corrompt uniquement le fichier principal
  const res = await readStore();
  assert.equal(res.success, true);
  assert.equal(res.data.users[0].id, "u1");
  assert.match(res.warning, /sauvegarde/i);
});

test("writeStore : structure invalide (tableaux manquants) est refusée avant écriture", async () => {
  const { writeStore } = resetStoreFiles();
  const res = await writeStore({ users: [], tasks: [] }); // "projects" manquant
  assert.equal(res.success, false);
  assert.ok(res.error.length > 0);
  assert.equal(fs.existsSync(STORE_FILE), false, "aucun fichier ne doit être créé sur un rejet");
});

test("writeStore puis readStore : aller-retour fidèle, y compris caractères spéciaux/unicode", async () => {
  const { writeStore, readStore } = resetStoreFiles();
  const tricky = {
    users: [{ id: "u1", name: "É è ü 中文 🧹 <script>alert(1)</script> \u202E", createdAt: "2026-01-01" }],
    projects: [],
    tasks: [],
  };
  await writeStore(tricky);
  const res = await readStore();
  assert.equal(res.success, true);
  assert.equal(res.data.users[0].name, tricky.users[0].name);
});

test("writeStore : écritures concurrentes ne corrompent jamais le fichier (file d'attente)", async () => {
  const { writeStore, readStore } = resetStoreFiles();

  const payloadFor = (n) => ({
    users: [{ id: `u${n}`, name: `Utilisateur ${n}`, createdAt: "2026-01-01" }],
    projects: [],
    tasks: [],
  });

  // 20 écritures lancées en parallèle sur le même fichier
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => writeStore(payloadFor(i))));

  assert.ok(results.every((r) => r.success === true), "toutes les écritures doivent réussir");

  // Le fichier final doit être un JSON valide et correspondre à EXACTEMENT une des 20 écritures
  // (dernier arrivé dans la file, gagnant — mais jamais un mélange corrompu des deux).
  const finalRead = await readStore();
  assert.equal(finalRead.success, true);
  assert.equal(finalRead.data.users.length, 1);
  assert.match(finalRead.data.users[0].id, /^u\d+$/);
});
