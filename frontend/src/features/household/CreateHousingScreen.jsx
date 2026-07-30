// src/features/household/CreateHousingScreen.jsx
// Écran affiché juste après l'inscription (aucun logement encore) —
// remplace l'ancien affichage à cartes simples qui naviguaient
// directement au clic. Nouveau modèle d'interaction (voir la
// conversation, maquette HTML fournie) : trois options en accordéon à
// sélection UNIQUE (Créer / Scanner / Rejoindre) — cliquer une option ne
// navigue plus immédiatement, ça déplie ses détails en dessous et
// surligne son icône. Un bouton "Continuer" en bas valide l'option
// choisie.
//
// PORTÉE VOLONTAIREMENT LIMITÉE à ce premier écran (voir la
// conversation) : quand des logements existent déjà, HousingDashboard.jsx
// garde son affichage précédent (liste + cartes d'action simples qui
// naviguent au clic) — cette demande ne concernait que le moment "après
// l'inscription", pas une refonte du reste.
//
// "Scanner un plan" et "Rejoindre un logement" restent des
// fonctionnalités À VENIR (badge "Bientôt", comme la maquette) — les
// déplier montre un aperçu de ce à quoi ça ressemblera, mais cliquer
// "Continuer" avec l'une de ces deux options sélectionnée affiche un
// message "pas encore disponible" plutôt que de faire quoi que ce soit
// de réel.
import { useState } from "react";
import { PlusIcon, ScanIcon, LinkIcon, ChevronDownIcon, CloudUploadIcon } from "../../components/ui/Icons";
import "./CreateHousingScreen.css";

const OPTIONS = [
  { id: "create", label: "Créer un logement", icon: PlusIcon, comingSoon: false },
  { id: "scan", label: "Scanner un plan", icon: ScanIcon, comingSoon: true },
  { id: "join", label: "Rejoindre un logement", icon: LinkIcon, comingSoon: true },
];

export default function CreateHousingScreen({ onCreateHousing }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [housingName, setHousingName] = useState("");
  const [scanName, setScanName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [notAvailableMessage, setNotAvailableMessage] = useState(null);

  const handleSelectOption = (optionId) => {
    setNotAvailableMessage(null);
    setSelectedOption((prev) => (prev === optionId ? null : optionId));
  };

  const handleContinue = () => {
    if (selectedOption === "create") {
      onCreateHousing(housingName);
      return;
    }
    // "scan" et "join" : fonctionnalités à venir, pas encore réelles —
    // voir l'en-tête de ce fichier.
    setNotAvailableMessage("Cette fonctionnalité arrive bientôt — pas encore disponible.");
  };

  return (
    <div className="create-housing__body">
      <div className="create-housing__options">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedOption === option.id;
          return (
            <div
              key={option.id}
              className={
                isSelected ? "create-housing__option create-housing__option--selected" : "create-housing__option"
              }
            >
              <button type="button" className="create-housing__option-header" onClick={() => handleSelectOption(option.id)}>
                <div className="create-housing__option-left">
                  <div
                    className={
                      isSelected
                        ? "create-housing__option-icon create-housing__option-icon--selected"
                        : "create-housing__option-icon"
                    }
                  >
                    <Icon size={18} />
                  </div>
                  <div className="create-housing__option-labels">
                    <h3 className="create-housing__option-title">{option.label}</h3>
                    {option.comingSoon && <span className="create-housing__badge">Bientôt</span>}
                  </div>
                </div>
                <ChevronDownIcon
                  size={13}
                  className={
                    isSelected
                      ? "create-housing__chevron create-housing__chevron--open"
                      : "create-housing__chevron"
                  }
                />
              </button>

              {isSelected && (
                <div className="create-housing__option-details">
                  {option.id === "create" && (
                    <>
                      <p className="create-housing__hint">Commencez par nommer votre logement pour ouvrir l'éditeur de plan.</p>
                      <input
                        className="create-housing__input"
                        value={housingName}
                        onChange={(e) => setHousingName(e.target.value)}
                        placeholder="Ex: Appartement Paris 11"
                      />
                    </>
                  )}

                  {option.id === "scan" && (
                    <>
                      <p className="create-housing__hint">Nommez votre logement et importez une photo de votre croquis papier.</p>
                      <input
                        className="create-housing__input"
                        value={scanName}
                        onChange={(e) => setScanName(e.target.value)}
                        placeholder="Ex: Appartement Paris 11"
                      />
                      <div className="create-housing__upload-zone">
                        <CloudUploadIcon size={22} className="create-housing__upload-icon" />
                        <p className="create-housing__upload-text">Glisser-déposer votre image ici</p>
                      </div>
                    </>
                  )}

                  {option.id === "join" && (
                    <>
                      <p className="create-housing__hint">Saisissez le code à 6 caractères partagé par un membre de votre foyer.</p>
                      <input
                        className="create-housing__input create-housing__input--code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Ex: ABC-123"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {notAvailableMessage && <p className="create-housing__not-available">{notAvailableMessage}</p>}

      <button
        type="button"
        className={
          selectedOption
            ? "create-housing__continue-btn create-housing__continue-btn--active"
            : "create-housing__continue-btn"
        }
        disabled={!selectedOption}
        onClick={handleContinue}
      >
        Continuer
      </button>
    </div>
  );
}
