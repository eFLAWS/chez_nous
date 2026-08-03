// taskService.js
// Service Supabase pour les tâches ménagères (chantier 🅲, schéma V1 —
// voir DATAMODEL.md §2/§7, PRODUCTVISION.md §4). Contrat uniforme
// { success, data?, error? }, comme householdService.js/floorPlanService.js.
//
// PÉRIMÈTRE DE CETTE PREMIÈRE VERSION (03/08/2026) — décidé avec Paul :
// service d'abord, écran de création riche ensuite. Couvre donc :
//   - listHouseholdTasks : lecture enrichie (groupe + assignés résolus
//     par NOM en une seule requête, via les jointures imbriquées
//     PostgREST — même technique que householdService.js).
//   - createTask : création MINIMALE ("ajout rapide" : titre + pièce
//     uniquement, sans groupe/assignation/récurrence).
//   - updateTaskStatus : bascule de statut (case à cocher). Décision
//     produit du 03/08/2026 : n'importe quel assigné qui coche la
//     tâche la termine pour tout le monde — tasks.status seul fait
//     foi, pas de statut par assigné.
//
// PAS ENCORE ÉCRIT ICI, volontairement (viendra avec l'écran de
// création riche — groupe/assignation multi-personnes/dépendance) :
//   - Écriture sur task_assignees (assigner/désassigner quelqu'un).
//   - Écriture sur task_groups (créer/modifier un groupe).
//   - Résolution/calcul des dépendances (depends_on_task_id/every_n).
import { supabase } from '../../lib/supabaseClient';

// Jointures imbriquées PostgREST : résout le nom du groupe et le nom de
// chaque assigné (compte utilisateur OU occupant) en une seule requête,
// sans second aller-retour ni service séparé pour les occupants.
const TASK_SELECT = `
  id, household_id, title, description, room_id, status, importance,
  recurrence_days, due_date, deadline_offset_days, task_group_id,
  depends_on_task_id, depends_on_every_n, created_at,
  task_groups ( id, name, icon, color ),
  task_assignees (
    id, user_id, occupant_id,
    users ( display_name ),
    occupants ( name, type )
  )
`;

function toCamel(row) {
  return {
    id: row.id,
    householdId: row.household_id,
    title: row.title,
    description: row.description,
    roomId: row.room_id,
    status: row.status,
    importance: row.importance,
    recurrenceDays: row.recurrence_days,
    dueDate: row.due_date,
    deadlineOffsetDays: row.deadline_offset_days,
    taskGroupId: row.task_group_id,
    dependsOnTaskId: row.depends_on_task_id,
    dependsOnEveryN: row.depends_on_every_n,
    createdAt: row.created_at,
    group: row.task_groups
      ? { id: row.task_groups.id, name: row.task_groups.name, icon: row.task_groups.icon, color: row.task_groups.color }
      : null,
    // `type` distingue un compte utilisateur d'un occupant non-utilisateur
    // (ex. un animal) — voir PRODUCTVISION.md §4 et DATAMODEL.md §7.
    assignees: (row.task_assignees ?? []).map((a) => ({
      id: a.id,
      type: a.user_id ? 'user' : 'occupant',
      userId: a.user_id,
      occupantId: a.occupant_id,
      name: a.user_id ? (a.users?.display_name ?? '—') : (a.occupants?.name ?? '—'),
    })),
  };
}

/**
 * Liste toutes les tâches d'un foyer (groupe + assignés déjà résolus
 * par nom, voir TASK_SELECT ci-dessus). Pas de pagination pour
 * l'instant — volume attendu par foyer reste modeste.
 */
export async function listHouseholdTasks(householdId) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []).map(toCamel) };
}

/**
 * Crée une tâche minimale — "ajout rapide" (titre + pièce). Pas
 * d'assignation/groupe/récurrence : voir l'en-tête du fichier, ça
 * viendra avec l'écran de création riche.
 */
export async function createTask({ householdId, roomId, title }) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ household_id: householdId, room_id: roomId ?? null, title })
    .select(TASK_SELECT)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: toCamel(data) };
}

/**
 * Bascule le statut d'une tâche (case à cocher). La RLS
 * (`tasks_all_members`) autorise tout membre du foyer à écrire, pas
 * seulement l'assigné — cohérent avec la décision produit "n'importe
 * qui coche termine pour tout le monde".
 */
export async function updateTaskStatus(taskId, status) {
  const { data, error } = await supabase.from('tasks').update({ status }).eq('id', taskId).select(TASK_SELECT).single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: toCamel(data) };
}
