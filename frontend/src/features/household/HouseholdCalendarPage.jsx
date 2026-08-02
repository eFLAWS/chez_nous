// HouseholdCalendarPage.jsx
// Route /households/:householdId/calendar — traduit le prototype
// ui_calendar_v0.1.2.html (voir la conversation) en React + CSS
// classique. Contrairement au prototype (dates figées sur "Août
// 2026"), la grille est calculée dynamiquement à partir de la vraie
// date du jour — reste correcte quel que soit le mois où on l'ouvre,
// pas seulement une capture figée du prototype.
//
// ⚠️ DONNÉES : aucune table "calendar_events" n'existe dans
// docs/DATA_MODEL.md — les événements ci-dessous sont des données
// STATIQUES positionnées par rapport à AUJOURD'HUI (pas des dates en
// dur comme "1er août"), pour qu'il y ait toujours quelque chose à
// voir sans devoir naviguer. À remplacer dès qu'un vrai service
// existe. Seules les vues "Mois" et les filtres de catégorie sont
// réellement fonctionnels — "Jour"/"Semaine" affichent un message
// d'attente (TabPlaceholder) plutôt que de faire semblant.
import { useMemo, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  BroomIcon,
  WrenchIcon,
  PartyIcon,
} from '../../components/ui/Icons';
import TabPlaceholder from './TabPlaceholder';
import './HouseholdCalendarPage.css';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const CATEGORIES = [
  { key: 'all', label: 'Tous' },
  { key: 'task', label: 'Tâches', dot: 'emerald' },
  { key: 'social', label: 'Événements', dot: 'sky' },
  { key: 'household', label: 'Visites / Foyer', dot: 'amber' },
];

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

// Grille du mois contenant `viewDate` : jours de bordure (mois
// précédent/suivant) inclus pour compléter des semaines entières,
// semaine démarrant le lundi (convention française, comme le prototype).
function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingCount = (firstOfMonth.getDay() + 6) % 7; // lundi = 0
  const totalCells = Math.ceil((leadingCount + daysInMonth) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i += 1) {
    const dayOffset = i - leadingCount;
    const date = new Date(year, month, 1 + dayOffset);
    cells.push({ date, iso: toISO(date), inMonth: date.getMonth() === month });
  }
  return cells;
}

function buildMockEvents() {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const in5Days = addDays(today, 5);

  return {
    [toISO(today)]: [
      {
        id: 'e1',
        title: 'Passage Technicien Fibre',
        time: '14:00 - 16:00',
        category: 'household',
        icon: WrenchIcon,
        note: "Être présent pour ouvrir la porte au technicien.",
      },
      {
        id: 'e2',
        title: 'Grand ménage collectif',
        time: '18:30 - 19:30',
        category: 'task',
        icon: BroomIcon,
        attendees: ['A', 'M'],
      },
    ],
    [toISO(tomorrow)]: [
      {
        id: 'e3',
        title: 'Soirée Pizza & Jeux de société',
        time: '20:30',
        category: 'social',
        icon: PartyIcon,
        badge: 'Tous',
      },
    ],
    [toISO(in5Days)]: [
      {
        id: 'e4',
        title: 'Visite de courtoisie propriétaire',
        time: '10:00',
        category: 'household',
        icon: WrenchIcon,
      },
    ],
  };
}

export default function HouseholdCalendarPage() {
  const [view, setView] = useState('month');
  const [category, setCategory] = useState('all');
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const events = useMemo(() => buildMockEvents(), []);
  const grid = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  const todayISO = toISO(new Date());
  const selectedISO = toISO(selectedDate);

  function eventsFor(iso) {
    const dayEvents = events[iso] ?? [];
    return category === 'all' ? dayEvents : dayEvents.filter((event) => event.category === category);
  }

  const selectedEvents = eventsFor(selectedISO);
  const totalVisibleCount = Object.keys(events).reduce((sum, iso) => sum + eventsFor(iso).length, 0);

  function goToAdjacentMonth(delta) {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <div className="household-calendar-page">
      <section className="household-calendar-page__toolbar">
        <div>
          <p className="household-calendar-page__eyebrow">Planning partagé</p>
          <div className="household-calendar-page__month-nav">
            <h2 className="household-calendar-page__month-label">
              {MONTH_LABELS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </h2>
            <button type="button" onClick={() => goToAdjacentMonth(-1)} aria-label="Mois précédent">
              <ChevronLeftIcon size={13} />
            </button>
            <button type="button" onClick={() => goToAdjacentMonth(1)} aria-label="Mois suivant">
              <ChevronRightIcon size={13} />
            </button>
          </div>
        </div>

        <button type="button" className="household-calendar-page__add-btn" disabled title="Bientôt disponible">
          <PlusIcon size={13} />
          <span>Événement</span>
        </button>
      </section>

      <section className="household-calendar-page__view-switch">
        {['day', 'week', 'month'].map((v) => (
          <button
            key={v}
            type="button"
            className={v === view ? 'household-calendar-page__view-btn household-calendar-page__view-btn--active' : 'household-calendar-page__view-btn'}
            onClick={() => setView(v)}
          >
            {v === 'day' ? 'Jour' : v === 'week' ? 'Semaine' : 'Mois'}
          </button>
        ))}
      </section>

      {view !== 'month' ? (
        <TabPlaceholder
          title={view === 'day' ? 'Vue Jour' : 'Vue Semaine'}
          text="Cette vue arrivera bientôt — la vue Mois est fonctionnelle dès maintenant."
        />
      ) : (
        <>
          <section className="household-calendar-page__filters">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={
                  cat.key === category
                    ? 'household-calendar-page__filter household-calendar-page__filter--active'
                    : 'household-calendar-page__filter'
                }
                onClick={() => setCategory(cat.key)}
              >
                {cat.dot && <span className={`household-calendar-page__filter-dot household-calendar-page__filter-dot--${cat.dot}`} />}
                {cat.label}
                {cat.key === 'all' && ` (${totalVisibleCount})`}
              </button>
            ))}
          </section>

          <section className="household-calendar-page__grid-card card-glow">
            <div className="household-calendar-page__weekdays">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="household-calendar-page__days">
              {grid.map((cell) => {
                const dayEvents = eventsFor(cell.iso);
                const isToday = cell.iso === todayISO;
                const isSelected = cell.iso === selectedISO;
                const hasEvents = dayEvents.length > 0;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    className={[
                      'household-calendar-page__day',
                      !cell.inMonth && 'household-calendar-page__day--outside',
                      isSelected && 'household-calendar-page__day--selected',
                      !isSelected && isToday && 'household-calendar-page__day--today',
                      !isSelected && !isToday && hasEvents && 'household-calendar-page__day--has-events',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelectedDate(cell.date)}
                  >
                    <span>{cell.date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="household-calendar-page__day-dots">
                        {dayEvents.slice(0, 2).map((event) => (
                          <span
                            key={event.id}
                            className={`household-calendar-page__day-dot household-calendar-page__day-dot--${event.category}`}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="household-calendar-page__agenda">
            <div className="household-calendar-page__agenda-header">
              <h3>Programme du {selectedDate.getDate()} {MONTH_LABELS[selectedDate.getMonth()].toLowerCase()}</h3>
              <span>{selectedEvents.length} événement{selectedEvents.length > 1 ? 's' : ''}</span>
            </div>

            {selectedEvents.length === 0 ? (
              <p className="household-calendar-page__agenda-empty">Rien de prévu ce jour-là.</p>
            ) : (
              <div className="household-calendar-page__agenda-list">
                {selectedEvents.map((event) => {
                  const Icon = event.icon;
                  return (
                    <article key={event.id} className={`household-calendar-page__event household-calendar-page__event--${event.category}`}>
                      <div className="household-calendar-page__event-row">
                        <span className="household-calendar-page__event-main">
                          <span className={`household-calendar-page__event-icon household-calendar-page__event-icon--${event.category}`}>
                            <Icon size={14} />
                          </span>
                          <span>
                            <h4>{event.title}</h4>
                            <p>{event.time}</p>
                          </span>
                        </span>
                        {event.attendees ? (
                          <span className="household-calendar-page__event-avatars">
                            {event.attendees.map((initial) => (
                              <span key={initial}>{initial}</span>
                            ))}
                          </span>
                        ) : event.badge ? (
                          <span className="household-calendar-page__event-badge">{event.badge}</span>
                        ) : null}
                      </div>
                      {event.note && <p className="household-calendar-page__event-note">{event.note}</p>}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
