-- ============================================================
-- Chez Nous (Homee) — Réconciliation avec docs/DATA_MODEL.md
--
-- Le script 01_schema_and_rls.sql a été écrit sans avoir accès au vrai
-- docs/DATA_MODEL.md (canonique) — plusieurs écarts ont été trouvés en
-- le lisant enfin. Ce script les corrige. À exécuter APRÈS le 01,
-- dans Supabase → SQL Editor.
--
-- ⚠️ DESTRUCTIF sur households / household_members / floor_plans /
-- tasks / expenses (DROP + recréation) — sans risque ici vu qu'il n'y a
-- que des données de test à ce stade. Si tu as des données à garder,
-- dis-le AVANT d'exécuter, on écrira des ALTER TABLE à la place.
--
-- Écarts corrigés :
--   1. households.invite_code (manquant) — ajouté, généré
--      automatiquement à la création (format "K9B-2X1").
--   2. floor_plans.version (manquant) — ajouté, pour le verrou
--      optimiste mentionné dans DATA_MODEL.md section 3.
--   3. tasks : assignee_user_id -> assigned_to (nom exact du doc),
--      status en MAJUSCULES (TODO/IN_PROGRESS/DONE, pas
--      todo/in_progress/done), room_id en varchar(50), due_date en
--      timestamptz (pas date).
--   4. expenses : paid_by_user_id -> paid_by (nom exact du doc),
--      category ajoutée (varchar(50), défaut 'GENERAL').
--
-- Écarts PAS corrigés — extensions volontairement conservées, absentes
-- du DATA_MODEL.md actuel (je fais l'hypothèse qu'elles ont été omises
-- du document plutôt que délibérément abandonnées — à confirmer) :
--   - Table `occupants` entière (humains/animaux, distincts des
--     comptes) : conservée telle quelle.
--   - tasks.description, tasks.recurrence_days,
--     tasks.assignee_occupant_id : conservés (permettent d'assigner
--     une tâche à un occupant non-utilisateur, ex. un animal — perdu
--     si on s'alignait strictement sur le seul `assigned_to` du doc).
--   - users : le doc décrit `password_hash`/`display_name`/
--     `avatar_url`, mais avec Supabase Auth le mot de passe vit dans
--     `auth.users`, jamais dupliqué dans `public.users` — ce serait un
--     vrai problème de sécurité de le stocker deux fois. `display_name`
--     et `avatar_url` ajoutés (renommage de `name` -> `display_name`,
--     `avatar_url` nouveau) ; `password_hash` volontairement absent.
--
-- Je propose de mettre à jour docs/DATA_MODEL.md pour documenter ces
-- extensions explicitement (fichier fourni séparément) plutôt que de
-- les supprimer silencieusement du code.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Nettoyage (ordre : dépendants d'abord)
-- ------------------------------------------------------------
drop table if exists public.tasks cascade;
drop table if exists public.expenses cascade;
drop table if exists public.floor_plans cascade;
drop table if exists public.household_members cascade;
drop table if exists public.households cascade;
drop type if exists task_status cascade;

-- ------------------------------------------------------------
-- 1. Enum tasks.status — valeurs exactes du DATA_MODEL.md
-- ------------------------------------------------------------
create type task_status as enum ('TODO', 'IN_PROGRESS', 'DONE');

-- ------------------------------------------------------------
-- 2. users — ajustements (display_name, avatar_url ; pas de
--    password_hash, voir note en tête de fichier)
-- ------------------------------------------------------------
alter table public.users rename column name to display_name;
alter table public.users add column if not exists avatar_url text;

-- ------------------------------------------------------------
-- 3. households — invite_code + génération automatique
-- ------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code varchar(10) unique not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sans 0/O/1/I/L (ambigus)
  raw_code text;
  candidate text;
  already_taken boolean;
begin
  loop
    raw_code := (
      select string_agg(substr(chars, (floor(random() * length(chars)) + 1)::int, 1), '')
      from generate_series(1, 6)
    );
    candidate := substr(raw_code, 1, 3) || '-' || substr(raw_code, 4, 3);
    select exists(select 1 from public.households where invite_code = candidate) into already_taken;
    exit when not already_taken;
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_invite_code()
returns trigger
language plpgsql
as $$
begin
  if new.invite_code is null then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end;
$$;

create trigger households_set_invite_code
  before insert on public.households
  for each row execute function public.set_invite_code();

-- ------------------------------------------------------------
-- 4. household_members — inchangé, juste recréé après le DROP
-- ------------------------------------------------------------
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role household_role not null,
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create index on public.household_members (household_id);
create index on public.household_members (user_id);

-- ------------------------------------------------------------
-- 5. floor_plans — + version (verrou optimiste)
-- ------------------------------------------------------------
create table public.floor_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  layout_data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 6. tasks — noms/casse alignés + extensions conservées
-- ------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text, -- extension conservée, absente du doc
  room_id varchar(50),
  assigned_to uuid references public.users(id), -- nom exact du doc
  assigned_to_occupant_id uuid references public.occupants(id), -- extension conservée
  recurrence_days int, -- extension conservée, absente du doc
  status task_status not null default 'TODO',
  due_date timestamptz,
  created_at timestamptz not null default now()
);

create index on public.tasks (household_id);

-- ------------------------------------------------------------
-- 7. expenses — noms alignés + category ajoutée
-- ------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  amount numeric(10, 2) not null,
  category varchar(50) not null default 'GENERAL',
  paid_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index on public.expenses (household_id);

-- ------------------------------------------------------------
-- 8. RLS — réactivé automatiquement par ton trigger "ensure_rls" à
--    chaque CREATE TABLE ci-dessus. Rappel explicite par sécurité.
-- ------------------------------------------------------------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.floor_plans enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;

-- ------------------------------------------------------------
-- 9. Policies — identiques au 01 (household_id/role inchangés),
--    à recréer car le DROP CASCADE les a supprimées avec les tables.
-- ------------------------------------------------------------
create policy "households_select_members"
  on public.households for select
  using (public.is_household_member(id));

create policy "households_insert_authenticated"
  on public.households for insert
  with check (created_by = auth.uid());

create policy "households_update_owner"
  on public.households for update
  using (public.get_household_role(id) = 'PROPRIETAIRE');

create policy "households_delete_owner"
  on public.households for delete
  using (public.get_household_role(id) = 'PROPRIETAIRE');

create policy "members_select_household"
  on public.household_members for select
  using (public.is_household_member(household_id));

create policy "members_manage_owner"
  on public.household_members for all
  using (public.get_household_role(household_id) = 'PROPRIETAIRE')
  with check (public.get_household_role(household_id) = 'PROPRIETAIRE');

create policy "members_insert_self_as_owner_on_create"
  on public.household_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.households h
      where h.id = household_id and h.created_by = auth.uid()
    )
  );

create policy "floor_plans_select_members"
  on public.floor_plans for select
  using (public.is_household_member(household_id));

create policy "floor_plans_insert_owner"
  on public.floor_plans for insert
  with check (public.get_household_role(household_id) = 'PROPRIETAIRE');

create policy "floor_plans_update_owner"
  on public.floor_plans for update
  using (public.get_household_role(household_id) = 'PROPRIETAIRE');

create policy "floor_plans_delete_owner"
  on public.floor_plans for delete
  using (public.get_household_role(household_id) = 'PROPRIETAIRE');

create policy "tasks_all_members"
  on public.tasks for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "expenses_all_members"
  on public.expenses for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
