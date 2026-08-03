// src/features/layout-editor/components/RoomInspector.jsx
// Inspecteur de pièce : ouvert par un tap (pas un appui long — celui-ci
// déplace la pièce, voir LayoutEditor.jsx) sur une pièce existante.
// Les changements s'appliquent immédiatement (pas de bouton "Valider"
// séparé qui suggérerait qu'on peut les perdre) — seul "Fermer" referme
// le panneau.
//
// COULEUR INDÉPENDANTE DU TYPE (02/08/2026, demande explicite de Paul,
// corrige le commentaire précédent de ce fichier) : choisir un type met
// à jour le nom ET l'icône, mais PLUS la couleur — la couleur se
// choisit maintenant séparément via la grille ci-dessous (voir
// roomTypes.js, ROOM_COLORS), pour rester cohérente avec le nouveau
// flux de création (RoomCreateModal.jsx, qui demande déjà les deux
// séparément). Sans ce découplage, changer de type après coup aurait
// silencieusement écrasé une couleur personnalisée choisie à la
// création.
import { ROOM_TYPES, ROOM_COLORS, findRoomType } from "../roomTypes";
import { computeRoomSurface } from "../utils/layoutGeneration";
import "./RoomInspector.css";

export default function RoomInspector({ room, onUpdateName, onUpdateType, onUpdateColor, onClose }) {
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

        <p className="room-inspector__section-label">Couleur</p>
        <div className="room-inspector__colors">
          {ROOM_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              className={hex === room.color ? "room-inspector__color room-inspector__color--active" : "room-inspector__color"}
              style={{ background: hex }}
              onClick={() => onUpdateColor(hex)}
              aria-label={`Choisir la couleur ${hex}`}
              aria-pressed={hex === room.color}
            />
          ))}
        </div>

        <button type="button" className="room-inspector__close-btn" onClick={onClose}>
          Fermer
        </button>
      </div>
    </>
  );
}
