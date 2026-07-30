// tests/taskContext.test.js
// Tests de l'attribution des tâches à un contexte : pièce, utilisateur ou
// animal — et des nouveaux champs récurrence/description. Vérifie aussi
// que projectId, désormais optionnel, ne casse rien pour les tâches déjà
// rattachées à un projet.
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

async function makeHouseholdWithRoomAndPet() {
  const signup = await svc.signup({ name: "Chloë", email: "chloe-tasks@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;
  const room = await svc.createRoom({ name: "Salon", type: "salon", width: 5, height: 4, householdId, userId: signup.data.user.id });
  const pet = await svc.createOccupant({ name: "Miel", type: "pet", species: "chat", householdId });
  return { householdId, userId: signup.data.user.id, roomId: room.data.id, petId: pet.data.id };
}

/* ------------------------- Contexte : pièce -------------------------- */

test("createTask : tâche liée à une pièce (ex. Nettoyer le sol -> Salon)", async () => {
  resetData();
  const { roomId } = await makeHouseholdWithRoomAndPet();
  const res = await svc.createTask({ title: "Nettoyer le sol", roomId });
  assert.equal(res.success, true);
  assert.equal(res.data.roomId, roomId);
  assert.equal(res.data.projectId, null, "aucun projet requis quand le contexte est une pièce");
});

test("createTask : roomId inexistant rejeté", async () => {
  resetData();
  const res = await svc.createTask({ title: "Nettoyer le sol", roomId: "fantome" });
  assert.equal(res.success, false);
  assert.match(res.error, /roomId/);
});

/* ------------------------- Contexte : animal -------------------------- */

test("createTask : routine liée à un animal (ex. Brossage)", async () => {
  resetData();
  const { petId } = await makeHouseholdWithRoomAndPet();
  const res = await svc.createTask({ title: "Brossage", petId, recurrenceDays: 7 });
  assert.equal(res.success, true);
  assert.equal(res.data.petId, petId);
  assert.equal(res.data.recurrenceDays, 7);
});

test("createTask : petId inexistant rejeté", async () => {
  resetData();
  const res = await svc.createTask({ title: "Brossage", petId: "fantome" });
  assert.equal(res.success, false);
  assert.match(res.error, /petId/);
});

/* ------------------------- Contexte : utilisateur ---------------------- */

test("createTask : tâche liée directement à un utilisateur, sans pièce ni animal ni projet", async () => {
  resetData();
  const { userId } = await makeHouseholdWithRoomAndPet();
  const res = await svc.createTask({ title: "Faire les courses", assigneeId: userId });
  assert.equal(res.success, true);
  assert.equal(res.data.assigneeId, userId);
});

/* ------------------------------ Récurrence ------------------------------ */

test("createTask : recurrenceDays valide accepté", async () => {
  resetData();
  const { roomId } = await makeHouseholdWithRoomAndPet();
  const res = await svc.createTask({ title: "Passer l'aspirateur", roomId, recurrenceDays: 7 });
  assert.equal(res.success, true);
  assert.equal(res.data.recurrenceDays, 7);
});

test("createTask : recurrenceDays non entier rejeté", async () => {
  resetData();
  const { roomId } = await makeHouseholdWithRoomAndPet();
  const res = await svc.createTask({ title: "Passer l'aspirateur", roomId, recurrenceDays: 2.5 });
  assert.equal(res.success, false);
  assert.match(res.error, /recurrenceDays/);
});

test("createTask : recurrenceDays hors bornes (0 et 400) rejeté", async () => {
  resetData();
  const { roomId } = await makeHouseholdWithRoomAndPet();
  const tooLow = await svc.createTask({ title: "Tâche", roomId, recurrenceDays: 0 });
  assert.equal(tooLow.success, false);
  const tooHigh = await svc.createTask({ title: "Tâche", roomId, recurrenceDays: 400 });
  assert.equal(tooHigh.success, false);
});

/* ------------------------------ Description ------------------------------ */

test("createTask : description valide acceptée", async () => {
  resetData();
  const { roomId } = await makeHouseholdWithRoomAndPet();
  const res = await svc.createTask({ title: "Tâche", roomId, description: "Ne pas oublier sous le canapé." });
  assert.equal(res.success, true);
  assert.equal(res.data.description, "Ne pas oublier sous le canapé.");
});

test("createTask : description trop longue (> 2000) rejetée", async () => {
  resetData();
  const { roomId } = await makeHouseholdWithRoomAndPet();
  const res = await svc.createTask({ title: "Tâche", roomId, description: "x".repeat(3000) });
  assert.equal(res.success, false);
  assert.match(res.error, /description/);
});

/* ------------------------- projectId reste compatible -------------------- */

test("createTask : projectId toujours fonctionnel pour les tâches liées à un projet", async () => {
  resetData();
  const { userId } = await makeHouseholdWithRoomAndPet();
  const project = await svc.createProject({ name: "Rénovation", ownerId: userId });
  const res = await svc.createTask({ title: "Peindre le mur", projectId: project.data.id });
  assert.equal(res.success, true);
  assert.equal(res.data.projectId, project.data.id);
});

test("createTask : aucun contexte du tout reste accepté (tâche libre)", async () => {
  resetData();
  const res = await svc.createTask({ title: "Rappel libre" });
  assert.equal(res.success, true);
  assert.equal(res.data.projectId, null);
  assert.equal(res.data.roomId, null);
  assert.equal(res.data.petId, null);
});

/* --------------------------------- updateTask ---------------------------- */

test("updateTask : peut ajouter roomId/petId/recurrenceDays après coup", async () => {
  resetData();
  const { roomId, petId } = await makeHouseholdWithRoomAndPet();
  const created = await svc.createTask({ title: "Tâche à préciser" });
  const res = await svc.updateTask(created.data.id, { roomId, petId, recurrenceDays: 14 });
  assert.equal(res.success, true);
  assert.equal(res.data.roomId, roomId);
  assert.equal(res.data.petId, petId);
  assert.equal(res.data.recurrenceDays, 14);
});
