// useHouseholdTasks.js
// Charge les tâches d'un foyer (taskService.js) — même convention que
// useHouseholds.js/useHouseholdDetail.js (loading/error/reload).
// Utilisé par HouseholdSpatialView.jsx (compteur par pièce + liste de
// RoomDetailView) et HouseholdTasksPage.jsx (onglet Tâches) — chacun
// fait son propre appel (même limite tolérée qu'ailleurs dans le
// projet pour useHouseholds, voir TODO.md #2 : pas de contexte partagé
// pour l'instant, à surveiller si ça devient gênant plutôt qu'à
// résoudre par anticipation).
import { useEffect, useState, useCallback } from 'react';
import { listHouseholdTasks, createTask, updateTaskStatus } from './taskService';

export function useHouseholdTasks(householdId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    const result = await listHouseholdTasks(householdId);
    if (result.success) {
      setTasks(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // "Ajout rapide" — titre + pièce uniquement, voir taskService.js.
  async function addQuickTask({ roomId, title }) {
    const result = await createTask({ householdId, roomId, title });
    if (result.success) await reload();
    return result;
  }

  // N'importe qui coche termine pour tout le monde (décision du
  // 03/08/2026) — pas de statut par assigné.
  async function completeTask(taskId) {
    const result = await updateTaskStatus(taskId, 'DONE');
    if (result.success) await reload();
    return result;
  }

  // Rouvrir une tâche marquée par erreur (pas dans le prototype
  // d'origine, mais symétrique et peu coûteux à exposer dès
  // maintenant).
  async function reopenTask(taskId) {
    const result = await updateTaskStatus(taskId, 'TODO');
    if (result.success) await reload();
    return result;
  }

  return { tasks, loading, error, reload, addQuickTask, completeTask, reopenTask };
}
