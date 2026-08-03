// src/features/household/RoomDetailView.jsx
// Vue détaillée d'UNE pièce (03/08/2026, demande explicite de Paul,
// prototype ui_room_v0.2.1.html) — remplace l'ancien comportement où
// cliquer une pièce dans Plan2DView.jsx ouvrait directement la Vue 3D
// (voir HouseholdSpatialView.jsx pour le câblage : le clic bascule
// maintenant vers CE composant, "Retour au plan 2D" y ramène).
//
// ⚠️ TÂCHES RÉELLES DEPUIS LE 03/08/2026 (chantier 🅲, taskService.js) —
// remplace le jeu de données MOCK_TASKS de la version précédente (voir
// TODO.md #11, maintenant traité). `tasks` est fourni par
// HouseholdSpatialView.jsx (déjà filtré sur `room.id`), les cases à
// cocher appellent `onCompleteTask`/`onReopenTask` (persistés en base),
// l'ajout rapide appelle `onAddQuickTask`.
//
// ÉCARTS ASSUMÉS PAR RAPPORT AU PROTOTYPE D'ORIGINE (mêmes principes
// que ProfilePage.jsx/HouseholdHomePage.jsx ailleurs dans le projet :
// afficher honnêtement ce qui existe plutôt que des chiffres fictifs) :
//   - "Gains potentiels"/"Gemmes" (gamification) retirés : aucune
//     colonne de points n'existe encore côté tasks (chantier 🅳, pas
//     commencé) — les réintroduire ici serait fabriquer une donnée.
//   - "Dernier ménage" retiré : `tasks` n'a pas de colonne
//     `completed_at`/`completed_by` aujourd'hui (seulement `status` et
//     `created_at`) — impossible de savoir honnêtement QUAND/QUI a
//     coché en dernier. Remplacé par deux compteurs 100% réels (tâches
//     actives / terminées) dans les mêmes emplacements visuels.
//   - Filtre "Ménage" retiré : rien dans le schéma actuel ne distingue
//     un "type" de tâche (toutes les tâches DE cette pièce sont déjà
//     des tâches ménagères par construction) — le filtre serait
//     redondant. "Toutes"/"Pour moi" suffisent, gardés.
//   - Historique : les tâches DONE sont listées (repris du prototype),
//     mais sans horodatage/auteur de complétion (mêmes raisons que
//     ci-dessus) — affiche les assigné·es à la place de "fait par X"
//     (n'importe qui a pu cocher, pas nécessairement l'assigné,
//     décision produit du 03/08/2026). Case à cocher réellement
//     fonctionnelle (rouvre la tâche), pas juste visuelle.
//
// Ce qui reste réel comme avant : nom/type/icône/couleur/surface de la
// pièce (mêmes données que Plan2DView.jsx/PlanEditorView.jsx), nom de
// l'étage.
import { useState } from "react";
import { ArrowRightIcon, PlusIcon, ChecklistIcon } from "../../components/ui/Icons";
import { findRoomType } from "../layout-editor/roomTypes";
import { computeRoomSurface } from "../layout-editor/utils/layoutGeneration";
import "./RoomDetailView.css";

const IMPORTANCE_LABEL = { BASSE: "Basse", NORMALE: "Normale", HAUTE: "Haute" };

function frequencyLabel(task) {
  if (task.recurrenceDays) return `Tous les ${task.recurrenceDays} j`;
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    return `Échéance : ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
  }
  return "Sans échéance";
}

function assigneeLabel(task, currentUserId) {
  if (!task.assignees || task.assignees.length === 0) return "Non assignée";
  return task.assignees
    .map((a) => (a.type === "user" && a.userId === currentUserId ? "Toi" : a.name))
    .join(", ");
}

export default function RoomDetailView({
  room,
  floor,
  onBack,
  tasks = [],
  currentUserId,
  onCompleteTask,
  onReopenTask,
  onAddQuickTask,
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'mine'
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const roomType = findRoomType(room.type);
  const { surfaceM2 } = computeRoomSurface(room);

  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  const visibleTasks = activeTasks.filter((t) => {
    if (filter === "mine") return t.assignees.some((a) => a.type === "user" && a.userId === currentUserId);
    return true;
  });

  const totalTasks = activeTasks.length + doneTasks.length;
  const cleanlinessPercent = totalTasks === 0 ? 100 : Math.round((doneTasks.length / totalTasks) * 100);
  const cleanlinessLabel =
    activeTasks.length === 0 ? "Nickel" : cleanlinessPercent >= 70 ? "Presque nickel" : cleanlinessPercent >= 40 ? "À surveiller" : "À faire";

  async function handleQuickAddSubmit(e) {
    e.preventDefault();
    const title = quickAddTitle.trim();
    if (!title || !onAddQuickTask) return;
    setQuickAddSaving(true);
    await onAddQuickTask(title);
    setQuickAddSaving(false);
    setQuickAddTitle("");
    setQuickAddOpen(false);
  }

  return (
    <div className="room-detail-view">
      <div className="room-detail-view__nav">
        <button type="button" className="room-detail-view__back-btn" onClick={onBack}>
          <ArrowRightIcon size={12} className="room-detail-view__back-icon" />
          <span>Retour au plan 2D</span>
        </button>
      </div>

      <section className="room-detail-view__header-card">
        <div className="room-detail-view__header-top">
          <div className="room-detail-view__header-identity">
            <div className="room-detail-view__icon" style={{ background: room.color }}>
              <span>{roomType.icon}</span>
            </div>
            <div>
              <h2 className="room-detail-view__title">{room.name}</h2>
              <p className="room-detail-view__meta">
                Étage : <span>{floor?.name || "—"}</span> · Surface : <span>{surfaceM2} m²</span>
              </p>
            </div>
          </div>
          <span className="room-detail-view__status-badge">
            <span className="room-detail-view__status-dot" />
            {cleanlinessLabel}
          </span>
        </div>

        <div className="room-detail-view__gauge">
          <div className="room-detail-view__gauge-header">
            <span>État de propreté</span>
            <span className="room-detail-view__gauge-value">
              {cleanlinessPercent}% ({activeTasks.length} tâche{activeTasks.length > 1 ? "s" : ""} restante{activeTasks.length > 1 ? "s" : ""})
            </span>
          </div>
          <div className="room-detail-view__gauge-track">
            <div className="room-detail-view__gauge-fill" style={{ width: `${cleanlinessPercent}%` }} />
          </div>
        </div>

        <div className="room-detail-view__stats">
          <div className="room-detail-view__stat">
            <p className="room-detail-view__stat-label">Tâches actives</p>
            <p className="room-detail-view__stat-value">{activeTasks.length}</p>
          </div>
          <div className="room-detail-view__stat">
            <p className="room-detail-view__stat-label">Tâches terminées</p>
            <p className="room-detail-view__stat-value">{doneTasks.length}</p>
          </div>
        </div>
      </section>

      <section className="room-detail-view__filters">
        <div className="room-detail-view__filter-chips">
          <button
            type="button"
            className={filter === "all" ? "room-detail-view__filter-chip room-detail-view__filter-chip--active" : "room-detail-view__filter-chip"}
            onClick={() => setFilter("all")}
          >
            Toutes ({activeTasks.length})
          </button>
          <button
            type="button"
            className={filter === "mine" ? "room-detail-view__filter-chip room-detail-view__filter-chip--active" : "room-detail-view__filter-chip"}
            onClick={() => setFilter("mine")}
          >
            Pour moi ({activeTasks.filter((t) => t.assignees.some((a) => a.type === "user" && a.userId === currentUserId)).length})
          </button>
        </div>
        <button type="button" className="room-detail-view__add-btn" onClick={() => setQuickAddOpen((v) => !v)}>
          <PlusIcon size={12} />
          <span>Tâche</span>
        </button>
      </section>

      {quickAddOpen && (
        <form className="room-detail-view__quick-add" onSubmit={handleQuickAddSubmit}>
          <input
            type="text"
            className="room-detail-view__quick-add-input"
            placeholder={`Nouvelle tâche dans ${room.name}...`}
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            autoFocus
          />
          <button type="submit" className="room-detail-view__quick-add-submit" disabled={quickAddSaving || !quickAddTitle.trim()}>
            {quickAddSaving ? "..." : "Ajouter"}
          </button>
        </form>
      )}

      <section className="room-detail-view__task-list">
        {visibleTasks.length === 0 && <p className="room-detail-view__empty">Aucune tâche pour ce filtre.</p>}
        {visibleTasks.map((task) => (
          <article key={task.id} className="room-detail-view__task">
            <input
              type="checkbox"
              className="room-detail-view__task-checkbox"
              aria-label={task.title}
              onChange={() => onCompleteTask?.(task.id)}
            />
            <div className="room-detail-view__task-body">
              <h4 className="room-detail-view__task-title">{task.title}</h4>
              <p className="room-detail-view__task-sub">
                Attribuée à <span>{assigneeLabel(task, currentUserId)}</span> · {frequencyLabel(task)}
              </p>
              <div className="room-detail-view__task-footer">
                {task.group && <span className="room-detail-view__task-group">{task.group.icon ?? "🗂️"} {task.group.name}</span>}
                <span className={`room-detail-view__task-importance room-detail-view__task-importance--${task.importance?.toLowerCase()}`}>
                  {IMPORTANCE_LABEL[task.importance] ?? task.importance}
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {doneTasks.length > 0 && (
        <details className="room-detail-view__history" open>
          <summary className="room-detail-view__history-summary">
            <ChecklistIcon size={13} />
            <span>Historique dans {room.name} ({doneTasks.length})</span>
          </summary>
          <div className="room-detail-view__history-list">
            {doneTasks.map((task) => (
              <article key={task.id} className="room-detail-view__history-item">
                <input
                  type="checkbox"
                  checked
                  className="room-detail-view__task-checkbox"
                  aria-label={`Rouvrir ${task.title}`}
                  onChange={() => onReopenTask?.(task.id)}
                />
                <div>
                  <p className="room-detail-view__history-title">{task.title}</p>
                  <p className="room-detail-view__history-sub">Attribuée à {assigneeLabel(task, currentUserId)}</p>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
