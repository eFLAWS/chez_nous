// Skeleton.jsx
// Squelette de chargement affiché pendant la lecture initiale de la liste,
// pour que l'interface ne reste jamais sur un écran vide ou un simple texte.
export default function SkeletonGrid({ count = 3 }) {
  return (
    <div className="item-grid__cards" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="item-card item-card--skeleton">
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line skeleton-line--meta" />
          <div className="skeleton-line skeleton-line--actions" />
        </div>
      ))}
    </div>
  );
}
