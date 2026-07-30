// Dashboard.jsx
// Vue de synthèse en haut de page : trois indicateurs essentiels, calculés
// à partir des mêmes listes que les grilles (aucune donnée ni logique de
// calcul dupliquée). Purement présentationnel + un calcul dérivé pur.
import ProgressBar from "../../components/ui/ProgressBar";

function computeKpis(tasks, projects) {
  const activeProjectIds = new Set(tasks.filter((t) => t.status !== "done").map((t) => t.projectId));
  const activeProjects = projects.filter((p) => activeProjectIds.has(p.id)).length;
  const pendingTasks = tasks.filter((t) => t.status === "todo").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const completionRate = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  return { activeProjects, pendingTasks, completionRate };
}

export default function Dashboard({ tasks, projects, loading }) {
  if (loading) {
    return (
      <div className="kpi-row" aria-hidden="true">
        <div className="kpi-card kpi-card--skeleton" />
        <div className="kpi-card kpi-card--skeleton" />
        <div className="kpi-card kpi-card--skeleton kpi-card--wide" />
      </div>
    );
  }

  const { activeProjects, pendingTasks, completionRate } = computeKpis(tasks, projects);

  return (
    <div className="kpi-row">
      <div className="kpi-card">
        <span className="kpi-card__value">{activeProjects}</span>
        <span className="kpi-card__label">Projets actifs</span>
      </div>

      <div className="kpi-card">
        <span className="kpi-card__value kpi-card__value--warning">{pendingTasks}</span>
        <span className="kpi-card__label">Tâches en attente</span>
      </div>

      <div className="kpi-card kpi-card--wide">
        <div className="kpi-card__row">
          <span className="kpi-card__value kpi-card__value--success">{completionRate}%</span>
          <span className="kpi-card__label">Taux de complétion</span>
        </div>
        <ProgressBar value={completionRate} tone="success" />
      </div>
    </div>
  );
}
