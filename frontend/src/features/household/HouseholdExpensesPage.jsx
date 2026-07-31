// HouseholdExpensesPage.jsx
// Route /households/:householdId/expenses — "Dépenses" (voir la
// conversation, capture annotée : nouvel onglet séparé de "Vie du
// foyer"). La table `expenses` existe déjà en base (migrée, voir
// docs/DATA_MODEL.md et backend/supabase/migrations/), mais aucun
// service frontend ne la consomme encore ici — placeholder en
// attendant ce service.
import TabPlaceholder from './TabPlaceholder';

export default function HouseholdExpensesPage() {
  return (
    <TabPlaceholder
      title="Dépenses"
      text="Le suivi des dépenses partagées du foyer arrivera ici."
    />
  );
}
