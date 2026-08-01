// src/features/layout-editor/components/LayoutEditor.jsx
// Mode édition du plan : tracé de pièces par rectangle, déplacement de
// pièces existantes, redimensionnement depuis les coins, un outil de
// placement manuel de porte, et un Inspecteur de Pièce (type, nom,
// surface) — sur une grille neutre, sans meubles, sans texture de sol
// par pièce, sans murs 3D. Murs/portes ne sont jamais dessinés ici :
// dérivés automatiquement au moment d'enregistrer, via
// generateFloorTiles (features/layout-editor/utils/layoutGeneration.js).
//
// Interaction en Pointer Events partout (pas mousedown/touchstart
// séparés) : un seul modèle unifié souris/tactile.
//
// Gestes distincts sur une pièce existante, routés via un minuteur
// d'appui long partagé (longPressTimerRef) :
//   - Relâchement AVANT 500ms (le minuteur est encore en attente) ->
//     tap rapide -> SÉLECTIONNE la pièce (affiche ses 4 poignées de
//     redimensionnement aux coins).
//   - Le minuteur se déclenche (500ms tenus) -> démarre un déplacement ;
//     le relâchement final est alors géré par la grille (le pointeur a
//     été capturé dessus), pas par la pièce elle-même.
//   - Poignée ✢ : démarre un déplacement immédiatement, pas de tap
//     possible dessus (uniquement pour glisser).
//   - Nom/surface affichés sur la pièce : cible DÉDIÉE et DISTINCTE pour
//     ouvrir l'Inspecteur — son propre stopPropagation sur pointerDown
//     (pas seulement onClick) empêche le minuteur d'appui long du parent
//     de démarrer, puisque pointerdown/up précèdent click dans l'ordre
//     des événements.
//   - Poignées de redimensionnement (coins, visibles seulement pièce
//     sélectionnée) : démarrent un redimensionnement immédiatement,
//     comme la poignée de déplacement.
//
// COLLISION (voir la conversation) : le cadrillage pur pendant le
// glissé/redimensionnement (aucune attraction/aimantage vers les pièces
// voisines), MAIS une résolution anti-chevauchement s'applique au
// RELÂCHEMENT (resolveOverlap, src/features/layout-editor/utils/roomCollision.js)
// — deux pièces ne peuvent plus se retrouver superposées une fois le
// geste terminé. Taille minimale d'une pièce : 1×1 dalle (MIN_ROOM_SIZE).
// Redimensionnement vérifié par calcul avant intégration (les 4 coins,
// taille minimale respectée). Type/couleur/surface : src/data/roomTypes.js
// + computeRoomSurface (layoutGeneration.js).
//
// IMPORTANT — limite assumée (voir README) : ce composant ne connaît que
// des PIÈCES (rectangles) et des PORTES, jamais de meubles (retirés du
// MVP pour l'instant).
import { useState, useRef } from "react";
import RoomNameModal from "./RoomNameModal";
import RoomInspector from "./RoomInspector";
import { findDoorCandidates, edgeKey } from "../utils/layoutGeneration";
import { rectsOverlap, resolveOverlap } from "../utils/roomCollision";
import { findRoomType, DEFAULT_ROOM_TYPE } from "../roomTypes";
import { computeRoomSurface } from "../utils/layoutGeneration";
import "./LayoutEditor.css";

const CELL_PX = 28; // plus petit que dans FloorView3D : besoin de voir toute la grille de tracé à l'écran
const MIN_ROOM_SIZE = 1; // au moins 1x1 dalle, comme demandé
const DEFAULT_GRID_WIDTH = 20;
const DEFAULT_GRID_HEIGHT = 16;
const LONG_PRESS_MS = 500;
// Épaisseur du segment cliquable affiché sur une cloison pour une porte
// (candidat ou déjà placée) — voir le rendu en bas du fichier. Volontai-
// rement plus large que le simple trait mural (WallEdges.jsx, vue
// lecture seule) pour rester praticable au doigt malgré la finesse
// intrinsèque d'une arête (voir TO_DO.md : cible tactile encore petite,
// amélioration possible plus tard).
const DOOR_HIT_THICKNESS_PX = 16;

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x) + 1;
  const height = Math.abs(b.y - a.y) + 1;
  return { x, y, width, height };
}

/**
 * Calcule le nouveau rectangle d'une pièce en train d'être redimensionnée
 * depuis un coin (`handle` : "nw"|"ne"|"sw"|"se"). Le coin OPPOSÉ à celui
 * attrapé reste toujours fixe. Taille minimale (MIN_ROOM_SIZE) toujours
 * respectée. Vérifié par calcul avant intégration (voir la conversation)
 * : les 4 coins, y compris le plafonnement à la taille minimale quand on
 * pousse très loin dans le mauvais sens.
 */
function computeResizedRect(original, handle, pointerCell) {
  let { x, y, width, height } = original;
  const right = x + width;
  const bottom = y + height;

  if (handle.includes("w")) {
    const newX = Math.min(pointerCell.x, right - MIN_ROOM_SIZE);
    width = right - newX;
    x = newX;
  }
  if (handle.includes("e")) {
    width = Math.max(MIN_ROOM_SIZE, pointerCell.x - x + 1);
  }
  if (handle.includes("n")) {
    const newY = Math.min(pointerCell.y, bottom - MIN_ROOM_SIZE);
    height = bottom - newY;
    y = newY;
  }
  if (handle.includes("s")) {
    height = Math.max(MIN_ROOM_SIZE, pointerCell.y - y + 1);
  }
  return { ...original, x, y, width, height };
}

export default function LayoutEditor({
  existingRooms = [],
  existingDoors = [],
  floorName,
  onSave,
  saving = false,
  onCancel,
  onReset,
  onExport,
  onImport,
  importError,
  onDismissImportError,
}) {
  const [rooms, setRooms] = useState(existingRooms);
  const [doors, setDoors] = useState(existingDoors); // [{orientation: 'h'|'v', x, y}, ...] — voir layoutGeneration.js
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [pendingRect, setPendingRect] = useState(null);
  const [message, setMessage] = useState(null);
  const [doorToolActive, setDoorToolActive] = useState(false);
  const [inspectedRoomId, setInspectedRoomId] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null); // pièce "sélectionnée" -> affiche ses poignées de redimensionnement
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Déplacement d'une pièce existante.
  const [movingRoomId, setMovingRoomId] = useState(null);
  const [movePreviewRect, setMovePreviewRect] = useState(null);
  const moveStartRef = useRef(null); // { room, startCell }
  const longPressTimerRef = useRef(null);

  // Redimensionnement d'une pièce existante (depuis un coin).
  const [resizingRoomId, setResizingRoomId] = useState(null);
  const [resizePreviewRect, setResizePreviewRect] = useState(null);
  const resizeStartRef = useRef(null); // { room, handle }

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
    if (doorToolActive || pendingRect || movingRoomId || resizingRoomId) return; // outil porte actif, nommage en attente, ou déplacement/redimensionnement déjà en cours
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
    // SÉLECTIONNE la pièce (affiche ses poignées de redimensionnement).
    // Pour ouvrir l'Inspecteur, voir handleInfoClick (sur le nom/la
    // surface affichés, une cible distincte).
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      setSelectedRoomId((prev) => (prev === room.id ? null : room.id));
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

  // Cible dédiée pour ouvrir l'Inspecteur (le nom/la surface affichés sur
  // la pièce) — distincte du tap sur le reste de la pièce, qui sélectionne
  // pour le redimensionnement. `stopPropagation` sur pointerDown (pas
  // seulement onClick) : nécessaire pour empêcher le minuteur d'appui
  // long du parent de démarrer, puisque pointerdown/up précèdent click
  // dans l'ordre des événements — un stopPropagation posé seulement dans
  // onClick arriverait trop tard.
  const handleInfoPointerDown = (e) => {
    e.stopPropagation();
  };
  const handleInfoClick = (room, e) => {
    e.stopPropagation();
    setInspectedRoomId(room.id);
  };

  /* -------------------------------- Redimensionnement de pièce ------------------------- */

  const beginResize = (room, handle) => {
    resizeStartRef.current = { room, handle };
    setResizingRoomId(room.id);
    setResizePreviewRect(room);
  };

  const handleResizeHandlePointerDown = (room, handle, e) => {
    if (doorToolActive) return;
    e.stopPropagation();
    gridRef.current?.setPointerCapture?.(e.pointerId);
    beginResize(room, handle);
  };

  /* --------------------------------- Outil de porte ------------------------------------ */

  // Candidats = arêtes "wall-int" (cloisons entre deux pièces qui se
  // touchent réellement, gap=0) — voir layoutGeneration.js. Contrairement
  // à l'ancien modèle, deux pièces espacées n'offrent plus aucun candidat.
  const doorCandidates = doorToolActive ? findDoorCandidates(rooms) : [];

  const toggleDoor = (candidate) => {
    setDoors((prev) => {
      const key = edgeKey(candidate.orientation, candidate.x, candidate.y);
      const exists = prev.some((d) => edgeKey(d.orientation, d.x, d.y) === key);
      return exists
        ? prev.filter((d) => edgeKey(d.orientation, d.x, d.y) !== key)
        : [...prev, { orientation: candidate.orientation, x: candidate.x, y: candidate.y }];
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
    if (resizingRoomId && resizeStartRef.current) {
      const { room, handle } = resizeStartRef.current;
      setResizePreviewRect(computeResizedRect(room, handle, cell));
      return;
    }
    if (movingRoomId && moveStartRef.current) {
      // Pendant le glissé : cadrillage pur, aucune attraction vers les
      // pièces voisines — la pièce suit le décalage en cases entières
      // exactement. La résolution anti-chevauchement (resolveOverlap)
      // s'applique seulement au relâchement, dans handleGridPointerUp.
      const { room, startCell } = moveStartRef.current;
      const dx = cell.x - startCell.x;
      const dy = cell.y - startCell.y;
      setMovePreviewRect({ ...room, x: room.x + dx, y: room.y + dy });
      return;
    }
    if (dragStart) {
      setDragCurrent(cell);
    }
  };

  const handleGridPointerUp = () => {
    if (resizingRoomId) {
      // Résolution anti-chevauchement au relâchement seulement (pas
      // pendant le glissé — la pièce suit le pointeur exactement
      // jusque-là, cale-cadrillage pur).
      const others = rooms.filter((r) => r.id !== resizingRoomId);
      const resolved = resolveOverlap(resizePreviewRect, others);
      setRooms((prev) =>
        prev.map((r) =>
          r.id === resizingRoomId ? { ...r, x: resolved.x, y: resolved.y, width: resolved.width, height: resolved.height } : r
        )
      );
      setResizingRoomId(null);
      setResizePreviewRect(null);
      resizeStartRef.current = null;
      return;
    }

    if (movingRoomId) {
      // Idem : résolution anti-chevauchement uniquement au relâchement —
      // pas d'aimantage/attraction pendant le glissé (retiré à une
      // demande précédente, volontairement pas réintroduit).
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
    if (selectedRoomId === id) setSelectedRoomId(null);
  };

  const previewRect = dragStart && dragCurrent ? normalizeRect(dragStart, dragCurrent) : null;
  const activeDoorKeys = new Set(doors.map((d) => edgeKey(d.orientation, d.x, d.y)));

  return (
    <div className="layout-editor">
      <div className="layout-editor__header">
        <button type="button" className="layout-editor__cancel-btn" onClick={onCancel}>
          Annuler
        </button>
        <p className="layout-editor__hint">
          {doorToolActive
            ? "Touchez un mur en surbrillance pour ajouter ou retirer une porte."
            : `${floorName ? `Modifier : ${floorName}` : "Nouveau logement"} — touchez une pièce pour la sélectionner (redimensionner), touchez son nom pour la qualifier, glissez pour en tracer une nouvelle, appui long pour la déplacer.`}
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
            const isResizing = room.id === resizingRoomId;
            const displayRect = isResizing ? resizePreviewRect : isMoving ? movePreviewRect : room;
            const overlapping = (isMoving || isResizing) && rooms.some((r) => r.id !== room.id && rectsOverlap(displayRect, r));
            const roomType = findRoomType(room.type);
            const { surfaceM2 } = computeRoomSurface(displayRect);
            const isSelected = room.id === selectedRoomId;
            return (
              <div
                key={room.id}
                className={`layout-editor__room${isMoving || isResizing ? " layout-editor__room--moving" : ""}${overlapping ? " layout-editor__room--invalid" : ""}`}
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
                <span
                  className="layout-editor__room-info"
                  onPointerDown={handleInfoPointerDown}
                  onClick={(e) => handleInfoClick(room, e)}
                >
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

                {isSelected && !isMoving && (
                  <>
                    {["nw", "ne", "sw", "se"].map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        className={`layout-editor__resize-handle layout-editor__resize-handle--${handle}`}
                        onPointerDown={(e) => handleResizeHandlePointerDown(room, handle, e)}
                        aria-label={`Redimensionner ${room.name}`}
                      />
                    ))}
                  </>
                )}
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
              const isActive = activeDoorKeys.has(c.key);
              const isHorizontal = c.orientation === "h";
              const style = isHorizontal
                ? {
                    left: c.x * CELL_PX,
                    top: c.y * CELL_PX - DOOR_HIT_THICKNESS_PX / 2,
                    width: CELL_PX,
                    height: DOOR_HIT_THICKNESS_PX,
                  }
                : {
                    left: c.x * CELL_PX - DOOR_HIT_THICKNESS_PX / 2,
                    top: c.y * CELL_PX,
                    width: DOOR_HIT_THICKNESS_PX,
                    height: CELL_PX,
                  };
              return (
                <button
                  type="button"
                  key={c.key}
                  className={
                    isActive
                      ? "layout-editor__door-candidate layout-editor__door-candidate--active"
                      : "layout-editor__door-candidate"
                  }
                  style={style}
                  onClick={() => toggleDoor(c)}
                  aria-label={isActive ? "Retirer cette porte" : "Ajouter une porte ici"}
                />
              );
            })}
        </div>
      </div>

      <button
        type="button"
        className="layout-editor__save-btn"
        onClick={() => onSave(rooms, doors)}
        disabled={rooms.length === 0 || saving}
      >
        {saving ? "Enregistrement..." : "Enregistrer le plan"}
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
