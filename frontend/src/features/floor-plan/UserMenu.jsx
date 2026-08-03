// UserMenu.jsx
// Menu déroulant du profil (header AppLayout) — remplace la cloche de
// notifications (voir la conversation) : Profil (-> /profile) et
// Réglages (-> /settings) mènent maintenant vers de vraies pages (voir
// la conversation, prototypes v0.1.2) ; Déconnexion fonctionnelle via
// useAuth().signOut() — jusqu'ici aucun écran du foyer n'exposait de
// bouton de déconnexion facilement accessible.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { UserIcon, SettingsIcon, LogoutIcon } from '../../components/ui/Icons';
import './UserMenu.css';

export default function UserMenu() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Ferme le menu au clic en dehors ou à la touche Échap — comportement
  // standard attendu d'un menu déroulant, pas de librairie dédiée pour
  // un menu aussi simple (3 items fixes).
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

  function handleSignOut() {
    setOpen(false);
    signOut();
  }

  function handleProfile() {
    setOpen(false);
    navigate('/profile');
  }

  function handleSettings() {
    setOpen(false);
    navigate('/settings');
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu__trigger"
        aria-label="Menu profil"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <UserIcon size={18} />
      </button>

      {open && (
        <div className="user-menu__panel" role="menu">
          <button type="button" className="user-menu__item" role="menuitem" onClick={handleProfile}>
            <UserIcon size={15} />
            <span>Profil</span>
          </button>

          <button type="button" className="user-menu__item" role="menuitem" onClick={handleSettings}>
            <SettingsIcon size={15} />
            <span>Réglages</span>
          </button>

          <div className="user-menu__divider" />

          <button type="button" className="user-menu__item user-menu__item--danger" role="menuitem" onClick={handleSignOut}>
            <LogoutIcon size={15} />
            <span>Se déconnecter</span>
          </button>
        </div>
      )}
    </div>
  );
}
