// live-test.js — script de vérification rapide ("smoke test") : démarre le
// serveur, l'interroge réellement en suivant le parcours complet décrit par
// l'utilisateur (inscription -> occupants -> réclamation -> invitation ->
// l'invité réclame l'occupant libre -> étages -> pièces -> collision), puis
// l'arrête proprement. À lancer après toute modification du backend.
// Usage : node live-test.js
const server = require("./server");

const PORT = 3001;
const base = `http://localhost:${PORT}/api`;

async function post(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function patch(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}
async function get(path) {
  const res = await fetch(`${base}${path}`);
  return { status: res.status, body: await res.json() };
}
async function del(path) {
  const res = await fetch(`${base}${path}`, { method: "DELETE" });
  return res.json();
}

async function main() {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log("=== Serveur démarré ===\n");

  // 1. Inscription -> crée le foyer, Chloë devient "responsable" (createdBy)
  const signup = await post("/auth/signup", { name: "Chloë", email: "chloe@test.com", password: "Motdepasse123!" });
  console.log("POST /auth/signup ->", JSON.stringify(signup));
  const householdId = signup.data.household.id;
  console.log("   -> responsable du foyer (createdBy) :", signup.data.household.createdBy === signup.data.user.id);

  // 2. Chloë ajoute les occupants : elle-même, sa colocataire, leur chat
  const occChloe = await post("/occupants", { name: "Chloë", type: "human", householdId });
  const occColoc = await post("/occupants", { name: "Colocataire", type: "human", householdId });
  const occChat = await post("/occupants", { name: "Miel", type: "pet", species: "chat", householdId });
  console.log("\nPOST /occupants x3 (Chloë, Colocataire, Miel) -> tous créés ?",
    occChloe.success && occColoc.success && occChat.success);

  // 3. Chloë se réclame elle-même
  const claimChloe = await post(`/occupants/${occChloe.data.id}/claim`, { userId: signup.data.user.id });
  console.log("\nPOST /occupants/:id/claim (Chloë se réclame) ->", JSON.stringify(claimChloe));

  // 4. Chloë invite sa colocataire par email
  const invite = await post("/invitations", { householdId, email: "coloc@test.com", invitedBy: signup.data.user.id });
  console.log("\nPOST /invitations ->", JSON.stringify(invite));

  // 5. La colocataire accepte l'invitation (crée son propre compte, rejoint le MÊME foyer)
  const accept = await post("/invitations/accept", { token: invite.data.token, name: "Colocataire", password: "Motdepassecoloc1!" });
  console.log("\nPOST /invitations/accept ->", JSON.stringify(accept));
  console.log("   -> même foyer que Chloë ?", accept.data.householdId === householdId);

  // 6. La colocataire regarde les occupants libres, et se réclame elle-même
  const freeOccupants = await get(`/occupants?householdId=${householdId}&onlyUnclaimed=true`);
  console.log("\nGET /occupants?onlyUnclaimed=true ->", JSON.stringify(freeOccupants.body));
  const claimColoc = await post(`/occupants/${freeOccupants.body.data[0].id}/claim`, { userId: accept.data.id });
  console.log("\nPOST /occupants/:id/claim (colocataire se réclame l'occupant libre) ->", JSON.stringify(claimColoc));

  // 7. Étages : un rez-de-chaussée et un étage
  const rdc = await post("/floors", { name: "Rez-de-chaussée", level: 0, householdId, userId: signup.data.user.id });
  const etage1 = await post("/floors", { name: "Étage 1", level: 1, householdId, userId: signup.data.user.id });
  console.log("\nPOST /floors x2 ->", rdc.success && etage1.success);

  // 8. Un salon au RDC, une chambre à l'étage 1 — mêmes coordonnées, pas de conflit
  const salon = await post("/rooms", { name: "Salon", type: "salon", width: 5, height: 4, householdId, floorId: rdc.data.id, userId: signup.data.user.id });
  const chambre = await post("/rooms", { name: "Chambre", type: "chambre", width: 5, height: 4, householdId, floorId: etage1.data.id, userId: signup.data.user.id });
  console.log("\nPOST /rooms (Salon RDC, Chambre étage 1) -> positions:", salon.data.x, salon.data.y, "|", chambre.data.x, chambre.data.y);

  const moveChambre = await patch(`/rooms/${chambre.data.id}/position`, { x: salon.data.x, y: salon.data.y, userId: signup.data.user.id });
  console.log("\nPATCH chambre (étage 1) sur EXACTEMENT les coordonnées du salon (RDC) ->", JSON.stringify(moveChambre));
  console.log("   -> autorisé car étages différents ?", moveChambre.success === true);

  // 9. Une deuxième pièce au RDC : le chevauchement doit, lui, être bloqué
  const cuisine = await post("/rooms", { name: "Cuisine", type: "cuisine", width: 3, height: 3, householdId, floorId: rdc.data.id, userId: signup.data.user.id });
  const collideRes = await patch(`/rooms/${cuisine.data.id}/position`, { x: salon.data.x, y: salon.data.y, userId: signup.data.user.id });
  console.log("\nPATCH cuisine (même étage que le salon) sur ses coordonnées -> refusé ?", collideRes.success === false, JSON.stringify(collideRes));

  // 10. Suppression en cascade : une tâche sur la cuisine, puis on supprime la cuisine
  await post("/tasks", { title: "Faire la vaisselle", roomId: cuisine.data.id });
  const beforeDeleteRoom = await get(`/tasks`);
  const deleteRoomRes = await del(`/rooms/${cuisine.data.id}?userId=${signup.data.user.id}`);
  console.log("\nDELETE /rooms/:id (Cuisine, avec 1 tâche) ->", JSON.stringify(deleteRoomRes));
  const afterDeleteRoom = await get(`/tasks`);
  console.log("   -> tâches avant/après :", beforeDeleteRoom.body.data.length, "->", afterDeleteRoom.body.data.length);

  // 11. Suppression en cascade : on supprime l'étage 1 (qui contient la Chambre)
  const deleteFloorRes = await del(`/floors/${etage1.data.id}?userId=${signup.data.user.id}`);
  console.log("\nDELETE /floors/:id (Étage 1, avec la Chambre) ->", JSON.stringify(deleteFloorRes));
  const roomsAfterFloorDelete = await get(`/rooms?householdId=${householdId}`);
  console.log("   -> pièces restantes :", roomsAfterFloorDelete.body.data.map((r) => r.name));

  server.close();
  console.log("\n=== Serveur arrêté proprement ===");
}

main().catch((err) => {
  console.error("ÉCHEC :", err);
  server.close();
  process.exitCode = 1;
});
