-- =============================================================================
-- NutriAI / traking-food — esquema inicial para Supabase (Postgres)
--
-- Bloques:
--   1. Caché de USDA FoodData Central: foods + food_queries
--   2. Usuarios: profiles (1:1 con auth.users)
--   3. Historial: meals + meal_items (totales recalculados por trigger)
--   4. Row Level Security
--   5. Función de resumen diario
--
-- Convenciones:
--   - Nutrientes de `foods` por 100 g; en `meal_items` ya escalados a `grams`.
--   - Solo el backend (clave service_role) escribe en la caché y en el historial.
--   - La app solo usa Supabase para autenticarse; con el JWT llama al backend.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Utilidad: mantener updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. CACHÉ USDA
-- =============================================================================

-- Alimento tal y como lo conocemos de USDA, nutrientes por 100 g.
create table public.foods (
  fdc_id        bigint primary key,
  description   text        not null,
  data_type     text,                           -- Foundation | SR Legacy | Branded | Survey (FNDDS)
  calories      numeric(8,2),                   -- kcal / 100 g (null si USDA no lo trae → Atwater en backend)
  protein       numeric(8,2),
  carbohydrates numeric(8,2),
  fat           numeric(8,2),
  raw           jsonb,                          -- respuesta USDA completa, por si hacen falta más nutrientes
  fetched_at    timestamptz not null default now()
);

comment on table public.foods is 'Caché de alimentos USDA FoodData Central. Nutrientes por 100 g.';

-- Término de búsqueda normalizado → alimento elegido.
-- Caché positiva (fdc_id no nulo) y negativa (fdc_id nulo), ambas con caducidad.
create table public.food_queries (
  query_normalized text primary key,            -- minúsculas, sin acentos, espacios colapsados
  fdc_id           bigint references public.foods (fdc_id) on delete set null,
  score            numeric(8,3),                 -- score de USDA del elegido
  candidates       jsonb       not null default '[]'::jsonb,
                                                -- [{ "fdcId", "description", "dataType", "score" }]
  hit_count        integer     not null default 0,
  resolved_at      timestamptz not null default now(),
  expires_at       timestamptz not null,        -- positiva: +90 días · negativa: +7 días
  constraint food_queries_query_not_blank check (char_length(btrim(query_normalized)) > 0)
);

create index food_queries_expires_at_idx on public.food_queries (expires_at);
create index food_queries_fdc_id_idx     on public.food_queries (fdc_id);

comment on table public.food_queries is
  'Mapa término normalizado → fdc_id. fdc_id nulo = caché negativa (USDA no encontró nada).';

-- =============================================================================
-- 2. USUARIOS
-- =============================================================================

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  name               text        not null default '' check (char_length(name) <= 40),
  daily_calorie_goal integer     not null default 2000 check (daily_calorie_goal > 0),
  protein_goal       integer     not null default 100  check (protein_goal > 0),
  carbs_goal         integer     not null default 250  check (carbs_goal > 0),
  fat_goal           integer     not null default 65   check (fat_goal > 0),
  timezone           text        not null default 'Europe/Madrid',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse un usuario en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 3. HISTORIAL DE COMIDAS
-- =============================================================================

create table public.meals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  eaten_at      timestamptz not null default now(),
  meal_type     text        check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  source        text        not null default 'photo' check (source in ('photo', 'manual')),
  model         text,                           -- modelo de Gemini usado en el análisis
  -- Totales denormalizados; los mantiene el trigger de meal_items.
  calories      numeric(8,1) not null default 0,
  protein       numeric(8,1) not null default 0,
  carbohydrates numeric(8,1) not null default 0,
  fat           numeric(8,1) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index meals_user_eaten_at_idx on public.meals (user_id, eaten_at desc);

create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();

create table public.meal_items (
  id            uuid primary key default gen_random_uuid(),
  meal_id       uuid        not null references public.meals (id) on delete cascade,
  position      smallint    not null default 0,
  name          text        not null,           -- nombre en español (Gemini)
  usda_query    text,                           -- término enviado a USDA
  fdc_id        bigint      references public.foods (fdc_id) on delete set null,
  usda_match    text,                           -- descripción USDA en el momento del análisis
  grams         numeric(7,1) not null check (grams >= 0 and grams <= 2000),
  -- Nutrientes ya escalados a `grams`.
  calories      numeric(8,1) not null default 0,
  protein       numeric(8,1) not null default 0,
  carbohydrates numeric(8,1) not null default 0,
  fat           numeric(8,1) not null default 0,
  confidence    numeric(3,2) check (confidence between 0 and 1),
  created_at    timestamptz not null default now()
);

create index meal_items_meal_id_idx on public.meal_items (meal_id, position);
create index meal_items_fdc_id_idx  on public.meal_items (fdc_id);

-- Recalcula los totales de la comida cuando cambian sus alimentos.
create or replace function public.recalculate_meal_totals()
returns trigger
language plpgsql
as $$
declare
  target_meal uuid := coalesce(new.meal_id, old.meal_id);
begin
  update public.meals m
  set calories      = coalesce(t.calories, 0),
      protein       = coalesce(t.protein, 0),
      carbohydrates = coalesce(t.carbohydrates, 0),
      fat           = coalesce(t.fat, 0)
  from (
    select sum(calories)      as calories,
           sum(protein)       as protein,
           sum(carbohydrates) as carbohydrates,
           sum(fat)           as fat
    from public.meal_items
    where meal_id = target_meal
  ) t
  where m.id = target_meal;
  return null;
end;
$$;

create trigger meal_items_recalculate_totals
  after insert or update or delete on public.meal_items
  for each row execute function public.recalculate_meal_totals();

-- =============================================================================
-- 4. ROW LEVEL SECURITY
--    service_role (backend) salta RLS. Estas políticas aplican al JWT de usuario.
-- =============================================================================

alter table public.foods        enable row level security;
alter table public.food_queries enable row level security;
alter table public.profiles     enable row level security;
alter table public.meals        enable row level security;
alter table public.meal_items   enable row level security;

-- Caché: lectura para usuarios autenticados; escritura solo backend.
create policy foods_select_authenticated
  on public.foods for select to authenticated using (true);

create policy food_queries_select_authenticated
  on public.food_queries for select to authenticated using (true);

-- Perfil: cada usuario ve y edita solo el suyo.
create policy profiles_select_own
  on public.profiles for select to authenticated using (auth.uid() = id);

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Comidas: solo las propias.
create policy meals_select_own
  on public.meals for select to authenticated using (auth.uid() = user_id);

create policy meals_insert_own
  on public.meals for insert to authenticated with check (auth.uid() = user_id);

create policy meals_update_own
  on public.meals for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy meals_delete_own
  on public.meals for delete to authenticated using (auth.uid() = user_id);

-- Alimentos de una comida: a través de la propiedad de la comida.
create policy meal_items_select_own
  on public.meal_items for select to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

create policy meal_items_insert_own
  on public.meal_items for insert to authenticated
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

create policy meal_items_update_own
  on public.meal_items for update to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

create policy meal_items_delete_own
  on public.meal_items for delete to authenticated
  using (exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

-- =============================================================================
-- 5. RESUMEN DIARIO
--    Totales de un usuario en un día, en su zona horaria.
--    select * from public.daily_totals('<uuid>', current_date);
-- =============================================================================

create or replace function public.daily_totals(p_user uuid, p_day date)
returns table (
  meals_count   bigint,
  calories      numeric,
  protein       numeric,
  carbohydrates numeric,
  fat           numeric
)
language sql
stable
as $$
  select count(*)                     as meals_count,
         coalesce(sum(m.calories), 0)      as calories,
         coalesce(sum(m.protein), 0)       as protein,
         coalesce(sum(m.carbohydrates), 0) as carbohydrates,
         coalesce(sum(m.fat), 0)           as fat
  from public.meals m
  join public.profiles p on p.id = m.user_id
  where m.user_id = p_user
    and (m.eaten_at at time zone p.timezone)::date = p_day;
$$;
