// RoomFloorPlan.jsx
// Affiche les pièces en blocs positionnés, et permet de les déplacer à la
// souris/au doigt avec :
//  - blocage de collision : impossible de glisser une pièce dans une
//    position qui chevaucherait une autre (on refuse le mouvement plutôt
//    que de repousser les autres pièces — plus simple et plus prévisible ;
//    voir le README pour la justification de ce choix).
//  - effet magnétique : à quelques pixels d'un bord voisin, la pièce vient
//    se coller parfaitement contre lui.
// Le calcul se fait entièrement ici, en mémoire, à chaque déplacement de
// pointeur (fluide, aucun aller-retour réseau). Seule la position FINALE,
// une fois le geste terminé, est envoyée au parent via `onMove` pour être
// validée et persistée (voir ItemGrid.jsx -> handleMove -> useItems -> api.js).
//
// Suppression d'une pièce : demande confirmation AVANT d'appeler
// `onDelete`, en affichant le nombre exact de tâches qui seront
// supprimées avec elle (calculé ici à partir de `tasks`, déjà chargées
// par le parent — pas besoin d'un aller-retour serveur pour le savoir).
import { useState, useRef, useEffect } from "react";

const PIXELS_PER_METER = 40;
const SNAP_THRESHOLD_METERS = 16 / PIXELS_PER_METER; // ~16px de tolérance à l'écran
const PADDING_METERS = 2; // marge de respiration autour du plan pendant le glisser

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.length && a.y + a.length > b.y;
}

/* Ajuste (x, y) pour "coller" contre le bord d'une pièce voisine si l'écart
   est inférieur au seuil de magnétisme — indépendamment sur chaque axe. */
function applyMagnetism(tentative, others) {
  const { width, length } = tentative;
  let { x, y } = tentative;
  const right = x + width, bottom = y + length;

  for (const o of others) {
    const oRight = o.x + o.width;
    if (Math.abs(right - o.x) <= SNAP_THRESHOLD_METERS) x = o.x - width;
    else if (Math.abs(x - oRight) <= SNAP_THRESHOLD_METERS) x = oRight;
    else if (Math.abs(x - o.x) <= SNAP_THRESHOLD_METERS) x = o.x;
    else if (Math.abs(right - oRight) <= SNAP_THRESHOLD_METERS) x = oRight - width;
  }
  for (const o of others) {
    const oBottom = o.y + o.length;
    if (Math.abs(bottom - o.y) <= SNAP_THRESHOLD_METERS) y = o.y - length;
    else if (Math.abs(y - oBottom) <= SNAP_THRESHOLD_METERS) y = oBottom;
    else if (Math.abs(y - o.y) <= SNAP_THRESHOLD_METERS) y = o.y;
    else if (Math.abs(bottom - oBottom) <= SNAP_THRESHOLD_METERS) y = oBottom - length;
  }
  return { x, y };
}

export default function RoomFloorPlan({ rooms, tasks, onMove, onDelete }) {
  const [positions, setPositions] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const dragsRef = useRef(new Map()); // pointerId -> { id, startClientX/Y, startX/Y, lastValid }

  // Resynchronise les positions locales avec les props (après un rafraîchissement
  // suite à une sauvegarde réussie, par ex.) — sauf pour une pièce en cours de glisser.
  useEffect(() => {
    const draggingIds = new Set([...dragsRef.current.values()].map((d) => d.id));
    setPositions((prev) => {
      const next = { ...prev };
      for (const r of rooms) {
        if (draggingIds.has(r.id)) continue;
        next[r.id] = { x: r.x, y: r.y };
      }
      return next;
    });
  }, [rooms]);

  if (!rooms || rooms.length === 0) {
    return <p className="item-grid__empty">Aucune pièce pour l'instant.</p>;
  }

  const posFor = (room) => positions[room.id] || { x: room.x, y: room.y };
  const taskCountFor = (roomId) => (tasks || []).filter((t) => t.roomId === roomId).length;

  const onPointerDown = (room) => (e) => {
    if (confirmingDeleteId === room.id) return; // pas de glisser pendant une confirmation
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const current = posFor(room);
    dragsRef.current.set(e.pointerId, {
      id: room.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: current.x,
      startY: current.y,
      lastValid: { x: current.x, y: current.y },
    });
    setDraggingId(room.id);
  };

  const onPointerMove = (room) => (e) => {
    const drag = dragsRef.current.get(e.pointerId);
    if (!drag || drag.id !== room.id) return;

    const dxM = (e.clientX - drag.startClientX) / PIXELS_PER_METER;
    const dyM = (e.clientY - drag.startClientY) / PIXELS_PER_METER;
    const tentative = { x: drag.startX + dxM, y: drag.startY + dyM, width: room.width, length: room.length };

    const others = rooms.filter((r) => r.id !== room.id).map((r) => ({ ...r, ...(positions[r.id] || {}) }));
    const snapped = applyMagnetism(tentative, others);
    const candidateRect = { ...snapped, width: room.width, length: room.length };

    const collides = others.some((o) => rectsOverlap(candidateRect, o));
    const finalPos = collides ? drag.lastValid : snapped;
    if (!collides) drag.lastValid = finalPos;

    setPositions((prev) => ({ ...prev, [room.id]: finalPos }));
  };

  const endDrag = (room) => async (e) => {
    const drag = dragsRef.current.get(e.pointerId);
    if (!drag || drag.id !== room.id) return;
    dragsRef.current.delete(e.pointerId);
    setDraggingId((current) => (current === room.id ? null : current));

    const final = positions[room.id] || drag.lastValid;
    const rounded = { x: Math.round(final.x * 100) / 100, y: Math.round(final.y * 100) / 100 };

    const result = await onMove?.(room.id, rounded);
    if (result && !result.success) {
      // le serveur a refusé (ex. chevauchement détecté entre-temps) : on
      // revient à la dernière position confirmée par le serveur.
      setPositions((prev) => ({ ...prev, [room.id]: { x: room.x, y: room.y } }));
    }
  };

  const requestDelete = (room) => (e) => {
    e.stopPropagation();
    setConfirmingDeleteId(room.id);
  };
  const cancelDelete = (e) => {
    e.stopPropagation();
    setConfirmingDeleteId(null);
  };
  const confirmDelete = (room) => async (e) => {
    e.stopPropagation();
    await onDelete?.(room.id);
    setConfirmingDeleteId(null);
  };

  const maxX = Math.max(...rooms.map((r) => posFor(r).x + r.width)) + PADDING_METERS;
  const maxY = Math.max(...rooms.map((r) => posFor(r).y + r.length)) + PADDING_METERS;

  return (
    <div
      className="floor-plan"
      style={{ position: "relative", width: maxX * PIXELS_PER_METER, height: maxY * PIXELS_PER_METER }}
    >
      {rooms.map((room) => {
        const pos = posFor(room);
        const isDragging = draggingId === room.id;
        const isConfirming = confirmingDeleteId === room.id;
        const taskCount = taskCountFor(room.id);
        return (
          <div
            key={room.id}
            data-testid={`room-${room.id}`}
            className={`floor-plan__room${isDragging ? " floor-plan__room--dragging" : ""}`}
            style={{
              position: "absolute",
              left: pos.x * PIXELS_PER_METER,
              top: pos.y * PIXELS_PER_METER,
              width: room.width * PIXELS_PER_METER,
              height: room.length * PIXELS_PER_METER,
              background: room.color,
              touchAction: "none",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onPointerDown={onPointerDown(room)}
            onPointerMove={onPointerMove(room)}
            onPointerUp={endDrag(room)}
            onPointerCancel={endDrag(room)}
          >
            {isConfirming ? (
              <div className="floor-plan__confirm">
                <p>
                  Supprimer "{room.name}" ?
                  {taskCount > 0 && ` ${taskCount} tâche${taskCount > 1 ? "s" : ""} seront aussi supprimée${taskCount > 1 ? "s" : ""}.`}
                </p>
                <div className="floor-plan__confirm-actions">
                  <button type="button" onClick={confirmDelete(room)}>
                    Confirmer
                  </button>
                  <button type="button" onClick={cancelDelete}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="floor-plan__room-delete"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={requestDelete(room)}
                  aria-label={`Supprimer ${room.name}`}
                  title="Supprimer cette pièce"
                >
                  ✕
                </button>
                <span className="floor-plan__room-name">{room.name}</span>
                <span className="floor-plan__room-dims">
                  {room.width} × {room.length} m
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
