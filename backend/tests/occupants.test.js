// tests/occupants.test.js
// Tests du modèle d'occupants : un occupant (humain ou animal) est créé
// sans compte ; un compte existant peut ensuite le "réclamer". Vérifie
// aussi que le foyer garde bien la trace de qui l'a créé (createdBy).
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

/* -------------------------- Foyer : responsable --------------------------- */

test("signup : le foyer garde la trace de qui l'a créé (createdBy)", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ@example.com", password: "Motdepasse123!" });
  assert.equal(signup.data.household.createdBy, signup.data.user.id);
});

/* ----------------------------- Création d'occupants ----------------------- */

test("createOccupant : occupant humain créé sans compte (non réclamé)", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ2@example.com", password: "Motdepasse123!" });
  const res = await svc.createOccupant({ name: "Chloë", type: "human", householdId: signup.data.household.id });
  assert.equal(res.success, true);
  assert.equal(res.data.claimedByUserId, null);
  assert.equal(res.data.type, "human");
});

test("createOccupant : animal créé, jamais réclamable", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ3@example.com", password: "Motdepasse123!" });
  const res = await svc.createOccupant({ name: "Miel", type: "pet", species: "chat", householdId: signup.data.household.id });
  assert.equal(res.success, true);
  assert.equal(res.data.species, "chat");
  assert.equal(res.data.claimedByUserId, null);
});

test("createOccupant : type invalide rejeté", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ4@example.com", password: "Motdepasse123!" });
  const res = await svc.createOccupant({ name: "?", type: "robot", householdId: signup.data.household.id });
  assert.equal(res.success, false);
  assert.match(res.error, /type/);
});

test("createOccupant : species fournie sur un humain est rejetée", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ5@example.com", password: "Motdepasse123!" });
  const res = await svc.createOccupant({ name: "Chloë", type: "human", species: "chat", householdId: signup.data.household.id });
  assert.equal(res.success, false);
  assert.match(res.error, /species/);
});

test("createOccupant : householdId inexistant rejeté", async () => {
  resetData();
  const res = await svc.createOccupant({ name: "Chloë", type: "human", householdId: "fantome" });
  assert.equal(res.success, false);
  assert.match(res.error, /fantome/);
});

/* -------------------------------- Réclamation ------------------------------ */

test("claimOccupant : cas nominal, un compte réclame un occupant humain libre", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ6@example.com", password: "Motdepasse123!" });
  const occupant = await svc.createOccupant({ name: "Chloë", type: "human", householdId: signup.data.household.id });

  const res = await svc.claimOccupant(occupant.data.id, signup.data.user.id);
  assert.equal(res.success, true);
  assert.equal(res.data.claimedByUserId, signup.data.user.id);
});

test("claimOccupant : un animal ne peut jamais être réclamé", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ7@example.com", password: "Motdepasse123!" });
  const pet = await svc.createOccupant({ name: "Miel", type: "pet", householdId: signup.data.household.id });

  const res = await svc.claimOccupant(pet.data.id, signup.data.user.id);
  assert.equal(res.success, false);
  assert.match(res.error, /animal/);
});

test("claimOccupant : un occupant déjà réclamé ne peut pas l'être une seconde fois", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ8@example.com", password: "Motdepasse123!" });
  const invite = await svc.inviteUser({ householdId: signup.data.household.id, email: "paul-occ@example.com", invitedBy: signup.data.user.id });
  const paul = await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Motdepassepaul1!" });

  const occupant = await svc.createOccupant({ name: "Chloë", type: "human", householdId: signup.data.household.id });
  await svc.claimOccupant(occupant.data.id, signup.data.user.id);

  const second = await svc.claimOccupant(occupant.data.id, paul.data.id);
  assert.equal(second.success, false);
  assert.match(second.error, /déjà attribué/);
});

test("claimOccupant : un même compte ne peut pas réclamer deux occupants", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ9@example.com", password: "Motdepasse123!" });
  const occ1 = await svc.createOccupant({ name: "Chloë", type: "human", householdId: signup.data.household.id });
  const occ2 = await svc.createOccupant({ name: "Colocataire", type: "human", householdId: signup.data.household.id });

  await svc.claimOccupant(occ1.data.id, signup.data.user.id);
  const second = await svc.claimOccupant(occ2.data.id, signup.data.user.id);
  assert.equal(second.success, false);
  assert.match(second.error, /déjà réclamé un autre/);
});

test("claimOccupant : un utilisateur d'un AUTRE foyer ne peut pas réclamer", async () => {
  resetData();
  const s1 = await svc.signup({ name: "Chloë", email: "chloe-occ10@example.com", password: "Motdepasse123!" });
  const s2 = await svc.signup({ name: "Inconnu", email: "inconnu-occ@example.com", password: "Motdepasseautre1!" });
  const occupant = await svc.createOccupant({ name: "Chloë", type: "human", householdId: s1.data.household.id });

  const res = await svc.claimOccupant(occupant.data.id, s2.data.user.id);
  assert.equal(res.success, false);
  assert.match(res.error, /n'appartient pas/);
});

test("claimOccupant : occupant ou utilisateur inexistant rejeté proprement", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-occ11@example.com", password: "Motdepasse123!" });
  const notFoundOccupant = await svc.claimOccupant("fantome", signup.data.user.id);
  assert.equal(notFoundOccupant.success, false);

  const occupant = await svc.createOccupant({ name: "Chloë", type: "human", householdId: signup.data.household.id });
  const notFoundUser = await svc.claimOccupant(occupant.data.id, "fantome");
  assert.equal(notFoundUser.success, false);
});

/* ------------ Le parcours complet décrit par l'utilisateur ---------------- */

test("parcours complet : créer le foyer, ajouter occupants (soi, colocataire, animal), se réclamer, inviter, l'invité réclame le libre", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-flow@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;

  const me = await svc.createOccupant({ name: "Chloë", type: "human", householdId });
  const roommate = await svc.createOccupant({ name: "Colocataire", type: "human", householdId });
  const pet = await svc.createOccupant({ name: "Miel", type: "pet", species: "chat", householdId });

  const claimMe = await svc.claimOccupant(me.data.id, signup.data.user.id);
  assert.equal(claimMe.success, true);

  const invite = await svc.inviteUser({ householdId, email: "colocataire@example.com", invitedBy: signup.data.user.id });
  const accepted = await svc.acceptInvitation({ token: invite.data.token, name: "Colocataire", password: "Motdepassecoloc1!" });
  assert.equal(accepted.data.householdId, householdId);

  const freeList = await svc.listOccupants(householdId, { onlyUnclaimed: true });
  assert.equal(freeList.data.length, 1);
  assert.equal(freeList.data[0].id, roommate.data.id);

  const claimRoommate = await svc.claimOccupant(roommate.data.id, accepted.data.id);
  assert.equal(claimRoommate.success, true);

  const finalList = await svc.listOccupants(householdId);
  assert.equal(finalList.data.length, 3);
  assert.equal(finalList.data.filter((o) => o.claimedByUserId).length, 2);
  assert.equal(pet.data.claimedByUserId, null, "l'animal ne doit jamais être réclamé");
});
