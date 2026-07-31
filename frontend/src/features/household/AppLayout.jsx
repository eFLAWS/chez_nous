// AppLayout.jsx
// Coquille d'app fixe pour les écrans d'un foyer actif (voir
// docs/ROUTING_AND_USER_FLOWS.md, section 1) : header fixe (switcher de
// foyer, gamification, notifications) + zone centrale scrollable
// (<Outlet/>) + barre de navigation basse à 5 onglets. Destiné à
// envelopper les routes /households/:householdId/* une fois la
// restructuration en routes imbriquées faite (points 3-4, pas encore
// câblé ici).
//
// ⚠️ Gamification (Streaks/Gems) : PAS de colonnes réelles en base pour
// l'instant (streak_count/points_balance ne sont pas dans
// docs/DATA_MODEL.md) — affichage statique en attendant qu'on valide
// et ajoute ces colonnes. Ne pas prendre ces valeurs pour du réel.
import { Outlet, NavLink, useParams } from 'react-router-dom';
import { useHouseholds } from './useHouseholds';
import HouseholdSwitcher from './HouseholdSwitcher';
import UserMenu from './UserMenu';
import {
  HouseIcon,
  FloorPlanIcon,
  ChecklistIcon,
  CalendarIcon,
  UsersIcon,
  FlameIcon,
  GemIcon,
} from '../../components/ui/Icons';
import './AppLayout.css';

const TABS = [
  { to: '', label: 'Accueil', Icon: HouseIcon, end: true },
  { to: 'spatial', label: 'Plan', Icon: FloorPlanIcon },
  { to: 'tasks', label: 'Tâches', Icon: ChecklistIcon },
  { to: 'calendar', label: 'Calendrier', Icon: CalendarIcon },
  { to: 'life', label: 'Vie du foyer', Icon: UsersIcon },
];

export default function AppLayout() {
  const { householdId } = useParams();
  const { households } = useHouseholds();

  const current = households.find((h) => h.id === householdId) ?? null;

  return (
    <div className="app-layout">
      <header className="app-layout__header">
        <HouseholdSwitcher current={current} households={households} />

        <div className="app-layout__header-right">
          <div className="app-layout__gamification" title="Pas encore branché en base — placeholder">
            <span className="app-layout__badge app-layout__badge--amber">
              <FlameIcon size={13} /> 0
            </span>
            <span className="app-layout__badge app-layout__badge--sky">
              <GemIcon size={13} /> 0
            </span>
          </div>

          <UserMenu />
        </div>
      </header>

      <main className="app-layout__content">
        <Outlet context={{ household: current }} />
      </main>

      <nav className="app-layout__bottom-nav">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'app-layout__tab app-layout__tab--active' : 'app-layout__tab'
            }
          >
            <Icon size={20} className="app-layout__tab-icon" />
            <span className="app-layout__tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
