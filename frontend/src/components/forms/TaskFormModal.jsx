// src/components/forms/TaskFormModal.jsx
// Modale (tiroir bas d'écran, mobile-first) de création de tâche.
//
// Deux comportements différents selon la cible :
//   - Tâche de MEUBLE (target.furnitureId défini) : reste verrouillée à
//     une seule pièce, comme avant — un meuble ne peut pas être
//     physiquement dans deux pièces à la fois, pas de sélecteur ici.
//   - Tâche de PIÈCE (pas de meuble) : sélection d'UNE OU PLUSIEURS
//     pièces (cases à cocher), pour qu'une même tâche (ex. "passer
//     l'aspirateur") puisse couvrir plusieurs pièces à la fois. La
//     pièce d'où la création a été lancée est pré-cochée.
//
// Composant présentationnel, aucun état de tâches ici — la validation
// ("Créer la tâche") passe la donnée saisie au parent via `onSubmit`,
// qui décide comment l'ajouter à la liste canonique de tâches.
//
// `points` n'est volontairement pas un champ du formulaire (pas demandé
// dans la spec) — une valeur par défaut est appliquée par l'appelant.
import { useState } from "react";
import "./TaskFormModal.css";

// Récurrence présentée comme des choix simples plutôt qu'un nombre de
// jours à saisir à la main — plus clair pour un usage courant. Ne
// correspond pas 1:1 à recurrenceDays du backend réel (1-365, saisie
// libre) : ici, un MVP mock avec des préréglages suffit.
const RECURRENCE_OPTIONS = [
  { value: "none", label: "Une fois", days: null },
  { value: "daily", label: "Tous les jours", days: 1 },
  { value: "weekly", label: "Toutes les semaines", days: 7 },
  { value: "monthly", label: "Tous les mois", days: 30 },
];

export default function TaskFormModal({ target, allRooms = [], onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState(target.roomId ? [target.roomId] : []);
  const [recurrence, setRecurrence] = useState("none");
  const [error, setError] = useState(null);

  const isFurnitureTask = Boolean(target.furnitureId);

  const toggleRoom = (roomId) => {
    setSelectedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Le titre de la tâche est requis.");
      return;
    }
    if (!isFurnitureTask && selectedRoomIds.length === 0) {
      setError("Choisissez au moins une pièce.");
      return;
    }

    const recurrenceDays = RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.days ?? null;

    onSubmit({
      title: title.trim(),
      roomIds: isFurnitureTask ? [target.roomId] : selectedRoomIds,
      furnitureId: target.furnitureId ?? null,
      recurrenceDays,
    });
  };

  return (
    <>
      <div className="task-modal-backdrop" onClick={onClose} />
      <div className="task-modal" role="dialog" aria-modal="true" aria-label="Créer une tâche">
        <div className="task-modal__handle" />
        <h3 className="task-modal__title">Nouvelle tâche</h3>

        <form onSubmit={handleSubmit}>
          <label className="task-modal__label">
            Titre de la tâche
            <input
              className="task-modal__input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex. Nettoyer les coussins"
              autoFocus
            />
          </label>

          {isFurnitureTask ? (
            <p className="task-modal__target">Sur : {target.furnitureLabel}</p>
          ) : (
            <fieldset className="task-modal__rooms">
              <legend>Pièce(s) concernée(s)</legend>
              {allRooms.map((room) => (
                <label key={room.id} className="task-modal__room-option">
                  <input type="checkbox" checked={selectedRoomIds.includes(room.id)} onChange={() => toggleRoom(room.id)} />
                  {room.name}
                </label>
              ))}
            </fieldset>
          )}

          <label className="task-modal__label">
            Récurrence
            <select className="task-modal__select" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="task-modal__error">{error}</p>}

          <div className="task-modal__actions">
            <button type="submit" className="task-modal__submit">
              Créer la tâche
            </button>
            <button type="button" className="task-modal__cancel" onClick={onClose}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
