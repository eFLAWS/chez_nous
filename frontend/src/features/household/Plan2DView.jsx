// src/features/household/Plan2DView.jsx
// Vue "Plan 2D" : aperçu global, EN LECTURE SEULE, du plan déjà construit
// — pas d'avatar, pas de déplacement, juste les dalles (sol/murs/portes)
// vues du dessus. Distincte de LayoutEditor.jsx (qui sert à CRÉER/
// MODIFIER le plan, pas à le consulter) et de FloorView2D.jsx (qui est
// la vue immersive AVEC avatar).
//
// DÉFILEMENT NATIF, PAS react-zoom-pan-pinch (voir la conversation) :
// la bibliothèque de zoom/pincement a causé un vrai bug visuel signalé
// ici (le mur coupé à droite/en bas, contenu pas entièrement visible) —
// jamais pu la tester réellement dans un navigateur. Remplacée par la
// MÊME approche de défilement natif déjà éprouvée dans
// LayoutEditor.jsx (overflow: auto sur un conteneur de taille fixe,
// aucune bibliothèque tierce) : plus simple, plus prévisible, et
// garantit que la totalité du plan reste accessible par défilement,
// jamais coupée.
//
// Clic sur une pièce : optionnel (`onSelectRoom`), pour sauter directement
// dans la Vue 2.5D centrée sur cette pièce si le parent le souhaite.
//
// Lit exactement les mêmes `tiles`/`rooms` que FloorView2D — les deux
// vues restent en accord sur le même layout, juste rendu différemment.
import "./Plan2DView.css";

const CELL_PX = 40;

function shade(hex, amount) {
  const n = parseInt(hex.replace("#", ""), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `rgb(${r}, ${g}, ${b})`;
}

export default function Plan2DView({ floor, tiles, rooms, onSelectRoom }) {
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const gridWidthPx = (floor.gridWidth || 10) * CELL_PX;
  const gridHeightPx = (floor.gridHeight || 10) * CELL_PX;

  return (
    <div className="plan2d-view">
      <p className="plan2d-hint">{floor.name} — vue d'ensemble (touchez une pièce pour vous y rendre en 2.5D)</p>

      <div className="plan2d-scroll">
        <div
          className="plan2d-grid"
          style={{
            width: gridWidthPx,
            height: gridHeightPx,
            gridTemplateColumns: `repeat(${floor.gridWidth || 10}, ${CELL_PX}px)`,
            gridTemplateRows: `repeat(${floor.gridHeight || 10}, ${CELL_PX}px)`,
          }}
        >
          {tiles.map((tile) => {
            const room = roomById.get(tile.roomId);
            const isDark = (tile.x + tile.y) % 2 === 0;
            const baseColor = room ? room.color : tile.type === "door" ? "#f3c98a" : "#b9b6ab";
            const background = tile.type === "floor" ? (isDark ? shade(baseColor, -10) : baseColor) : baseColor;
            const clickable = tile.type === "floor" && room && Boolean(onSelectRoom);
            return (
              <div
                key={`${tile.x}-${tile.y}`}
                className="plan2d-tile"
                style={{ gridColumn: tile.x + 1, gridRow: tile.y + 1, background, cursor: clickable ? "pointer" : "default" }}
                onClick={clickable ? () => onSelectRoom(room.id) : undefined}
                role={clickable ? "button" : undefined}
                aria-label={clickable ? `Aller à ${room.name}` : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
