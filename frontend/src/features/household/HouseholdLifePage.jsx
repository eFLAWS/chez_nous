// HouseholdLifePage.jsx
// Route /households/:householdId/life — "Vie du foyer" : nom du
// logement, code d'invitation, membres et rôles (voir
// docs/user-flows/ROUTING_AND_USER_FLOWS.md section 5 ; les dépenses
// arriveront ici aussi, pas encore de service Supabase dédié).
//
// Remplace l'ancien HouseholdViewPage.jsx, qui portait ce même contenu
// mais avec son propre header plein écran (bouton "← Mes logements",
// badge de rôle en haut). Retiré : c'est AppLayout, monté au-dessus via
// la route parent, qui porte désormais le switcher de foyer — plus
// besoin d'un bouton retour ni d'un header dupliqué ici. Le badge de
// rôle reste, mais dans le corps de la page plutôt que dans un header.
import { useParams } from 'react-router-dom';
import { useHouseholdDetail } from './useHouseholdDetail';
import './HouseholdLifePage.css';

export default function HouseholdLifePage() {
  const { householdId } = useParams();
  const { household, role, loading, error } = useHouseholdDetail(householdId);

  if (loading) {
    return <p className="household-life-page__status">Chargement…</p>;
  }

  if (error) {
    return <p className="household-life-page__status household-life-page__status--error">{error}</p>;
  }

  if (!household) {
    return null;
  }

  return (
    <div className="household-life-page">
      <header className="household-life-page__header">
        <h1>{household.name}</h1>
        {role && <span className="household-life-page__role-badge">{role}</span>}
      </header>

      <div className="household-life-page__invite">
        <span>Code d'invitation</span>
        <strong>{household.invite_code}</strong>
      </div>

      <section className="household-life-page__members">
        <h2>Membres</h2>
        <ul>
          {household.members.map((member) => (
            <li key={member.userId}>
              <span>{member.displayName ?? member.email}</span>
              <span className="household-life-page__member-role">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
