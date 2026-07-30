// src/features/household/HouseholdRoot.jsx
// Orchestrateur de plus haut niveau : Authentification (réelle) ->
// Dashboard (sélection/création de logement, VRAIS foyers) ->
// ApartmentSpatialMvp, borné à UN logement à la fois. C'est CE composant
// que main.jsx monte à la place d'App.jsx pour le MVP.
//
// ÉTAPES 3 ET 4/4, TERMINÉES (voir la conversation) : la LISTE des
// logements ET le PLAN de chacun (étages/pièces/portes) sont maintenant
// tous les deux branchés sur le vrai backend — plus de mock localStorage
// nulle part dans ce flux. `selectedHousingId` EST directement le vrai
// id du foyer côté backend (plus de clé synthétique nécessaire) —
// transmis tel quel à ApartmentSpatialMvp.jsx comme `householdId`.
//
// "occupantsCount" par logement : le backend ne renvoie pas ce compte
// directement dans listHouseholdsForUser — recalculé ici avec un appel
// listOccupants par logement (occupants humains RÉCLAMÉS), pour que
// HousingDashboard.jsx puisse choisir "Quitter" vs "Supprimer" sans
// changement de son côté (même contrat qu'avant, juste des vraies
// données dessous). Le backend revérifie de toute façon ce compte
// lui-même avant d'accepter une suppression réelle (jamais fait
// confiance au frontend pour ça, voir userService.js).
import { useState, useEffect } from "react";
import { api } from "../../api";
import SignupForm from "../auth/SignupForm";
import { HouseIcon } from "../../components/ui/Icons";
import LoginForm from "../auth/LoginForm";
import HousingDashboard from "./HousingDashboard";
import ApartmentSpatialMvp from "./ApartmentSpatialMvp";
import "./HouseholdRoot.css";

const SESSION_KEY = "chez-nous-session"; // même clé que App.jsx, volontairement

function loadSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  try {
    if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Stockage indisponible (navigation privée...) : la session ne
    // survivra pas à un rafraîchissement, mais l'appli continue de marcher.
  }
}

/** Charge les foyers d'un compte, avec le nombre d'occupants humains
 * réclamés pour chacun (un appel listOccupants par foyer). */
async function fetchHousingsWithOccupantCounts(userId) {
  const res = await api.listHouseholdsForUser(userId);
  if (!res.success) return [];

  const withCounts = await Promise.all(
    res.data.map(async (household) => {
      const occRes = await api.listOccupants(household.id);
      const occupantsCount = occRes.success
        ? occRes.data.filter((o) => o.type === "human" && o.claimedByUserId).length
        : 1; // repli prudent : suppose "dernier occupant" si le compte échoue, pour ne jamais bloquer une suppression légitime sans raison
      return { id: household.id, name: household.name, occupantsCount };
    })
  );
  return withCounts;
}

export default function HouseholdRoot() {
  const [session, setSession] = useState(loadSession);
  const [authView, setAuthView] = useState("signup"); // "signup" | "login"
  const [housings, setHousings] = useState([]);
  const [housingsLoading, setHousingsLoading] = useState(false);
  const [housingActionError, setHousingActionError] = useState(null);
  const [selectedHousingId, setSelectedHousingId] = useState(null);
  const [justCreated, setJustCreated] = useState(false);

  // Recharge la liste des foyers à chaque changement de compte (connexion,
  // déconnexion/reconnexion avec un autre compte).
  useEffect(() => {
    if (!session) {
      setHousings([]);
      return;
    }
    let cancelled = false;
    setHousingsLoading(true);
    fetchHousingsWithOccupantCounts(session.id).then((list) => {
      if (!cancelled) {
        setHousings(list);
        setHousingsLoading(false);
      }
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
    setSelectedHousingId(null);
    setJustCreated(false);
  };

  const handleCreateHousing = async (customName) => {
    setHousingActionError(null);
    const householdName = (customName && customName.trim()) || `Logement ${housings.length + 1}`;
    const res = await api.createHouseholdForUser({ userId: session.id, householdName });
    if (!res.success) {
      // Corrige un vrai bug signalé ("le bouton n'ouvre rien") : cet
      // échec était avalé en silence jusqu'ici, sans jamais rien
      // afficher — exactement ce qui donne l'impression que le bouton
      // ne fait rien. Le serveur backend doit être démarré (node
      // server.js) pour que cet appel puisse réussir.
      setHousingActionError(res.error || "Impossible de créer le logement. Le serveur est-il démarré ?");
      return;
    }
    const newHousing = { id: res.data.household.id, name: res.data.household.name, occupantsCount: 1 };
    setHousings((prev) => [...prev, newHousing]);
    setJustCreated(true);
    setSelectedHousingId(newHousing.id);
  };

  const handleSelectHousing = (housingId) => {
    setJustCreated(false);
    setSelectedHousingId(housingId);
  };

  const handleBackToDashboard = () => {
    setSelectedHousingId(null);
    setJustCreated(false);
  };

  // Quitte (occupantsCount > 1) ou supprime réellement (dernier occupant)
  // — le VRAI compte d'occupants vient du backend (voir
  // fetchHousingsWithOccupantCounts), mais le backend revérifie de toute
  // façon lui-même avant d'accepter une suppression réelle (jamais fait
  // confiance au frontend pour un calcul aussi conséquent).
  const handleRemoveHousing = async (housingId) => {
    setHousingActionError(null);
    const housing = housings.find((h) => h.id === housingId);
    const occupantsCount = housing?.occupantsCount ?? 1;

    const res =
      occupantsCount > 1
        ? await api.leaveHousehold(housingId, session.id)
        : await api.deleteHousehold(housingId, session.id);

    if (!res.success) {
      setHousingActionError(res.error || "Impossible de retirer ce logement.");
      return;
    }
    setHousings((prev) => prev.filter((h) => h.id !== housingId));
  };

  if (!session) {
    return (
      <div className="household-root__auth">
        <div className="household-root__glow household-root__glow--emerald" aria-hidden="true" />
        <div className="household-root__glow household-root__glow--amber" aria-hidden="true" />

        <div className="household-root__auth-card">
          <div className="household-root__auth-top">
            <div className="household-root__auth-header">
              <div className="household-root__auth-badge">
                <HouseIcon size={28} />
              </div>
              <h1 className="household-root__auth-title">Chez nous</h1>
              <p className="household-root__auth-subtitle">
                {authView === "signup" ? "Bienvenue chez vous ! Créer votre foyer" : "Ravi de vous revoir au foyer !"}
              </p>
            </div>

            <div className="household-root__auth-tabs">
              <button
                type="button"
                className={authView === "signup" ? "household-root__auth-tab household-root__auth-tab--active" : "household-root__auth-tab"}
                onClick={() => setAuthView("signup")}
              >
                S'inscrire
              </button>
              <button
                type="button"
                className={authView === "login" ? "household-root__auth-tab household-root__auth-tab--active" : "household-root__auth-tab"}
                onClick={() => setAuthView("login")}
              >
                Se connecter
              </button>
            </div>

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
              <LoginForm
                onSubmit={async (values) => {
                  const res = await api.login(values);
                  if (res.success) handleAuthSuccess(res.data);
                  return res;
                }}
              />
            )}
          </div>

          {/* Pied de page commun aux deux vues — ancré en bas du cadre
              (pas recentré avec le reste), pour ne pas bouger que le
              formulaire soit court (connexion) ou long (inscription).
              Lien "Règles du foyer" en placeholder (#) : la page des
              termes et conditions n'existe pas encore, viendra ensuite. */}
          <p className="household-root__auth-footer">
            En continuant, vous acceptez les{" "}
            <a href="#" className="household-root__auth-footer-link">
              Règles du Foyer
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  if (!selectedHousingId) {
    if (housingsLoading) {
      return <p className="household-root__loading">Chargement de tes logements...</p>;
    }
    return (
      <HousingDashboard
        housings={housings}
        userName={session.name}
        onLogout={handleLogout}
        onSelectHousing={handleSelectHousing}
        onCreateHousing={handleCreateHousing}
        onRemoveHousing={handleRemoveHousing}
        errorMessage={housingActionError}
      />
    );
  }

  const selectedHousing = housings.find((h) => h.id === selectedHousingId);

  return (
    <ApartmentSpatialMvp
      key={selectedHousingId}
      householdId={selectedHousingId}
      housingName={selectedHousing?.name}
      onBackToDashboard={handleBackToDashboard}
      startInEditor={justCreated}
    />
  );
}
