// src/features/household/RoomDetailView.jsx
// Vue détaillée d'UNE pièce (03/08/2026, demande explicite de Paul,
// prototype ui_room_v0.2.1.html) — remplace l'ancien comportement où
// cliquer une pièce dans Plan2DView.jsx ouvrait directement la Vue 3D
// (voir HouseholdSpatialView.jsx pour le nouveau câblage : le clic
// bascule maintenant vers CE composant, "Retour au plan 2D" y ramène).
//
// ⚠️ TÂCHES — DONNÉES PLACEHOLDER, PAS ENCORE RÉELLES (même situation
// que HouseholdHomePage.jsx, voir son en-tête) : aucune table `tasks`
// n'est interrogée par le frontend pour l'instant (chantier Tâches pas
// commencé, voir docs/PROJET.md). La liste ci-dessous, la jauge de
// propreté, "Dernier ménage" et "Gains potentiels" sont un jeu de
// données STATIQUE générique (pas propre à un type de pièce précis,
// contrairement au prototype qui illustrait spécifiquement un
// "Bureau") — à remplacer dès qu'un vrai service tasks existera.
// Les cases à cocher sont interactives (état local uniquement) : cocher
// une tâche la déplace dans "Historique récent", MAIS rien n'est
// persisté nulle part — recharger la page réinitialise tout. C'est
// assumé : donner un aperçu honnête de l'interaction cible, sans
// prétendre à une vraie sauvegarde.
//
// Ce qui EST réel : nom/type/icône/couleur/surface de la pièce (mêmes
// données que Plan2DView.jsx/LayoutEditor.jsx), nom de l'étage.
import { useState } from "react";
import { ArrowRightIcon, GemIcon, PlusIcon, ChecklistIcon } from "../../components/ui/Icons";
import { findRoomType } from "../layout-editor/roomTypes";
import { computeRoomSurface } from "../layout-editor/utils/layoutGeneration";
import "./RoomDetailView.css";

// Jeu de tâches PLACEHOLDER générique — voir l'en-tête du fichier.
// `mine` : affichée sous le filtre "Pour moi". `chore` : affichée sous
// le filtre "Ménage" (les 3 filtres du prototype).
const MOCK_TASKS = [
  {
    id: "t1",
    title: "Dépoussiérer et ranger",
    assignedTo: "Toi",
    mine: true,
    chore: true,
    frequency: "Hebdo",
    duration: "~10 min",
    gems: 25,
  },
  {
    id: "t2",
    title: "Vider la corbeille",
    assignedTo: "Alex",
    mine: false,
    chore: true,
    frequency: "Bi-mensuel",
    duration: "~2 min",
    gems: 10,
  },
];

const MOCK_HISTORY = [{ id: "h1", title: "Ranger les affaires qui traînent", completedBy: "Alex", completedWhen: "hier", gems: 20 }];

export default function RoomDetailView({ room, floor, onBack }) {
  const [filter, setFilter] = useState("all"); // 'all' | 'mine' | 'chore'
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [history, setHistory] = useState(MOCK_HISTORY);

  const roomType = findRoomType(room.type);
  const { surfaceM2 } = computeRoomSurface(room);

  const visibleTasks = tasks.filter((t) => {
    if (filter === "mine") return t.mine;
    if (filter === "chore") return t.chore;
    return true;
  });

  // Cocher une tâche la déplace vers l'historique — état local
  // uniquement, voir l'avertissement en en-tête de fichier.
  function completeTask(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setHistory((prev) => [{ id: task.id, title: task.title, completedBy: "Toi", completedWhen: "à l'instant", gems: task.gems }, ...prev]);
  }

  const totalTasks = tasks.length + history.length;
  const cleanlinessPercent = totalTasks === 0 ? 100 : Math.round((history.length / totalTasks) * 100);
  const cleanlinessLabel =
    tasks.length === 0 ? "Nickel" : cleanlinessPercent >= 70 ? "Presque nickel" : cleanlinessPercent >= 40 ? "À surveiller" : "À faire";

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
              {cleanlinessPercent}% ({tasks.length} tâche{tasks.length > 1 ? "s" : ""} restante{tasks.length > 1 ? "s" : ""})
            </span>
          </div>
          <div className="room-detail-view__gauge-track">
            <div className="room-detail-view__gauge-fill" style={{ width: `${cleanlinessPercent}%` }} />
          </div>
        </div>

        <div className="room-detail-view__stats">
          <div className="room-detail-view__stat">
            <p className="room-detail-view__stat-label">Dernier ménage</p>
            <p className="room-detail-view__stat-value">
              {history[0]?.completedWhen || "—"} {history[0] && <span>(par {history[0].completedBy})</span>}
            </p>
          </div>
          <div className="room-detail-view__stat">
            <p className="room-detail-view__stat-label">Gains potentiels</p>
            <p className="room-detail-view__stat-value room-detail-view__stat-value--gems">
              +{tasks.reduce((sum, t) => sum + t.gems, 0)} Gemmes <GemIcon size={12} />
            </p>
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
            Toutes ({tasks.length})
          </button>
          <button
            type="button"
            className={filter === "mine" ? "room-detail-view__filter-chip room-detail-view__filter-chip--active" : "room-detail-view__filter-chip"}
            onClick={() => setFilter("mine")}
          >
            Pour moi ({tasks.filter((t) => t.mine).length})
          </button>
          <button
            type="button"
            className={filter === "chore" ? "room-detail-view__filter-chip room-detail-view__filter-chip--active" : "room-detail-view__filter-chip"}
            onClick={() => setFilter("chore")}
          >
            Ménage
          </button>
        </div>
        <button type="button" className="room-detail-view__add-btn">
          <PlusIcon size={12} />
          <span>Tâche</span>
        </button>
      </section>

      <section className="room-detail-view__task-list">
        {visibleTasks.length === 0 && <p className="room-detail-view__empty">Aucune tâche pour ce filtre.</p>}
        {visibleTasks.map((task) => (
          <article key={task.id} className="room-detail-view__task">
            <input
              type="checkbox"
              className="room-detail-view__task-checkbox"
              aria-label={task.title}
              onChange={() => completeTask(task.id)}
            />
            <div className="room-detail-view__task-body">
              <h4 className="room-detail-view__task-title">{task.title}</h4>
              <p className="room-detail-view__task-sub">
                Attribuée à <span>{task.assignedTo}</span> · Fréquence : {task.frequency}
              </p>
              <div className="room-detail-view__task-footer">
                <span>{task.duration}</span>
                <span className="room-detail-view__task-gems">
                  <GemIcon size={11} /> +{task.gems} pts
                </span>
              </div>
            </div>
          </article>
        ))}
      </section>

      {history.length > 0 && (
        <details className="room-detail-view__history" open>
          <summary className="room-detail-view__history-summary">
            <ChecklistIcon size={13} />
            <span>Historique récent dans {room.name} ({history.length})</span>
          </summary>
          <div className="room-detail-view__history-list">
            {history.map((item) => (
              <article key={item.id} className="room-detail-view__history-item">
                <input type="checkbox" checked readOnly className="room-detail-view__task-checkbox" />
                <div>
                  <p className="room-detail-view__history-title">{item.title}</p>
                  <p className="room-detail-view__history-sub">
                    Fait {item.completedWhen} par {item.completedBy} (+{item.gems} pts)
                  </p>
                </div>
              </article>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
