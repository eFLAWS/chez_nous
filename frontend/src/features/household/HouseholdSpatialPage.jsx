// HouseholdSpatialPage.jsx
// Route /households/:householdId/spatial — vue interactive du plan
// 2D/2.5D (lecture pour LOCATAIRE, lecture/interaction pour
// PROPRIETAIRE ; l'édition réelle vit sur /editor, hors périmètre ici).
// Reprend le texte role-aware de l'ancien HouseholdViewPage.jsx en
// attendant la migration floor_plans — le rôle vient du contexte fourni
// par AppLayout (déjà chargé via useHouseholds(), pas de fetch
// supplémentaire nécessaire ici).
import { useOutletContext } from 'react-router-dom';
import TabPlaceholder from './TabPlaceholder';

export default function HouseholdSpatialPage() {
  const { household } = useOutletContext();
  const isOwner = household?.role === 'PROPRIETAIRE';

  return (
    <TabPlaceholder
      title="Plan du logement"
      text={
        isOwner
          ? 'Le plan 2D/2.5D arrivera ici une fois la migration terminée.'
          : 'Le plan 2D/2.5D (lecture seule pour un locataire) arrivera ici une fois la migration terminée.'
      }
    />
  );
}
