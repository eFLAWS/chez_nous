// HouseholdHomePage.jsx
// Route index (Accueil) de /households/:householdId — traduit le
// prototype fourni (ui_home_v0.5.1.html, voir la conversation) en
// React + CSS classique, sans Tailwind ni FontAwesome (cf. Icons.jsx,
// et la convention de design handoff déjà établie sur ce projet).
//
// ⚠️ DONNÉES : aucun service Supabase pour les pièces, tâches du jour
// ou la liste de courses n'existe encore (pas de table dédiée dans
// docs/DATA_MODEL.md, pas de service tasks branché ici) — le contenu
// ci-dessous est un jeu de données STATIQUE reproduisant fidèlement le
// prototype, à remplacer dès que ces services existent. Ne pas prendre
// les valeurs (78%, "3 du jour", "5 articles"...) pour du réel.
//
// NAVIGATION DES CARTES (voir la conversation, capture annotée) :
// "Vue du foyer" -> Plan, "Tâches ménagères" et "Tâches du jour" ->
// Tâches, "Liste de courses" -> Dépenses. Chaque carte est rendue
// cliquable/activable au clavier (role="button" + Entrée/Espace) sans
// utiliser <Link> autour d'éléments interactifs (la checkbox des
// tâches a besoin de rester cliquable indépendamment — stopPropagation
// dessus pour ne pas déclencher la navigation en cochant une tâche).
import { useNavigate, useParams } from 'react-router-dom';
import { ChecklistIcon, CartIcon, PointerIcon } from '../../components/ui/Icons';
import './HouseholdHomePage.css';

const MOCK_ROOMS = [
  { id: 'kitchen', label: 'Cuisine · Propre', tone: 'clean' },
  { id: 'living', label: 'Salon · 1 tâche', tone: 'pending' },
  { id: 'bathroom', label: 'SDB · À faire', tone: 'todo' },
];

const MOCK_CLEANLINESS = 78;

const MOCK_TASKS_TODAY = [
  {
    id: 't1',
    title: 'Nettoyer la table du salon',
    overdue: false,
    badgeLabel: 'Avant 18h',
    tags: [
      { label: 'Salon', tone: 'violet' },
      { label: 'Quotidien', tone: 'sky' },
    ],
  },
  {
    id: 't2',
    title: 'Vider le lave-vaisselle',
    overdue: true,
    badgeLabel: 'En retard',
    tags: [
      { label: 'Cuisine', tone: 'emerald' },
      { label: 'Tous les 2 jours', tone: 'slate' },
    ],
  },
];

export default function HouseholdHomePage() {
  const navigate = useNavigate();
  const { householdId } = useParams();

  function goTo(tab) {
    navigate(`/households/${householdId}/${tab}`);
  }

  // Rend un conteneur non-interactif (section/article) activable à la
  // souris ET au clavier, sans imbriquer d'<a>/<Link> autour d'enfants
  // interactifs (la checkbox des tâches, notamment).
  function clickableProps(tab) {
    return {
      role: 'button',
      tabIndex: 0,
      onClick: () => goTo(tab),
      onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goTo(tab);
        }
      },
    };
  }

  return (
    <div className="household-home-page">
      <section className="household-home-page__overview household-home-page__clickable" {...clickableProps('spatial')}>
        <div className="household-home-page__overview-glow" aria-hidden="true" />

        <div className="household-home-page__overview-header">
          <div>
            <p className="household-home-page__eyebrow">Vue du foyer</p>
            <h2 className="household-home-page__overview-title">Pièces du logement</h2>
          </div>
          <span className="household-home-page__rooms-badge">
            <span className="household-home-page__dot" aria-hidden="true" />
            {MOCK_ROOMS.length} pièces actives
          </span>
        </div>

        <div className="household-home-page__overview-inner">
          <div className="household-home-page__room-chips">
            {MOCK_ROOMS.map((room) => (
              <span
                key={room.id}
                className={`household-home-page__room-chip household-home-page__room-chip--${room.tone}`}
              >
                {room.label}
              </span>
            ))}
          </div>

          <p className="household-home-page__hint">
            <PointerIcon size={13} />
            Toucher une pièce pour interagir
          </p>

          <div className="household-home-page__cleanliness">
            <div className="household-home-page__cleanliness-header">
              <span>Propreté globale</span>
              <span className="household-home-page__cleanliness-value">{MOCK_CLEANLINESS}%</span>
            </div>
            <div className="household-home-page__cleanliness-track">
              <div
                className="household-home-page__cleanliness-fill"
                style={{ width: `${MOCK_CLEANLINESS}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="household-home-page__stats">
        <article
          className="household-home-page__stat-card household-home-page__clickable"
          {...clickableProps('tasks')}
        >
          <div className="household-home-page__stat-header">
            <span className="household-home-page__stat-icon household-home-page__stat-icon--emerald">
              <ChecklistIcon size={17} />
            </span>
            <span className="household-home-page__stat-badge household-home-page__stat-badge--emerald">
              3 du jour
            </span>
          </div>
          <p className="household-home-page__stat-title">Tâches ménagères</p>
          <p className="household-home-page__stat-subtitle">Prochaine : Vaisselle</p>
        </article>

        <article
          className="household-home-page__stat-card household-home-page__clickable"
          {...clickableProps('expenses')}
        >
          <div className="household-home-page__stat-header">
            <span className="household-home-page__stat-icon household-home-page__stat-icon--sky">
              <CartIcon size={17} />
            </span>
            <span className="household-home-page__stat-badge household-home-page__stat-badge--sky">
              5 articles
            </span>
          </div>
          <p className="household-home-page__stat-title">Liste de courses</p>
          <p className="household-home-page__stat-subtitle">Dernier ajout : Lait</p>
        </article>
      </section>

      <section
        className="household-home-page__tasks household-home-page__clickable"
        {...clickableProps('tasks')}
      >
        <div className="household-home-page__tasks-header">
          <div>
            <p className="household-home-page__eyebrow">Aujourd'hui</p>
            <h2 className="household-home-page__tasks-title">Tâches du jour</h2>
          </div>
          <button type="button" className="household-home-page__see-all">
            Voir tout ({MOCK_TASKS_TODAY.length})
          </button>
        </div>

        <div className="household-home-page__task-list">
          {MOCK_TASKS_TODAY.map((task) => (
            <article
              key={task.id}
              className={
                task.overdue
                  ? 'household-home-page__task household-home-page__task--overdue'
                  : 'household-home-page__task'
              }
            >
              <input
                type="checkbox"
                className="household-home-page__task-checkbox"
                aria-label={task.title}
                onClick={(event) => event.stopPropagation()}
              />
              <div className="household-home-page__task-body">
                <div className="household-home-page__task-row">
                  <h3 className="household-home-page__task-title">{task.title}</h3>
                  <span
                    className={
                      task.overdue
                        ? 'household-home-page__task-badge household-home-page__task-badge--rose'
                        : 'household-home-page__task-badge household-home-page__task-badge--amber'
                    }
                  >
                    {task.badgeLabel}
                  </span>
                </div>
                <div className="household-home-page__task-tags">
                  {task.tags.map((tag) => (
                    <span
                      key={tag.label}
                      className={`household-home-page__task-tag household-home-page__task-tag--${tag.tone}`}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
