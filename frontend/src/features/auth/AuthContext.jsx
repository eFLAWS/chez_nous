// AuthContext.jsx
// Session Supabase partagée dans toute l'app. AuthProvider écoute les
// changements de session (connexion, déconnexion, rafraîchissement de
// jeton) via onAuthStateChange, et expose signUp/signIn/signOut avec le
// contrat { success, data?, error? } utilisé partout ailleurs dans le
// projet.
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // true tant qu'on n'a pas encore la réponse de getSession() — évite
  // un flash "non connecté" au premier rendu pendant que Supabase
  // vérifie une session existante (ex. après un rafraîchissement de page).
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!isMounted) return;
      setSession(currentSession);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signUp({ email, password, name }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // "name" atterrit dans raw_user_meta_data côté auth.users, lu par
      // le trigger handle_new_user() (étape 3) pour préremplir public.users.name.
      options: { data: { name } },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth() doit être appelé à l'intérieur de <AuthProvider>");
  }
  return ctx;
}
