// HouseholdTasksPage.jsx
// Route /households/:householdId/tasks — remplace le placeholder
// TabPlaceholder (03/08/2026, chantier 🅲) par une VRAIE liste des
// tâches du foyer, groupées par pièce (résolution du nom de pièce via
// floorPlanService.js, même source que Plan2DView/RoomDetailView).
//
// ⚠️ PÉRIMÈTRE VOLONTAIREMENT MINIMAL — décidé avec Paul : le service
// (taskService.js) d'abord, l'écran/formulaire de création RICHE
// (groupe, assignation multi-personnes, dépendance, récurrence) est un
// chantier à part, pas encore construit. Cette page n'a donc PAS
// d'ajout de tâche pour l'instant — utilise le bouton "+ Tâche" (ajout
// rapide : titre seul) déjà câblé dans RoomDetailView.jsx (onglet Plan
// → cliquer une pièce) pour créer des tâches de test en attendant.
// Aucun prototype Tailwind n'existe pour cet écran (contrairement aux
// autres onglets) — présentation modeste/fonctionnelle avec les tokens
// existants de theme.css, à affiner une fois un prototype fourni ou la
// session de conception de l'écran de création faite.
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useHouseholdTasks } from "./useHouseholdTasks";
import { useHouseholdRoomNames } from "./useHouseholdRoomNames";
import "./HouseholdTasksPage.css";

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
  return task.assignees.map((a) => (a.type === "user" && a.userId === currentUserId ? "Toi" : a.name)).join(", ");
}

export default function HouseholdTasksPage() {
  const { householdId } = useParams();
  const { user } = useAuth();
  const { tasks, loading: tasksLoading, error, completeTask, reopenTask } = useHouseholdTasks(householdId);
  const { roomNameById, loading: roomsLoading } = useHouseholdRoomNames(householdId);

  const loading = tasksLoading || roomsLoading;

  if (loading) {
    return (
      <div className="household-tasks-page">
        <p className="household-tasks-page__hint">Chargement des tâches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="household-tasks-page">
        <p className="household-tasks-page__hint">Impossible de charger les tâches ({error}).</p>
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status !== "DONE");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  // Regroupe les tâches actives par pièce (nom résolu via le plan,
  // "Sans pièce" pour room_id absent ou introuvable dans le plan
  // courant — ex. une pièce supprimée depuis).
  const groups = new Map();
  for (const task of activeTasks) {
    const key = task.roomId && roomNameById[task.roomId] ? roomNameById[task.roomId] : "Sans pièce";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }

  return (
    <div className="household-tasks-page">
      <header className="household-tasks-page__header">
        <h2 className="household-tasks-page__title">Tâches</h2>
        <p className="household-tasks-page__subtitle">
          {activeTasks.length} tâche{activeTasks.length > 1 ? "s" : ""} active{activeTasks.length > 1 ? "s" : ""} · {doneTasks.length} terminée
          {doneTasks.length > 1 ? "s" : ""}
        </p>
      </header>

      {activeTasks.length === 0 ? (
        <p className="household-tasks-page__hint">
          Aucune tâche pour l'instant — ouvre une pièce depuis l'onglet Plan pour en créer une ("+ Tâche").
        </p>
      ) : (
        [...groups.entries()].map(([roomName, roomTasks]) => (
          <section key={roomName} className="household-tasks-page__group">
            <h3 className="household-tasks-page__group-title">{roomName}</h3>
            <div className="household-tasks-page__list">
              {roomTasks.map((task) => (
                <article key={task.id} className="household-tasks-page__task">
                  <input
                    type="checkbox"
                    className="household-tasks-page__checkbox"
                    aria-label={task.title}
                    onChange={() => completeTask(task.id)}
                  />
                  <div className="household-tasks-page__task-body">
                    <h4 className="household-tasks-page__task-title">{task.title}</h4>
                    <p className="household-tasks-page__task-sub">
                      Attribuée à <span>{assigneeLabel(task, user?.id)}</span> · {frequencyLabel(task)}
                    </p>
                    <div className="household-tasks-page__task-footer">
                      {task.group && (
                        <span className="household-tasks-page__task-group">
                          {task.group.icon ?? "🗂️"} {task.group.name}
                        </span>
                      )}
                      <span className={`household-tasks-page__task-importance household-tasks-page__task-importance--${task.importance?.toLowerCase()}`}>
                        {IMPORTANCE_LABEL[task.importance] ?? task.importance}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {doneTasks.length > 0 && (
        <details className="household-tasks-page__group household-tasks-page__done">
          <summary className="household-tasks-page__group-title household-tasks-page__done-summary">Terminées ({doneTasks.length})</summary>
          <div className="household-tasks-page__list">
            {doneTasks.map((task) => (
              <article key={task.id} className="household-tasks-page__task">
                <input
                  type="checkbox"
                  checked
                  className="household-tasks-page__checkbox"
                  aria-label={`Rouvrir ${task.title}`}
                  onChange={() => reopenTask(task.id)}
                />
                <div className="household-tasks-page__task-body">
                  <h4 className="household-tasks-page__task-title">{task.title}</h4>
                  <p className="household-tasks-page__task-sub">
                    {task.roomId && roomNameById[task.roomId] ? roomNameById[task.roomId] : "Sans pièce"} · Attribuée à{" "}
                    <span>{assigneeLabel(task, user?.id)}</span>
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
