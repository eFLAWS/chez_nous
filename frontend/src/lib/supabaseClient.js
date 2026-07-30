// supabaseClient.js
// Point d'accès unique au client Supabase (Auth, base Postgres via
// PostgREST, Storage). Toute la config vient des variables
// d'environnement Vite (préfixe VITE_ obligatoire pour être exposées au
// navigateur) — jamais de valeur en dur ici.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables Supabase manquantes : vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans ton .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
