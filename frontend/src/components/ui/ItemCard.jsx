// ItemCard.jsx — Composant 1 : "Carte Projet / Tâche"
// Purement présentationnel. Utilise StatusBadge et ProgressBar (définis
// une seule fois, partagés avec le Dashboard) plutôt que de redéfinir un
// badge ou une barre localement. Seul état local propre : la confirmation
// de suppression (UI).
import { useState } from "react";
import Spinner from "./Spinner";
import StatusBadge from "./StatusBadge";
import ProgressBar from "./ProgressBar";

export default function ItemCard({ item, kind, ownerName, assigneeName, roomName, petName, completion, isMutating, onEdit, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editable = kind !== "pet"; // les animaux sont "créer + lister" seulement, pour l'instant

  return (
    <div className={`item-card${isMutating ? " item-card--mutating" : ""}`} data-kind={kind}>
      <div className="item-card__header">
        <h3 className="item-card__title">{kind === "task" ? item.title : item.name}</h3>
        {kind === "task" && <StatusBadge status={item.status} />}
      </div>

      <div className="item-card__meta">
        {kind === "project" && <span>Responsable : {ownerName || "—"}</span>}
        {kind === "pet" && <span>Espèce : {item.species || "non précisée"}</span>}
        {kind === "task" && (
          <>
            <span>Assigné à : {assigneeName || "Personne"}</span>
            {roomName && <span>📍 {roomName}</span>}
            {petName && <span>🐾 {petName}</span>}
            {item.recurrenceDays && <span>🔁 tous les {item.recurrenceDays} j</span>}
            {item.dueDate && <span>Échéance : {new Date(item.dueDate).toLocaleDateString()}</span>}
          </>
        )}
      </div>

      {kind === "task" && item.description && <p className="item-card__description">{item.description}</p>}

      {kind === "project" && completion !== null && completion !== undefined && (
        <div className="item-card__progress">
          <ProgressBar value={completion} tone={completion === 100 ? "success" : "neutral"} />
          <span className="item-card__progress-label">{completion}% des tâches terminées</span>
        </div>
      )}

      {editable && (
        <div className="item-card__actions">
          {isMutating ? (
            <span className="item-card__mutating">
              <Spinner size={14} /> En cours…
            </span>
          ) : !confirmingDelete ? (
            <>
              <button type="button" onClick={() => onEdit(item)}>
                Modifier
              </button>
              <button type="button" onClick={() => setConfirmingDelete(true)}>
                Supprimer
              </button>
            </>
          ) : (
            <span className="item-card__confirm">
              <button type="button" onClick={() => onDelete(item.id)}>
                Confirmer
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)}>
                Annuler
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
