// StatusBadge.jsx
// Puce de couleur réutilisable pour le statut d'une tâche. Un seul endroit
// où la correspondance statut -> libellé/couleur est définie, pour ne pas
// la dupliquer entre ItemCard, Dashboard, ou ailleurs.
const STATUS_META = {
  todo: { label: "À faire", tone: "neutral" },
  in_progress: { label: "En cours", tone: "warning" },
  done: { label: "Terminé", tone: "success" },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, tone: "neutral" };
  return <span className={`badge badge--${meta.tone}`}>{meta.label}</span>;
}

export { STATUS_META };
