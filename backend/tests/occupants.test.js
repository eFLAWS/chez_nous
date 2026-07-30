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
  // signup a déjà réclamé un occupant pour Chloë elle-même (voir plus
  // haut) — ce test vérifie le cas nominal avec un SECOND compte
  // (invité), qui réclame un occupant LIBRE, pour ne pas entrer en
  // conflit avec l'occupant déjà réclamé automatiquement pour Chloë.
  const invite = await svc.inviteUser({ householdId: signup.data.household.id, email: "paul-occ6@example.com", invitedBy: signup.data.user.id });
  const paul = await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Motdepassepaul1!" });
  const occupant = await svc.createOccupant({ name: "Colocataire", type: "human", householdId: signup.data.household.id });

  const res = await svc.claimOccupant(occupant.data.id, paul.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.claimedByUserId, paul.data.id);
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
  const invite2 = await svc.inviteUser({ householdId: signup.data.household.id, email: "julie-occ@example.com", invitedBy: signup.data.user.id });
  const julie = await svc.acceptInvitation({ token: invite2.data.token, name: "Julie", password: "Motdepassejulie1!" });

  // Occupant libre réclamé une première fois par Paul...
  const occupant = await svc.createOccupant({ name: "Colocataire", type: "human", householdId: signup.data.household.id });
  await svc.claimOccupant(occupant.data.id, paul.data.id);

  // ...puis Julie essaie de réclamer CE MÊME occupant déjà pris.
  const second = await svc.claimOccupant(occupant.data.id, julie.data.id);
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

test("claimOccupant : un compte PEUT désormais réclamer un occupant dans un AUTRE foyer (multi-foyers)", async () => {
  resetData();
  const s1 = await svc.signup({ name: "Chloë", email: "chloe-occ10@example.com", password: "Motdepasse123!" });
  const s2 = await svc.signup({ name: "Inconnu", email: "inconnu-occ@example.com", password: "Motdepasseautre1!" });
  const occupant = await svc.createOccupant({ name: "Invité", type: "human", householdId: s1.data.household.id });

  // s2 n'appartient pas au foyer de s1 (dans le sens "n'y a pas été créé"),
  // mais peut maintenant réclamer un occupant qui s'y trouve — c'est
  // exactement le scénario "être occupant de plusieurs foyers".
  const res = await svc.claimOccupant(occupant.data.id, s2.data.user.id);
  assert.equal(res.success, true);
  assert.equal(res.data.claimedByUserId, s2.data.user.id);
});

test("claimOccupant : un compte peut réclamer un occupant dans CHACUN de plusieurs foyers différents", async () => {
  resetData();
  const s1 = await svc.signup({ name: "Chloë", email: "chloe-multi1@example.com", password: "Motdepasse123!" });
  const s2 = await svc.signup({ name: "Foyer B", email: "chloe-multi2@example.com", password: "Motdepasse123!" });
  // s1 a déjà un occupant auto-réclamé dans SON PROPRE foyer (signup) —
  // ce test vérifie qu'elle peut EN PLUS réclamer un occupant dans le
  // foyer DE QUELQU'UN D'AUTRE (s2).
  const occInHouseholdB = await svc.createOccupant({ name: "Chloë ailleurs", type: "human", householdId: s2.data.household.id });

  const claimB = await svc.claimOccupant(occInHouseholdB.data.id, s1.data.user.id);
  assert.equal(claimB.success, true, "un compte doit pouvoir être occupant de plusieurs foyers");

  const households = await svc.listHouseholdsForUser(s1.data.user.id);
  assert.equal(households.data.length, 2, "listHouseholdsForUser doit retrouver le foyer de l'inscription ET celui de s2");
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

test("parcours complet : créer le foyer (occupant auto-réclamé), ajouter occupants (colocataire, animal), inviter, l'invité réclame le libre", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-flow@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;
  // signup a déjà créé ET réclamé un occupant pour Chloë elle-même (voir
  // plus haut) — pas besoin de le refaire manuellement ici.

  const roommate = await svc.createOccupant({ name: "Colocataire", type: "human", householdId });
  const pet = await svc.createOccupant({ name: "Miel", type: "pet", species: "chat", householdId });

  const invite = await svc.inviteUser({ householdId, email: "colocataire@example.com", invitedBy: signup.data.user.id });
  const accepted = await svc.acceptInvitation({ token: invite.data.token, name: "Colocataire", password: "Motdepassecoloc1!" });
  assert.equal(accepted.data.householdId, householdId);

  const freeList = await svc.listOccupants(householdId, { onlyUnclaimed: true });
  assert.equal(freeList.data.length, 1);
  assert.equal(freeList.data[0].id, roommate.data.id);

  const claimRoommate = await svc.claimOccupant(roommate.data.id, accepted.data.id);
  assert.equal(claimRoommate.success, true);

  const finalList = await svc.listOccupants(householdId);
  assert.equal(finalList.data.length, 3, "Chloë (auto) + colocataire + animal");
  assert.equal(finalList.data.filter((o) => o.claimedByUserId).length, 2, "Chloë et le colocataire, pas l'animal");
  assert.equal(pet.data.claimedByUserId, null, "l'animal ne doit jamais être réclamé");
});

/* -------------- createHouseholdForUser / listHouseholdsForUser (multi-foyers) ------------- */

test("createHouseholdForUser : crée un second foyer pour un compte déjà existant, avec un occupant auto-réclamé", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-newhh1@example.com", password: "Motdepasse123!" });

  const res = await svc.createHouseholdForUser({ userId: signup.data.user.id, householdName: "Maison de vacances" });
  assert.equal(res.success, true);
  assert.equal(res.data.household.name, "Maison de vacances");
  assert.equal(res.data.occupant.claimedByUserId, signup.data.user.id, "le créateur doit être automatiquement occupant de son nouveau foyer");

  const households = await svc.listHouseholdsForUser(signup.data.user.id);
  assert.equal(households.data.length, 2, "doit retrouver le foyer de l'inscription ET le nouveau");
});

test("createHouseholdForUser : nom par défaut si aucun fourni", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-newhh2@example.com", password: "Motdepasse123!" });
  const res = await svc.createHouseholdForUser({ userId: signup.data.user.id });
  assert.equal(res.success, true);
  assert.match(res.data.household.name, /Chloë/);
});

test("createHouseholdForUser : utilisateur inexistant rejeté proprement", async () => {
  resetData();
  const res = await svc.createHouseholdForUser({ userId: "fantome" });
  assert.equal(res.success, false);
});

test("listHouseholdsForUser : signup crée ET réclame automatiquement un occupant (un compte = un occupant, dès l'inscription)", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-newhh3@example.com", password: "Motdepasse123!" });
  const res = await svc.listHouseholdsForUser(signup.data.user.id);
  assert.equal(res.success, true);
  assert.equal(res.data.length, 1, "le foyer créé à l'inscription doit être retrouvé immédiatement");
  assert.equal(res.data[0].id, signup.data.household.id);
});

test("listHouseholdsForUser : compte inconnu ne retrouve rien", async () => {
  resetData();
  const res = await svc.listHouseholdsForUser("fantome");
  assert.equal(res.success, true);
  assert.equal(res.data.length, 0);
});

/* ------------------------- leaveHousehold / deleteHousehold (nouveau) ----------------------- */

test("leaveHousehold : déréclame l'occupant, le foyer et son plan restent intacts", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-leave1@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;
  const room = await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, userId: signup.data.user.id });

  const res = await svc.leaveHousehold(householdId, signup.data.user.id);
  assert.equal(res.success, true);

  const households = await svc.listHouseholdsForUser(signup.data.user.id);
  assert.equal(households.data.length, 0, "le compte ne doit plus voir ce foyer après l'avoir quitté");

  const rooms = await svc.listRooms(householdId);
  assert.equal(rooms.data.length, 1, "le plan doit rester intact — quitter n'efface rien");
  assert.equal(rooms.data[0].id, room.data.id);
});

test("leaveHousehold : compte qui n'est pas occupant de ce foyer rejeté", async () => {
  resetData();
  const s1 = await svc.signup({ name: "Chloë", email: "chloe-leave2@example.com", password: "Motdepasse123!" });
  const s2 = await svc.signup({ name: "Paul", email: "paul-leave2@example.com", password: "Motdepasse123!" });

  const res = await svc.leaveHousehold(s1.data.household.id, s2.data.user.id);
  assert.equal(res.success, false);
});

test("deleteHousehold : dernier occupant peut supprimer réellement, en cascade", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-del1@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;
  const floor = await svc.createFloor({ name: "RDC", level: 0, householdId, userId: signup.data.user.id });
  const room = await svc.createRoom({ name: "Salon", type: "salon", width: 4, height: 4, householdId, floorId: floor.data.id, userId: signup.data.user.id });
  await svc.createDoor({ householdId, floorId: floor.data.id, x: 1, y: 1, userId: signup.data.user.id });
  await svc.createTask({ title: "Ranger", roomId: room.data.id });

  const res = await svc.deleteHousehold(householdId, signup.data.user.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedRoomCount, 1);
  assert.equal(res.data.deletedFloorCount, 1);
  assert.equal(res.data.deletedDoorCount, 1);
  assert.equal(res.data.deletedTaskCount, 1);

  const households = await svc.listHouseholdsForUser(signup.data.user.id);
  assert.equal(households.data.length, 0);
});

test("deleteHousehold : REFUSÉ s'il reste d'autres occupants réclamés — même si le frontend prétend le contraire", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-del2@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;
  const invite = await svc.inviteUser({ householdId, email: "paul-del2@example.com", invitedBy: signup.data.user.id });
  await svc.acceptInvitation({ token: invite.data.token, name: "Paul", password: "Motdepassepaul1!" });
  // acceptInvitation ne réclame pas d'occupant automatiquement — on le
  // fait manuellement pour bien avoir DEUX occupants réclamés dans ce foyer.
  const paulOccupant = await svc.createOccupant({ name: "Paul", type: "human", householdId });
  const accepted = await svc.login({ email: "paul-del2@example.com", password: "Motdepassepaul1!" });
  await svc.claimOccupant(paulOccupant.data.id, accepted.data.id);

  const res = await svc.deleteHousehold(householdId, signup.data.user.id);
  assert.equal(res.success, false, "ne doit JAMAIS supprimer tant qu'un autre occupant est réclamé");
  assert.match(res.error, /quitter/);

  // Rien n'a été supprimé.
  const households = await svc.listHouseholdsForUser(signup.data.user.id);
  assert.equal(households.data.length, 1);
});

test("deleteHousehold : compte qui n'est pas occupant de ce foyer rejeté", async () => {
  resetData();
  const s1 = await svc.signup({ name: "Chloë", email: "chloe-del3@example.com", password: "Motdepasse123!" });
  const s2 = await svc.signup({ name: "Étranger", email: "etranger-del3@example.com", password: "Motdepasse123!" });

  const res = await svc.deleteHousehold(s1.data.household.id, s2.data.user.id);
  assert.equal(res.success, false);
  assert.match(res.error, /pas occupant/);
});

test("deleteHousehold : foyer inexistant rejeté proprement", async () => {
  resetData();
  const signup = await svc.signup({ name: "Chloë", email: "chloe-del4@example.com", password: "Motdepasse123!" });
  const res = await svc.deleteHousehold("fantome", signup.data.user.id);
  assert.equal(res.success, false);
});
