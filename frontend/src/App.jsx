// App.jsx
// Point d'entrée applicatif : gère la session utilisateur.
//   - Pas connecté  -> onglets Inscription / Connexion / J'ai une invitation
//   - Connecté      -> AppShell (le tableau de bord)
//
// IMPORTANT — simplification assumée : la "session" est juste l'objet
// utilisateur renvoyé par signup/login/acceptInvitation, gardé dans
// localStorage pour survivre à un rafraîchissement de page. Ce n'est PAS un
// vrai système de jeton (pas d'expiration, pas de révocation côté serveur,
// pas de vérification que le compte existe encore). Suffisant pour tester
// en local ; à remplacer par un vrai jeton de session avant tout usage réel
// au-delà de ta propre machine.
import { useState, useEffect } from "react";
import { api } from "./api";
import SignupForm from "./components/auth/SignupForm";
import LoginForm from "./components/auth/LoginForm";
import ForgotPasswordForm from "./components/auth/ForgotPasswordForm";
import AcceptInvitationForm from "./components/auth/AcceptInvitationForm";
import AppShell from "./components/layout/AppShell";

const SESSION_KEY = "chez-nous-session";

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // stockage indisponible (navigation privée, etc.) : la session ne
    // survivra pas à un rafraîchissement, mais l'appli continue de marcher.
  }
}

// Un lien d'invitation ressemblerait à http://localhost:5173/?invite=LEJETON
function inviteTokenFromUrl() {
  return new URLSearchParams(window.location.search).get("invite") || "";
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [authView, setAuthView] = useState(inviteTokenFromUrl() ? "accept" : "signup"); // "signup" | "login" | "accept" | "forgot"
  const [householdUsers, setHouseholdUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Une fois connecté, récupère les membres du foyer (pour les listes
  // déroulantes "assigné à" dans les tâches). listUsers() renvoie TOUS les
  // utilisateurs (pas de filtre par foyer côté serveur) : le filtrage se
  // fait ici, côté client.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoadingUsers(true);
    api.listUsers().then((res) => {
      if (cancelled) return;
      if (res.success) {
        setHouseholdUsers(res.data.filter((u) => u.householdId === session.householdId));
      }
      setLoadingUsers(false);
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleAuthSuccess = (user) => {
    setSession(user);
    saveSession(user);
  };

  const handleLogout = () => {
    setSession(null);
    saveSession(null);
  };

  if (!session) {
    return (
      <div className="auth-shell">
        <h1 className="auth-shell__title">Chez nous</h1>

        {authView !== "forgot" && (
          <div className="seg-toggle auth-shell__tabs">
            <button
              type="button"
              className={authView === "signup" ? "seg-toggle__btn seg-toggle__btn--active" : "seg-toggle__btn"}
              onClick={() => setAuthView("signup")}
            >
              S'inscrire
            </button>
            <button
              type="button"
              className={authView === "login" ? "seg-toggle__btn seg-toggle__btn--active" : "seg-toggle__btn"}
              onClick={() => setAuthView("login")}
            >
              Se connecter
            </button>
            <button
              type="button"
              className={authView === "accept" ? "seg-toggle__btn seg-toggle__btn--active" : "seg-toggle__btn"}
              onClick={() => setAuthView("accept")}
            >
              J'ai une invitation
            </button>
          </div>
        )}

        {authView === "signup" && (
          <SignupForm
            onSubmit={async (values) => {
              const res = await api.signup(values);
              if (res.success) handleAuthSuccess(res.data.user);
              return res;
            }}
          />
        )}

        {authView === "login" && (
          <>
            <LoginForm
              onSubmit={async (values) => {
                const res = await api.login(values);
                if (res.success) handleAuthSuccess(res.data);
                return res;
              }}
            />
            <button type="button" className="ghost-btn" onClick={() => setAuthView("forgot")}>
              Mot de passe oublié ?
            </button>
          </>
        )}

        {authView === "forgot" && (
          <ForgotPasswordForm
            onRequestReset={(email) => api.requestPasswordReset(email)}
            onConfirmReset={(values) => api.resetPassword(values)}
            onBackToLogin={() => setAuthView("login")}
          />
        )}

        {authView === "accept" && (
          <AcceptInvitationForm
            token={inviteTokenFromUrl()}
            onSubmitCreate={async (values) => {
              const res = await api.acceptInvitation(values);
              if (res.success) handleAuthSuccess(res.data);
              return res;
            }}
            onSubmitExisting={async (values) => {
              const res = await api.acceptInvitationForExistingUser(values);
              if (res.success) handleAuthSuccess(res.data);
              return res;
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="app-topbar">
        <span>Connecté en tant que {session.name}</span>
        <button type="button" className="ghost-btn" onClick={handleLogout}>
          Se déconnecter
        </button>
      </div>

      {loadingUsers ? (
        <p className="item-grid__state">Chargement…</p>
      ) : (
        <AppShell users={householdUsers} householdId={session.householdId} currentUserId={session.id} />
      )}
    </div>
  );
}
