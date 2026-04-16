-- ═══════════════════════════════════════════════════════════════
-- FUELWATCH MZ — Schema Corrigido
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  nome            text not null,
  email           text not null,
  telefone        text,
  tipo            text not null default 'cliente'
                  check (tipo in ('cliente','funcionario','proprietario')),
  bomba_nome      text,
  pontos          integer not null default 0,
  total_reports   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────
-- STATIONS
-- ──────────────────────────────────────────────────────────────
create table if not exists public.stations (
  id          uuid default uuid_generate_v4() primary key,
  nome        text not null,
  marca       text not null,
  cidade      text not null,
  endereco    text not null,
  telefone    text,
  px          integer default 50,
  py          integer default 50,
  verificada  boolean default false,
  ativa       boolean default true,
  created_at  timestamptz default now()
);
alter table public.stations enable row level security;
create policy "stations_select" on public.stations for select using (true);

insert into public.stations (nome, marca, cidade, endereco, telefone, px, py, verificada) values
  ('Galp Sommerschield', 'Galp',          'Maputo', 'Av. Julius Nyerere, Sommerschield', '+258 21 490 000', 68, 28, true),
  ('Total Polana',       'TotalEnergies', 'Maputo', 'Av. 24 de Julho, Polana',           '+258 21 491 234', 76, 40, true),
  ('Puma Baixa',         'Puma',          'Maputo', 'Av. 25 de Setembro, Baixa',         '+258 21 303 000', 58, 57, true),
  ('Enacol Matola',      'Enacol',        'Maputo', 'EN4, Matola',                       '+258 21 771 500', 30, 46, false),
  ('Galp Machava',       'Galp',          'Maputo', 'Av. Acordos de Lusaka, Machava',    '+258 21 770 100', 24, 36, true),
  ('Total Aeroporto',    'TotalEnergies', 'Maputo', 'Av. de Mocambique, Aeroporto',      '+258 21 465 000', 46, 24, true),
  ('Puma Polana Canico', 'Puma',          'Maputo', 'EN1, Polana Canico',                '+258 21 450 000', 84, 62, false),
  ('Enacol KaMubukwana', 'Enacol',        'Maputo', 'Av. Machava, KaMubukwana',          '+258 21 760 000', 16, 56, true);

-- ──────────────────────────────────────────────────────────────
-- FUEL AVAILABILITY
-- ──────────────────────────────────────────────────────────────
create table if not exists public.fuel_availability (
  id          uuid default uuid_generate_v4() primary key,
  station_id  uuid references public.stations(id) on delete cascade not null,
  tipo        text not null check (tipo in ('g87','g95','diesel','petro','gpl')),
  disponivel  boolean not null default false,
  nivel_pct   integer check (nivel_pct between 0 and 100),
  fila        text default 'nenhuma' check (fila in ('nenhuma','baixa','media','alta')),
  fila_qtd    integer default 0,
  status      text not null default 'sem stock' check (status in ('disponivel','parcial','sem stock')),
  updated_at  timestamptz default now(),
  updated_by  uuid references auth.users(id),
  unique(station_id, tipo)
);
alter table public.fuel_availability enable row level security;
create policy "fuel_select" on public.fuel_availability for select using (true);
create policy "fuel_all"    on public.fuel_availability for all using (auth.uid() is not null);

-- ──────────────────────────────────────────────────────────────
-- FUEL PRICES
-- ──────────────────────────────────────────────────────────────
create table if not exists public.fuel_prices (
  id          serial primary key,
  tipo        text not null check (tipo in ('g87','g95','diesel','petro','gpl')),
  label       text not null,
  preco       numeric(10,2) not null,
  unidade     text not null default 'MZN/L',
  vigente_de  date not null default current_date,
  fonte       text default 'MIREME/ARENE'
);
alter table public.fuel_prices enable row level security;
create policy "prices_select" on public.fuel_prices for select using (true);

insert into public.fuel_prices (tipo, label, preco, unidade) values
  ('g87',    'Gasolina 87',    89.00,   'MZN/L'),
  ('g95',    'Gasolina 95',    94.00,   'MZN/L'),
  ('diesel', 'Diesel',         84.00,   'MZN/L'),
  ('petro',  'Petroleo',       65.00,   'MZN/L'),
  ('gpl',    'Gas GPL 12,5kg', 1850.00, 'MZN/garrafa');

-- ──────────────────────────────────────────────────────────────
-- REPORTS
-- ──────────────────────────────────────────────────────────────
create table if not exists public.reports (
  id          uuid default uuid_generate_v4() primary key,
  station_id  uuid references public.stations(id) on delete cascade not null,
  user_id     uuid references auth.users(id) not null,
  tipo_fuel   text not null check (tipo_fuel in ('g87','g95','diesel','petro','gpl')),
  fila        text check (fila in ('nenhuma','baixa','media','alta')),
  fila_qtd    integer default 0,
  nota        text,
  votos_up    integer default 0,
  votos_down  integer default 0,
  created_at  timestamptz default now()
);
alter table public.reports enable row level security;
create policy "reports_select" on public.reports for select using (true);
create policy "reports_insert" on public.reports for insert with check (auth.uid() = user_id);
create index idx_reports_station on public.reports(station_id, created_at desc);

-- ──────────────────────────────────────────────────────────────
-- REPORT VOTES
-- ──────────────────────────────────────────────────────────────
create table if not exists public.report_votes (
  id          uuid default uuid_generate_v4() primary key,
  report_id   uuid references public.reports(id) on delete cascade not null,
  user_id     uuid references auth.users(id) not null,
  voto        text not null check (voto in ('up','down')),
  created_at  timestamptz default now(),
  unique(report_id, user_id)
);
alter table public.report_votes enable row level security;
create policy "rvotes_select" on public.report_votes for select using (true);
create policy "rvotes_insert" on public.report_votes for insert with check (auth.uid() = user_id);
create policy "rvotes_delete" on public.report_votes for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- MESSAGES
-- ──────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users(id) not null,
  station_id  uuid references public.stations(id),
  conteudo    text not null,
  imagem_url  text,
  votos_up    integer default 0,
  votos_down  integer default 0,
  created_at  timestamptz default now()
);
alter table public.messages enable row level security;
create policy "messages_select" on public.messages for select using (true);
create policy "messages_insert" on public.messages for insert with check (auth.uid() = user_id);
create policy "messages_delete" on public.messages for delete using (auth.uid() = user_id);
create index idx_messages_created on public.messages(created_at desc);

-- ──────────────────────────────────────────────────────────────
-- MESSAGE VOTES
-- ──────────────────────────────────────────────────────────────
create table if not exists public.message_votes (
  id          uuid default uuid_generate_v4() primary key,
  message_id  uuid references public.messages(id) on delete cascade not null,
  user_id     uuid references auth.users(id) not null,
  voto        text not null check (voto in ('up','down')),
  created_at  timestamptz default now(),
  unique(message_id, user_id)
);
alter table public.message_votes enable row level security;
create policy "mvotes_select" on public.message_votes for select using (true);
create policy "mvotes_insert" on public.message_votes for insert with check (auth.uid() = user_id);
create policy "mvotes_delete" on public.message_votes for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-criar perfil ao registar
-- ──────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nome, email, tipo, telefone, bomba_nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'tipo', 'cliente'),
    new.raw_user_meta_data->>'telefone',
    new.raw_user_meta_data->>'bomba'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: sincronizar votos em reports
-- ──────────────────────────────────────────────────────────────
create or replace function public.sync_report_votes()
returns trigger language plpgsql as $$
declare rid uuid;
begin
  rid := coalesce(new.report_id, old.report_id);
  update public.reports set
    votos_up   = (select count(*) from public.report_votes where report_id = rid and voto = 'up'),
    votos_down = (select count(*) from public.report_votes where report_id = rid and voto = 'down')
  where id = rid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_report_votes_trigger on public.report_votes;
create trigger sync_report_votes_trigger
  after insert or delete on public.report_votes
  for each row execute procedure public.sync_report_votes();

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: sincronizar votos em mensagens
-- ──────────────────────────────────────────────────────────────
create or replace function public.sync_message_votes()
returns trigger language plpgsql as $$
declare mid uuid;
begin
  mid := coalesce(new.message_id, old.message_id);
  update public.messages set
    votos_up   = (select count(*) from public.message_votes where message_id = mid and voto = 'up'),
    votos_down = (select count(*) from public.message_votes where message_id = mid and voto = 'down')
  where id = mid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_message_votes_trigger on public.message_votes;
create trigger sync_message_votes_trigger
  after insert or delete on public.message_votes
  for each row execute procedure public.sync_message_votes();

-- ──────────────────────────────────────────────────────────────
-- FUNÇÃO: adicionar pontos ao utilizador
-- ──────────────────────────────────────────────────────────────
create or replace function public.add_user_points(uid uuid, pts integer)
returns void language plpgsql security definer as $$
begin
  update public.profiles set
    pontos = pontos + pts,
    total_reports = total_reports + 1,
    updated_at = now()
  where id = uid;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- REALTIME
-- ──────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.fuel_availability;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reports;
