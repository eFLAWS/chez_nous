// tests/floors.test.js
// Tests des étages : création, rattachement d'une pièce à un étage, et
// surtout la conséquence la plus importante — deux pièces à des étages
// différents peuvent partager les mêmes coordonnées SANS que ce soit un
// vrai chevauchement (une chambre directement au-dessus du salon).
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

async function makeHousehold() {
  const signup = await svc.signup({ name: "Chloë", email: "chloe-floors@example.com", password: "Motdepasse123!" });
  return signup.data.household.id;
}

test("createFloor : cas nominal", async () => {
  resetData();
  const householdId = await makeHousehold();
  const res = await svc.createFloor({ name: "Rez-de-chaussée", level: 0, householdId });
  assert.equal(res.success, true);
  assert.equal(res.data.level, 0);
});

test("createFloor : level non entier ou hors bornes rejeté", async () => {
  resetData();
  const householdId = await makeHousehold();
  const notInt = await svc.createFloor({ name: "Étage", level: 1.5, householdId });
  assert.equal(notInt.success, false);
  const tooHigh = await svc.createFloor({ name: "Étage", level: 999, householdId });
  assert.equal(tooHigh.success, false);
});

test("createFloor : householdId inexistant rejeté", async () => {
  resetData();
  const res = await svc.createFloor({ name: "Étage", level: 1, householdId: "fantome" });
  assert.equal(res.success, false);
});

test("createRoom : floorId inexistant rejeté", async () => {
  resetData();
  const householdId = await makeHousehold();
  const res = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, floorId: "fantome" });
  assert.equal(res.success, false);
  assert.match(res.error, /floorId/);
});

test("createRoom : sans floorId reste valide (logement de plain-pied)", async () => {
  resetData();
  const householdId = await makeHousehold();
  const res = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  assert.equal(res.success, true);
  assert.equal(res.data.floorId, null);
});

test("Le placement automatique est indépendant par étage (chaque étage recommence à x=0,y=0)", async () => {
  resetData();
  const householdId = await makeHousehold();
  const rdc = await svc.createFloor({ name: "Rez-de-chaussée", level: 0, householdId });
  const etage1 = await svc.createFloor({ name: "Étage 1", level: 1, householdId });

  const salonRdc = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, floorId: rdc.data.id });
  assert.equal(salonRdc.data.x, 0);
  assert.equal(salonRdc.data.y, 0);

  // Une chambre à l'étage 1 : nouvel étage, donc elle recommence aussi à (0,0),
  // même si le rez-de-chaussée a déjà une pièce là.
  const chambreEtage1 = await svc.createRoom({ name: "Chambre", width: 4, length: 4, householdId, floorId: etage1.data.id });
  assert.equal(chambreEtage1.data.x, 0);
  assert.equal(chambreEtage1.data.y, 0);
});

test("updateRoomPosition : deux pièces à des étages DIFFÉRENTS peuvent partager les mêmes coordonnées", async () => {
  resetData();
  const householdId = await makeHousehold();
  const rdc = await svc.createFloor({ name: "Rez-de-chaussée", level: 0, householdId });
  const etage1 = await svc.createFloor({ name: "Étage 1", level: 1, householdId });

  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, floorId: rdc.data.id, x: 0, y: 0 });
  const chambre = await svc.createRoom({ name: "Chambre", width: 5, length: 4, householdId, floorId: etage1.data.id, x: 10, y: 10 });

  // On déplace la chambre EXACTEMENT sur les mêmes coordonnées que le salon —
  // légitime puisqu'elle est à un étage différent (juste au-dessus).
  const res = await svc.updateRoomPosition(chambre.data.id, { x: 0, y: 0 });
  assert.equal(res.success, true, "des pièces à des étages différents ne doivent jamais se bloquer entre elles");
});

test("updateRoomPosition : deux pièces du MÊME étage restent bloquées en cas de chevauchement", async () => {
  resetData();
  const householdId = await makeHousehold();
  const rdc = await svc.createFloor({ name: "Rez-de-chaussée", level: 0, householdId });

  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, floorId: rdc.data.id, x: 0, y: 0 });
  const cuisine = await svc.createRoom({ name: "Cuisine", width: 3, length: 3, householdId, floorId: rdc.data.id, x: 10, y: 10 });

  const res = await svc.updateRoomPosition(cuisine.data.id, { x: 1, y: 1 });
  assert.equal(res.success, false);
  assert.match(res.error, /Chevauchement/);
});

test("updateRoomPosition : une pièce SANS étage et une pièce AVEC étage ne se bloquent jamais entre elles", async () => {
  resetData();
  const householdId = await makeHousehold();
  const etage1 = await svc.createFloor({ name: "Étage 1", level: 1, householdId });

  const salonSansEtage = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, x: 0, y: 0 });
  const chambreEtage1 = await svc.createRoom({ name: "Chambre", width: 5, length: 4, householdId, floorId: etage1.data.id, x: 10, y: 10 });

  const res = await svc.updateRoomPosition(chambreEtage1.data.id, { x: 0, y: 0 });
  assert.equal(res.success, true);
});

test("listFloors : filtre bien par foyer", async () => {
  resetData();
  const h1 = await makeHousehold();
  const signup2 = await svc.signup({ name: "Paul", email: "paul-floors@example.com", password: "Motdepassepaul1!" });
  const h2 = signup2.data.household.id;

  await svc.createFloor({ name: "RDC foyer 1", level: 0, householdId: h1 });
  await svc.createFloor({ name: "RDC foyer 2", level: 0, householdId: h2 });

  const onlyH1 = await svc.listFloors(h1);
  assert.equal(onlyH1.data.length, 1);
  assert.equal(onlyH1.data[0].name, "RDC foyer 1");
});

/* -------------------------------- deleteFloor ----------------------------- */

test("deleteFloor : cas nominal, étage vide de pièces", async () => {
  resetData();
  const householdId = await makeHousehold();
  const floor = await svc.createFloor({ name: "Étage 1", level: 1, householdId });

  const res = await svc.deleteFloor(floor.data.id);
  assert.equal(res.success, true);

  const list = await svc.listFloors(householdId);
  assert.equal(list.data.length, 0);
});

test("deleteFloor : supprime en cascade ses pièces ET les tâches rattachées à ces pièces", async () => {
  resetData();
  const householdId = await makeHousehold();
  const floor = await svc.createFloor({ name: "Étage 1", level: 1, householdId });
  const chambre = await svc.createRoom({ name: "Chambre", width: 4, length: 4, householdId, floorId: floor.data.id });
  const bureau = await svc.createRoom({ name: "Bureau", width: 3, length: 3, householdId, floorId: floor.data.id });
  await svc.createTask({ title: "Ranger", roomId: chambre.data.id });
  await svc.createTask({ title: "Dépoussiérer", roomId: bureau.data.id });

  const res = await svc.deleteFloor(floor.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedRoomCount, 2);
  assert.equal(res.data.deletedTaskCount, 2);

  const rooms = await svc.listRooms(householdId);
  assert.equal(rooms.data.length, 0);
  const tasks = await svc.listTasks();
  assert.equal(tasks.data.length, 0);
});

test("deleteFloor : ne touche jamais aux pièces/tâches des AUTRES étages", async () => {
  resetData();
  const householdId = await makeHousehold();
  const rdc = await svc.createFloor({ name: "Rez-de-chaussée", level: 0, householdId });
  const etage1 = await svc.createFloor({ name: "Étage 1", level: 1, householdId });
  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, floorId: rdc.data.id });
  await svc.createRoom({ name: "Chambre", width: 4, length: 4, householdId, floorId: etage1.data.id });
  await svc.createTask({ title: "Nettoyer le sol", roomId: salon.data.id });

  const res = await svc.deleteFloor(etage1.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedRoomCount, 1);
  assert.equal(res.data.deletedTaskCount, 0);

  const rooms = await svc.listRooms(householdId);
  assert.equal(rooms.data.length, 1);
  assert.equal(rooms.data[0].name, "Salon");
  const tasks = await svc.listTasks();
  assert.equal(tasks.data.length, 1, "la tâche du salon (autre étage) ne doit pas être touchée");
});

test("deleteFloor : un étage sans aucune pièce se supprime normalement (0 partout)", async () => {
  resetData();
  const householdId = await makeHousehold();
  const floor = await svc.createFloor({ name: "Étage vide", level: 2, householdId });

  const res = await svc.deleteFloor(floor.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedRoomCount, 0);
  assert.equal(res.data.deletedTaskCount, 0);
});

test("deleteFloor : id manquant ou inexistant rejeté proprement", async () => {
  resetData();
  const missing = await svc.deleteFloor("");
  assert.equal(missing.success, false);

  const notFound = await svc.deleteFloor("fantome");
  assert.equal(notFound.success, false);
  assert.match(notFound.error, /Aucun étage trouvé/);
});

/* --------------------------------- deleteRoom ------------------------------ */

test("deleteRoom : supprime en cascade les tâches qui lui sont rattachées", async () => {
  resetData();
  const householdId = await makeHousehold();
  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  await svc.createTask({ title: "Passer l'aspirateur", roomId: salon.data.id });
  await svc.createTask({ title: "Nettoyer le sol", roomId: salon.data.id });

  const res = await svc.deleteRoom(salon.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedTaskCount, 2);

  const tasks = await svc.listTasks();
  assert.equal(tasks.data.length, 0);
});

test("deleteRoom : ne touche jamais aux tâches d'une AUTRE pièce", async () => {
  resetData();
  const householdId = await makeHousehold();
  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  const cuisine = await svc.createRoom({ name: "Cuisine", width: 3, length: 3, householdId });
  await svc.createTask({ title: "Nettoyer le sol du salon", roomId: salon.data.id });
  await svc.createTask({ title: "Faire la vaisselle", roomId: cuisine.data.id });

  const res = await svc.deleteRoom(salon.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedTaskCount, 1);

  const tasks = await svc.listTasks();
  assert.equal(tasks.data.length, 1);
  assert.equal(tasks.data[0].title, "Faire la vaisselle");
});

test("deleteRoom : tâches non liées à une pièce (roomId null) jamais affectées", async () => {
  resetData();
  const householdId = await makeHousehold();
  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  await svc.createTask({ title: "Rappel libre, sans pièce" });

  const res = await svc.deleteRoom(salon.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedTaskCount, 0);

  const tasks = await svc.listTasks();
  assert.equal(tasks.data.length, 1);
});

test("deleteRoom : une pièce sans aucune tâche se supprime normalement", async () => {
  resetData();
  const householdId = await makeHousehold();
  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });

  const res = await svc.deleteRoom(salon.data.id);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedTaskCount, 0);
});

test("deleteRoom : id manquant ou inexistant rejeté proprement", async () => {
  resetData();
  const missing = await svc.deleteRoom("");
  assert.equal(missing.success, false);

  const notFound = await svc.deleteRoom("fantome");
  assert.equal(notFound.success, false);
  assert.match(notFound.error, /Aucune pièce trouvée/);
});
