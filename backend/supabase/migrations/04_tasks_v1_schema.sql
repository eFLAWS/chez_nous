-- ============================================================
-- Chez Nous (Homee) — Chantier 🅲 : schéma Tâches V1
-- Réf. produit : PRODUCTVISION.md §4 (section enrichie 03/08/2026)
--
-- ⚠️ PROPOSITION — PAS ENCORE EXÉCUTÉE SUR LE PROJET SUPABASE RÉEL.
-- À valider par Paul avant exécution (voir le message d'accompagnement
-- pour le détail de chaque décision et les points ouverts). Une fois
-- exécuté et confirmé, DATAMODEL.md/PROJECT.md seront mis à jour en
-- conséquence — même logique que les migrations 02/03 (§4 de
-- PROJECT.md : "confirmer que la migration a bien été EXÉCUTÉE, pas
-- seulement écrite").
--
-- Portée :
--   1. Enrichit `tasks` (importance, deadline_offset_days, dépendance
--      d'instance V1, rattachement à un groupe).
--   2. Ajoute `task_groups` (remplace l'ancienne piste `task_rooms` —
--      décision déjà actée le 03/08/2026, PROJECT.md §Phase 2/🅲).
--   3. Ajoute `task_assignees` (assignation multi-personnes,
--      utilisateur OU occupant non-utilisateur) — remplace les
--      colonnes uniques `assigned_to`/`assigned_to_occupant_id`.
--
-- Décisions prises pour cette proposition (signalées aussi dans le
-- message d'accompagnement — à confirmer ou corriger avant exécution) :
--   D1. `assigned_to`/`assigned_to_occupant_id` migrées vers
--       `task_assignees` PUIS supprimées de `tasks` (étape destructive
--       mais sans risque : aucune UI réelle ne les consomme encore,
--       voir HouseholdTasksPage.jsx = placeholder).
--   D2. `task_assignees.household_id` dénormalisée (comme `tasks`/
--       `expenses`) pour des policies RLS simples, cohérentes avec le
--       pattern déjà en place — remplie automatiquement par trigger
--       depuis `tasks.household_id`, jamais depuis la valeur envoyée
--       par le client (évite une incohérence assignee/tâche).
--   D3. `tasks.task_group_id` → ON DELETE SET NULL : supprimer un
--       groupe ne supprime PAS les tâches qui le composent, juste le
--       lien (chaque tâche reste une entité autonome, cohérent avec
--       "instances distinctes, chacune avec son propre état").
--   D4. Pas de contrainte dure empêchant de renseigner à la fois
--       `due_date` ET `deadline_offset_days` — la règle "l'un ou
--       l'autre selon ponctuelle/récurrente" reste appliquée côté
--       formulaire frontend pour l'instant, pas en base (à db durcir
--       plus tard si des incohérences apparaissent en usage réel).
--   D5. Pas de contrainte d'unicité sur `task_groups(household_id,
--       name)` — deux groupes de même nom sont autorisés pour l'instant
--       (facile à ajouter ensuite si souhaité, plus dur à retirer si
--       des données la violent déjà).
--
-- À exécuter APRÈS 01/02/03, dans Supabase → SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUM — niveau d'importance (purement informatif/visuel en V1)
-- ------------------------------------------------------------

create type task_importance as enum ('BASSE', 'NORMALE', 'HAUTE');

-- ------------------------------------------------------------
-- 2. TABLE `task_groups` — remplace l'ancienne piste `task_rooms`
-- ------------------------------------------------------------
-- Une même "sorte" de tâche répétée dans plusieurs pièces (ex. "Laver
-- les vitres" Salon + Cuisine) = plusieurs lignes `tasks` distinctes,
-- une par pièce, chacune avec son propre statut — simplement
-- rattachées à un groupe commun. PAS de notion de pièces multiples
-- portée par `task_groups` lui-même (les pièces restent sur chaque
-- ligne `tasks.room_id`, inchangé).

create table public.task_groups (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  icon text, -- optionnel, ex. emoji/nom d'icône par défaut suggéré aux instances
  color text, -- optionnel, hex — cohérence visuelle entre les instances d'un même groupe
  created_at timestamptz not null default now()
);

create index on public.task_groups (household_id);

alter table public.task_groups enable row level security;

-- Accès complet pour tout membre du foyer (même règle que `tasks` :
-- PROPRIETAIRE et LOCATAIRE ont tous deux droit de créer/gérer les
-- tâches, DATAMODEL.md §3).
create policy "task_groups_all_members"
  on public.task_groups for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ------------------------------------------------------------
-- 3. `tasks` — nouvelles colonnes V1
-- ------------------------------------------------------------

alter table public.tasks
  add column importance task_importance not null default 'NORMALE',
  add column deadline_offset_days int, -- récurrentes : délai relatif après le DÉBUT de chaque occurrence (voir due_date, D4 plus haut)
  add column task_group_id uuid references public.task_groups(id) on delete set null,
  add column depends_on_task_id uuid references public.tasks(id) on delete set null, -- V1 : dépendance d'INSTANCE uniquement, informative
  add column depends_on_every_n int not null default 1; -- "toutes les N occurrences de la dépendance" — voir PRODUCTVISION.md §4, mécanisme de couplage

alter table public.tasks
  add constraint tasks_deadline_offset_days_positive
    check (deadline_offset_days is null or deadline_offset_days >= 0),
  add constraint tasks_depends_on_every_n_positive
    check (depends_on_every_n >= 1),
  add constraint tasks_no_self_dependency
    check (depends_on_task_id is distinct from id);

create index on public.tasks (task_group_id) where task_group_id is not null;
create index on public.tasks (depends_on_task_id) where depends_on_task_id is not null;

-- ------------------------------------------------------------
-- 4. TABLE `task_assignees` — assignation multi-personnes
-- ------------------------------------------------------------
-- Une ligne = une personne assignée à une tâche, qu'il s'agisse d'un
-- compte utilisateur OU d'un occupant non-utilisateur (ex. "le chat").
-- Exactement une des deux colonnes doit être renseignée (jamais les
-- deux, jamais aucune) — voir contrainte plus bas.
--
-- Rappel produit (décidé 03/08/2026) : n'importe quel assigné qui
-- coche la tâche la termine pour tout le monde — cette table ne porte
-- donc PAS de statut par assigné, seul `tasks.status` fait foi.

create table public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade, -- rempli par trigger, voir plus bas (D2)
  user_id uuid references public.users(id) on delete cascade,
  occupant_id uuid references public.occupants(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint task_assignees_exactly_one_target
    check (num_nonnulls(user_id, occupant_id) = 1)
);

-- Empêche d'assigner deux fois la même personne/le même occupant à la
-- même tâche (index partiels, une contrainte UNIQUE classique ne
-- fonctionne pas ici : NULL != NULL en SQL empêcherait toute
-- déduplication utile sur la colonne toujours vide de l'autre cas).
create unique index task_assignees_unique_user
  on public.task_assignees (task_id, user_id) where user_id is not null;
create unique index task_assignees_unique_occupant
  on public.task_assignees (task_id, occupant_id) where occupant_id is not null;

create index on public.task_assignees (task_id);
create index on public.task_assignees (household_id);

alter table public.task_assignees enable row level security;

create policy "task_assignees_all_members"
  on public.task_assignees for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- `household_id` toujours dérivé de la tâche référencée, jamais de la
-- valeur envoyée par le client (D2) — évite qu'un assignee affiche un
-- household_id incohérent avec sa tâche réelle.
create or replace function public.task_assignees_set_household_id()
returns trigger
language plpgsql
as $$
begin
  select household_id into strict new.household_id
  from public.tasks
  where id = new.task_id;
  return new;
end;
$$;

create trigger task_assignees_before_insert
  before insert on public.task_assignees
  for each row execute function public.task_assignees_set_household_id();

-- ------------------------------------------------------------
-- 5. Migration des données existantes (assigned_to /
--    assigned_to_occupant_id -> task_assignees), PUIS suppression des
--    anciennes colonnes (D1)
-- ------------------------------------------------------------

insert into public.task_assignees (task_id, household_id, user_id)
select id, household_id, assigned_to
from public.tasks
where assigned_to is not null;

insert into public.task_assignees (task_id, household_id, occupant_id)
select id, household_id, assigned_to_occupant_id
from public.tasks
where assigned_to_occupant_id is not null;

alter table public.tasks
  drop column assigned_to,
  drop column assigned_to_occupant_id;

-- ============================================================
-- Fin. Rappel : exécuter, tester (création de groupe, assignation
-- multi-personnes/occupant, dépendance d'instance), PUIS confirmer
-- ici pour que DATAMODEL.md/PROJECT.md soient mis à jour en
-- conséquence.
-- ============================================================
