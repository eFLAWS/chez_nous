// HouseholdDashboardPage.jsx
// Route /households — liste les foyers Supabase du compte connecté.
// Remplace HousingDashboard.jsx (ancien backend) pour le nouveau
// système. Clic sur un foyer -> /households/:id. "+ Créer" -> /onboarding
// (pas de garde RequireHousehold dessus, donc accessible même en ayant
// déjà un foyer — utile pour un compte multi-foyers).
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useHouseholds } from './useHouseholds';
import './HouseholdDashboardPage.css';

export default function HouseholdDashboardPage() {
  const { user, signOut } = useAuth();
  const { households, loading, error } = useHouseholds();

  return (
    <div className="household-dashboard-page">
      <header className="household-dashboard-page__header">
        <span className="household-dashboard-page__user">{user?.email}</span>
        <button type="button" onClick={signOut} className="household-dashboard-page__logout">
          Déconnexion
        </button>
      </header>

      <h1>Mes logements</h1>

      {loading && <p className="household-dashboard-page__status">Chargement…</p>}
      {error && <p className="household-dashboard-page__error">{error}</p>}

      {!loading && !error && (
        <ul className="household-dashboard-page__list">
          {households.map((household) => (
            <li key={household.id}>
              <Link to={`/households/${household.id}`} className="household-dashboard-page__card">
                <span className="household-dashboard-page__card-name">{household.name}</span>
                <span className="household-dashboard-page__card-role">{household.role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link to="/onboarding" className="household-dashboard-page__add">
        + Créer un nouveau logement
      </Link>
    </div>
  );
}
