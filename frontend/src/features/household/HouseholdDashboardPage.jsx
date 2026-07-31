// HouseholdDashboardPage.jsx
// Route /households — liste les foyers Supabase du compte connecté.
// Remplace HousingDashboard.jsx (ancien backend) pour le nouveau
// système.
//
// Un seul foyer -> redirection directe vers /households/:id (Accueil),
// voir docs/user-flows/ROUTING_AND_USER_FLOWS.md section 3
// (HouseholdGuard, cas N=1) : c'est ce qui fait qu'une connexion
// atterrit bien sur l'Accueil du foyer plutôt que sur cette liste
// quand il n'y a rien à choisir.
//
// EXCEPTION — ?manage=1 (voir la conversation, ajout de "Gérer mes
// logements" dans HouseholdSwitcher) : ce paramètre désactive la
// redirection automatique, pour qu'un compte à un seul foyer puisse
// quand même consulter/gérer sa liste plutôt que d'être renvoyé tout
// de suite dans ce même foyer.
//
// ⚠️ Cas N>1 (choisir le DERNIER foyer actif consulté plutôt que la
// liste, per spec) pas encore implémenté ici — nécessite de décider où
// persister "dernier foyer actif" (localStorage ? colonne dédiée ?).
// Affiche la liste pour l'instant, à traiter séparément.
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useHouseholds } from './useHouseholds';
import './HouseholdDashboardPage.css';

export default function HouseholdDashboardPage() {
  const { user, signOut } = useAuth();
  const { households, loading, error } = useHouseholds();
  const [searchParams] = useSearchParams();
  const forceList = searchParams.get('manage') === '1';

  if (!forceList && !loading && !error && households.length === 1) {
    return <Navigate to={`/households/${households[0].id}`} replace />;
  }

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
