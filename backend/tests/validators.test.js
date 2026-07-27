// tests/validators.test.js
// Tests unitaires du validateur : garantit que chaque type d'entrée
// invalide est bien rejeté avec un message explicite, et que les entrées
// valides (y compris avec des caractères spéciaux) passent.
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateUser, validateProject, validateTask } = require("../validators");

test("validateUser : entrée valide minimale", () => {
  const { valid, errors } = validateUser({ id: "u1", name: "Chloë" });
  assert.equal(valid, true);
  assert.deepEqual(errors, []);
});

test("validateUser : name manquant est rejeté", () => {
  const { valid, errors } = validateUser({ id: "u1" });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("name")));
});

test("validateUser : id manquant est rejeté", () => {
  const { valid, errors } = validateUser({ name: "Sans id" });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("id")));
});

test("validateUser : email mal formé est rejeté", () => {
  const { valid, errors } = validateUser({ id: "u1", name: "A", email: "pas-un-email" });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("email")));
});

test("validateUser : email absent est toléré (optionnel)", () => {
  const { valid } = validateUser({ id: "u1", name: "A" });
  assert.equal(valid, true);
});

test("validateUser : name trop long (>500) est rejeté explicitement", () => {
  const { valid, errors } = validateUser({ id: "u1", name: "x".repeat(5000) });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("500 caractères")));
});

test("validateUser : corps non-objet (tableau, null, string) est rejeté sans planter", () => {
  assert.equal(validateUser(null).valid, false);
  assert.equal(validateUser(undefined).valid, false);
  assert.equal(validateUser([1, 2, 3]).valid, false);
  assert.equal(validateUser("juste une chaîne").valid, false);
});

test("validateUser : caractères spéciaux / balises dans name sont ACCEPTÉS (le validateur "
  + "vérifie la forme, pas le contenu — l'échappement se fait à l'affichage)", () => {
  const { valid } = validateUser({ id: "u1", name: "<script>alert(1)</script>" });
  assert.equal(valid, true, "la validation de type ne doit pas faire de filtrage de contenu");
});

test("validateProject : ownerId inexistant est rejeté (intégrité référentielle)", () => {
  const { valid, errors } = validateProject(
    { id: "p1", name: "Projet", ownerId: "fantome" },
    { existingUserIds: new Set(["u1"]) }
  );
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("fantome")));
});

test("validateProject : ownerId existant est accepté", () => {
  const { valid } = validateProject(
    { id: "p1", name: "Projet", ownerId: "u1" },
    { existingUserIds: new Set(["u1"]) }
  );
  assert.equal(valid, true);
});

test("validateTask : projectId inexistant est rejeté", () => {
  const { valid, errors } = validateTask(
    { id: "t1", title: "Tâche", projectId: "fantome" },
    { existingProjectIds: new Set(["p1"]), existingUserIds: new Set() }
  );
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("fantome")));
});

test("validateTask : assigneeId inexistant est rejeté", () => {
  const { valid, errors } = validateTask(
    { id: "t1", title: "Tâche", projectId: "p1", assigneeId: "fantome" },
    { existingProjectIds: new Set(["p1"]), existingUserIds: new Set(["u1"]) }
  );
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("fantome")));
});

test("validateTask : status hors énumération est rejeté", () => {
  const { valid, errors } = validateTask(
    { id: "t1", title: "Tâche", projectId: "p1", status: "termine_a_moitie" },
    { existingProjectIds: new Set(["p1"]) }
  );
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("status")));
});

test("validateTask : dueDate invalide est rejetée", () => {
  const { valid, errors } = validateTask(
    { id: "t1", title: "Tâche", projectId: "p1", dueDate: "32 janvier 2026" },
    { existingProjectIds: new Set(["p1"]) }
  );
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("dueDate")));
});

test("validateTask : title trop long (>500) est rejeté explicitement", () => {
  const { valid, errors } = validateTask(
    { id: "t1", title: "x".repeat(10000), projectId: "p1" },
    { existingProjectIds: new Set(["p1"]) }
  );
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes("500 caractères")));
});

test("validateTask : caractères unicode/emoji dans title sont acceptés", () => {
  const { valid } = validateTask(
    { id: "t1", title: "Passer l'aspirateur 🧹 — à faire cette semaine", projectId: "p1" },
    { existingProjectIds: new Set(["p1"]) }
  );
  assert.equal(valid, true);
});
