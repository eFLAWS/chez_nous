// src/components/spatial/FloorView2D.jsx
// Affiche le plan RÉEL et unifié de l'étage (une seule grille de dalles
// avec roomId par dalle — voir mockData.js), avec déplacement pas à pas
// (recherche de chemin) et zoom/pan/pincement via react-zoom-pan-pinch.
//
// SIMPLIFIÉ (voir la conversation) : mobilier et tâches retirés pour
// l'instant — le foyer se concentre sur l'éditeur de plan avant de
// remettre ces concepts par-dessus une base spatiale solide. Ce
// composant ne fait donc plus que : afficher le plan, déplacer l'avatar
// dessus, et zoomer/naviguer. Plus de tiroir de tâches, plus de bouton
// "+ Créer une tâche", plus de rendu de meuble.
//
// Toujours 100% mock, pas d'appel API ici.
import { useState, useRef, useMemo, useEffect } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import { MOCK_FLOORS, MOCK_FLOOR_TILES, MOCK_ROOMS, MOCK_USER } from "../../data/mockData";
import { findPath } from "../../services/pathfinding";
import "./FloorView2D.css";

const CELL_PX = 50;
// Doit rester synchronisé avec la durée de transition de .floor-avatar
// dans FloorView2D.css — le glissé visuel entre deux cases doit durer
// exactement le temps qui s'écoule entre deux étapes de la marche.
const STEP_DURATION_MS = 250;

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

// Boutons flottants +/-/🎯 — DOIVENT être un enfant de TransformWrapper :
// useControls() ne fonctionne que dans ce contexte, pas dans le composant
// parent qui monte <TransformWrapper>.
function ZoomControls({ avatarRef }) {
  const { zoomIn, zoomOut, zoomToElement, centerView } = useControls();
  return (
    <div className="floor-zoom-controls">
      <button type="button" onClick={() => zoomOut()} aria-label="Dézoomer">
        −
      </button>
      <button
        type="button"
        onClick={() => (avatarRef.current ? zoomToElement(avatarRef.current) : centerView())}
        aria-label="Recentrer sur l'avatar"
      >
        🎯
      </button>
      <button type="button" onClick={() => zoomIn()} aria-label="Zoomer">
        +
      </button>
    </div>
  );
}

export default function FloorView2D({
  floor = MOCK_FLOORS[0],
  tiles = MOCK_FLOOR_TILES[MOCK_FLOORS[0].id],
  rooms = MOCK_ROOMS,
  user = MOCK_USER,
  initialRoomId,
  onBack,
}) {
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);

  // Position d'entrée : la première case "sol" de la pièce demandée
  // (venant d'un clic dans la Vue Ensemble), sinon la position par
  // défaut de l'étage.
  const entryPosition = useMemo(() => {
    if (initialRoomId) {
      const tile = tiles.find((t) => t.roomId === initialRoomId && t.type === "floor");
      if (tile) return { x: tile.x, y: tile.y };
    }
    return floor.avatarStart;
  }, [initialRoomId, tiles, floor]);

  const [avatarPos, setAvatarPos] = useState(entryPosition);
  const [lastRoomId, setLastRoomId] = useState(initialRoomId ?? null);

  // Marche pas à pas : `path` est la liste des cases RESTANTES à
  // parcourir (la position actuelle n'y figure pas).
  const [path, setPath] = useState(null);

  const avatarRef = useRef(null);

  // Anime la marche : une case toutes les STEP_DURATION_MS. Se
  // ré-exécute à chaque changement de `path` — donc si un nouveau clic
  // remplace `path` en cours de route (redirection), le minuteur en
  // attente est annulé (nettoyage de l'effet précédent) et la marche
  // reprend depuis la position actuelle vers la nouvelle destination.
  useEffect(() => {
    if (!path || path.length === 0) return undefined;
    const timer = window.setTimeout(() => {
      const [next, ...rest] = path;
      setAvatarPos(next);
      setPath(rest.length === 0 ? null : rest);
    }, STEP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [path]);

  const currentTile = tiles.find((t) => t.x === avatarPos.x && t.y === avatarPos.y);
  // En cas de passage transitoire par une porte (roomId absent), on garde
  // la dernière pièce connue plutôt que de perdre le contexte pendant
  // une fraction de seconde.
  useEffect(() => {
    if (currentTile?.roomId) setLastRoomId(currentTile.roomId);
  }, [currentTile?.roomId]);
  const currentRoom = roomById.get(currentTile?.roomId ?? lastRoomId);

  const handleCellClick = (tile) => {
    if (tile.type !== "floor" && tile.type !== "door") return;
    const newPath = findPath(tiles, avatarPos, { x: tile.x, y: tile.y });
    if (!newPath || newPath.length <= 1) return; // déjà là, ou destination inaccessible
    setPath(newPath.slice(1)); // retire la position de départ, déjà occupée par l'avatar
  };

  const gridWidthPx = floor.gridWidth * CELL_PX;
  const gridHeightPx = floor.gridHeight * CELL_PX;

  return (
    <div className="floor-view">
      <div className="floor-header">
        {onBack && (
          <button type="button" className="floor-back-btn" onClick={onBack}>
            ← Vue ensemble
          </button>
        )}
        <p className="floor-hint">
          {floor.name} — {currentRoom?.name || "Passage"} — {user.name}
        </p>
      </div>

      <div className="floor-viewport">
        <TransformWrapper initialScale={1} minScale={0.4} maxScale={2.5} centerOnInit doubleClick={{ disabled: true }}>
          <ZoomControls avatarRef={avatarRef} />
          <TransformComponent wrapperClass="floor-scroll-container" contentClass="floor-transform-content">
            <div
              className="floor-grid"
              style={{
                width: gridWidthPx,
                height: gridHeightPx,
                gridTemplateColumns: `repeat(${floor.gridWidth}, ${CELL_PX}px)`,
                gridTemplateRows: `repeat(${floor.gridHeight}, ${CELL_PX}px)`,
              }}
            >
              {tiles.map((tile) => {
                const clickable = tile.type === "floor" || tile.type === "door";
                const room = roomById.get(tile.roomId);
                const isDark = (tile.x + tile.y) % 2 === 0;
                const baseColor = room ? room.color : tile.type === "door" ? "#f3c98a" : "#b9b6ab";
                const background = tile.type === "floor" ? (isDark ? shade(baseColor, -10) : baseColor) : baseColor;
                const label = clickable ? tile.label || "Se déplacer ici" : undefined;
                return (
                  <div
                    key={`${tile.x}-${tile.y}`}
                    className="floor-tile"
                    style={{ gridColumn: tile.x + 1, gridRow: tile.y + 1, background, cursor: clickable ? "pointer" : "default" }}
                    onClick={clickable ? () => handleCellClick(tile) : undefined}
                    role={clickable ? "button" : undefined}
                    aria-label={label}
                  />
                );
              })}

              <div
                ref={avatarRef}
                className="floor-avatar"
                style={{
                  left: avatarPos.x * CELL_PX,
                  top: avatarPos.y * CELL_PX - 0.4 * CELL_PX,
                  width: CELL_PX,
                  height: 1.4 * CELL_PX,
                  zIndex: avatarPos.y * 10 + 1,
                }}
                aria-label="Votre avatar"
              >
                🚶
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
}
