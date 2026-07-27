// tests/security-edge-cases.test.js
// Scénarios de "stress-test" QA demandés explicitement : fichier vide,
// écritures concurrentes, caractères spéciaux/injection, pollution de
// prototype, payloads démesurés. Chaque test documente le comportement
// attendu ET la raison pour laquelle il est sûr.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const BACKUP_FILE = path.join(DATA_DIR, "store.json.bak");

function resetData() {
  for (const f of [STORE_FILE, BACKUP_FILE]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

const svc = require("../dataService");
const { readStore, writeStore } = require("../store");

test("Fichier JSON vide (chaîne vide) : lecture échoue proprement, ne plante pas", async () => {
  resetData();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, "");
  const res = await readStore();
  assert.equal(res.success, false);
  assert.ok(!res.data || res.data === null);
});

test("Fichier JSON vide mais bien-formé ('{}') : structure inattendue, échec propre", async () => {
  resetData();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, "{}");
  const res = await readStore();
  // {} est un JSON valide mais ne respecte pas la forme users/projects/tasks attendue
  assert.equal(res.success, false);
});

test("50 écritures simultanées : aucune corruption, le fichier final reste un JSON valide", async () => {
  resetData();
  const writes = Array.from({ length: 50 }, (_, i) =>
    writeStore({ users: [{ id: `u${i}`, name: `U${i}`, createdAt: "2026-01-01" }], projects: [], tasks: [] })
  );
  const results = await Promise.all(writes);
  assert.ok(results.every((r) => r.success));

  // Le fichier doit rester parseable et cohérent (une seule des 50 versions, jamais un mélange)
  const raw = fs.readFileSync(STORE_FILE, "utf8");
  const parsed = JSON.parse(raw); // lève si le fichier est corrompu/entrelacé
  assert.equal(parsed.users.length, 1);
});

test("Deux écritures concurrentes avec des données DIFFÉRENTES ne s'entrelacent jamais", async () => {
  resetData();
  const a = { users: [{ id: "a", name: "A".repeat(10000), createdAt: "2026-01-01" }], projects: [], tasks: [] };
  const b = { users: [{ id: "b", name: "B".repeat(10000), createdAt: "2026-01-01" }], projects: [], tasks: [] };

  await Promise.all([writeStore(a), writeStore(b)]);

  const raw = fs.readFileSync(STORE_FILE, "utf8");
  const parsed = JSON.parse(raw); // un entrelacement produirait un JSON invalide ici
  assert.equal(parsed.users.length, 1);
  assert.ok(parsed.users[0].id === "a" || parsed.users[0].id === "b");
});

test("Injection de balises/scripts dans un champ texte : stocké et relu tel quel, sans exécution", async () => {
  resetData();
  const payload = "<img src=x onerror=alert(1)>";
  const res = await svc.createUser({ id: "u1", name: payload });
  assert.equal(res.success, true);
  const list = await svc.listUsers();
  assert.equal(list.data[0].name, payload, "la donnée doit être conservée telle quelle côté stockage");
  // Note sécurité : la protection contre l'exécution se fait à l'AFFICHAGE (React échappe
  // le texte par défaut dans du JSX classique), pas en filtrant le contenu ici. Le
  // validateur ne fait que vérifier la forme (type, longueur), jamais le contenu.
});

test("Chaîne façon injection SQL : traitée comme texte inerte (pas de base SQL dans cette pile)", async () => {
  resetData();
  const payload = "\"; DROP TABLE users; --";
  const res = await svc.createProject({ id: "p1", name: payload, ownerId: "inconnu" });
  // Ce test échoue pour une autre raison (ownerId inexistant) : on vérifie que c'est
  // bien CETTE raison-là, et pas un plantage lié au contenu de `name`.
  assert.equal(res.success, false);
  assert.match(res.error, /ownerId/);
});

test("Caractères Unicode à risque (RTL override, null byte) : round-trip fidèle", async () => {
  resetData();
  const payload = "Rapport\u202Egnp.exe\u0000fin";
  const res = await svc.createUser({ id: "u1", name: payload });
  assert.equal(res.success, true);
  const list = await svc.listUsers();
  assert.equal(list.data[0].name, payload);
});

test("Tentative de pollution de prototype (__proto__ dans le corps) : sans effet", async () => {
  resetData();
  const malicious = JSON.parse('{"id":"u1","name":"Test","__proto__":{"polluted":"oui"}}');
  await svc.createUser(malicious);

  // Le champ __proto__ ne doit jamais avoir atteint Object.prototype :
  assert.equal({}.polluted, undefined);
  assert.equal(Object.prototype.polluted, undefined);
});

test("Payload démesuré (title > 500 caractères) : rejeté par le validateur, pas de crash", async () => {
  resetData();
  await svc.createUser({ id: "u1", name: "Chloë" });
  await svc.createProject({ id: "p1", name: "Maison", ownerId: "u1" });
  const res = await svc.createTask({ title: "x".repeat(200000), projectId: "p1" });
  assert.equal(res.success, false);
  assert.match(res.error, /500 caractères/);
});

test("Type inattendu (nombre au lieu de chaîne pour id) : rejeté sans exception", async () => {
  resetData();
  const res = await svc.createUser({ id: 12345, name: "Chloë" });
  assert.equal(res.success, false);
});

test("Corps totalement vide ou mal typé (null, tableau, chaîne) : jamais d'exception", async () => {
  resetData();
  for (const bad of [null, undefined, [], "chaîne", 42, true]) {
    const res = await svc.createUser(bad);
    assert.equal(res.success, false);
  }
});
