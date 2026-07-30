// Spinner.jsx
// Petit indicateur de chargement réutilisable partout où une action est en cours.
export default function Spinner({ size = 16 }) {
  return (
    <span
      className="spinner"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Chargement"
    />
  );
}
