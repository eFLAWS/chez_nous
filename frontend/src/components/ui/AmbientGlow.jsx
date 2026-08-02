// AmbientGlow.jsx
// Halos lumineux d'ambiance en arrière-plan de page (coin haut-gauche
// émeraude, coin bas-droit lime) — présents sur quasiment tous les
// prototypes Tailwind fournis pour ce projet. Extrait en composant
// partagé plutôt que dupliqué à chaque page traduite (voir la
// conversation : directive de conversion — ne jamais supprimer/
// simplifier ces effets). Styles dans assets/theme.css (.ambient-glow*).
//
// Usage : premier enfant d'un conteneur en `position: relative` +
// `overflow: hidden` (ex. la racine d'une page plein écran, ou la
// coquille AppLayout pour que tous les onglets du foyer en héritent
// d'un coup).
export default function AmbientGlow() {
  return (
    <div className="ambient-glow" aria-hidden="true">
      <div className="ambient-glow__blob ambient-glow__blob--emerald" />
      <div className="ambient-glow__blob ambient-glow__blob--lime" />
    </div>
  );
}
