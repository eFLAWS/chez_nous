// useHouseholdRoomNames.js
// Petit hook dédié : résout { [roomId]: roomName } pour un foyer, à
// partir du plan (floorPlanService.js — même source que
// HouseholdSpatialView.jsx). Utilisé par HouseholdTasksPage.jsx pour
// grouper les tâches par nom de pièce plutôt que par leur id brut.
// Séparé de useHouseholdTasks.js : deux préoccupations différentes
// (tâches vs plan), même limite tolérée qu'ailleurs sur les fetchs
// indépendants (voir TODO.md #2).
import { useEffect, useState } from 'react';
import { fetchHouseholdLayout } from '../floor-plan/floorPlanService';

export function useHouseholdRoomNames(householdId) {
  const [roomNameById, setRoomNameById] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!householdId) return undefined;
    setLoading(true);
    fetchHouseholdLayout(householdId).then((layout) => {
      if (cancelled) return;
      const map = {};
      for (const room of layout.rooms) map[room.id] = room.name;
      setRoomNameById(map);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  return { roomNameById, loading };
}
