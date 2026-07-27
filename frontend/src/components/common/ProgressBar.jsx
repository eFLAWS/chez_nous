// ProgressBar.jsx
// Barre de progression réutilisable — utilisée à la fois par le Dashboard
// (taux de complétion global) et par les cartes projet (avancement du
// projet), pour ne pas redéfinir deux fois la même barre.
export default function ProgressBar({ value, tone = "success" }) {
  const clamped = Math.max(0, Math.min(100, value || 0));
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`progress-bar__fill progress-bar__fill--${tone}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
