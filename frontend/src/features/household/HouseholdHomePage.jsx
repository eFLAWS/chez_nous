// HouseholdHomePage.jsx
// Route index (Accueil) de /households/:householdId — traduit le
// prototype fourni (ui_home_v0.5.1.html, voir la conversation) en
// React + CSS classique, sans Tailwind ni FontAwesome (cf. Icons.jsx,
// et la convention de design handoff déjà établie sur ce projet).
//
// ⚠️ DONNÉES RESTANT PLACEHOLDER : aucun service Supabase pour les
// tâches du jour ou la liste de courses n'existe encore (pas de table
// dédiée dans docs/DATA_MODEL.md, pas de service tasks branché ici) —
// le contenu de ces deux sections est un jeu de données STATIQUE
// reproduisant fidèlement le prototype, à remplacer dès que ces
// services existent. Ne pas prendre les valeurs ("3 du jour", "5
// articles", "78%"...) pour du réel — "Propreté globale" en particulier
// n'est PAS calculée depuis les tâches (le chantier Tâches n'a pas
// commencé), demande de Paul non traitée ici (voir plus bas).
//
// VUE DU FOYER — DONNÉES RÉELLES (03/08/2026, demande explicite de
// Paul, capture d'écran annotée à l'appui) : la carte "Pièces du
// logement" affichait des pastilles de pièces STATIQUES (Cuisine/Salon/
// SDB imaginaires) — remplacées par le VRAI plan de l'étage principal
// (`Plan2DView.jsx`, le même composant que l'onglet Plan), chargé via
// `fetchHouseholdLayout` (même service que `HouseholdSpatialView.jsx`).
// Étage affiché : `floors[0]` — même convention que
// `HouseholdSpatialView.jsx` (pas de tri explicite par `level`, ordre du
// tableau tel que renvoyé par Supabase ; limite préexistante, pas
// introduite ici). "Propreté globale" (78%, mock) volontairement
// CONSERVÉE telle quelle : Paul a demandé le plan, pas cette métrique,
// et aucune donnée réelle n'existe pour la calculer de toute façon.
//
// NAVIGATION DES CARTES (voir la conversation, capture annotée) :
// "Vue du foyer" -> Plan, "Tâches ménagères" et "Tâches du jour" ->
// Tâches, "Liste de courses" -> Dépenses. Chaque carte est rendue
// cliquable/activable au clavier (role="button" + Entrée/Espace) sans
// utiliser <Link> autour d'éléments interactifs (la checkbox des
// tâches a besoin de rester cliquable indépendamment — stopPropagation
// dessus pour ne pas déclencher la navigation en cochant une tâche).
// Le plan intégré n'a PAS son propre `onSelectRoom` (pièces non
// cliquables individuellement) : la carte entière navigue déjà vers
// "Plan" au moindre tap, y compris sur une pièce — ajouter une
// navigation par pièce en plus aurait fait doublon avec cette même
// destination, sans bénéfice.
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChecklistIcon, CartIcon, PointerIcon } from '../../components/ui/Icons';
import { fetchHouseholdLayout } from '../floor-plan/floorPlanService';
import { generateFloorTiles } from '../layout-editor/utils/layoutGeneration';
import Plan2DView from '../floor-plan/Plan2DView';
import './HouseholdHomePage.css';

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

  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [doorsByFloor, setDoorsByFloor] = useState({});
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchHouseholdLayout(householdId).then((layout) => {
      if (cancelled) return;
      setFloors(layout.floors);
      setRooms(layout.rooms);
      setDoorsByFloor(layout.doors);
      setLoadingPlan(false);
    });
    return () => {
      cancelled = true;
    };
  }, [householdId]);

  const homeFloor = floors[0] || null;
  const homeFloorRooms = homeFloor ? rooms.filter((r) => r.floorId === homeFloor.id) : [];
  const homeFloorEdges = homeFloor
    ? generateFloorTiles(homeFloorRooms, {
        openingEdges: (doorsByFloor[homeFloor.id] || []).map((d) => ({ orientation: d.orientation, x: d.x, y: d.y })),
      }).edges
    : [];

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
            <h2 className="household-home-page__overview-title">{homeFloor ? homeFloor.name : 'Pièces du logement'}</h2>
          </div>
          {homeFloor && (
            <span className="household-home-page__rooms-badge">
              <span className="household-home-page__dot" aria-hidden="true" />
              {homeFloorRooms.length} pièce{homeFloorRooms.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="household-home-page__overview-inner">
          {loadingPlan ? (
            <p className="household-home-page__hint">Chargement du plan...</p>
          ) : homeFloorRooms.length > 0 ? (
            <div className="household-home-page__plan-embed">
              <Plan2DView floor={homeFloor} edges={homeFloorEdges} rooms={homeFloorRooms} maxHeight="200px" showHint={false} />
            </div>
          ) : (
            <p className="household-home-page__hint">Aucun plan tracé pour l'instant — ouvre l'onglet Plan pour commencer.</p>
          )}

          <p className="household-home-page__hint">
            <PointerIcon size={13} />
            Toucher pour voir le plan en détail
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
