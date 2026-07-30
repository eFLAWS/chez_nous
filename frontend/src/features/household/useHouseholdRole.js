// src/features/household/useHouseholdRole.js
// Service/hook d'authentification + rôle pour l'onboarding (voir la
// conversation, étape 3 du chantier routing/Supabase/rôles) : résout le
// RÔLE du compte connecté (`useAuth()`) au sein d'UN foyer précis, à
// partir du modèle relationnel déjà en place côté backend
// (occupants + `claimedByUserId` + `role`, voir roomService.js/
// userService.js — PROPRIETAIRE/LOCATAIRE).
//
// C'est la pièce qui manquait pour que le FRONTEND puisse enfin prendre
// des décisions selon le rôle (afficher ou non "Modifier le plan", par
// exemple) — le BACKEND applique déjà cette règle de son côté (voir
// isHouseholdOwner, roomService.js) et reste la vraie barrière de
// sécurité ; ce hook ne fait qu'adapter l'AFFICHAGE en conséquence,
// jamais la seule protection.
import { useState, useEffect } from "react";
import { api } from "../../api";
import { useAuth } from "../auth/AuthContext";

/**
 * @param {string} householdId
 * @returns {{ role: "PROPRIETAIRE" | "LOCATAIRE" | null, isOwner: boolean, loading: boolean }}
 *
 * `role` reste `null` tant que le chargement n'est pas terminé, ou si
 * le compte connecté n'est occupant réclamé d'aucun occupant de ce
 * foyer (ne devrait pas arriver dans un usage normal — protection
 * défensive plutôt qu'un cas attendu).
 */
export function useHouseholdRole(householdId) {
  const { session } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRole(null);

    api.listOccupants(householdId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        const mine = res.data.find((o) => o.claimedByUserId === session.id);
        setRole(mine?.role ?? null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [householdId, session.id]);

  return { role, isOwner: role === "PROPRIETAIRE", loading };
}
