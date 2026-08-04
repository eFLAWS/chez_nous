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
// CORRECTIONS APRÈS PREMIER TEST RÉEL (03/08/2026, retour de Paul) :
//   - "Ajuster" et "Pièce" sont désormais deux OUTILS EXCLUSIFS
//     (`activeTool: null|'adjust'|'piece'`, remplace le booléen
//     `editMode` + un tracé toujours possible en arrière-plan) :
//     "Ajuster" bloque maintenant le tracé d'une nouvelle pièce (avant,
//     dessiner restait possible même en Ajuster — source de gestes
//     accidentels) ; "Pièce" est un vrai toggle (avant, cliquer dessus
//     ne faisait qu'activer `editMode`, sans état "actif" propre).
//   - Zoom (+ / − / reset), sur `effectiveCellPx` (= CELL_PX × zoomScale)
//     plutôt qu'un `transform: scale()` CSS — reste fiable avec le
//     défilement natif `overflow: auto` du conteneur.
//   - `touch-action` dynamique sur la grille et les pièces : le pan
//     tactile natif du plan est désormais possible dès que "Pièce"
//     n'est PAS l'outil actif (avant, `touch-action: none` était posé
//     en dur sur la grille, bloquant tout pan tactile en permanence —
//     Paul butait contre les bords du conteneur en ajoutant des pièces).
//     Une pièce ne bloque le pan que pendant "Ajuster" (rôle actif :
//     sélection/glisser) ; en lecture seule ou en "Pièce", elle laisse
//     passer le geste de pan.
//
// 2E ROUND DE CORRECTIONS (même jour, 2e test réel de Paul) :
//   - "Séparation" devient un 4e outil AUTONOME (`activeTool` peut
//     valoir `'separation'`) — ne dépendait plus à raison de "Ajuster"
//     (erreur du 1er jet : Paul avait initialement demandé qu'"Ajuster"
//     déverrouille "pièces ET séparations" ensemble, mais à l'usage ça
//     n'avait pas de sens — Séparation est un outil de nature différente
//     de la sélection/déplacement de pièces).
//   - **Bug trouvé en relisant le CSS, pas juste supposé** : deux règles
//     `touch-action: none` STATIQUES étaient restées dans
//     `PlanEditorView.css` (`.plan-editor-view__grid` et `__room`),
//     écrites lors du premier jet puis jamais retirées quand le
//     `touch-action` dynamique a été ajouté en style inline — une
//     incohérence entre le CSS et le JSX, seul le second corrigé au
//     tour précédent. Retirées : `touch-action` est maintenant piloté
//     UNIQUEMENT par l'inline (une seule source de vérité).
//   - `.plan-editor-view__canvas-wrap` ne centre plus son contenu en
//     flex (`align-items`/`justify-content: center` retirés, remplacés
//     par un simple `padding`) — un conteneur flex centré + `overflow:
//     auto` a un comportement de défilement peu fiable selon les
//     navigateurs quand son contenu déborde (bug CSS documenté,
//     potentiellement responsable du pan encore bloqué malgré le
//     premier correctif touch-action).
//   - Quadrillage de fond rendu plus visible : opacité des traits
//     doublée (`rgba(255,255,255,0.07)` → `0.15`) — même ajustement que
//     l'ancien `LayoutEditor.css` avait déjà dû faire une fois (`0.12`
//     → `0.22`), un quadrillage d'éditeur a besoin d'être nettement
//     plus visible qu'un simple motif décoratif.
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

  // "Ajuster", "Pièce" et "Séparation" sont trois OUTILS EXCLUSIFS
  // (03/08/2026, deux retours de Paul après tests réels successifs —
  // corrige (1) "Pièce" qui n'était pas un vrai toggle et "Ajuster" qui
  // ne bloquait pas le tracé, puis (2) "Séparation" qui dépendait à tort
  // de "Ajuster" au lieu d'être son propre outil) : `activeTool` unique
  // plutôt que des booléens/dépendances indépendants.
  //   - null         : lecture seule — pièces en nom+surface, le geste
  //     tactile sur la grille PAN nativement (voir touch-action plus bas).
  //   - 'adjust'     : tape une pièce pour la sélectionner (poignées +
  //     pilule). Bloque le tracé d'une nouvelle pièce.
  //   - 'piece'      : glisser sur la grille trace une nouvelle pièce.
  //     Bloque la sélection/déplacement des pièces existantes.
  //   - 'separation' : tape une cloison pour poser/retirer une porte,
  //     fenêtre ou un passage — indépendant de "Ajuster", accessible
  //     directement (voir SEPARATION_TOOLS plus bas).
  // Activer l'un désactive les autres (jamais deux en même temps).
  const [activeTool, setActiveTool] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [pendingRect, setPendingRect] = useState(null);
  const [message, setMessage] = useState(null);
  const [inspectedRoomId, setInspectedRoomId] = useState(null);

  const [separationMode, setSeparationMode] = useState(null); // null | 'door' | 'window' | 'passage' — significatif quand activeTool === 'separation' (outil autonome depuis le 03/08/2026, ne dépend plus de 'adjust')
  const [separationMenuOpen, setSeparationMenuOpen] = useState(false);
  const [floorMenuOpen, setFloorMenuOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  // Zoom (03/08/2026, nouveau — Paul butait contre les bords du
  // conteneur en ajoutant des pièces). Applique un facteur sur la
  // taille de case EFFECTIVE (`effectiveCellPx` plus bas) plutôt qu'un
  // `transform: scale()` CSS — reste fiable avec le défilement natif
  // `overflow: auto` du conteneur (un transform CSS a un comportement
  // parfois incohérent avec scrollWidth/scrollHeight selon les
  // navigateurs, pas vérifiable ici sans accès réseau).
  const [zoomScale, setZoomScale] = useState(1);
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 2;
  const ZOOM_STEP = 0.25;
  const effectiveCellPx = CELL_PX * zoomScale;
  const zoomIn = () => setZoomScale((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100));
  const zoomOut = () => setZoomScale((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100));
  const zoomReset = () => setZoomScale(1);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [addFloorConfirmOpen, setAddFloorConfirmOpen] = useState(false);
  const [deleteFloorConfirmOpen, setDeleteFloorConfirmOpen] = useState(false);
  const [switchFloorTarget, setSwitchFloorTarget] = useState(null); // floorId en attente de confirmation

  // Bascule un outil : le retaper l'éteint (retour à null), en taper un
  // autre l'active et éteint automatiquement celui qui tournait avant
  // (jamais deux outils actifs en même temps). Nettoie les états
  // transitoires au passage pour ne jamais rester dans un demi-état.
  const handleToggleTool = (tool) => {
    setActiveTool((prev) => (prev === tool ? null : tool));
    setSelectedRoomId(null);
    setSeparationMode(null);
    setSeparationMenuOpen(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  /* --------------------------- Réinitialiser / étages --------------------------- */

  const handleConfirmReset = () => {
    setResetConfirmOpen(false);
    resetHistory([], []);
    setSelectedRoomId(null);
    setActiveTool(null);
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
    setActiveTool(null);
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
    const x = Math.floor((e.clientX - rect.left) / effectiveCellPx);
    const y = Math.floor((e.clientY - rect.top) / effectiveCellPx);
    return { x: Math.max(0, Math.min(gridWidth - 1, x)), y: Math.max(0, Math.min(gridHeight - 1, y)) };
  };

  /* ------------------------------ Tracé (nouvelle pièce) ------------------------------ */

  const handleGridPointerDown = (e) => {
    // Le tracé n'est possible QUE si l'outil "Pièce" est actif (03/08/2026,
    // retour de Paul : avant, on pouvait dessiner n'importe quand, y
    // compris pendant "Ajuster" — source de gestes accidentels).
    if (activeTool !== "piece" || pendingRect || movingRoomId || resizingRoomId) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const cell = cellFromPointer(e);
    setDragStart(cell);
    setDragCurrent(cell);
    setMessage(null);
  };

  /* -------------------------------- Sélection / déplacement de pièce ------------------------ */

  const beginMove = (room, startCell) => {
    moveStartRef.current = { room, startCell };
    setMovingRoomId(room.id);
    setMovePreviewRect(room);
  };

  const handleRoomPointerDown = (room, e) => {
    if (activeTool !== "adjust") return; // sélection/déplacement réservés à l'outil "Ajuster"
    e.stopPropagation();
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
    // Bascule sur "Ajuster" avec la pièce fraîchement créée déjà
    // sélectionnée — prête à être repositionnée/redimensionnée
    // immédiatement si besoin, sans retaper "Pièce" par erreur.
    setActiveTool("adjust");
    setSelectedRoomId(id);
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
            setActiveTool(null);
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

      <div className="plan-editor-view__canvas-outer">
        <div className="plan-editor-view__zoom-controls">
          <button type="button" title="Dézoomer" className="plan-editor-view__zoom-btn" onClick={zoomOut} disabled={zoomScale <= ZOOM_MIN}>
            −
          </button>
          <button type="button" title="Réinitialiser le zoom" className="plan-editor-view__zoom-value" onClick={zoomReset}>
            {Math.round(zoomScale * 100)}%
          </button>
          <button type="button" title="Zoomer" className="plan-editor-view__zoom-btn" onClick={zoomIn} disabled={zoomScale >= ZOOM_MAX}>
            +
          </button>
        </div>
        <div className="plan-editor-view__canvas-wrap">
        <div
          ref={gridRef}
          className="plan-editor-view__grid"
          style={{
            width: gridWidth * effectiveCellPx,
            height: gridHeight * effectiveCellPx,
            backgroundSize: `${effectiveCellPx}px ${effectiveCellPx}px`,
            // Pan tactile natif du conteneur SAUF pendant le tracé d'une
            // nouvelle pièce (03/08/2026, retour de Paul) : "Pièce" a
            // besoin du geste de glissé pour lui seul (touch-action:none),
            // sinon on laisse le navigateur gérer le défilement/pan.
            touchAction: activeTool === "piece" ? "none" : "pan-x pan-y",
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
            const isSelected = activeTool === "adjust" && room.id === selectedRoomId;
            return (
              <div
                key={room.id}
                className={`plan-editor-view__room${isMoving || isResizing ? " plan-editor-view__room--moving" : ""}${overlapping ? " plan-editor-view__room--invalid" : ""}${isSelected ? " plan-editor-view__room--selected" : ""}`}
                style={{
                  left: displayRect.x * effectiveCellPx,
                  top: displayRect.y * effectiveCellPx,
                  width: displayRect.width * effectiveCellPx,
                  height: displayRect.height * effectiveCellPx,
                  background: room.color,
                  // Une pièce ne bloque le pan natif que pendant "Ajuster"
                  // (elle y a un rôle actif : sélection/glisser) — sinon
                  // (lecture seule ou outil "Pièce") elle laisse passer le
                  // pan, sans quoi on ne pourrait déplacer la caméra que
                  // dans les interstices entre les pièces.
                  touchAction: activeTool === "adjust" ? "none" : "pan-x pan-y",
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

          <WallEdges edges={liveEdges} cellPx={effectiveCellPx} width={gridWidth * effectiveCellPx} height={gridHeight * effectiveCellPx} wallThickness={3} />

          {previewRect && (
            <div
              className="plan-editor-view__preview"
              style={{
                left: previewRect.x * effectiveCellPx,
                top: previewRect.y * effectiveCellPx,
                width: previewRect.width * effectiveCellPx,
                height: previewRect.height * effectiveCellPx,
              }}
            />
          )}

          {separationMode &&
            separationSegments.map((seg) => {
              const isThisType = seg.kind === separationMode;
              const isHorizontal = seg.orientation === "h";
              const style = isHorizontal
                ? { left: seg.x * effectiveCellPx, top: seg.y * effectiveCellPx - DOOR_HIT_THICKNESS_PX / 2, width: effectiveCellPx, height: DOOR_HIT_THICKNESS_PX }
                : { left: seg.x * effectiveCellPx - DOOR_HIT_THICKNESS_PX / 2, top: seg.y * effectiveCellPx, width: DOOR_HIT_THICKNESS_PX, height: effectiveCellPx };
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
      </div>

      {/* Dock d'outils inférieur */}
      <div className="plan-editor-view__dock">
        <button
          type="button"
          className={
            activeTool === "piece"
              ? "plan-editor-view__dock-btn plan-editor-view__dock-btn--accent plan-editor-view__dock-btn--active"
              : "plan-editor-view__dock-btn plan-editor-view__dock-btn--accent"
          }
          onClick={() => handleToggleTool("piece")}
        >
          <PlusIcon size={16} />
          <span>Pièce</span>
        </button>

        <div className="plan-editor-view__dock-item plan-editor-view__menu-anchor">
          <button
            type="button"
            className={separationMode ? "plan-editor-view__dock-btn plan-editor-view__dock-btn--active" : "plan-editor-view__dock-btn"}
            onClick={() => {
              if (separationMode) {
                // ré-appui pendant qu'un type est actif -> en sortir entièrement
                setSeparationMode(null);
                setActiveTool(null);
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
                      // "Séparation" est un outil autonome (03/08/2026,
                      // retour de Paul — ne dépendait de "Ajuster" que
                      // par erreur) : le choix d'un type l'active
                      // directement, sans exiger "Ajuster" au préalable.
                      setActiveTool("separation");
                      setSelectedRoomId(null);
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
          className={activeTool === "adjust" ? "plan-editor-view__dock-btn plan-editor-view__dock-btn--active" : "plan-editor-view__dock-btn"}
          onClick={() => handleToggleTool("adjust")}
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
