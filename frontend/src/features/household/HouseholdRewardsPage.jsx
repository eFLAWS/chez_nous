// HouseholdRewardsPage.jsx
// Route /households/:householdId/rewards — atteinte via le badge gemme
// du header (AppLayout.jsx), pas un onglet de la barre basse (comme
// dans le prototype d'origine : le score ouvre un écran dédié séparé
// des 6 onglets). Placeholder en attendant le service de gamification
// réel (streak_count/points_balance, voir docs/DATA_MODEL.md) — même
// pattern que HouseholdTasksPage.jsx/HouseholdCalendarPage.jsx.
import TabPlaceholder from './TabPlaceholder';

export default function HouseholdRewardsPage() {
  return (
    <TabPlaceholder
      title="Récompenses"
      text="Le classement du foyer et l'historique des gemmes gagnées arriveront ici, une fois la gamification branchée en base."
    />
  );
}
