// src/features/layout-editor/components/PlanEditorView.jsx
// Mode édition du plan — REMPLACE LayoutEditor.jsx (03/08/2026, demande
// explicite de Paul, prototype ui_plan_editor_v0.3.0.html : l'ancienne
// UI était jugée "peu gracieuse et peu fonctionnelle"). Renommage
// complet façon "2.5D->3D"/"ApartmentSpatialMvp->HouseholdSpatialView"
// (voir la conversation) — même dossier (features/layout-editor/), même
// logique métier reprise et étendue, nouvelle présentation.
//
// CE QUI CHANGE PAR RAPPORT À LayoutEditor.jsx (décidé avec Paul avant
// d'écrire ce fichier) :
//   - Grille 20px (CELL_PX), au lieu de 28px — demande explicite,
//     alignement strict sur pas de 20px pour move/resize (déjà garanti
//     par construction : toutes les coordonnées sont en CASES entières,
//     CELL_PX ne fait que les traduire en pixels).
//   - Le CADENAS PAR PIÈCE disparaît, remplacé par un bouton "Ajuster"
//     (dock, global) : off (défaut) = tout est en lecture seule (nom +
//     surface) ; on = TOUTES les pièces et séparations deviennent
//     manipulables, taper une pièce la SÉLECTIONNE (poignées + pilule
//     contextuelle), une seule sélectionnée à la fois pour rester
//     lisible. Sortir d'"Ajuster" désélectionne et reverrouille tout.
//   - Sélecteur d'étage en DROPDOWN (au lieu d'une simple étiquette) —
//     switch réel vers un autre étage déjà enregistré SANS quitter
//     l'éditeur (`onSwitchFloor`, nouveau — confirmation si un brouillon
//     non vide serait perdu, même logique que "+ Ajouter un étage").
//     "+ Ajouter un étage"/"Supprimer cet étage" déplacés dans ce menu.
//   - Menu "..." : Exporter/Importer/Réinitialiser regroupés (étaient
//     une rangée de boutons toujours visible).
//   - Undo/Redo réels (pile d'historique) — n'existaient pas du tout
//     avant. Un `commit()` unique pousse un instantané {rooms, doors}
//     à chaque changement VALIDÉ (création/suppression/déplacement ou
//     redimensionnement au RELÂCHEMENT/renommage-type-couleur/
//     séparation) — jamais pendant un glissé en cours (aperçu seul).
//   - Séparation PORTE/FENÊTRE/PASSAGE RÉELLE, pas cosmétique (demande
//     explicite de Paul — voir layoutGeneration.js/WallEdges.jsx pour
//     le détail du modèle) : une fenêtre CONSERVE le mur (pas de
//     passage), une porte/un passage le RETIRENT. Popup à 3 choix
//     (outil "brosse" : on choisit un type, puis on tapote les
//     cloisons concernées, autant de fois qu'on veut, jusqu'à changer
//     d'outil ou fermer).
//   - Pilule contextuelle flottante (Modifier=ouvre RoomInspector.jsx
//     inchangé, Supprimer) au-dessus de la pièce sélectionnée —
//     remplace le petit "×" + le tap sur le nom de l'ancienne version.
//   - Bouton "Tâches" (dock) : pièce sélectionnée -> `onOpenRoomTasks`.
//
// CE QUI NE CHANGE PAS (repris tel quel de LayoutEditor.jsx, voir sa
// propre documentation historique pour le detail) :
//   - Modèle mur-arête (computeRoomEdges), résolution anti-chevauchement
//     UNIQUEMENT au relâchement (roomCollision.js), pas d'aimantage.
//   - RoomCreateModal.jsx (création : nom+type+couleur) et
//     RoomInspector.jsx (modification après coup) inchangés.
//   - Ajout/suppression d'étage restent des actions D'ÉDITION (déjà
//     déplacées ici le 02/08/2026), juste regroupées différemment dans
//     l'UI (dropdown plutôt que rangée de boutons).
import { useState, useRef } from "react";
import RoomCreateModal from "./RoomCreateModal";
import RoomInspector from "./RoomInspector";
import { findOpenableWallSegments, edgeKey, computeRoomEdges } from "../utils/layoutGeneration";
import { rectsOverlap, resolveOverlap } from "../utils/roomCollision";
import { findRoomType } from "../roomTypes";
import { computeRoomSurface } from "../utils/layoutGeneration";
import WallEdges from "./WallEdges";
import {
  XIcon,
  CheckIcon,
  PlusIcon,
  LayerGroupIcon,
  ChevronDownIcon,
  RotateLeftIcon,
  EllipsisVerticalIcon,
  FileExportIcon,
  FileImportIcon,
  PenIcon,
  TrashIcon,
  DoorOpenIcon,
  WindowIcon,
  EraserIcon,
  AdjustIcon,
  WallIcon,
  ChecklistIcon,
} from "../../../components/ui/Icons";
import "./PlanEditorView.css";

const CELL_PX = 20; // grille stricte 20px (demande explicite de Paul, prototype ui_plan_editor_v0.3.0.html)
const MIN_ROOM_SIZE = 1; // au moins 1x1 dalle
const DEFAULT_GRID_WIDTH = 20;
const DEFAULT_GRID_HEIGHT = 16;
const LONG_PRESS_MS = 500;
const DOOR_HIT_THICKNESS_PX = 16; // épaisseur cliquable d'un segment de séparation, plus large que le trait lui-même

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x) + 1;
  const height = Math.abs(b.y - a.y) + 1;
  return { x, y, width, height };
}

/** Coin OPPOSÉ à celui attrapé toujours fixe. Taille minimale garantie. */
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

const SEPARATION_TOOLS = [
  { type: "door", label: "Ajouter une porte", Icon: DoorOpenIcon, tone: "amber" },
  { type: "window", label: "Ajouter une fenêtre", Icon: WindowIcon, tone: "sky" },
  { type: "passage", label: "Retirer un mur / Passage libre", Icon: EraserIcon, tone: "rose" },
];

export default function PlanEditorView({
  existingRooms = [],
  existingDoors = [],
  floorName,
  floors = [],
  currentFloorId,
  onSave,
  saving = false,
  onCancel,
  onAddFloor,
  onDeleteFloor,
  onSwitchFloor,
  onExport,
  onImport,
  importError,
  onDismissImportError,
  onOpenRoomTasks,
}) {
  const [rooms, setRooms] = useState(existingRooms);
  const [doors, setDoors] = useState(existingDoors); // [{orientation, x, y, type?}, ...] — voir layoutGeneration.js

  // Historique undo/redo (03/08/2026, nouveau) — un instantané par
  // changement VALIDÉ (jamais pendant un glissé en cours). `commit`
  // ci-dessous est le SEUL point d'entrée qui doit toucher rooms/doors
  // en dehors des aperçus de glissé.
  const [history, setHistory] = useState([{ rooms: existingRooms, doors: existingDoors }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  function commit(nextRooms, nextDoors) {
    setRooms(nextRooms);
    setDoors(nextDoors);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), { rooms: nextRooms, doors: nextDoors }]);
    setHistoryIndex((i) => i + 1);
  }

  function resetHistory(nextRooms, nextDoors) {
    setRooms(nextRooms);
    setDoors(nextDoors);
    setHistory([{ rooms: nextRooms, doors: nextDoors }]);
    setHistoryIndex(0);
  }

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  function undo() {
    if (!canUndo) return;
    const snap = history[historyIndex - 1];
    setRooms(snap.rooms);
    setDoors(snap.doors);
    setHistoryIndex((i) => i - 1);
    setSelectedRoomId(null);
  }
  function redo() {
    if (!canRedo) return;
    const snap = history[historyIndex + 1];
    setRooms(snap.rooms);
    setDoors(snap.doors);
    setHistoryIndex((i) => i + 1);
    setSelectedRoomId(null);
  }

  // "Ajuster" (03/08/2026, remplace le cadenas par pièce, demande
  // explicite de Paul) : off = tout en lecture seule ; on = tape une
  // pièce pour la sélectionner (poignées + pilule), tape une cloison
  // (avec un outil Séparation choisi) pour la modifier. Sortir
  // désélectionne et referme les outils.
  const [editMode, setEditMode] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [pendingRect, setPendingRect] = useState(null);
  const [message, setMessage] = useState(null);
  const [inspectedRoomId, setInspectedRoomId] = useState(null);

  const [separationMode, setSeparationMode] = useState(null); // null | 'door' | 'window' | 'passage'
  const [separationMenuOpen, setSeparationMenuOpen] = useState(false);
  const [floorMenuOpen, setFloorMenuOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [addFloorConfirmOpen, setAddFloorConfirmOpen] = useState(false);
  const [deleteFloorConfirmOpen, setDeleteFloorConfirmOpen] = useState(false);
  const [switchFloorTarget, setSwitchFloorTarget] = useState(null); // floorId en attente de confirmation

  const toggleEditMode = () => {
    setEditMode((v) => !v);
    setSelectedRoomId(null);
    setSeparationMode(null);
    setSeparationMenuOpen(false);
  };

  /* --------------------------- Réinitialiser / étages --------------------------- */

  const handleConfirmReset = () => {
    setResetConfirmOpen(false);
    resetHistory([], []);
    setSelectedRoomId(null);
    setEditMode(false);
    setSeparationMode(null);
    setPendingRect(null);
    setDragStart(null);
    setDragCurrent(null);
    setMovingRoomId(null);
    setMovePreviewRect(null);
    setResizingRoomId(null);
    setResizePreviewRect(null);
    setMessage(null);
  };

  const handleRequestAddFloor = () => {
    setFloorMenuOpen(false);
    if (rooms.length > 0) {
      setAddFloorConfirmOpen(true);
    } else {
      handleConfirmAddFloor();
    }
  };
  const handleConfirmAddFloor = () => {
    setAddFloorConfirmOpen(false);
    resetHistory([], []);
    setSelectedRoomId(null);
    setEditMode(false);
    onAddFloor?.();
  };

  const handleConfirmDeleteFloor = () => {
    setDeleteFloorConfirmOpen(false);
    onDeleteFloor?.();
  };

  // Changer d'étage SANS quitter l'éditeur (nouveau, 03/08/2026) — même
  // prudence que "+ Ajouter un étage" : confirmation si un brouillon non
  // vide serait perdu (le parent recharge les pièces/portes du nouvel
  // étage, l'état local ici doit repartir de zéro pour ne pas les
  // mélanger avec l'ancien brouillon).
  const handleRequestSwitchFloor = (floorId) => {
    setFloorMenuOpen(false);
    if (floorId === currentFloorId) return;
    if (rooms.length > 0) {
      setSwitchFloorTarget(floorId);
    } else {
      onSwitchFloor?.(floorId);
    }
  };
  const handleConfirmSwitchFloor = () => {
    const floorId = switchFloorTarget;
    setSwitchFloorTarget(null);
    onSwitchFloor?.(floorId);
  };

  /* ------------------------------ Déplacement / redimensionnement ------------------------------ */

  const [movingRoomId, setMovingRoomId] = useState(null);
  const [movePreviewRect, setMovePreviewRect] = useState(null);
  const moveStartRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const [resizingRoomId, setResizingRoomId] = useState(null);
  const [resizePreviewRect, setResizePreviewRect] = useState(null);
  const resizeStartRef = useRef(null);

  const gridRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImport?.(file);
    e.target.value = "";
  };

  const gridWidth = Math.max(DEFAULT_GRID_WIDTH, ...rooms.map((r) => r.x + r.width + 2), 0) || DEFAULT_GRID_WIDTH;
  const gridHeight = Math.max(DEFAULT_GRID_HEIGHT, ...rooms.map((r) => r.y + r.height + 2), 0) || DEFAULT_GRID_HEIGHT;

  const cellFromPointer = (e) => {
    const rect = gridRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_PX);
    const y = Math.floor((e.clientY - rect.top) / CELL_PX);
    return { x: Math.max(0, Math.min(gridWidth - 1, x)), y: Math.max(0, Math.min(gridHeight - 1, y)) };
  };

  /* ------------------------------ Tracé (nouvelle pièce) ------------------------------ */

  const handleGridPointerDown = (e) => {
    if (separationMode || pendingRect || movingRoomId || resizingRoomId) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const cell = cellFromPointer(e);
    setDragStart(cell);
    setDragCurrent(cell);
    setMessage(null);
    setSelectedRoomId(null);
  };

  /* -------------------------------- Sélection / déplacement de pièce ------------------------ */

  const beginMove = (room, startCell) => {
    moveStartRef.current = { room, startCell };
    setMovingRoomId(room.id);
    setMovePreviewRect(room);
  };

  const handleRoomPointerDown = (room, e) => {
    if (separationMode) return; // en mode séparation, les pièces ne se sélectionnent/déplacent pas
    e.stopPropagation();
    if (!editMode) return; // lecture seule tant qu'"Ajuster" n'est pas activé
    if (room.id !== selectedRoomId) {
      setSelectedRoomId(room.id); // simple tap : sélectionne cette pièce (pas de déplacement)
      return;
    }
    // Déjà sélectionnée : un appui long démarre un déplacement (même
    // minuteur partagé que l'ancien modèle, pour ne pas confondre un
    // tap avec un glissé).
    const startCell = cellFromPointer(e);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      gridRef.current?.setPointerCapture?.(e.pointerId);
      beginMove(room, startCell);
    }, LONG_PRESS_MS);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleResizeHandlePointerDown = (room, handle, e) => {
    if (separationMode) return;
    e.stopPropagation();
    gridRef.current?.setPointerCapture?.(e.pointerId);
    resizeStartRef.current = { room, handle };
    setResizingRoomId(room.id);
    setResizePreviewRect(room);
  };

  /* ----------------------------- Pilule contextuelle (Modifier / Supprimer) ------------------------- */

  const handleOpenInspector = (e) => {
    e.stopPropagation();
    setInspectedRoomId(selectedRoomId);
  };

  const handleDeleteSelectedRoom = (e) => {
    e.stopPropagation();
    if (!selectedRoomId) return;
    const nextRooms = rooms.filter((r) => r.id !== selectedRoomId);
    commit(nextRooms, doors);
    setSelectedRoomId(null);
    if (inspectedRoomId === selectedRoomId) setInspectedRoomId(null);
  };

  /* -------------------------------- Inspecteur de pièce (Modifier) --------------------------------- */

  const inspectedRoom = rooms.find((r) => r.id === inspectedRoomId) || null;

  const handleUpdateRoomName = (name) => {
    commit(rooms.map((r) => (r.id === inspectedRoomId ? { ...r, name } : r)), doors);
  };
  const handleUpdateRoomType = (type) => {
    const roomType = findRoomType(type);
    commit(rooms.map((r) => (r.id === inspectedRoomId ? { ...r, type, icon: roomType.icon, name: roomType.label } : r)), doors);
  };
  const handleUpdateRoomColor = (color) => {
    commit(rooms.map((r) => (r.id === inspectedRoomId ? { ...r, color } : r)), doors);
  };

  /* ----------------------------- Outil Séparation (porte/fenêtre/passage) ------------------- */

  // Tous les segments togglables (murs pleins ET séparations déjà
  // posées, pour pouvoir les changer/retirer) — voir layoutGeneration.js.
  const separationSegments = separationMode ? findOpenableWallSegments(rooms, doors) : [];

  const applySeparation = (candidate) => {
    const k = edgeKey(candidate.orientation, candidate.x, candidate.y);
    const alreadyThisType = candidate.kind === separationMode;
    const withoutThis = doors.filter((d) => edgeKey(d.orientation, d.x, d.y) !== k);
    const nextDoors = alreadyThisType
      ? withoutThis // déjà ce type -> on retire, redevient un mur plein
      : [...withoutThis, { orientation: candidate.orientation, x: candidate.x, y: candidate.y, type: separationMode }];
    commit(rooms, nextDoors);
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
      const { room, startCell } = moveStartRef.current;
      const dx = cell.x - startCell.x;
      const dy = cell.y - startCell.y;
      setMovePreviewRect({ ...room, x: room.x + dx, y: room.y + dy });
      return;
    }
    if (dragStart) setDragCurrent(cell);
  };

  const handleGridPointerUp = () => {
    if (resizingRoomId) {
      const others = rooms.filter((r) => r.id !== resizingRoomId);
      const resolved = resolveOverlap(resizePreviewRect, others);
      commit(
        rooms.map((r) => (r.id === resizingRoomId ? { ...r, x: resolved.x, y: resolved.y, width: resolved.width, height: resolved.height } : r)),
        doors
      );
      setResizingRoomId(null);
      setResizePreviewRect(null);
      resizeStartRef.current = null;
      return;
    }
    if (movingRoomId) {
      const others = rooms.filter((r) => r.id !== movingRoomId);
      const resolved = resolveOverlap(movePreviewRect, others);
      commit(rooms.map((r) => (r.id === movingRoomId ? { ...r, x: resolved.x, y: resolved.y } : r)), doors);
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

  const handleNameSubmit = ({ name, type, icon, color }) => {
    const id = `room-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "piece"}-${Date.now()}`;
    const nextRooms = [...rooms, { ...pendingRect, id, name, type, icon, color }];
    commit(nextRooms, doors);
    setPendingRect(null);
    setSelectedRoomId(id); // prête à être repositionnée/redimensionnée immédiatement si besoin
    setEditMode(true);
  };
  const handleNameCancel = () => setPendingRect(null);

  const previewRect = dragStart && dragCurrent ? normalizeRect(dragStart, dragCurrent) : null;

  const displayRoomsForEdges = rooms.map((r) => {
    if (r.id === movingRoomId) return movePreviewRect;
    if (r.id === resizingRoomId) return resizePreviewRect;
    return r;
  });
  const liveEdges = computeRoomEdges(displayRoomsForEdges, doors);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  return (
    <div className="plan-editor-view">
      <header className="plan-editor-view__header">
        <button type="button" className="plan-editor-view__header-btn" onClick={onCancel}>
          <XIcon size={12} />
          <span>Annuler</span>
        </button>

        <div className="plan-editor-view__header-title">
          <h1>Éditeur de plan</h1>
          <p>Aligné sur grille 20px</p>
        </div>

        <button
          type="button"
          className="plan-editor-view__header-btn plan-editor-view__header-btn--primary"
          onClick={() => {
            setEditMode(false);
            setSelectedRoomId(null);
            onSave(rooms, doors);
          }}
          disabled={rooms.length === 0 || saving}
        >
          <CheckIcon size={12} />
          <span>{saving ? "..." : "Sauver"}</span>
        </button>
      </header>

      {(importError || message) && (
        <p className="plan-editor-view__message">
          {importError || message}{" "}
          {importError && (
            <button type="button" className="plan-editor-view__message-dismiss" onClick={onDismissImportError}>
              <XIcon size={10} />
            </button>
          )}
        </p>
      )}

      <div className="plan-editor-view__toolbar">
        {/* Sélecteur d'étage en dropdown */}
        <div className="plan-editor-view__menu-anchor">
          <button type="button" className="plan-editor-view__floor-btn" onClick={() => setFloorMenuOpen((v) => !v)}>
            <LayerGroupIcon size={11} />
            <span>{floorName || "Nouveau logement"}</span>
            <ChevronDownIcon size={10} />
          </button>
          {floorMenuOpen && (
            <>
              <div className="plan-editor-view__menu-backdrop" onClick={() => setFloorMenuOpen(false)} />
              <div className="plan-editor-view__menu">
                {floors.map((floor) => (
                  <button
                    key={floor.id}
                    type="button"
                    className={
                      floor.id === currentFloorId
                        ? "plan-editor-view__menu-item plan-editor-view__menu-item--active"
                        : "plan-editor-view__menu-item"
                    }
                    onClick={() => handleRequestSwitchFloor(floor.id)}
                  >
                    <span>{floor.name}</span>
                    {floor.id === currentFloorId && <CheckIcon size={10} />}
                  </button>
                ))}
                <div className="plan-editor-view__menu-divider" />
                <button type="button" className="plan-editor-view__menu-item plan-editor-view__menu-item--accent" onClick={handleRequestAddFloor}>
                  <PlusIcon size={10} />
                  <span>Ajouter un étage</span>
                </button>
                {onDeleteFloor && (
                  <button
                    type="button"
                    className="plan-editor-view__menu-item plan-editor-view__menu-item--danger"
                    onClick={() => {
                      setFloorMenuOpen(false);
                      setDeleteFloorConfirmOpen(true);
                    }}
                  >
                    <TrashIcon size={10} />
                    <span>Supprimer cet étage</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Undo / Redo, centrés */}
        <div className="plan-editor-view__history-controls">
          <button type="button" title="Annuler" className="plan-editor-view__history-btn" onClick={undo} disabled={!canUndo}>
            <RotateLeftIcon size={13} />
          </button>
          <div className="plan-editor-view__history-sep" />
          <button type="button" title="Rétablir" className="plan-editor-view__history-btn" onClick={redo} disabled={!canRedo}>
            <RotateLeftIcon size={13} className="plan-editor-view__history-btn-icon--flip" />
          </button>
        </div>

        {/* Menu options : export/import/réinitialiser */}
        <div className="plan-editor-view__menu-anchor">
          <button type="button" className="plan-editor-view__icon-btn" onClick={() => setOptionsMenuOpen((v) => !v)} aria-label="Options">
            <EllipsisVerticalIcon size={14} />
          </button>
          {optionsMenuOpen && (
            <>
              <div className="plan-editor-view__menu-backdrop" onClick={() => setOptionsMenuOpen(false)} />
              <div className="plan-editor-view__menu plan-editor-view__menu--right">
                <button
                  type="button"
                  className="plan-editor-view__menu-item"
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    onExport?.();
                  }}
                >
                  <FileExportIcon size={12} />
                  <span>Exporter (.json)</span>
                </button>
                <button
                  type="button"
                  className="plan-editor-view__menu-item"
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <FileImportIcon size={12} />
                  <span>Importer un plan</span>
                </button>
                <input ref={fileInputRef} type="file" accept=".json" className="plan-editor-view__file-input" onChange={handleImportFileChange} />
                <div className="plan-editor-view__menu-divider" />
                <button
                  type="button"
                  className="plan-editor-view__menu-item plan-editor-view__menu-item--danger"
                  onClick={() => {
                    setOptionsMenuOpen(false);
                    setResetConfirmOpen(true);
                  }}
                >
                  <TrashIcon size={12} />
                  <span>Réinitialiser le plan</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="plan-editor-view__canvas-wrap">
        <div
          ref={gridRef}
          className="plan-editor-view__grid"
          style={{ width: gridWidth * CELL_PX, height: gridHeight * CELL_PX, backgroundSize: `${CELL_PX}px ${CELL_PX}px` }}
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
            const isSelected = editMode && room.id === selectedRoomId;
            return (
              <div
                key={room.id}
                className={`plan-editor-view__room${isMoving || isResizing ? " plan-editor-view__room--moving" : ""}${overlapping ? " plan-editor-view__room--invalid" : ""}${isSelected ? " plan-editor-view__room--selected" : ""}`}
                style={{
                  left: displayRect.x * CELL_PX,
                  top: displayRect.y * CELL_PX,
                  width: displayRect.width * CELL_PX,
                  height: displayRect.height * CELL_PX,
                  background: room.color,
                }}
                onPointerDown={(e) => handleRoomPointerDown(room, e)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
              >
                {isSelected && (
                  <div className="plan-editor-view__pill" onPointerDown={(e) => e.stopPropagation()}>
                    <button type="button" title="Modifier" className="plan-editor-view__pill-btn" onClick={handleOpenInspector}>
                      <PenIcon size={10} />
                    </button>
                    <span className="plan-editor-view__pill-label">
                      {roomType.icon} {room.name} · {surfaceM2} m²
                    </span>
                    <button type="button" title="Supprimer" className="plan-editor-view__pill-btn plan-editor-view__pill-btn--danger" onClick={handleDeleteSelectedRoom}>
                      <TrashIcon size={10} />
                    </button>
                  </div>
                )}

                {!isSelected && (
                  <span className="plan-editor-view__room-info">
                    <span className="plan-editor-view__room-name">
                      {roomType.icon} {room.name}
                    </span>
                    <span className="plan-editor-view__room-surface">
                      {surfaceM2} m² ({displayRect.width}×{displayRect.height})
                    </span>
                  </span>
                )}

                {isSelected &&
                  !isMoving &&
                  ["nw", "ne", "sw", "se"].map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      className={`plan-editor-view__resize-handle plan-editor-view__resize-handle--${handle}`}
                      onPointerDown={(e) => handleResizeHandlePointerDown(room, handle, e)}
                      aria-label={`Redimensionner ${room.name}`}
                    />
                  ))}
              </div>
            );
          })}

          <WallEdges edges={liveEdges} cellPx={CELL_PX} width={gridWidth * CELL_PX} height={gridHeight * CELL_PX} wallThickness={3} />

          {previewRect && (
            <div
              className="plan-editor-view__preview"
              style={{
                left: previewRect.x * CELL_PX,
                top: previewRect.y * CELL_PX,
                width: previewRect.width * CELL_PX,
                height: previewRect.height * CELL_PX,
              }}
            />
          )}

          {separationMode &&
            separationSegments.map((seg) => {
              const isThisType = seg.kind === separationMode;
              const isHorizontal = seg.orientation === "h";
              const style = isHorizontal
                ? { left: seg.x * CELL_PX, top: seg.y * CELL_PX - DOOR_HIT_THICKNESS_PX / 2, width: CELL_PX, height: DOOR_HIT_THICKNESS_PX }
                : { left: seg.x * CELL_PX - DOOR_HIT_THICKNESS_PX / 2, top: seg.y * CELL_PX, width: DOOR_HIT_THICKNESS_PX, height: CELL_PX };
              return (
                <button
                  type="button"
                  key={seg.key}
                  className={
                    isThisType ? "plan-editor-view__wall-segment plan-editor-view__wall-segment--active" : "plan-editor-view__wall-segment"
                  }
                  style={style}
                  onClick={() => applySeparation(seg)}
                  aria-label={isThisType ? "Retirer cette séparation" : `Poser : ${SEPARATION_TOOLS.find((t) => t.type === separationMode)?.label}`}
                />
              );
            })}
        </div>
      </div>

      {/* Dock d'outils inférieur */}
      <div className="plan-editor-view__dock">
        <button
          type="button"
          className="plan-editor-view__dock-btn plan-editor-view__dock-btn--accent"
          onClick={() => {
            setSeparationMode(null);
            setSeparationMenuOpen(false);
            setEditMode(true);
            setSelectedRoomId(null);
            setDragStart(null);
          }}
        >
          <PlusIcon size={16} />
          <span>Pièce</span>
        </button>

        <div className="plan-editor-view__dock-item plan-editor-view__menu-anchor">
          <button
            type="button"
            className={separationMode ? "plan-editor-view__dock-btn plan-editor-view__dock-btn--active" : "plan-editor-view__dock-btn"}
            disabled={!editMode}
            onClick={() => {
              if (separationMode) {
                setSeparationMode(null); // ré-appui pendant qu'un outil est actif -> en sortir
              } else {
                setSeparationMenuOpen((v) => !v);
              }
            }}
          >
            <WallIcon size={16} />
            <span>Séparation</span>
          </button>
          {separationMenuOpen && (
            <>
              <div className="plan-editor-view__menu-backdrop" onClick={() => setSeparationMenuOpen(false)} />
              <div className="plan-editor-view__menu plan-editor-view__menu--up">
                {SEPARATION_TOOLS.map((tool) => (
                  <button
                    key={tool.type}
                    type="button"
                    className={`plan-editor-view__menu-item plan-editor-view__menu-item--${tool.tone}`}
                    onClick={() => {
                      setSeparationMode(tool.type);
                      setSeparationMenuOpen(false);
                    }}
                  >
                    <tool.Icon size={12} />
                    <span>{tool.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className={editMode ? "plan-editor-view__dock-btn plan-editor-view__dock-btn--active" : "plan-editor-view__dock-btn"}
          onClick={toggleEditMode}
        >
          <AdjustIcon size={16} />
          <span>Ajuster</span>
        </button>

        <button
          type="button"
          className="plan-editor-view__dock-btn"
          disabled={!selectedRoom}
          onClick={() => selectedRoom && onOpenRoomTasks?.(selectedRoom.id)}
        >
          <ChecklistIcon size={16} />
          <span>Tâches</span>
        </button>
      </div>

      {pendingRect && <RoomCreateModal onSubmit={handleNameSubmit} onCancel={handleNameCancel} />}
      {inspectedRoom && (
        <RoomInspector
          room={inspectedRoom}
          onUpdateName={handleUpdateRoomName}
          onUpdateType={handleUpdateRoomType}
          onUpdateColor={handleUpdateRoomColor}
          onClose={() => setInspectedRoomId(null)}
        />
      )}

      {resetConfirmOpen && (
        <>
          <div className="plan-editor-view__confirm-backdrop" onClick={() => setResetConfirmOpen(false)} />
          <div className="plan-editor-view__confirm" role="alertdialog" aria-modal="true" aria-label="Confirmer la réinitialisation">
            <p className="plan-editor-view__confirm-text">
              Réinitialiser efface toutes les pièces et séparations de CET étage (le brouillon affiché à l'écran) — les autres étages ne
              sont pas concernés, et rien n'est définitivement perdu côté serveur tant que tu ne cliques pas sur "Sauver" ensuite.
            </p>
            <div className="plan-editor-view__confirm-actions">
              <button type="button" className="plan-editor-view__confirm-danger-btn" onClick={handleConfirmReset}>
                Réinitialiser
              </button>
              <button type="button" className="plan-editor-view__confirm-cancel-btn" onClick={() => setResetConfirmOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}

      {addFloorConfirmOpen && (
        <>
          <div className="plan-editor-view__confirm-backdrop" onClick={() => setAddFloorConfirmOpen(false)} />
          <div className="plan-editor-view__confirm" role="alertdialog" aria-modal="true" aria-label="Confirmer l'ajout d'un étage">
            <p className="plan-editor-view__confirm-text">
              Passer à un nouvel étage efface le brouillon affiché à l'écran (pas encore sauvé) — clique "Sauver" d'abord si tu veux le
              garder.
            </p>
            <div className="plan-editor-view__confirm-actions">
              <button type="button" className="plan-editor-view__confirm-danger-btn" onClick={handleConfirmAddFloor}>
                Passer au nouvel étage
              </button>
              <button type="button" className="plan-editor-view__confirm-cancel-btn" onClick={() => setAddFloorConfirmOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}

      {switchFloorTarget && (
        <>
          <div className="plan-editor-view__confirm-backdrop" onClick={() => setSwitchFloorTarget(null)} />
          <div className="plan-editor-view__confirm" role="alertdialog" aria-modal="true" aria-label="Confirmer le changement d'étage">
            <p className="plan-editor-view__confirm-text">
              Changer d'étage efface le brouillon affiché à l'écran (pas encore sauvé) — clique "Sauver" d'abord si tu veux le garder.
            </p>
            <div className="plan-editor-view__confirm-actions">
              <button type="button" className="plan-editor-view__confirm-danger-btn" onClick={handleConfirmSwitchFloor}>
                Changer d'étage
              </button>
              <button type="button" className="plan-editor-view__confirm-cancel-btn" onClick={() => setSwitchFloorTarget(null)}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}

      {deleteFloorConfirmOpen && (
        <>
          <div className="plan-editor-view__confirm-backdrop" onClick={() => setDeleteFloorConfirmOpen(false)} />
          <div className="plan-editor-view__confirm" role="alertdialog" aria-modal="true" aria-label="Confirmer la suppression de l'étage">
            <p className="plan-editor-view__confirm-text">
              Supprimer "{floorName || "cet étage"}" efface définitivement ses pièces et séparations côté serveur — cette action ne peut
              pas être annulée. Les autres étages ne sont pas concernés.
            </p>
            <div className="plan-editor-view__confirm-actions">
              <button type="button" className="plan-editor-view__confirm-danger-btn" onClick={handleConfirmDeleteFloor}>
                Supprimer
              </button>
              <button type="button" className="plan-editor-view__confirm-cancel-btn" onClick={() => setDeleteFloorConfirmOpen(false)}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
