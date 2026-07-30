-- ============================================================
-- Chez Nous (Homee) — Correctif : bootstrap SELECT sur households
--
-- Bug trouvé après une longue session de diagnostic (voir la
-- conversation pour le détail complet) : `.insert().select()` relit la
-- ligne juste insérée pour la renvoyer au client — cette relecture est
-- soumise à la policy de SELECT, pas seulement à celle d'INSERT.
--
-- Au moment exact de cette relecture, aucune ligne n'existe encore
-- dans household_members pour ce foyer tout neuf (elle est insérée
-- juste après, en 2e étape côté application, dans
-- householdService.js::createHousehold). La policy SELECT existante
-- (`is_household_member`) échoue donc systématiquement à cet instant
-- précis, et Postgres renvoie "new row violates row-level security
-- policy" — un message IDENTIQUE à un vrai refus d'INSERT, ce qui a
-- rendu le diagnostic trompeur (la policy d'INSERT elle-même était
-- correcte depuis le début).
--
-- Correctif : une policy SELECT supplémentaire, qui autorise un compte
-- à voir un foyer qu'il vient de créer lui-même, en plus d'être membre
-- via household_members. Les policies de SELECT se combinent en OR.
-- ============================================================

create policy "households_select_own_on_create"
  on public.households for select
  using (created_by = auth.uid());
