// src/features/household/Plan2DView.jsx
// Vue "Plan 2D" : aperçu global, EN LECTURE SEULE, du plan déjà construit
// — pas d'avatar, pas de déplacement, juste les dalles de SOL vues du
// dessus + les murs/portes en surimpression. Distincte de
// LayoutEditor.jsx (qui sert à CRÉER/MODIFIER le plan, pas à le
// consulter) et de FloorView3D.jsx (qui est la vue immersive AVEC
// avatar — pas encore adaptée au modèle mur-arête, voir la conversation).
//
// REFONTE MUR-ARÊTE (voir la conversation, layoutGeneration.js pour le
// détail de l'algorithme) : `tiles` ne contient plus QUE des dalles de
// sol (`type: "floor"` ou `"furniture"`) — les murs et portes ne sont
// plus des dalles mais des ARÊTES (`edges`, calculées séparément),
// rendues en surimpression par `WallEdges` (SVG absolument positionné
// par-dessus la grille de sol). Corrige le bug où deux pièces collées
// perdaient leur cloison : chaque frontière entre pièces différentes
// est maintenant TOUJOURS une arête, qu'elles se touchent ou non.
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
// dans la Vue 3D centrée sur cette pièce si le parent le souhaite.
//
// Lit exactement les mêmes `tiles`/`rooms` que FloorView3D — les deux
// vues restent en accord sur le même layout, juste rendu différemment.
import WallEdges from "../layout-editor/components/WallEdges";
import "./Plan2DView.css";

const CELL_PX = 40;
const WALL_THICKNESS_PX = 4;

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

export default function Plan2DView({ floor, tiles, edges = [], rooms, onSelectRoom }) {
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const gridWidthPx = (floor.gridWidth || 10) * CELL_PX;
  const gridHeightPx = (floor.gridHeight || 10) * CELL_PX;

  return (
    <div className="plan2d-view">
      <p className="plan2d-hint">{floor.name} — vue d'ensemble (touchez une pièce pour vous y rendre en 3D)</p>

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
            // Uniquement des dalles de sol désormais ("floor" ou
            // "furniture") — plus de "wall"/"door" ici, voir l'en-tête.
            const room = roomById.get(tile.roomId);
            const isDark = (tile.x + tile.y) % 2 === 0;
            const baseColor = room ? room.color : "#b9b6ab"; // filet de sécurité si roomId inconnu
            const background = tile.type === "floor" ? (isDark ? shade(baseColor, -10) : baseColor) : baseColor;
            const clickable = room && Boolean(onSelectRoom);
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

          <WallEdges edges={edges} cellPx={CELL_PX} width={gridWidthPx} height={gridHeightPx} wallThickness={WALL_THICKNESS_PX} />
        </div>
      </div>
    </div>
  );
}

