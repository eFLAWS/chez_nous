// useItems.js
// Hook réutilisable : centralise le cycle de vie (chargement, erreur,
// données, actions CRUD) d'une liste d'éléments — pour ne jamais dupliquer
// cette logique entre les différentes grilles/écrans.
//
// Expose deux granularités d'état de chargement, sur demande explicite :
// - `loading` : la lecture initiale de la liste (bloquante, plein écran/squelette).
// - `creating` / `mutatingIds` : les actions en cours, par élément (non bloquantes,
//   pour que seule la carte concernée réagisse pendant sa propre mise à jour/suppression).
//
// Note : le kind "pet" a été retiré (route /api/pets remplacée par
// /api/occupants, qui n'a pas encore d'écran dédié — voir README, "Ce qui
// manque"). Mieux vaut ne rien exposer qu'un flux à moitié raccordé.
import { useState, useEffect, useCallback } from "react";
import { api } from "../api";

const LISTERS = {
  task: api.listTasks,
  project: api.listProjects,
  room: (params) => api.listRooms(params?.householdId),
  floor: (params) => api.listFloors(params?.householdId),
};
const CREATORS = { task: api.createTask, project: api.createProject, room: api.createRoom, floor: api.createFloor };
const UPDATERS = { task: api.updateTask, room: api.updateRoomPosition };
const REMOVERS = { task: api.deleteTask, floor: api.deleteFloor, room: api.deleteRoom };

export function useItems(kind, params) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [mutatingIds, setMutatingIds] = useState(() => new Set());

  const setMutating = useCallback((id, on) => {
    setMutatingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await LISTERS[kind](params);
    if (res.success) setItems(res.data);
    else setError(res.error);
    setLoading(false);
  }, [kind, params?.householdId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input) => {
      setCreating(true);
      const res = await CREATORS[kind](input);
      if (res.success) await refresh();
      setCreating(false);
      return res;
    },
    [kind, refresh]
  );

  const update = useCallback(
    async (id, patch) => {
      const updater = UPDATERS[kind];
      if (!updater) return { success: false, error: "Mise à jour non prise en charge pour ce type." };
      setMutating(id, true);
      const res = await updater(id, patch);
      if (res.success) await refresh();
      setMutating(id, false);
      return res;
    },
    [kind, refresh, setMutating]
  );

  const remove = useCallback(
    async (id) => {
      const remover = REMOVERS[kind];
      if (!remover) return { success: false, error: "Suppression non prise en charge pour ce type." };
      setMutating(id, true);
      const res = await remover(id);
      if (res.success) await refresh();
      setMutating(id, false);
      return res;
    },
    [kind, refresh, setMutating]
  );

  return { items, loading, error, creating, mutatingIds, refresh, create, update, remove };
}
