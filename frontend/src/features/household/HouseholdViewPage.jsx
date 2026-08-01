// HouseholdViewPage.jsx
// Route /households/:householdId — détail d'un foyer, version Supabase.
// Remplace la variante précédente (ancien backend, jamais branchée dans
// AppRouter.jsx) — même forme (useParams, rôle résolu par hook dédié),
// mais rewiré sur household_members.role plutôt que occupants/api.js.
//
// ⚠️ PÉRIMÈTRE DE CETTE VERSION : n'affiche PAS le plan 2D/3D.
// ApartmentSpatialMvp reste branché sur l'ancien backend (IDs
// incompatibles avec les UUID Supabase) — migration floor_plans =
// étape suivante, volontairement hors périmètre ici.
import { useParams, useNavigate } from 'react-router-dom';
import { useHouseholdDetail } from './useHouseholdDetail';
import './HouseholdViewPage.css';

export default function HouseholdViewPage() {
  const { householdId } = useParams();
  const navigate = useNavigate();
  const { household, role, isOwner, loading, error } = useHouseholdDetail(householdId);

  if (loading) {
    return <p className="household-view-page__status">Chargement…</p>;
  }

  if (error) {
    return <p className="household-view-page__status household-view-page__status--error">{error}</p>;
  }

  if (!household) {
    return null;
  }

  return (
    <div className="household-view-page">
      <header className="household-view-page__header">
        <button
          type="button"
          onClick={() => navigate('/households')}
          className="household-view-page__back"
        >
          ← Mes logements
        </button>
        {role && <span className="household-view-page__role-badge">{role}</span>}
      </header>

      <h1>{household.name}</h1>

      <div className="household-view-page__invite">
        <span>Code d'invitation</span>
        <strong>{household.invite_code}</strong>
      </div>

      <section className="household-view-page__members">
        <h2>Membres</h2>
        <ul>
          {household.members.map((member) => (
            <li key={member.userId}>
              <span>{member.displayName ?? member.email}</span>
              <span className="household-view-page__member-role">{member.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="household-view-page__plan-placeholder">
        <p>
          {isOwner
            ? 'Le plan 2D/3D arrivera ici une fois la migration terminée.'
            : 'Le plan 2D/3D (lecture seule pour un locataire) arrivera ici une fois la migration terminée.'}
        </p>
      </section>
    </div>
  );
}
