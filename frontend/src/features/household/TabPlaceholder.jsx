// TabPlaceholder.jsx
// Contenu générique "à venir" pour les onglets pas encore implémentés
// (Accueil, Tâches, Calendrier), et pour le Plan tant que la migration
// floor_plans n'est pas faite. Même logique de mutualisation que
// PlaceholderModal (habillage partagé, contenu variable via props) mais
// en plein contenu de page plutôt qu'en feuille modale — destiné à
// remplir l'<Outlet/> d'AppLayout, pas à flotter par-dessus.
import './TabPlaceholder.css';

export default function TabPlaceholder({ title, text }) {
  return (
    <div className="tab-placeholder">
      <h2 className="tab-placeholder__title">{title}</h2>
      <p className="tab-placeholder__text">{text}</p>
    </div>
  );
}
