// householdService.js
// Accès Supabase pour la gestion des foyers (households) et
// l'appartenance (household_members). Remplace l'ancien flux
// POST /api/households de l'ancien backend Node.js — un foyer créé ici
// vit dans les vraies tables Supabase (étape 3 : households,
// household_members).
//
// Contrat uniforme { success, data?, error? }, comme partout ailleurs
// dans le projet.
import { supabase } from '../../lib/supabaseClient';

export async function listMyHouseholds(userId) {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, households ( id, name, created_at )')
    .eq('user_id', userId);

  if (error) return { success: false, error: error.message };

  const households = (data ?? []).map((row) => ({
    id: row.households.id,
    name: row.households.name,
    createdAt: row.households.created_at,
    role: row.role,
  }));

  return { success: true, data: households };
}

export async function createHousehold({ name, userId }) {
  const { data: household, error: householdError } = await supabase
    .from('households')
    .insert({ name, created_by: userId })
    .select()
    .single();

  if (householdError) return { success: false, error: householdError.message };

  const { error: memberError } = await supabase.from('household_members').insert({
    household_id: household.id,
    user_id: userId,
    role: 'PROPRIETAIRE',
  });

  if (memberError) {
    // Le foyer a été créé mais l'affectation du rôle a échoué — état
    // incohérent à signaler clairement plutôt qu'à masquer.
    return {
      success: false,
      error: `Foyer créé mais échec de l'affectation du rôle : ${memberError.message}`,
    };
  }

  return { success: true, data: household };
}
