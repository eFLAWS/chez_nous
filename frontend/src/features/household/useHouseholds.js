// useHouseholds.js
// Charge les foyers du compte connecté (via householdService). Utilisé
// par RequireHousehold (redirige vers /onboarding si aucun foyer) et
// par CreateHouseholdPage (recharge après création pour débloquer la
// redirection).
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { listMyHouseholds } from './householdService';

export function useHouseholds() {
  const { user } = useAuth();
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!user) {
      setHouseholds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await listMyHouseholds(user.id);
    if (result.success) {
      setHouseholds(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { households, loading, error, reload };
}
