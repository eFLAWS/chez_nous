// src/components/spatial/LayoutEditor.jsx
// Mode édition du plan : tracé de pièces par rectangle, déplacement de
// pièces existantes (aimantage + résolution de collision), un outil de
// placement manuel de porte, et maintenant un Inspecteur de Pièce
// (type, nom, surface) — sur une grille neutre, sans meubles, sans
// texture de sol par pièce, sans murs 3D. Murs/portes ne sont jamais
// dessinés ici : dérivés automatiquement au moment d'enregistrer, via
// generateFloorTiles (services/layoutGeneration.js).
//
// Interaction en Pointer Events partout (pas mousedown/touchstart
// séparés) : un seul modèle unifié souris/tactile.
//
// Gestes distincts sur une pièce existante, routés via un minuteur
// d'appui long partagé (longPressTimerRef) :
//   - Relâchement AVANT 500ms (le minuteur est encore en attente) ->
//     tap rapide -> ouvre l'Inspecteur de Pièce.
//   - Le minuteur se déclenche (500ms tenus) -> démarre un déplacement ;
//     le relâchement final est alors géré par la grille (le pointeur a
//     été capturé dessus), pas par la pièce elle-même.
//   - Poignée ✢ : démarre un déplacement immédiatement, pas de tap
//     possible dessus (uniquement pour glisser).
//
// Aimantage/collision : src/services/roomCollision.js, vérifié par
// simulation avant intégration (un bug d'oscillation trouvé et corrigé
// à cette étape). Type/couleur/surface : src/data/roomTypes.js +
// computeRoomSurface (layoutGeneration.js).
//
// IMPORTANT — limite assumée (voir README) : ce composant ne connaît que
// des PIÈCES (rectangles) et des PORTES, jamais de meubles (retirés du
// MVP pour l'instant).
import { useState, useRef } from "react";
import RoomNameModal from "../forms/RoomNameModal";
import RoomInspector from "./RoomInspector";
import { findDoorCandidates } from "../../services/layoutGeneration";
import { applyMagneticSnap, resolveOverlap, rectsOverlap } from "../../services/roomCollision";
import { findRoomType, DEFAULT_ROOM_TYPE } from "../../data/roomTypes";
import { computeRoomSurface } from "../../services/layoutGeneration";
import "./LayoutEditor.css";

const CELL_PX = 28; // plus petit que dans FloorView2D : besoin de voir toute la grille de tracé à l'écran
const MIN_ROOM_SIZE = 2; // au moins 2x2 dalles, comme demandé
const DEFAULT_GRID_WIDTH = 20;
const DEFAULT_GRID_HEIGHT = 16;
const LONG_PRESS_MS = 500;

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x) + 1;
  const height = Math.abs(b.y - a.y) + 1;
  return { x, y, width, height };
}

function doorKey(x, y) {
  return `${x},${y}`;
}

export default function LayoutEditor({
  existingRooms = [],
  existingDoors = [],
  floorName,
  onSave,
  onCancel,
  onReset,
  onExport,
  onImport,
  importError,
  onDismissImportError,
}) {
  const [rooms, setRooms] = useState(existingRooms);
  const [doors, setDoors] = useState(existingDoors); // [{x, y}, ...]
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [pendingRect, setPendingRect] = useState(null);
  const [message, setMessage] = useState(null);
  const [doorToolActive, setDoorToolActive] = useState(false);
  const [inspectedRoomId, setInspectedRoomId] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Déplacement d'une pièce existante.
  const [movingRoomId, setMovingRoomId] = useState(null);
  const [movePreviewRect, setMovePreviewRect] = useState(null);
  const moveStartRef = useRef(null); // { room, startCell }
  const longPressTimerRef = useRef(null);

  const gridRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImport?.(file);
    e.target.value = ""; // permet de réimporter le même fichier deux fois de suite si besoin
  };

  // Bornes de la grille de tracé : au moins la taille par défaut, ou
  // assez grande pour englober les pièces déjà présentes (+ marge) si on
  // édite un étage existant.
  const gridWidth = Math.max(DEFAULT_GRID_WIDTH, ...rooms.map((r) => r.x + r.width + 2), 0) || DEFAULT_GRID_WIDTH;
  const gridHeight = Math.max(DEFAULT_GRID_HEIGHT, ...rooms.map((r) => r.y + r.height + 2), 0) || DEFAULT_GRID_HEIGHT;

  const cellFromPointer = (e) => {
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_PX);
    const y = Math.floor((e.clientY - rect.top) / CELL_PX);
    return {
      x: Math.max(0, Math.min(gridWidth - 1, x)),
      y: Math.max(0, Math.min(gridHeight - 1, y)),
    };
  };

  /* ------------------------------ Tracé (nouvelle pièce) ------------------------------ */

  const handleGridPointerDown = (e) => {
    if (doorToolActive || pendingRect || movingRoomId) return; // outil porte actif, nommage en attente, ou déplacement déjà en cours
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const cell = cellFromPointer(e);
    setDragStart(cell);
    setDragCurrent(cell);
    setMessage(null);
  };

  /* -------------------------------- Déplacement / tap de pièce ------------------------ */

  const beginMove = (room, startCell) => {
    moveStartRef.current = { room, startCell };
    setMovingRoomId(room.id);
    setMovePreviewRect(room);
  };

  const handleRoomPointerDown = (room, e) => {
    if (doorToolActive) return; // en mode porte, les pièces ne se déplacent/inspectent pas
    e.stopPropagation(); // empêche le tracé d'une nouvelle pièce sur la grille en dessous
    const startCell = cellFromPointer(e);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      gridRef.current?.setPointerCapture?.(e.pointerId);
      beginMove(room, startCell);
    }, LONG_PRESS_MS);
  };

  const handleRoomPointerUp = (room) => {
    // Le minuteur est encore en attente (n'a pas eu le temps de se
    // déclencher) -> relâchement rapide -> tap, pas un appui long ->
    // ouvre l'Inspecteur. S'il s'était déjà déclenché, il aurait mis
    // cette ref à null lui-même (voir handleRoomPointerDown) et la
    // grille gère alors le relâchement (déplacement en cours).
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setInspectedRoomId(room.id);
    }
  };

  const handleRoomPointerLeave = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleHandlePointerDown = (room, e) => {
    if (doorToolActive) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gridRef.current?.setPointerCapture?.(e.pointerId);
    beginMove(room, cellFromPointer(e));
  };

  /* --------------------------------- Outil de porte ------------------------------------ */

  const doorCandidates = doorToolActive ? findDoorCandidates(rooms) : [];

  const toggleDoor = (candidate) => {
    setDoors((prev) => {
      const key = doorKey(candidate.x, candidate.y);
      const exists = prev.some((d) => doorKey(d.x, d.y) === key);
      return exists ? prev.filter((d) => doorKey(d.x, d.y) !== key) : [...prev, { x: candidate.x, y: candidate.y }];
    });
  };

  /* -------------------------------- Inspecteur de pièce --------------------------------- */

  const inspectedRoom = rooms.find((r) => r.id === inspectedRoomId) || null;

  const handleUpdateRoomName = (name) => {
    setRooms((prev) => prev.map((r) => (r.id === inspectedRoomId ? { ...r, name } : r)));
  };

  const handleUpdateRoomType = (type) => {
    const roomType = findRoomType(type);
    setRooms((prev) =>
      prev.map((r) => (r.id === inspectedRoomId ? { ...r, type, icon: roomType.icon, color: roomType.color, name: roomType.label } : r))
    );
  };

  /* --------------------------- Gestes partagés sur la grille --------------------------- */

  const handleGridPointerMove = (e) => {
    const cell = cellFromPointer(e);
    if (movingRoomId && moveStartRef.current) {
      const { room, startCell } = moveStartRef.current;
      const dx = cell.x - startCell.x;
      const dy = cell.y - startCell.y;
      const others = rooms.filter((r) => r.id !== movingRoomId);
      const candidate = applyMagneticSnap({ ...room, x: room.x + dx, y: room.y + dy }, others);
      setMovePreviewRect(candidate);
      return;
    }
    if (dragStart) {
      setDragCurrent(cell);
    }
  };

  const handleGridPointerUp = () => {
    if (movingRoomId) {
      const others = rooms.filter((r) => r.id !== movingRoomId);
      const resolved = resolveOverlap(movePreviewRect, others);
      setRooms((prev) => prev.map((r) => (r.id === movingRoomId ? { ...r, x: resolved.x, y: resolved.y } : r)));
      setMovingRoomId(null);
      setMovePreviewRect(null);
      moveStartRef.current = null;
      return;
    }

    if (!dragStart || !dragCurrent) return;
    const rect = normalizeRect(dragStart, dragCurrent);
    setDragStart(null);
    setDragCurrent(null);

    if (rect.width < MIN_ROOM_SIZE || rect.height < MIN_ROOM_SIZE) {
      setMessage(`Une pièce doit faire au moins ${MIN_ROOM_SIZE}×${MIN_ROOM_SIZE} dalles.`);
      return;
    }
    if (rooms.some((r) => rectsOverlap(r, rect))) {
      setMessage("Cette zone chevauche une pièce déjà tracée.");
      return;
    }
    setPendingRect(rect);
  };

  const handleNameSubmit = (name) => {
    const defaultType = findRoomType(DEFAULT_ROOM_TYPE);
    const id = `room-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "piece"}-${Date.now()}`;
    setRooms((prev) => [...prev, { ...pendingRect, id, name, type: defaultType.value, icon: defaultType.icon, color: defaultType.color }]);
    setPendingRect(null);
  };

  const handleNameCancel = () => {
    setPendingRect(null);
  };

  const removeRoom = (id) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    if (inspectedRoomId === id) setInspectedRoomId(null);
  };

  const previewRect = dragStart && dragCurrent ? normalizeRect(dragStart, dragCurrent) : null;
  const activeDoorKeys = new Set(doors.map((d) => doorKey(d.x, d.y)));

  return (
    <div className="layout-editor">
      <div className="layout-editor__header">
        <button type="button" className="layout-editor__cancel-btn" onClick={onCancel}>
          Annuler
        </button>
        <p className="layout-editor__hint">
          {doorToolActive
            ? "Touchez un mur en surbrillance pour ajouter ou retirer une porte."
            : `${floorName ? `Modifier : ${floorName}` : "Nouveau logement"} — touchez une pièce pour la qualifier, glissez pour en tracer une nouvelle, appui long pour la déplacer.`}
        </p>
        <button
          type="button"
          className={doorToolActive ? "layout-editor__door-tool layout-editor__door-tool--active" : "layout-editor__door-tool"}
          onClick={() => setDoorToolActive((v) => !v)}
        >
          🚪 Ajouter une porte
        </button>

        <div className="layout-editor__toolbar-row">
          <button type="button" className="layout-editor__toolbar-btn" onClick={onExport}>
            📥 Exporter (.json)
          </button>
          <button type="button" className="layout-editor__toolbar-btn" onClick={() => fileInputRef.current?.click()}>
            📤 Importer un plan
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="layout-editor__file-input"
            onChange={handleImportFileChange}
          />
          <button type="button" className="layout-editor__toolbar-btn layout-editor__toolbar-btn--danger" onClick={() => setResetConfirmOpen(true)}>
            🗑️ Réinitialiser le plan
          </button>
        </div>
      </div>

      {importError && (
        <p className="layout-editor__message">
          {importError}{" "}
          <button type="button" className="layout-editor__message-dismiss" onClick={onDismissImportError}>
            ✕
          </button>
        </p>
      )}

      {message && <p className="layout-editor__message">{message}</p>}

      <div className="layout-editor__scroll">
        <div
          ref={gridRef}
          className="layout-editor__grid"
          style={{
            width: gridWidth * CELL_PX,
            height: gridHeight * CELL_PX,
            backgroundSize: `${CELL_PX}px ${CELL_PX}px`,
          }}
          onPointerDown={handleGridPointerDown}
          onPointerMove={handleGridPointerMove}
          onPointerUp={handleGridPointerUp}
          onPointerCancel={handleGridPointerUp}
        >
          {rooms.map((room) => {
            const isMoving = room.id === movingRoomId;
            const displayRect = isMoving ? movePreviewRect : room;
            const overlapping = isMoving && rooms.some((r) => r.id !== room.id && rectsOverlap(displayRect, r));
            const roomType = findRoomType(room.type);
            const { surfaceM2 } = computeRoomSurface(room);
            return (
              <div
                key={room.id}
                className={`layout-editor__room${isMoving ? " layout-editor__room--moving" : ""}${overlapping ? " layout-editor__room--invalid" : ""}`}
                style={{
                  left: displayRect.x * CELL_PX,
                  top: displayRect.y * CELL_PX,
                  width: displayRect.width * CELL_PX,
                  height: displayRect.height * CELL_PX,
                  background: room.color,
                }}
                onPointerDown={(e) => handleRoomPointerDown(room, e)}
                onPointerUp={() => handleRoomPointerUp(room)}
                onPointerLeave={handleRoomPointerLeave}
              >
                <span className="layout-editor__room-info">
                  <span className="layout-editor__room-name">
                    {roomType.icon} {room.name}
                  </span>
                  <span className="layout-editor__room-surface">{surfaceM2} m²</span>
                </span>
                <button
                  type="button"
                  className="layout-editor__room-handle"
                  onPointerDown={(e) => handleHandlePointerDown(room, e)}
                  aria-label={`Déplacer ${room.name}`}
                >
                  ✢
                </button>
                <button
                  type="button"
                  className="layout-editor__room-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRoom(room.id);
                  }}
                  aria-label={`Supprimer ${room.name}`}
                >
                  ×
                </button>
              </div>
            );
          })}

          {previewRect && (
            <div
              className="layout-editor__preview"
              style={{
                left: previewRect.x * CELL_PX,
                top: previewRect.y * CELL_PX,
                width: previewRect.width * CELL_PX,
                height: previewRect.height * CELL_PX,
              }}
            />
          )}

          {doorToolActive &&
            doorCandidates.map((c) => {
              const isActive = activeDoorKeys.has(doorKey(c.x, c.y));
              return (
                <button
                  type="button"
                  key={`door-${c.x}-${c.y}`}
                  className={isActive ? "layout-editor__door-candidate layout-editor__door-candidate--active" : "layout-editor__door-candidate"}
                  style={{ left: c.x * CELL_PX, top: c.y * CELL_PX, width: CELL_PX, height: CELL_PX }}
                  onClick={() => toggleDoor(c)}
                  aria-label={isActive ? "Retirer cette porte" : "Ajouter une porte ici"}
                >
                  🚪
                </button>
              );
            })}
        </div>
      </div>

      <button
        type="button"
        className="layout-editor__save-btn"
        onClick={() => onSave(rooms, doors)}
        disabled={rooms.length === 0}
      >
        Enregistrer le plan
      </button>

      {pendingRect && <RoomNameModal onSubmit={handleNameSubmit} onCancel={handleNameCancel} />}
      {inspectedRoom && (
        <RoomInspector
          room={inspectedRoom}
          onUpdateName={handleUpdateRoomName}
          onUpdateType={handleUpdateRoomType}
          onClose={() => setInspectedRoomId(null)}
        />
      )}

      {resetConfirmOpen && (
        <>
          <div className="layout-editor__confirm-backdrop" onClick={() => setResetConfirmOpen(false)} />
          <div className="layout-editor__confirm" role="alertdialog" aria-modal="true" aria-label="Confirmer la réinitialisation">
            <p className="layout-editor__confirm-text">
              Réinitialiser efface tout le plan actuel (pièces, portes) — cette action ne peut pas être annulée.
            </p>
            <div className="layout-editor__confirm-actions">
              <button
                type="button"
                className="layout-editor__confirm-danger-btn"
                onClick={() => {
                  setResetConfirmOpen(false);
                  onReset?.();
                }}
              >
                Réinitialiser
              </button>
              <button type="button" className="layout-editor__confirm-cancel-btn" onClick={() => setResetConfirmOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
