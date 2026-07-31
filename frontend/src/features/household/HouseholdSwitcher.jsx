// HouseholdSwitcher.jsx
// Bouton + menu déroulant pour changer de foyer actif (header
// AppLayout) — remplace le <select> natif (voir la conversation) : un
// <select> ouvre un menu stylé par l'OS/le navigateur, ce qui casse
// l'esthétique glassmorphique sombre dès qu'on l'ouvre, surtout en
// mobile-first. Même pattern d'interaction que UserMenu.jsx (clic
// extérieur / Échap pour fermer).
//
// ⚠️ ICÔNE PERSONNALISABLE (voir la conversation, capture annotée) :
// cliquer sur l'icône du foyer permet de choisir une image locale et
// l'affiche en aperçu immédiat — mais ce n'est QU'UN APERÇU CLIENT
// (URL.createObjectURL), rien n'est envoyé à Supabase et l'image
// disparaît au rechargement de la page. Pour la rendre persistante il
// faudra : une colonne households.avatar_url, un bucket Supabase
// Storage dédié, une policy RLS (upload réservé au PROPRIETAIRE ?) et
// un service d'upload — décision produit/archi à prendre séparément,
// pas fait ici.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HouseIcon, ChevronDownIcon, CameraIcon, GridIcon } from '../../components/ui/Icons';
import './HouseholdSwitcher.css';

export default function HouseholdSwitcher({ households, current }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // Clé = household id -> object URL locale. Pas persistant (voir
  // commentaire ci-dessus), et gardé par foyer pour ne pas afficher la
  // même photo si on change de foyer actif.
  const [avatarPreviews, setAvatarPreviews] = useState({});
  const rootRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function handleSelect(householdId) {
    setOpen(false);
    if (householdId !== current?.id) navigate(`/households/${householdId}`);
  }

  function handleAddHousehold() {
    setOpen(false);
    navigate('/onboarding');
  }

  function handleManageHouseholds() {
    setOpen(false);
    // ?manage=1 : voir HouseholdDashboardPage.jsx — sans ce paramètre,
    // /households redirige automatiquement vers l'unique foyer d'un
    // compte qui n'en a qu'un, ce qui rendrait cette liste injoignable.
    navigate('/households?manage=1');
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // permet de re-choisir le même fichier ensuite
    if (!file || !current) return;
    const url = URL.createObjectURL(file);
    setAvatarPreviews((prev) => ({ ...prev, [current.id]: url }));
  }

  const avatarPreview = current ? avatarPreviews[current.id] : null;

  return (
    <div className="household-switcher" ref={rootRef}>
      <button
        type="button"
        className="household-switcher__avatar-btn"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Changer l'icône du foyer (aperçu local, pas encore enregistré)"
        title="Changer l'icône du foyer"
      >
        {avatarPreview ? (
          <img src={avatarPreview} alt="" className="household-switcher__avatar-img" />
        ) : (
          <HouseIcon size={18} />
        )}
        <span className="household-switcher__avatar-overlay">
          <CameraIcon size={11} />
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        className="household-switcher__avatar-input"
      />

      <button
        type="button"
        className="household-switcher__label-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="household-switcher__eyebrow">Foyer actif</span>
        <span className="household-switcher__name">
          {current?.name ?? '—'}
          <ChevronDownIcon size={10} />
        </span>
      </button>

      {open && (
        <div className="household-switcher__panel" role="menu">
          {households.map((household) => (
            <button
              key={household.id}
              type="button"
              className={
                household.id === current?.id
                  ? 'household-switcher__item household-switcher__item--active'
                  : 'household-switcher__item'
              }
              role="menuitem"
              onClick={() => handleSelect(household.id)}
            >
              {household.name}
            </button>
          ))}

          <div className="household-switcher__divider" />

          <button
            type="button"
            className="household-switcher__item"
            role="menuitem"
            onClick={handleManageHouseholds}
          >
            <GridIcon size={14} />
            Gérer mes logements
          </button>

          <button
            type="button"
            className="household-switcher__item household-switcher__item--add"
            role="menuitem"
            onClick={handleAddHousehold}
          >
            + Ajouter un logement
          </button>
        </div>
      )}
    </div>
  );
}
