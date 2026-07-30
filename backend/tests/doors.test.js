// tests/doors.test.js
// Tests du nouveau concept de porte (voir la conversation) : une case de
// mur (x, y) transformée en passage libre sur un étage donné.
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

async function makeHouseholdWithFloor() {
  const signup = await svc.signup({ name: "Chloë", email: "chloe-doors@example.com", password: "Motdepasse123!" });
  const householdId = signup.data.household.id;
  const userId = signup.data.user.id;
  const floor = await svc.createFloor({ name: "Rez-de-chaussée", level: 0, householdId, userId });
  return { householdId, floorId: floor.data.id, userId };
}

test("createDoor : cas nominal", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  const res = await svc.createDoor({ householdId, floorId, x: 5, y: 3 , userId });
  assert.equal(res.success, true);
  assert.equal(res.data.x, 5);
  assert.equal(res.data.y, 3);
});

test("createDoor : x/y non entiers rejetés", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  const res = await svc.createDoor({ householdId, floorId, x: 1.5, y: 3 , userId });
  assert.equal(res.success, false);
  assert.match(res.error, /x/);
});

test("createDoor : householdId ou floorId inexistant rejeté", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  const badHousehold = await svc.createDoor({ householdId: "fantome", floorId, x: 1, y: 1 , userId });
  assert.equal(badHousehold.success, false);

  const badFloor = await svc.createDoor({ householdId, floorId: "fantome", x: 1, y: 1 , userId });
  assert.equal(badFloor.success, false);
});

test("createDoor : deux portes à la même position sur le même étage sont rejetées", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  await svc.createDoor({ householdId, floorId, x: 5, y: 3 , userId });
  const second = await svc.createDoor({ householdId, floorId, x: 5, y: 3 , userId });
  assert.equal(second.success, false);
  assert.match(second.error, /existe déjà/);
});

test("createDoor : la même position sur un AUTRE étage est autorisée", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  const floor2 = await svc.createFloor({ name: "Étage 1", level: 1, householdId , userId });
  await svc.createDoor({ householdId, floorId, x: 5, y: 3 , userId });
  const res = await svc.createDoor({ householdId, floorId: floor2.data.id, x: 5, y: 3 , userId });
  assert.equal(res.success, true, "la même position sur un étage différent ne doit pas entrer en conflit");
});

test("listDoors : filtre bien par étage", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  const floor2 = await svc.createFloor({ name: "Étage 1", level: 1, householdId , userId });
  await svc.createDoor({ householdId, floorId, x: 5, y: 3 , userId });
  await svc.createDoor({ householdId, floorId: floor2.data.id, x: 2, y: 2 , userId });

  const onFloor1 = await svc.listDoors(floorId);
  assert.equal(onFloor1.data.length, 1);
  assert.equal(onFloor1.data[0].x, 5);
});

test("deleteDoor : cas nominal, id inexistant rejeté proprement", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  const door = await svc.createDoor({ householdId, floorId, x: 5, y: 3 , userId });

  const res = await svc.deleteDoor(door.data.id, userId);
  assert.equal(res.success, true);

  const list = await svc.listDoors(floorId);
  assert.equal(list.data.length, 0);

  const notFound = await svc.deleteDoor("fantome");
  assert.equal(notFound.success, false);
});

test("deleteFloor : supprime aussi les portes de cet étage (cascade)", async () => {
  resetData();
  const { householdId, floorId, userId } = await makeHouseholdWithFloor();
  await svc.createDoor({ householdId, floorId, x: 5, y: 3 , userId });
  await svc.createDoor({ householdId, floorId, x: 8, y: 3 , userId });

  const res = await svc.deleteFloor(floorId, userId);
  assert.equal(res.success, true);
  assert.equal(res.data.deletedDoorCount, 2);

  const list = await svc.listDoors(floorId);
  assert.equal(list.data.length, 0);
});
