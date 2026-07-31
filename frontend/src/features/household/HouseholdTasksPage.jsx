// HouseholdTasksPage.jsx
// Route /households/:householdId/tasks — gestionnaire de corvées par
// pièce/occupant (docs/DATA_MODEL.md). Accès complet PROPRIETAIRE et
// LOCATAIRE (voir la matrice RLS, section 3). Placeholder en attendant
// le service tasks côté Supabase.
import TabPlaceholder from './TabPlaceholder';

export default function HouseholdTasksPage() {
  return (
    <TabPlaceholder
      title="Tâches"
      text="Le gestionnaire de corvées par pièce et par occupant arrivera ici."
    />
  );
}
