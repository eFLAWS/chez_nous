// src/features/layout-editor/components/RoomNameModal.jsx
// Petite modale : saisir le nom d'une pièce qui vient d'être tracée dans
// LayoutEditor.jsx, avant de la valider définitivement. Composant
// présentationnel, aucun état de plan ici.
import { useState } from "react";
import "./RoomNameModal.css";

export default function RoomNameModal({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la pièce est requis.");
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <>
      <div className="room-name-modal-backdrop" onClick={onCancel} />
      <div className="room-name-modal" role="dialog" aria-modal="true" aria-label="Nommer la pièce">
        <div className="room-name-modal__handle" />
        <h3 className="room-name-modal__title">Nommer cette pièce</h3>
        <form onSubmit={handleSubmit}>
          <input
            className="room-name-modal__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Salon, Cuisine, Chambre 1"
            autoFocus
          />
          {error && <p className="room-name-modal__error">{error}</p>}
          <div className="room-name-modal__actions">
            <button type="submit" className="room-name-modal__submit">
              Valider
            </button>
            <button type="button" className="room-name-modal__cancel" onClick={onCancel}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
