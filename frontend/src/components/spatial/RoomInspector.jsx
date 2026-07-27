// src/components/spatial/RoomInspector.jsx
// Inspecteur de pièce : ouvert par un tap (pas un appui long — celui-ci
// déplace la pièce, voir LayoutEditor.jsx) sur une pièce existante.
// Les changements s'appliquent immédiatement (pas de bouton "Valider"
// séparé qui suggérerait qu'on peut les perdre) — seul "Fermer" referme
// le panneau.
//
// Choisir un type met à jour le nom ET la couleur de la pièce
// automatiquement (couleur toujours dérivée du type, jamais une valeur
// indépendante) — l'utilisateur peut ensuite personnaliser le nom
// librement, jusqu'à ce qu'il change de type à nouveau.
import { ROOM_TYPES, findRoomType } from "../../data/roomTypes";
import { computeRoomSurface } from "../../services/layoutGeneration";
import "./RoomInspector.css";

export default function RoomInspector({ room, onUpdateName, onUpdateType, onClose }) {
  const { tilesCount, surfaceM2 } = computeRoomSurface(room);
  const currentType = findRoomType(room.type);

  return (
    <>
      <div className="room-inspector-backdrop" onClick={onClose} />
      <div className="room-inspector" role="dialog" aria-modal="true" aria-label="Inspecteur de pièce">
        <div className="room-inspector__handle" />
        <h3 className="room-inspector__title">Inspecteur de pièce</h3>

        <label className="room-inspector__label">
          Nom
          <input
            className="room-inspector__input"
            value={room.name}
            onChange={(e) => onUpdateName(e.target.value)}
          />
        </label>

        <p className="room-inspector__surface">
          {currentType.icon} {surfaceM2} m² ({tilesCount} dalle{tilesCount > 1 ? "s" : ""})
        </p>

        <p className="room-inspector__section-label">Type de pièce</p>
        <div className="room-inspector__types">
          {ROOM_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={t.value === room.type ? "room-inspector__type room-inspector__type--active" : "room-inspector__type"}
              style={{ background: t.color }}
              onClick={() => onUpdateType(t.value)}
            >
              <span className="room-inspector__type-icon">{t.icon}</span>
              <span className="room-inspector__type-label">{t.label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="room-inspector__close-btn" onClick={onClose}>
          Fermer
        </button>
      </div>
    </>
  );
}
