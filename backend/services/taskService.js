// services/taskService.js
const { readStore, writeStore, genId, ok, fail } = require("../core/storageUtils");
const { validateTask } = require("../validators");

async function createTask(input) {
  const read = await readStore();
  if (!read.success) return fail("task.create", read.error);

  const existingProjectIds = new Set(read.data.projects.map((p) => p.id));
  const existingUserIds = new Set(read.data.users.map((u) => u.id));
  const existingRoomIds = new Set(read.data.rooms.map((r) => r.id));
  const existingPetIds = new Set(read.data.occupants.filter((o) => o.type === "pet").map((o) => o.id));

  const candidate = {
    id: (input && input.id) || genId(),
    title: input && input.title,
    description: (input && input.description) ?? null,
    projectId: (input && input.projectId) ?? null,
    roomId: (input && input.roomId) ?? null,
    petId: (input && input.petId) ?? null,
    assigneeId: (input && input.assigneeId) ?? null,
    recurrenceDays: (input && input.recurrenceDays) ?? null,
    status: (input && input.status) ?? "todo",
    dueDate: (input && input.dueDate) ?? null,
    createdAt: new Date().toISOString(),
  };

  const { valid, errors } = validateTask(candidate, {
    existingProjectIds,
    existingUserIds,
    existingRoomIds,
    existingPetIds,
  });
  if (!valid) return fail("task.create.validation", errors.join(" "));

  if (read.data.tasks.some((t) => t.id === candidate.id)) {
    return fail("task.create.duplicate", `Une tâche avec l'id "${candidate.id}" existe déjà.`);
  }

  const next = { ...read.data, tasks: [...read.data.tasks, candidate] };
  const write = await writeStore(next);
  if (!write.success) return fail("task.create.write", write.error);

  return ok("task.create", candidate);
}

async function updateTask(id, patch) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("task.update.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("task.update", read.error);

  const index = read.data.tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return fail("task.update.not_found", `Aucune tâche trouvée avec l'id "${id}".`);
  }

  const existingProjectIds = new Set(read.data.projects.map((p) => p.id));
  const existingUserIds = new Set(read.data.users.map((u) => u.id));
  const existingRoomIds = new Set(read.data.rooms.map((r) => r.id));
  const existingPetIds = new Set(read.data.occupants.filter((o) => o.type === "pet").map((o) => o.id));
  const candidate = { ...read.data.tasks[index], ...(patch || {}), id };

  const { valid, errors } = validateTask(candidate, {
    existingProjectIds,
    existingUserIds,
    existingRoomIds,
    existingPetIds,
  });
  if (!valid) return fail("task.update.validation", errors.join(" "));

  const tasks = [...read.data.tasks];
  tasks[index] = candidate;

  const write = await writeStore({ ...read.data, tasks });
  if (!write.success) return fail("task.update.write", write.error);

  return ok("task.update", candidate);
}

async function deleteTask(id) {
  if (typeof id !== "string" || !id.trim()) {
    return fail("task.delete.validation", "id manquant ou invalide.");
  }

  const read = await readStore();
  if (!read.success) return fail("task.delete", read.error);

  if (!read.data.tasks.some((t) => t.id === id)) {
    return fail("task.delete.not_found", `Aucune tâche trouvée avec l'id "${id}".`);
  }

  const tasks = read.data.tasks.filter((t) => t.id !== id);
  const write = await writeStore({ ...read.data, tasks });
  if (!write.success) return fail("task.delete.write", write.error);

  return ok("task.delete", { id });
}

async function listTasks() {
  const read = await readStore();
  if (!read.success) return fail("task.list", read.error);
  return ok("task.list", read.data.tasks, `${read.data.tasks.length} tâche(s).`);
}

module.exports = { createTask, updateTask, deleteTask, listTasks };
