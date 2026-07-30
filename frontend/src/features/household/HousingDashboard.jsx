// src/features/household/HousingDashboard.jsx
// Dashboard de sélection/gestion des logements — affiché une fois
// connecté (vrai login/inscription, voir HouseholdRoot.jsx). Montre
// chaque logement existant sous forme de carte, plus deux cartes
// d'action : créer, rejoindre (placeholder, voir JoinHousingModal.jsx).
//
// THÈME DARK MODE NÉON (voir la conversation) : restylé pour
// correspondre au prototype HTML fourni (mêmes tokens que
// HouseholdRoot.css/AuthForm.css, theme.css) — fond thématique plein
// écran avec halos, cartes d'action avec icône/titre/description/
// chevron, pas de conteneur encadré séparé (même principe que l'écran
// de connexion).
//
// Retrait d'un logement (survol/appui long, voir plus bas) : la
// confirmation se BRANCHE selon `housing.occupantsCount` — "Quitter le
// foyer" (plusieurs occupants, rien n'est supprimé) ou "Supprimer"
// (dernier occupant, perte définitive du plan). La décision de CE QUI
// est réellement effacé vit dans HouseholdRoot.jsx (handleRemoveHousing)
// — ce composant ne fait QUE choisir le bon texte/bouton à afficher, sur
// le même champ `occupantsCount` que le parent.
//
// Suppression d'un logement (nouveau) : survol (souris) OU appui long
// (tactile) fait apparaître une croix "×" sur la carte. Chaque carte est
// un <div role="button"> (pas un <button>) : nécessaire pour pouvoir
// imbriquer la croix, elle-même un vrai <button> — un bouton dans un
// bouton serait du HTML invalide.
//
// Distinction tap rapide (navigue) / appui long (révèle la croix) : même
// minuteur partagé que LayoutEditor.jsx (500ms). Un drapeau
// (justLongPressedRef) empêche le clic de navigation de se déclencher
// juste après un appui long réussi — sinon relâcher le doigt après avoir
// révélé la croix ouvrirait quand même le logement.
import { useRef, useState } from "react";
import JoinHousingModal from "./JoinHousingModal";
import ScanPlanModal from "./ScanPlanModal";
import CreateHousingScreen from "./CreateHousingScreen";
import { HouseUserIcon, HouseIcon, PlusIcon, LinkIcon, ScanIcon, ChevronRightIcon, LogoutIcon } from "../../components/ui/Icons";
import "./HousingDashboard.css";

const LONG_PRESS_MS = 500;

export default function HousingDashboard({
  housings,
  userName,
  onLogout,
  onSelectHousing,
  onCreateHousing,
  onRemoveHousing,
  errorMessage,
}) {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [revealedHousingId, setRevealedHousingId] = useState(null); // croix visible sur cette carte (tactile)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // logement en attente de confirmation de suppression

  const longPressTimerRef = useRef(null);
  const justLongPressedRef = useRef(false);

  const handleCardPointerDown = (housingId) => {
    justLongPressedRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      justLongPressedRef.current = true;
      setRevealedHousingId(housingId);
    }, LONG_PRESS_MS);
  };

  const handleCardPointerUp = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardClick = (housingId) => {
    if (justLongPressedRef.current) {
      // Vient de déclencher l'appui long (croix révélée) -> ne navigue
      // pas en plus au relâchement du doigt/clic.
      justLongPressedRef.current = false;
      return;
    }
    onSelectHousing(housingId);
  };

  const handleDeleteClick = (e, housingId) => {
    e.stopPropagation(); // n'ouvre pas le logement en plus d'ouvrir la confirmation
    setConfirmDeleteId(housingId);
  };

  const confirmedHousing = housings.find((h) => h.id === confirmDeleteId);
  const hasHousings = housings.length > 0;

  return (
    <div className="housing-dashboard">
      <div className="housing-dashboard__glow housing-dashboard__glow--emerald" aria-hidden="true" />
      <div className="housing-dashboard__glow housing-dashboard__glow--lime" aria-hidden="true" />

      <div className="housing-dashboard__frame">
        {(userName || onLogout) && (
          <div className="housing-dashboard__topbar">
            {userName && (
              <span className="housing-dashboard__user-pill">
                <span className="housing-dashboard__user-avatar">{userName.charAt(0).toUpperCase()}</span>
                {userName}
              </span>
            )}
            {onLogout && (
              <button type="button" className="housing-dashboard__logout-btn" onClick={onLogout}>
                <LogoutIcon size={13} />
                Déconnexion
              </button>
            )}
          </div>
        )}

        <div className="housing-dashboard__hero">
          <div className="housing-dashboard__hero-badge">
            <HouseUserIcon size={26} />
          </div>
          <h1 className="housing-dashboard__title">{hasHousings ? "Mes logements" : "Créer un logement"}</h1>
          <p className="housing-dashboard__subtitle">
            {hasHousings
              ? "Sélectionnez un logement, ou créez-en un nouveau."
              : "Vous n'avez aucun foyer actif pour le moment. Créez-en un ou rejoignez-en un !"}
          </p>
        </div>

        {errorMessage && <p className="housing-dashboard__error">{errorMessage}</p>}

        {/* Premier logement (voir la conversation, maquette fournie) :
            accordéon à sélection unique (Créer/Scanner/Rejoindre),
            remplace l'ancien affichage à cartes simples pour ce cas
            précis. Une fois qu'un logement existe, l'affichage
            précédent (liste + cartes d'action) reprend, inchangé — cette
            demande ne concernait que ce premier écran. */}
        {!hasHousings && <CreateHousingScreen onCreateHousing={onCreateHousing} />}

        {hasHousings && (
        <div className="housing-dashboard__list">
          {housings.map((housing) => (
            <div
              key={housing.id}
              role="button"
              tabIndex={0}
              className={
                housing.id === revealedHousingId
                  ? "housing-dashboard__existing-card housing-dashboard__existing-card--revealed"
                  : "housing-dashboard__existing-card"
              }
              onPointerDown={() => handleCardPointerDown(housing.id)}
              onPointerUp={handleCardPointerUp}
              onPointerLeave={handleCardPointerUp}
              onClick={() => handleCardClick(housing.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelectHousing(housing.id)}
            >
              <div className="housing-dashboard__card-icon housing-dashboard__card-icon--existing">
                <HouseIcon size={20} />
              </div>
              <span className="housing-dashboard__card-name">{housing.name}</span>
              <ChevronRightIcon size={13} className="housing-dashboard__card-chevron" />
              <button
                type="button"
                className="housing-dashboard__delete-btn"
                onClick={(e) => handleDeleteClick(e, housing.id)}
                aria-label={`Supprimer ${housing.name}`}
              >
                ×
              </button>
            </div>
          ))}

          <button type="button" className="housing-dashboard__action-card housing-dashboard__action-card--primary" onClick={onCreateHousing}>
            <div className="housing-dashboard__card-icon housing-dashboard__card-icon--primary">
              <PlusIcon size={20} />
            </div>
            <div className="housing-dashboard__action-text">
              <h3 className="housing-dashboard__action-title">Créer un logement</h3>
              <p className="housing-dashboard__action-desc">Dessiner un plan de chez vous.</p>
            </div>
            <ChevronRightIcon size={13} className="housing-dashboard__card-chevron" />
          </button>

          {/* Placeholder (voir la conversation) : scanner un plan
              dessiné à main levée n'est pas encore fonctionnel — même
              traitement que "Rejoindre un logement" (ScanPlanModal.jsx,
              PlaceholderModal partagé). */}
          <button
            type="button"
            className="housing-dashboard__action-card housing-dashboard__action-card--secondary"
            onClick={() => setScanModalOpen(true)}
          >
            <div className="housing-dashboard__card-icon housing-dashboard__card-icon--secondary">
              <ScanIcon size={18} />
            </div>
            <div className="housing-dashboard__action-text">
              <h3 className="housing-dashboard__action-title">Scanner un plan</h3>
              <p className="housing-dashboard__action-desc">Bientôt : convertir un plan dessiné à la main</p>
            </div>
            <ChevronRightIcon size={13} className="housing-dashboard__card-chevron" />
          </button>

          <button
            type="button"
            className="housing-dashboard__action-card housing-dashboard__action-card--secondary"
            onClick={() => setJoinModalOpen(true)}
          >
            <div className="housing-dashboard__card-icon housing-dashboard__card-icon--secondary">
              <LinkIcon size={18} />
            </div>
            <div className="housing-dashboard__action-text">
              <h3 className="housing-dashboard__action-title">Rejoindre un logement</h3>
              <p className="housing-dashboard__action-desc">Entrer un code d'invitation reçu</p>
            </div>
            <ChevronRightIcon size={13} className="housing-dashboard__card-chevron" />
          </button>
        </div>
        )}

        {/* Lien placeholder (#) : pas encore de vraie page d'aide/guide —
            même traitement que "Règles du Foyer" sur l'écran de connexion. */}
        <p className="housing-dashboard__footer">
          Besoin d'aide ?{" "}
          <a href="#" className="housing-dashboard__footer-link">
            Consulter le guide
          </a>
        </p>
      </div>

      {joinModalOpen && <JoinHousingModal onClose={() => setJoinModalOpen(false)} />}
      {scanModalOpen && <ScanPlanModal onClose={() => setScanModalOpen(false)} />}

      {confirmedHousing &&
        (() => {
          // `?? 1` : les logements créés avant l'ajout de ce champ
          // retombent sur "1 occupant" (suppression réelle), pas un
          // branchement cassé sur `undefined`.
          const occupantsCount = confirmedHousing.occupantsCount ?? 1;
          const isLastOccupant = occupantsCount <= 1;
          return (
            <>
              <div className="housing-dashboard__confirm-backdrop" onClick={() => setConfirmDeleteId(null)} />
              <div
                className="housing-dashboard__confirm"
                role="alertdialog"
                aria-modal="true"
                aria-label={isLastOccupant ? "Confirmer la suppression" : "Confirmer que vous quittez ce logement"}
              >
                <p className="housing-dashboard__confirm-text">
                  {isLastOccupant
                    ? `Vous êtes le dernier occupant de "${confirmedHousing.name}". Voulez-vous vraiment le supprimer ? Son plan (étages, pièces, portes) sera perdu définitivement — cette action ne peut pas être annulée.`
                    : `Quitter "${confirmedHousing.name}" ? Il ne sera plus dans votre liste, mais reste actif pour les autres occupants — son plan n'est pas touché.`}
                </p>
                <div className="housing-dashboard__confirm-actions">
                  <button
                    type="button"
                    className="housing-dashboard__confirm-danger-btn"
                    onClick={() => {
                      onRemoveHousing(confirmedHousing.id);
                      setConfirmDeleteId(null);
                      setRevealedHousingId(null);
                    }}
                  >
                    {isLastOccupant ? "Supprimer" : "Quitter le foyer"}
                  </button>
                  <button type="button" className="housing-dashboard__confirm-cancel-btn" onClick={() => setConfirmDeleteId(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            </>
          );
        })()}
    </div>
  );
}
