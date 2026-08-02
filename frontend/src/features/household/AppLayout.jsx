// AppLayout.jsx
// Coquille d'app fixe pour les écrans d'un foyer actif (voir
// docs/ROUTING_AND_USER_FLOWS.md, section 1) : header fixe (switcher de
// foyer, gamification, notifications) + zone centrale scrollable
// (<Outlet/>) + barre de navigation basse à 6 onglets (Dépenses ajouté
// après coup, voir la conversation — la spec d'origine n'en prévoyait
// que 5 et logeait les dépenses dans "Vie du foyer" ; à répercuter
// dans docs/ROUTING_AND_USER_FLOWS.md). Destiné à envelopper les
// routes /households/:householdId/* une fois la restructuration en
// routes imbriquées faite (points 3-4, pas encore câblé ici).
//
// ⚠️ Gamification (Streaks/Gems) : PAS de colonnes réelles en base pour
// l'instant (streak_count/points_balance ne sont pas dans
// docs/DATA_MODEL.md) — les VALEURS restent un placeholder (0) en
// attendant qu'on valide et ajoute ces colonnes. Les deux badges sont
// en revanche de vrais boutons (voir la conversation) : la flamme ouvre
// StreakModal (détails + explication), la gemme mène à la page dédiée
// /rewards — pas encore de données réelles derrière, mais l'interaction
// attendue par la maquette est bien câblée.
import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useHouseholds } from './useHouseholds';
import HouseholdSwitcher from './HouseholdSwitcher';
import UserMenu from './UserMenu';
import StreakModal from './StreakModal';
import AmbientGlow from '../../components/ui/AmbientGlow';
import {
  HouseIcon,
  FloorPlanIcon,
  ChecklistIcon,
  CalendarIcon,
  UsersIcon,
  WalletIcon,
  FlameIcon,
  GemIcon,
} from '../../components/ui/Icons';
import './AppLayout.css';

const TABS = [
  { to: '', label: 'Accueil', Icon: HouseIcon, end: true },
  { to: 'spatial', label: 'Plan', Icon: FloorPlanIcon },
  { to: 'tasks', label: 'Tâches', Icon: ChecklistIcon },
  { to: 'expenses', label: 'Dépenses', Icon: WalletIcon },
  { to: 'calendar', label: 'Calendrier', Icon: CalendarIcon },
  { to: 'life', label: 'Vie du foyer', Icon: UsersIcon },
];

export default function AppLayout() {
  const { householdId } = useParams();
  const { households } = useHouseholds();
  const navigate = useNavigate();
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  const current = households.find((h) => h.id === householdId) ?? null;

  return (
    <div className="app-layout">
      <AmbientGlow />
      <header className="app-layout__header">
        <HouseholdSwitcher current={current} households={households} />

        <div className="app-layout__header-right">
          <div className="app-layout__gamification">
            <button
              type="button"
              className="app-layout__badge app-layout__badge--amber"
              onClick={() => setStreakModalOpen(true)}
              title="Voir le détail de la série"
            >
              <FlameIcon size={13} /> 0
            </button>
            <button
              type="button"
              className="app-layout__badge app-layout__badge--sky"
              onClick={() => navigate(`/households/${householdId}/rewards`)}
              title="Voir les récompenses"
            >
              <GemIcon size={13} /> 0
            </button>
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
            <Icon size={18} className="app-layout__tab-icon" />
            <span className="app-layout__tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {streakModalOpen && <StreakModal days={0} onClose={() => setStreakModalOpen(false)} />}
    </div>
  );
}
