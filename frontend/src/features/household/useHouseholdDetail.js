// useHouseholdDetail.js
// Charge un foyer précis (nom, invite_code, membres) et résout le rôle
// du compte connecté au sein de CE foyer. Remplace l'ancien
// useHouseholdRole.js (qui résolvait via occupants/ancien backend) pour
// la variante Supabase de HouseholdViewPage.
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getHouseholdDetail } from './householdService';

export function useHouseholdDetail(householdId) {
  const { user } = useAuth();
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    const result = await getHouseholdDetail(householdId);
    if (result.success) {
      setHousehold(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [householdId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const myMembership = household?.members.find((m) => m.userId === user?.id) ?? null;

  return {
    household,
    role: myMembership?.role ?? null,
    isOwner: myMembership?.role === 'PROPRIETAIRE',
    loading,
    error,
    reload,
  };
}
