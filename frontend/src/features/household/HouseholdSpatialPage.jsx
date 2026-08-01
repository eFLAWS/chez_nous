// HouseholdSpatialPage.jsx
// Route /households/:householdId/spatial — vue interactive du plan
// 2D/2.5D. Monte ApartmentSpatialMvp (construit et testé de longue
// date, mais jusqu'ici jamais routé — voir la conversation) maintenant
// que floorPlanService.js le branche sur Supabase (floor_plans, blob
// JSONB) plutôt que sur l'ancien backend.
//
// startInEditor=false : ApartmentSpatialMvp gère lui-même la bascule
// vers son mode "editing" via son propre bouton "Modifier le plan"
// (masqué pour un LOCATAIRE, cf. le commentaire isOwner du composant)
// — pas besoin d'une route /editor séparée pour que l'édition
// fonctionne. Une sous-route dédiée reste une amélioration possible
// plus tard (bénéfice mobile du bouton "retour", voir le suivi projet,
// chantier 🅲) mais n'est pas requise pour que ça marche.
//
// ⚠️ user : pas encore de display_name réel câblé (public.users, "Bientôt"
// partout ailleurs dans l'app) — utilise l'email en attendant.
import { useParams, useOutletContext } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import ApartmentSpatialMvp from './ApartmentSpatialMvp';

export default function HouseholdSpatialPage() {
  const { householdId } = useParams();
  const { household } = useOutletContext();
  const { user } = useAuth();

  const isOwner = household?.role === 'PROPRIETAIRE';

  return (
    <ApartmentSpatialMvp
      householdId={householdId}
      housingName={household?.name}
      user={{ id: user?.id, name: user?.email ?? 'Moi' }}
      role={household?.role ?? null}
      isOwner={isOwner}
    />
  );
}
