// tests/dataService.test.js
// Tests de la couche métier : garantit que chaque action renvoie
// systématiquement { success, data } ou { success, error }, y compris sur
// les cas limites (ID manquant, élément introuvable, doublon).
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
resetData();

const svc = require("../dataService");

test("createUser : cas nominal renvoie un objet bien formé", async () => {
  resetData();
  const res = await svc.createUser({ id: "u1", name: "Chloë", email: "chloe@example.com" });
  assert.equal(res.success, true);
  assert.equal(res.data.id, "u1");
  assert.equal(typeof res.data.createdAt, "string");
});

test("createUser : entrée invalide -> success:false, error explicite, rien n'est écrit", async () => {
  resetData();
  const res = await svc.createUser({ id: "u1" }); // name manquant
  assert.equal(res.success, false);
  assert.match(res.error, /name/);

  const list = await svc.listUsers();
  assert.equal(list.data.length, 0, "l'utilisateur invalide ne doit pas être persisté");
});

test("createUser : id en double est rejeté", async () => {
  resetData();
  await svc.createUser({ id: "u1", name: "Premier" });
  const res = await svc.createUser({ id: "u1", name: "Deuxième" });
  assert.equal(res.success, false);
  assert.match(res.error, /existe déjà/);
});

test("createProject : ownerId inexistant est rejeté", async () => {
  resetData();
  const res = await svc.createProject({ id: "p1", name: "Projet", ownerId: "fantome" });
  assert.equal(res.success, false);
  assert.match(res.error, /fantome/);
});

test("createTask : projectId inexistant est rejeté", async () => {
  resetData();
  const res = await svc.createTask({ title: "Tâche", projectId: "fantome" });
  assert.equal(res.success, false);
  assert.match(res.error, /fantome/);
});

test("createTask : cas nominal génère un id si absent, et un statut par défaut", async () => {
  resetData();
  await svc.createUser({ id: "u1", name: "Chloë" });
  await svc.createProject({ id: "p1", name: "Maison", ownerId: "u1" });
  const res = await svc.createTask({ title: "Passer l'aspirateur", projectId: "p1" });
  assert.equal(res.success, true);
  assert.equal(typeof res.data.id, "string");
  assert.ok(res.data.id.length > 0);
  assert.equal(res.data.status, "todo");
});

test("updateTask : id manquant/vide -> échec propre sans toucher au fichier", async () => {
  resetData();
  const res = await svc.updateTask("", { status: "done" });
  assert.equal(res.success, false);
  assert.match(res.error, /id/i);
});

test("updateTask : id inexistant -> 'not found' explicite", async () => {
  resetData();
  const res = await svc.updateTask("id-qui-nexiste-pas", { status: "done" });
  assert.equal(res.success, false);
  assert.match(res.error, /Aucune tâche trouvée/);
});

test("updateTask : cas nominal met bien à jour le champ demandé", async () => {
  resetData();
  await svc.createUser({ id: "u1", name: "Chloë" });
  await svc.createProject({ id: "p1", name: "Maison", ownerId: "u1" });
  const created = await svc.createTask({ title: "Tâche", projectId: "p1" });
  const res = await svc.updateTask(created.data.id, { status: "done" });
  assert.equal(res.success, true);
  assert.equal(res.data.status, "done");
});

test("deleteTask : id inexistant -> échec propre (pas d'exception)", async () => {
  resetData();
  const res = await svc.deleteTask("fantome");
  assert.equal(res.success, false);
});

test("deleteTask : cas nominal retire bien la tâche de la liste", async () => {
  resetData();
  await svc.createUser({ id: "u1", name: "Chloë" });
  await svc.createProject({ id: "p1", name: "Maison", ownerId: "u1" });
  const created = await svc.createTask({ title: "À supprimer", projectId: "p1" });
  const del = await svc.deleteTask(created.data.id);
  assert.equal(del.success, true);

  const list = await svc.listTasks();
  assert.equal(list.data.some((t) => t.id === created.data.id), false);
});

test("listTasks / listUsers / listProjects : renvoient toujours un tableau, même vide", async () => {
  resetData();
  const tasks = await svc.listTasks();
  const users = await svc.listUsers();
  const projects = await svc.listProjects();
  assert.ok(Array.isArray(tasks.data));
  assert.ok(Array.isArray(users.data));
  assert.ok(Array.isArray(projects.data));
});
