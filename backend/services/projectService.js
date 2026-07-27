// services/projectService.js
// Regroupe deux entités "conteneur" légères : projets et foyers. Le foyer
// est généralement créé via userService.signup (foyer + premier compte
// en une opération), mais reste aussi gérable directement ici.
const { readStore, writeStore, genId, ok, fail } = require("../core/storageUtils");
const { validateProject, validateHousehold } = require("../validators");

/* ================================= Projets ================================ */

async function createProject(input) {
  const read = await readStore();
  if (!read.success) return fail("project.create", read.error);

  const existingUserIds = new Set(read.data.users.map((u) => u.id));
  const candidate = {
    id: (input && input.id) || genId(),
    name: input && input.name,
    ownerId: input && input.ownerId,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateProject(candidate, { existingUserIds });
  if (!valid) return fail("project.create.validation", errors.join(" "));

  if (read.data.projects.some((p) => p.id === candidate.id)) {
    return fail("project.create.duplicate", `Un projet avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, projects: [...read.data.projects, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("project.create.write", write.error);

  return ok("project.create", candidate);
}

async function listProjects() {
  const read = await readStore();
  if (!read.success) return fail("project.list", read.error);
  return ok("project.list", read.data.projects, `${read.data.projects.length} projet(s).`);
}

/* ================================= Foyers ================================= */

async function createHousehold(input) {
  const read = await readStore();
  if (!read.success) return fail("household.create", read.error);

  const candidate = {
    id: (input && input.id) || genId(),
    name: input && input.name,
    createdBy: (input && input.createdBy) ?? null,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateHousehold(candidate);
  if (!valid) return fail("household.create.validation", errors.join(" "));

  if (read.data.households.some((h) => h.id === candidate.id)) {
    return fail("household.create.duplicate", `Un foyer avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, households: [...read.data.households, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("household.create.write", write.error);

  return ok("household.create", candidate);
}

async function listHouseholds() {
  const read = await readStore();
  if (!read.success) return fail("household.list", read.error);
  return ok("household.list", read.data.households, `${read.data.households.length} foyer(s).`);
}

module.exports = { createProject, listProjects, createHousehold, listHouseholds };
