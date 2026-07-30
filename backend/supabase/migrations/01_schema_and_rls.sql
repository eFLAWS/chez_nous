-- ============================================================
-- Chez Nous (Homee) — Étape 3 : schéma Postgres + RLS
-- À exécuter dans Supabase → SQL Editor
--
-- Hypothèses posées (à valider contre docs/DATA_MODEL.md) :
--   - Un seul floor_plan par foyer (household_id UNIQUE sur floor_plans)
--   - expenses : version simple sans répartition détaillée pour l'instant
--   - La règle métier "transfert de propriété PROPRIETAIRE (N>1 bloqué,
--     N=1 cascade delete)" n'est PAS implémentée ici : nécessitera une
--     fonction dédiée dans une étape ultérieure (hors périmètre "créer
--     les tables").
--   - Le trigger d'event "ensure_rls" déjà en place chez toi active RLS
--     automatiquement à la création de chaque table. Les
--     `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` ci-dessous sont donc
--     redondants avec ce trigger, mais laissés explicites pour que ce
--     script reste autonome (idempotent, sans effet de bord si RLS est
--     déjà activé).
-- ============================================================

-- ------------------------------------------------------------
-- 1. ENUMS
-- ------------------------------------------------------------

create type household_role as enum ('PROPRIETAIRE', 'LOCATAIRE');
create type occupant_type as enum ('human', 'pet');
create type task_status as enum ('todo', 'in_progress', 'done');

-- ------------------------------------------------------------
-- 2. TABLES
-- ------------------------------------------------------------

-- Profil applicatif lié à auth.users (Supabase Auth gère le mot de
-- passe/session ; cette table ne stocke jamais de credentials).
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- Table de jonction foyer <-> compte, porteuse du rôle.
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role household_role not null,
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- Occupants (humains ou animaux) — distincts des comptes users.
-- Un occupant humain peut exister sans compte, puis être "réclamé".
create table public.occupants (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type occupant_type not null,
  species text,
  claimed_by_user_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint occupant_species_only_for_pet
    check (type = 'pet' or species is null),
  constraint occupant_pet_never_claimed
    check (type = 'human' or claimed_by_user_id is null)
);

-- Plan du foyer : SOURCE UNIQUE DE VÉRITÉ en JSONB (floors, rooms,
-- doors, furniture, spatialNotes regroupés à l'intérieur). Un seul
-- plan par foyer.
create table public.floor_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null unique references public.households(id) on delete cascade,
  layout_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  description text,
  -- room_id : référence LIBRE vers un id de pièce dans layout_data
  -- (pas de FK réelle possible, la pièce vit dans le JSONB, pas dans
  -- une table à part).
  room_id text,
  assignee_user_id uuid references public.users(id),
  assignee_occupant_id uuid references public.occupants(id),
  recurrence_days int,
  status task_status not null default 'todo',
  due_date date,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  amount numeric(10, 2) not null,
  paid_by_user_id uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

-- Index sur les FK household_id (perf des filtres par foyer, quasi
-- systématiques dans ce projet).
create index on public.household_members (household_id);
create index on public.household_members (user_id);
create index on public.occupants (household_id);
create index on public.tasks (household_id);
create index on public.expenses (household_id);

-- ------------------------------------------------------------
-- 3. SYNCHRO auth.users -> public.users
-- ------------------------------------------------------------
-- ATTENTION : vérifie que tu n'as pas déjà un trigger équivalent sur
-- auth.users (le tien affiché plus tôt ne concernait que l'activation
-- RLS, donc a priori pas de conflit, mais un doublon de trigger sur
-- l'INSERT ferait planter chaque inscription).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 4. FONCTIONS HELPER POUR LES POLICIES
-- ------------------------------------------------------------
-- SECURITY DEFINER : évite la récursion RLS (une policy sur
-- household_members qui interrogerait household_members elle-même
-- provoquerait une boucle si elle n'était pas en security definer).

create or replace function public.is_household_member(_household_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = _household_id
      and hm.user_id = auth.uid()
  );
$$;

create or replace function public.get_household_role(_household_id uuid)
returns household_role
language sql
security definer
stable
as $$
  select hm.role from public.household_members hm
  where hm.household_id = _household_id
    and hm.user_id = auth.uid()
  limit 1;
$$;

-- ------------------------------------------------------------
-- 5. RLS — activation explicite (redondant avec ton trigger, gardé
--    pour que ce script reste autonome)
-- ------------------------------------------------------------

alter table public.users enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.occupants enable row level security;
alter table public.floor_plans enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;

-- ------------------------------------------------------------
-- 6. POLICIES
-- ------------------------------------------------------------

-- ===== users =====
-- Visible : soi-même, ou toute personne partageant un foyer commun.
create policy "users_select_self_or_household"
  on public.users for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.household_members hm1
      join public.household_members hm2 on hm1.household_id = hm2.household_id
      where hm1.user_id = auth.uid() and hm2.user_id = users.id
    )
  );

create policy "users_update_self"
  on public.users for update
  using (id = auth.uid());

-- ===== households =====
create policy "households_select_members"
  on public.households for select
  using (public.is_household_member(id));

-- Création : n'importe quel compte authentifié peut créer un foyer,
-- à condition d'être renseigné comme created_by (il en devient
-- PROPRIETAIRE via l'insert dans household_members qui suit, voir
-- policy de bootstrap plus bas).
create policy "households_insert_authenticated"
  on public.households for insert
  with check (created_by = auth.uid());

create policy "households_update_owner"
  on public.households for update
  using (public.get_household_role(id) = 'PROPRIETAIRE');

create policy "households_delete_owner"
  on public.households for delete
  using (public.get_household_role(id) = 'PROPRIETAIRE');

-- ===== household_members =====
create policy "members_select_household"
  on public.household_members for select
  using (public.is_household_member(household_id));

-- Cas normal : seul un PROPRIETAIRE gère les membres (invite, retire,
-- change un rôle) une fois que le foyer existe déjà.
create policy "members_manage_owner"
  on public.household_members for all
  using (public.get_household_role(household_id) = 'PROPRIETAIRE')
  with check (public.get_household_role(household_id) = 'PROPRIETAIRE');

-- Cas de bootstrap : à la création d'un foyer, aucune ligne
-- household_members n'existe encore -> get_household_role() renvoie
-- NULL et la policy ci-dessus bloquerait tout le monde, y compris le
-- créateur. Cette policy autorise UNIQUEMENT le créateur du foyer à
-- s'insérer lui-même comme premier membre.
create policy "members_insert_self_as_owner_on_create"
  on public.household_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.households h
      where h.id = household_id and h.created_by = auth.uid()
    )
  );

-- ===== occupants =====
-- Accès complet pour tout membre du foyer (pas de distinction de rôle
-- ici — la spatial/task management reste ouverte aux deux rôles).
create policy "occupants_all_members"
  on public.occupants for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ===== floor_plans =====
-- Lecture pour tous les membres ; écriture réservée au PROPRIETAIRE
-- (LOCATAIRE = lecture seule sur le plan).
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

-- ===== tasks =====
-- Accès complet pour tout membre (PROPRIETAIRE et LOCATAIRE).
create policy "tasks_all_members"
  on public.tasks for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ===== expenses =====
-- Accès complet pour tout membre (PROPRIETAIRE et LOCATAIRE).
create policy "expenses_all_members"
  on public.expenses for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
