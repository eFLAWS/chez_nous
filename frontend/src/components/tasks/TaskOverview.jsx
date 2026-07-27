// TaskOverview.jsx
// Complète le Dashboard (étape 4) avec une vue synthétique des tâches,
// triable par urgence ou regroupée par pièce — ultra-scannable, comme
// demandé : chaque ligne tient sur une seule ligne visuelle (statut,
// contexte, échéance), pas de paragraphe.
import { useState } from "react";
import StatusBadge from "../common/StatusBadge";

const DAY_MS = 86400000;

/* Score d'urgence : plus petit = plus urgent. Les tâches faites sont
   reléguées en fin de liste, quel que soit leur ancienne échéance. */
function urgencyScore(task) {
  if (task.status === "done") return Infinity;
  if (!task.dueDate) return Number.MAX_SAFE_INTEGER - 1; // pas de date : après les datées, avant "terminé"
  return new Date(task.dueDate).getTime();
}

function dueLabel(task) {
  if (task.status === "done") return { text: "Terminé", tone: "success" };
  if (!task.dueDate) return { text: "Sans échéance", tone: "neutral" };
  const diffDays = Math.round((new Date(task.dueDate).getTime() - Date.now()) / DAY_MS);
  if (diffDays < 0) return { text: `En retard de ${Math.abs(diffDays)} j`, tone: "warning" };
  if (diffDays === 0) return { text: "Aujourd'hui", tone: "warning" };
  if (diffDays === 1) return { text: "Demain", tone: "neutral" };
  return { text: `Dans ${diffDays} j`, tone: "neutral" };
}

function TaskRow({ task, roomName, petName, assigneeName, hideRoom }) {
  const due = dueLabel(task);
  return (
    <li className="task-row">
      <StatusBadge status={task.status} />
      <span className="task-row__title">{task.title}</span>
      <span className="task-row__context">
        {roomName && !hideRoom && <span>📍 {roomName}</span>}
        {petName && <span>🐾 {petName}</span>}
        {assigneeName && <span>👤 {assigneeName}</span>}
        {task.recurrenceDays && <span>🔁 {task.recurrenceDays} j</span>}
      </span>
      <span className={`task-row__due badge badge--${due.tone}`}>{due.text}</span>
    </li>
  );
}

export default function TaskOverview({ tasks, rooms, pets, users }) {
  const [sortMode, setSortMode] = useState("urgency"); // "urgency" | "room"

  const nameOf = (list, id) => (list || []).find((x) => x.id === id)?.name;

  if (!tasks || tasks.length === 0) {
    return (
      <section className="task-overview">
        <h2 className="task-overview__title">Tâches</h2>
        <p className="item-grid__empty">Aucune tâche pour l'instant.</p>
      </section>
    );
  }

  const withNames = tasks.map((t) => ({
    task: t,
    roomName: nameOf(rooms, t.roomId),
    petName: nameOf(pets, t.petId),
    assigneeName: nameOf(users, t.assigneeId),
  }));

  return (
    <section className="task-overview">
      <div className="task-overview__header">
        <h2 className="task-overview__title">Tâches</h2>
        <div className="seg-toggle">
          <button
            type="button"
            className={sortMode === "urgency" ? "seg-toggle__btn seg-toggle__btn--active" : "seg-toggle__btn"}
            onClick={() => setSortMode("urgency")}
          >
            Par urgence
          </button>
          <button
            type="button"
            className={sortMode === "room" ? "seg-toggle__btn seg-toggle__btn--active" : "seg-toggle__btn"}
            onClick={() => setSortMode("room")}
          >
            Par pièce
          </button>
        </div>
      </div>

      {sortMode === "urgency" ? (
        <ul className="task-overview__list">
          {[...withNames]
            .sort((a, b) => urgencyScore(a.task) - urgencyScore(b.task))
            .map(({ task, roomName, petName, assigneeName }) => (
              <TaskRow key={task.id} task={task} roomName={roomName} petName={petName} assigneeName={assigneeName} />
            ))}
        </ul>
      ) : (
        Object.entries(
          withNames.reduce((groups, entry) => {
            const key = entry.roomName || "Sans pièce";
            (groups[key] = groups[key] || []).push(entry);
            return groups;
          }, {})
        )
          .sort(([a], [b]) => (a === "Sans pièce" ? 1 : b === "Sans pièce" ? -1 : a.localeCompare(b, "fr")))
          .map(([roomLabel, entries]) => (
            <div key={roomLabel} className="task-overview__group">
              <h3 className="task-overview__group-title">{roomLabel}</h3>
              <ul className="task-overview__list">
                {[...entries]
                  .sort((a, b) => urgencyScore(a.task) - urgencyScore(b.task))
                  .map(({ task, roomName, petName, assigneeName }) => (
                    <TaskRow key={task.id} task={task} roomName={roomName} petName={petName} assigneeName={assigneeName} hideRoom />
                  ))}
              </ul>
            </div>
          ))
      )}
    </section>
  );
}
