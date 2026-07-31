// src/features/household/StreakModal.jsx
// Détails du streak (badge flamme, header AppLayout) — même habillage
// que ScanPlanModal.jsx/JoinHousingModal.jsx (PlaceholderModal partagé).
//
// ⚠️ Comme le reste de la gamification (voir AppLayout.jsx) : aucune
// colonne streak_count/task_completions en base pour l'instant
// (docs/DATA_MODEL.md) — le nombre de jours affiché est le même
// placeholder que le badge, l'historique détaillé des tâches accomplies
// arrivera avec le service de tâches réel (actuellement TabPlaceholder,
// voir HouseholdTasksPage.jsx).
import PlaceholderModal from "./PlaceholderModal";

export default function StreakModal({ days = 0, onClose }) {
  return (
    <PlaceholderModal
      title={`Série active : ${days} jour${days > 1 ? "s" : ""} 🔥`}
      hint="Accomplissez au moins une tâche ménagère par jour pour faire grandir votre série. L'historique détaillé des tâches accomplies arrivera avec le vrai gestionnaire de tâches (pas encore branché en base)."
      onClose={onClose}
    />
  );
}
