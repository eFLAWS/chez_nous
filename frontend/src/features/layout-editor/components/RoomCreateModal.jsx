// src/features/layout-editor/components/RoomCreateModal.jsx
// Modale de création d'une pièce qui vient d'être tracée dans
// LayoutEditor.jsx, avant de la valider définitivement. Composant
// présentationnel, aucun état de plan ici.
//
// RENOMMÉE depuis RoomNameModal.jsx (02/08/2026, demande explicite de
// Paul) : demandait auparavant SEULEMENT le nom, avec le type imposé
// par défaut ("Autre/Cellier") — modifiable seulement après coup via
// l'Inspecteur. Demande maintenant nom + TYPE + COULEUR en une seule
// étape, comme demandé. Choisir un type suggère un nom et une couleur
// par défaut (celle du type) mais n'importe lequel des deux reste
// librement modifiable ensuite, y compris la couleur via la grille
// ci-dessous — INDÉPENDANTE du type (voir roomTypes.js, ROOM_COLORS).
import { useState } from "react";
import { ROOM_TYPES, ROOM_COLORS, DEFAULT_ROOM_TYPE, findRoomType } from "../roomTypes";
import "./RoomCreateModal.css";

export default function RoomCreateModal({ onSubmit, onCancel }) {
  const defaultType = findRoomType(DEFAULT_ROOM_TYPE);
  const [name, setName] = useState("");
  const [type, setType] = useState(DEFAULT_ROOM_TYPE);
  const [color, setColor] = useState(defaultType.color);
  const [error, setError] = useState(null);

  // Choisir un type suggère nom + couleur par défaut — mêmes valeurs
  // que si on avait créé la pièce puis ouvert l'Inspecteur et changé le
  // type. L'utilisateur peut ensuite modifier n'importe lequel des deux
  // librement (nom au clavier, couleur via la grille ci-dessous).
  const handleSelectType = (value) => {
    const roomType = findRoomType(value);
    setType(value);
    setName(roomType.label);
    setColor(roomType.color);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom de la pièce est requis.");
      return;
    }
    const roomType = findRoomType(type);
    onSubmit({ name: name.trim(), type, icon: roomType.icon, color });
  };

  return (
    <>
      <div className="room-create-modal-backdrop" onClick={onCancel} />
      <div className="room-create-modal" role="dialog" aria-modal="true" aria-label="Créer une pièce">
        <div className="room-create-modal__handle" />
        <h3 className="room-create-modal__title">Nouvelle pièce</h3>
        <form onSubmit={handleSubmit}>
          <p className="room-create-modal__section-label">Type de pièce</p>
          <div className="room-create-modal__types">
            {ROOM_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={t.value === type ? "room-create-modal__type room-create-modal__type--active" : "room-create-modal__type"}
                style={{ background: t.color }}
                onClick={() => handleSelectType(t.value)}
              >
                <span className="room-create-modal__type-icon">{t.icon}</span>
                <span className="room-create-modal__type-label">{t.label}</span>
              </button>
            ))}
          </div>

          <label className="room-create-modal__label">
            Nom
            <input
              className="room-create-modal__input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Salon, Cuisine, Chambre 1"
              autoFocus
            />
          </label>

          <p className="room-create-modal__section-label">Couleur</p>
          <div className="room-create-modal__colors">
            {ROOM_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                className={hex === color ? "room-create-modal__color room-create-modal__color--active" : "room-create-modal__color"}
                style={{ background: hex }}
                onClick={() => setColor(hex)}
                aria-label={`Choisir la couleur ${hex}`}
                aria-pressed={hex === color}
              />
            ))}
          </div>

          {error && <p className="room-create-modal__error">{error}</p>}
          <div className="room-create-modal__actions">
            <button type="submit" className="room-create-modal__submit">
              Créer la pièce
            </button>
            <button type="button" className="room-create-modal__cancel" onClick={onCancel}>
              Annuler
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
