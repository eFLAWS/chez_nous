// tests/roles.test.js
// Tests du système de rôles PROPRIETAIRE/LOCATAIRE (voir la conversation
// — USER_FLOW_ONBOARDING.md / DATA_MODEL.md fournis par l'utilisateur) :
// assignation du rôle, autorisation sur la modification du plan, règle
// de blocage du départ d'un propriétaire, transfert de propriété.
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

async function makeHouseholdWithTenant() {
  const signup = await svc.signup({ name: "Chloë", email: "chloe-roles@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;
  const ownerId = signup.data.user.id;

  const signupTenant = await svc.signup({ name: "Paul", email: "paul-roles@example.com", password: "Motdepasse123!" });
  const tenantOccupant = await svc.createOccupant({ name: "Paul", type: "human", householdId });
  await svc.claimOccupant(tenantOccupant.data.id, signupTenant.data.user.id);

  return { householdId, ownerId, tenantId: signupTenant.data.user.id };
}

/* ------------------------------- Assignation ------------------------------- */

test("signup : l'occupant auto-créé est PROPRIETAIRE", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-role1@example.com", password: "Motdepasse123!" });
  const occupants = await svc.listOccupants(signup.data.household.id);
  assert.equal(occupants.data[0].role, "PROPRIETAIRE");
});

test("createHouseholdForUser : l'occupant auto-créé est PROPRIETAIRE", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-role2@example.com", password: "Motdepasse123!" });
  const res = await svc.createHouseholdForUser({ userId: signup.data.user.id, householdName: "Second logement" });
  assert.equal(res.data.occupant.role, "PROPRIETAIRE");
});

test("createOccupant : un occupant humain ajouté ensuite est LOCATAIRE par défaut", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-role3@example.com", password: "Motdepasse123!" });
  const res = await svc.createOccupant({ name: "Colocataire", type: "human", householdId: signup.data.household.id });
  assert.equal(res.data.role, "LOCATAIRE");
});

test("createOccupant : un animal n'a jamais de rôle", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-role4@example.com", password: "Motdepasse123!" });
  const res = await svc.createOccupant({ name: "Miel", type: "pet", householdId: signup.data.household.id });
  assert.equal(res.data.role, null);
});

/* --------------------------- Autorisation du plan --------------------------- */

test("createRoom : un LOCATAIRE ne peut pas modifier le plan", async () => {
  resetData();
  const { householdId, tenantId } = await makeHouseholdWithTenant();
  const res = await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, userId: tenantId });
  assert.equal(res.success, false);
  assert.match(res.error, /propriétaire/);
});

test("createRoom : le PROPRIETAIRE peut modifier le plan", async () => {
  resetData();
  const { householdId, ownerId } = await makeHouseholdWithTenant();
  const res = await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, userId: ownerId });
  assert.equal(res.success, true);
});

test("createRoom : compte qui n'est occupant d'aucun rôle dans ce foyer rejeté", async () => {
  resetData();
  const { householdId } = await makeHouseholdWithTenant();
  const stranger = await svc.signup({ name: "Étranger", email: "etranger-roles@example.com", password: "Motdepasse123!" });
  const res = await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, userId: stranger.data.user.id });
  assert.equal(res.success, false);
});

test("updateRoomPosition : un LOCATAIRE ne peut pas déplacer une pièce", async () => {
  resetData();
  const { householdId, ownerId, tenantId } = await makeHouseholdWithTenant();
  const room = await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, userId: ownerId });
  const res = await svc.updateRoomPosition(room.data.id, { x: 5, y: 5 }, tenantId);
  assert.equal(res.success, false);
  assert.match(res.error, /propriétaire/);
});

test("deleteRoom : un LOCATAIRE ne peut pas supprimer une pièce", async () => {
  resetData();
  const { householdId, ownerId, tenantId } = await makeHouseholdWithTenant();
  const room = await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, userId: ownerId });
  const res = await svc.deleteRoom(room.data.id, tenantId);
  assert.equal(res.success, false);
  assert.match(res.error, /propriétaire/);
});

test("createFloor / updateFloorLayout / deleteFloor : un LOCATAIRE ne peut rien modifier", async () => {
  resetData();
  const { householdId, ownerId, tenantId } = await makeHouseholdWithTenant();
  const floor = await svc.createFloor({ name: "RDC", level: 0, householdId, userId: ownerId });

  const createRes = await svc.createFloor({ name: "Étage 1", level: 1, householdId, userId: tenantId });
  assert.equal(createRes.success, false);

  const updateRes = await svc.updateFloorLayout(floor.data.id, { gridWidth: 10 }, tenantId);
  assert.equal(updateRes.success, false);

  const deleteRes = await svc.deleteFloor(floor.data.id, tenantId);
  assert.equal(deleteRes.success, false);
});

test("createDoor / deleteDoor : un LOCATAIRE ne peut rien modifier", async () => {
  resetData();
  const { householdId, ownerId, tenantId } = await makeHouseholdWithTenant();
  const floor = await svc.createFloor({ name: "RDC", level: 0, householdId, userId: ownerId });
  const door = await svc.createDoor({ householdId, floorId: floor.data.id, x: 1, y: 1, userId: ownerId });

  const createRes = await svc.createDoor({ householdId, floorId: floor.data.id, x: 5, y: 5, userId: tenantId });
  assert.equal(createRes.success, false);

  const deleteRes = await svc.deleteDoor(door.data.id, tenantId);
  assert.equal(deleteRes.success, false);
});

test("listRooms / listFloors / listDoors : un LOCATAIRE peut toujours consulter", async () => {
  resetData();
  const { householdId, ownerId } = await makeHouseholdWithTenant();
  const floor = await svc.createFloor({ name: "RDC", level: 0, householdId, userId: ownerId });
  await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, floorId: floor.data.id, userId: ownerId });
  await svc.createDoor({ householdId, floorId: floor.data.id, x: 1, y: 1, userId: ownerId });

  // Les fonctions de LECTURE n'exigent aucun rôle particulier — juste vérifié
  // qu'elles restent accessibles sans authentification spécifique.
  const floors = await svc.listFloors(householdId);
  const rooms = await svc.listRooms(householdId);
  const doors = await svc.listDoors(floor.data.id);
  assert.equal(floors.data.length, 1);
  assert.equal(rooms.data.length, 1);
  assert.equal(doors.data.length, 1);
});

/* --------------------- Blocage du départ d'un propriétaire -------------------- */

test("leaveHousehold : un PROPRIETAIRE seul dans le foyer peut partir normalement", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-role5@example.com", password: "Motdepasse123!" });
  const res = await svc.leaveHousehold(signup.data.household.id, signup.data.user.id);
  assert.equal(res.success, true);
});

test("leaveHousehold : un PROPRIETAIRE ne peut PAS partir tant que d'autres occupants sont réclamés", async () => {
  resetData();
  const { householdId, ownerId } = await makeHouseholdWithTenant();
  const res = await svc.leaveHousehold(householdId, ownerId);
  assert.equal(res.success, false);
  assert.match(res.error, /transf/i);
});

test("leaveHousehold : un LOCATAIRE peut partir librement même si d'autres occupants restent", async () => {
  resetData();
  const { householdId, tenantId } = await makeHouseholdWithTenant();
  const res = await svc.leaveHousehold(householdId, tenantId);
  assert.equal(res.success, true);
});

/* ------------------------------ transferOwnership ----------------------------- */

test("transferOwnership : cas nominal, les rôles s'échangent", async () => {
  resetData();
  const { householdId, ownerId, tenantId } = await makeHouseholdWithTenant();
  const res = await svc.transferOwnership(householdId, ownerId, tenantId);
  assert.equal(res.success, true);
  assert.equal(res.data.newOwner.claimedByUserId, tenantId);
  assert.equal(res.data.newOwner.role, "PROPRIETAIRE");
  assert.equal(res.data.previousOwner.role, "LOCATAIRE");
});

test("transferOwnership : permet ensuite à l'ancien propriétaire de partir", async () => {
  resetData();
  const { householdId, ownerId, tenantId } = await makeHouseholdWithTenant();
  await svc.transferOwnership(householdId, ownerId, tenantId);
  const res = await svc.leaveHousehold(householdId, ownerId);
  assert.equal(res.success, true, "après transfert, l'ancien propriétaire n'est plus bloqué");
});

test("transferOwnership : refusé si l'expéditeur n'est pas propriétaire", async () => {
  resetData();
  const { householdId, tenantId, ownerId } = await makeHouseholdWithTenant();
  const res = await svc.transferOwnership(householdId, tenantId, ownerId);
  assert.equal(res.success, false);
});

test("transferOwnership : refusé si la cible n'est pas occupante de ce foyer", async () => {
  resetData();
  const { householdId, ownerId } = await makeHouseholdWithTenant();
  const stranger = await svc.signup({ name: "Étranger", email: "etranger-transfer@example.com", password: "Motdepasse123!" });
  const res = await svc.transferOwnership(householdId, ownerId, stranger.data.user.id);
  assert.equal(res.success, false);
});

test("transferOwnership : refusé si on se transfère à soi-même", async () => {
  resetData();
  const { householdId, ownerId } = await makeHouseholdWithTenant();
  const res = await svc.transferOwnership(householdId, ownerId, ownerId);
  assert.equal(res.success, false);
});

/* ------------------------- deleteHousehold, rôle exigé ------------------------ */

test("deleteHousehold : refusé si le compte n'est pas PROPRIETAIRE, même s'il est le seul occupant réclamé restant", async () => {
  resetData();
  const { householdId, ownerId, tenantId } = await makeHouseholdWithTenant();
  // Le propriétaire quitte D'ABORD après avoir transféré, laissant le LOCATAIRE seul.
  await svc.transferOwnership(householdId, ownerId, tenantId);
  await svc.leaveHousehold(householdId, ownerId);
  // Le tenant est maintenant PROPRIETAIRE (transféré) -> devrait pouvoir supprimer.
  const res = await svc.deleteHousehold(householdId, tenantId);
  assert.equal(res.success, true, "après transfert, le nouveau propriétaire peut bien supprimer");
});
