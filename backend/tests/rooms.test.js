// tests/rooms.test.js
// Tests du module "pièces" : validation (dimensions, couleur), et surtout
// l'algorithme de placement automatique des coordonnées (X, Y), puisque
// aucun glisser-déposer n'existe encore pour les corriger manuellement.
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
  const signup = await svc.signup({ name: "Chloë", email: "chloe@example.com", password: "Motdepasse123!" });
  return signup.data.household.id;
}

test("createRoom : cas nominal, position (0,0) pour la première pièce du foyer", async () => {
  resetData();
  const householdId = await makeHousehold();
  const res = await svc.createRoom({ name: "Salon", width: 5, length: 4, color: "#F0DEC5", householdId });
  assert.equal(res.success, true);
  assert.equal(res.data.x, 0);
  assert.equal(res.data.y, 0);
  assert.equal(res.data.width, 5);
  assert.equal(res.data.length, 4);
});

test("createRoom : couleur par défaut appliquée si absente", async () => {
  resetData();
  const householdId = await makeHousehold();
  const res = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  assert.equal(res.success, true);
  assert.equal(typeof res.data.color, "string");
  assert.match(res.data.color, /^#/);
});

test("createRoom : largeur/longueur hors bornes rejetées", async () => {
  resetData();
  const householdId = await makeHousehold();
  const tooSmall = await svc.createRoom({ name: "Placard", width: 0.1, length: 0.1, householdId });
  assert.equal(tooSmall.success, false);
  assert.match(tooSmall.error, /width/);

  const tooBig = await svc.createRoom({ name: "Immense", width: 500, length: 4, householdId });
  assert.equal(tooBig.success, false);
  assert.match(tooBig.error, /width/);
});

test("createRoom : couleur mal formée rejetée", async () => {
  resetData();
  const householdId = await makeHousehold();
  const res = await svc.createRoom({ name: "Salon", width: 5, length: 4, color: "bleu", householdId });
  assert.equal(res.success, false);
  assert.match(res.error, /color/);
});

test("createRoom : householdId inexistant rejeté", async () => {
  resetData();
  const res = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId: "fantome" });
  assert.equal(res.success, false);
  assert.match(res.error, /fantome/);
});

test("createRoom : positionnement automatique — 2e pièce placée à droite de la 1ère", async () => {
  resetData();
  const householdId = await makeHousehold();
  await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  const res = await svc.createRoom({ name: "Cuisine", width: 3, length: 3, householdId });
  assert.equal(res.success, true);
  assert.equal(res.data.x, 5); // juste après la largeur du salon
  assert.equal(res.data.y, 0); // même ligne
});

test("createRoom : positionnement automatique — retour à la ligne quand la largeur de la grille est dépassée", async () => {
  resetData();
  const householdId = await makeHousehold();
  await svc.createRoom({ name: "A", width: 6, length: 3, householdId });
  await svc.createRoom({ name: "B", width: 5, length: 4, householdId }); // total 11, tient encore sur la ligne (< 12)
  const res = await svc.createRoom({ name: "C", width: 4, length: 2, householdId }); // 11 + 4 > 12 -> nouvelle ligne
  assert.equal(res.success, true);
  assert.equal(res.data.x, 0);
  assert.equal(res.data.y, 4); // sous la pièce la plus "longue" de la 1ère ligne (B, length=4)
});

test("createRoom : le placement automatique ne modifie jamais les pièces déjà existantes", async () => {
  resetData();
  const householdId = await makeHousehold();
  const first = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  await svc.createRoom({ name: "Cuisine", width: 3, length: 3, householdId });

  const list = await svc.listRooms(householdId);
  const salon = list.data.find((r) => r.id === first.data.id);
  assert.equal(salon.x, 0);
  assert.equal(salon.y, 0, "la position de la première pièce ne doit jamais changer après coup");
});

test("createRoom : position explicite (x, y) respectée si fournie", async () => {
  resetData();
  const householdId = await makeHousehold();
  const res = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, x: 2, y: 7 });
  assert.equal(res.success, true);
  assert.equal(res.data.x, 2);
  assert.equal(res.data.y, 7);
});

test("listRooms : filtre bien par foyer, deux foyers ne se mélangent jamais", async () => {
  resetData();
  const h1 = await makeHousehold();
  const signup2 = await svc.signup({ name: "Paul", email: "paul3@example.com", password: "Motdepassepaul1!" });
  const h2 = signup2.data.household.id;

  await svc.createRoom({ name: "Salon H1", width: 5, length: 4, householdId: h1 });
  await svc.createRoom({ name: "Salon H2", width: 5, length: 4, householdId: h2 });

  const onlyH1 = await svc.listRooms(h1);
  assert.equal(onlyH1.data.length, 1);
  assert.equal(onlyH1.data[0].name, "Salon H1");
});

test("createRoom : id en double rejeté", async () => {
  resetData();
  const householdId = await makeHousehold();
  await svc.createRoom({ id: "room-fixe", name: "Salon", width: 5, length: 4, householdId });
  const res = await svc.createRoom({ id: "room-fixe", name: "Autre", width: 3, length: 3, householdId });
  assert.equal(res.success, false);
  assert.match(res.error, /existe déjà/);
});

/* --------------------------- updateRoomPosition --------------------------- */

test("updateRoomPosition : cas nominal déplace bien la pièce", async () => {
  resetData();
  const householdId = await makeHousehold();
  const room = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  const res = await svc.updateRoomPosition(room.data.id, { x: 10, y: 3 });
  assert.equal(res.success, true);
  assert.equal(res.data.x, 10);
  assert.equal(res.data.y, 3);
});

test("updateRoomPosition : id manquant/vide rejeté sans toucher au fichier", async () => {
  resetData();
  const res = await svc.updateRoomPosition("", { x: 1, y: 1 });
  assert.equal(res.success, false);
  assert.match(res.error, /id/i);
});

test("updateRoomPosition : id inexistant rejeté", async () => {
  resetData();
  const res = await svc.updateRoomPosition("fantome", { x: 1, y: 1 });
  assert.equal(res.success, false);
  assert.match(res.error, /Aucune pièce trouvée/);
});

test("updateRoomPosition : x/y non numériques rejetés", async () => {
  resetData();
  const householdId = await makeHousehold();
  const room = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId });
  const res = await svc.updateRoomPosition(room.data.id, { x: "beaucoup", y: 3 });
  assert.equal(res.success, false);
  assert.match(res.error, /x/);
});

test("updateRoomPosition : déplacement qui chevaucherait une autre pièce est rejeté", async () => {
  resetData();
  const householdId = await makeHousehold();
  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, x: 0, y: 0 });
  const cuisine = await svc.createRoom({ name: "Cuisine", width: 3, length: 3, householdId, x: 10, y: 10 });

  // on tente de déplacer la cuisine EN PLEIN dans le salon
  const res = await svc.updateRoomPosition(cuisine.data.id, { x: 1, y: 1 });
  assert.equal(res.success, false);
  assert.match(res.error, /Chevauchement/);
  assert.match(res.error, /Salon/);

  // la cuisine ne doit pas avoir bougé
  const list = await svc.listRooms(householdId);
  const stillThere = list.data.find((r) => r.id === cuisine.data.id);
  assert.equal(stillThere.x, 10);
  assert.equal(stillThere.y, 10);
});

test("updateRoomPosition : contact bord-à-bord exact (pas de chevauchement réel) est accepté", async () => {
  resetData();
  const householdId = await makeHousehold();
  const salon = await svc.createRoom({ name: "Salon", width: 5, length: 4, householdId, x: 0, y: 0 });
  const cuisine = await svc.createRoom({ name: "Cuisine", width: 3, length: 3, householdId, x: 10, y: 10 });

  // la cuisine vient se coller exactement contre le bord droit du salon (x=5), même y
  const res = await svc.updateRoomPosition(cuisine.data.id, { x: 5, y: 0 });
  assert.equal(res.success, true, "un contact bord-à-bord exact ne doit pas être traité comme un chevauchement");
  assert.equal(res.data.x, 5);
});

test("rectanglesOverlap : vérifie directement quelques cas géométriques", () => {
  const a = { x: 0, y: 0, width: 5, length: 4 };
  assert.equal(svc.rectanglesOverlap(a, { x: 4, y: 0, width: 3, length: 3 }), true, "chevauchement partiel");
  assert.equal(svc.rectanglesOverlap(a, { x: 5, y: 0, width: 3, length: 3 }), false, "contact bord-à-bord exact");
  assert.equal(svc.rectanglesOverlap(a, { x: 100, y: 100, width: 3, length: 3 }), false, "aucun contact");
  assert.equal(svc.rectanglesOverlap(a, { x: 1, y: 1, width: 1, length: 1 }), true, "entièrement contenu");
});
