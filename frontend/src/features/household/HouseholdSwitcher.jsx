// HouseholdSwitcher.jsx
// Bouton + menu déroulant pour changer de foyer actif (header
// AppLayout) — remplace le <select> natif (voir la conversation) : un
// <select> ouvre un menu stylé par l'OS/le navigateur, ce qui casse
// l'esthétique glassmorphique sombre dès qu'on l'ouvre, surtout en
// mobile-first. Même pattern d'interaction que UserMenu.jsx (clic
// extérieur / Échap pour fermer).
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HouseIcon, ChevronDownIcon } from '../../components/ui/Icons';
import './HouseholdSwitcher.css';

export default function HouseholdSwitcher({ households, current }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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
    navigate(`/households/${householdId}`);
  }

  function handleAddHousehold() {
    setOpen(false);
    navigate('/onboarding');
  }

  return (
    <div className="household-switcher" ref={menuRef}>
      <button
        type="button"
        className="household-switcher__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="household-switcher__icon">
          <HouseIcon size={17} />
        </span>
        <span className="household-switcher__label">
          <span className="household-switcher__eyebrow">Foyer actif</span>
          <span className="household-switcher__name">
            {current?.name ?? '…'}
            <ChevronDownIcon size={10} />
          </span>
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
