// src/features/household/HouseholdViewPage.jsx
// Page /households/:householdId — lit l'id du foyer depuis l'URL
// (useParams) plutôt que de le recevoir en prop depuis un parent qui
// gérait tout en mémoire (voir la conversation, mise en place de React
// Router). `ApartmentSpatialMvp.jsx` reste INCHANGÉ à l'intérieur pour
// cette première passe — il gère encore lui-même, en interne, la
// bascule affichage/édition (`mode`) ; lui donner sa PROPRE sous-route
// dédiée (pour un vrai bouton retour qui sort de l'éditeur) reste pour
// une prochaine étape, annoncée mais pas faite ici.
//
// RÔLE (nouveau, voir la conversation — étape 3, service/hook
// d'authentification + onboarding selon les rôles) : `useHouseholdRole`
// résout si le compte connecté est PROPRIETAIRE ou LOCATAIRE de CE
// foyer précis, transmis à ApartmentSpatialMvp.jsx pour adapter
// l'affichage (masquer "Modifier le plan" pour un LOCATAIRE). Le
// BACKEND reste la vraie barrière de sécurité (voir isHouseholdOwner,
// roomService.js) — ceci n'ajuste que l'affichage.
import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../auth/AuthContext";
import { useHouseholdRole } from "./useHouseholdRole";
import ApartmentSpatialMvp from "./ApartmentSpatialMvp";

export default function HouseholdViewPage() {
  const { householdId } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isOwner, loading: roleLoading } = useHouseholdRole(householdId);

  const [housingName, setHousingName] = useState(null);

  // Le nom du logement n'est connu que via la liste des foyers du
  // compte — pas encore de route dédiée "un seul foyer par id" côté
  // backend, donc on réutilise celle qui existe déjà (léger surcoût,
  // acceptable pour l'instant).
  useEffect(() => {
    let cancelled = false;
    api.listHouseholdsForUser(session.id).then((res) => {
      if (cancelled || !res.success) return;
      const match = res.data.find((h) => h.id === householdId);
      if (match) setHousingName(match.name);
    });
    return () => {
      cancelled = true;
    };
  }, [session.id, householdId]);

  if (roleLoading) {
    return <p className="household-root__loading">Chargement...</p>;
  }

  return (
    <ApartmentSpatialMvp
      key={householdId}
      householdId={householdId}
      housingName={housingName}
      onBackToDashboard={() => navigate("/households")}
      startInEditor={Boolean(location.state?.justCreated)}
      role={role}
      isOwner={isOwner}
    />
  );
}
