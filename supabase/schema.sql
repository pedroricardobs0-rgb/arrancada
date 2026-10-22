-- Placar de Arrancada — esquema do banco (Supabase / Postgres)
-- Rode este arquivo inteiro no Supabase: SQL Editor > New query > colar > Run.

create extension if not exists pgcrypto;

-- ---------- perfis e papel de admin ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'piloto' check (role in ('piloto', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- tabelas ----------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'tempo' check (tipo in ('tempo', 'caracteristica')),
  indice numeric(6,3),
  descricao text,
  letra text,
  exemplo boolean not null default false
);

create table if not exists public.campeonatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ano int,
  pontuacao int[] not null default '{25,20,16,13,11,10,9,8,7,6,5,4,3,2,1}',
  banner text,
  exemplo boolean not null default false
);

create table if not exists public.configuracoes (
  nome text primary key
);

create table if not exists public.pilotos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  apelido text,
  equipe text,
  cidade text,
  foto text,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  motivo_recusa text,
  created_at timestamptz not null default now(),
  exemplo boolean not null default false
);

-- e-mail e telefone ficam separados: só o próprio piloto e o admin leem
create table if not exists public.pilotos_contato (
  piloto_id uuid primary key references public.pilotos (id) on delete cascade,
  email text,
  telefone text
);

create table if not exists public.carros (
  id uuid primary key default gen_random_uuid(),
  piloto_id uuid not null references public.pilotos (id) on delete cascade,
  modelo text not null,
  ano text,
  numero text,
  configs text[] not null default '{}',
  tracao text check (tracao in ('dianteira', 'traseira', '4x4')),
  combustivel text check (combustivel in ('alcool', 'gasolina', 'metanol')),
  alimentacao text check (alimentacao in ('injetado', 'carburado')),
  foto_carro text,
  foto_piloto text,
  created_at timestamptz not null default now(),
  exemplo boolean not null default false
);

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  campeonato_id uuid references public.campeonatos (id) on delete restrict,
  data date,
  local text,
  status text not null default 'agendado' check (status in ('agendado', 'andamento', 'encerrado')),
  categorias uuid[] not null default '{}',
  pontuacao int[] not null default '{}',
  encerrado_antecipado boolean not null default false,
  vencedores jsonb not null default '{}',
  copa jsonb,
  banner text,
  formato text not null default 'ranking' check (formato in ('ranking', 'copa', 'ambos')),
  exemplo boolean not null default false
);

create table if not exists public.puxadas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  categoria_id uuid references public.categorias (id) on delete restrict,
  fase text not null check (fase in ('treino', 'classificatoria', 'semi1', 'semi2', 'final', 'terceiro', 'copa')),
  copa_key text,
  piloto_id uuid not null references public.pilotos (id) on delete restrict,
  carro_id uuid not null references public.carros (id) on delete restrict,
  reacao numeric(6,3),
  p60 numeric(6,3),
  m100 numeric(6,3),
  m201 numeric(6,3),
  vel numeric(6,2),
  valida boolean not null default true,
  motivo text,
  criado bigint not null default (extract(epoch from now()) * 1000)::bigint,
  import_key text,
  exemplo boolean not null default false
);
create index if not exists puxadas_evento_idx on public.puxadas (evento_id);
create unique index if not exists puxadas_import_key on public.puxadas (evento_id, import_key) where import_key is not null;

-- ---------- regras do cadastro de piloto ----------
-- Piloto não muda o próprio status nem o dono do cadastro.
-- Cadastro recusado volta para "pendente" quando o piloto edita.
create or replace function public.pilotos_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'pendente';
    new.exemplo := false;
  else
    new.user_id := old.user_id;
    new.exemplo := old.exemplo;
    new.status := case when old.status = 'recusado' then 'pendente' else old.status end;
    new.motivo_recusa := case when old.status = 'recusado' then null else old.motivo_recusa end;
  end if;
  return new;
end $$;

drop trigger if exists pilotos_guard on public.pilotos;
create trigger pilotos_guard before insert or update on public.pilotos
  for each row execute function public.pilotos_guard();

create or replace function public.dono_do_piloto(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pilotos where id = pid and user_id = auth.uid());
$$;

create or replace function public.piloto_visivel(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pilotos where id = pid and (status = 'aprovado' or user_id = auth.uid()))
         or public.is_admin();
$$;

-- ---------- segurança (RLS) ----------
alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.campeonatos enable row level security;
alter table public.configuracoes enable row level security;
alter table public.pilotos enable row level security;
alter table public.pilotos_contato enable row level security;
alter table public.carros enable row level security;
alter table public.eventos enable row level security;
alter table public.puxadas enable row level security;

drop policy if exists "perfil proprio" on public.profiles;
create policy "perfil proprio" on public.profiles for select using (id = auth.uid() or public.is_admin());

-- leitura pública + escrita só admin
do $$
declare t text;
begin
  foreach t in array array['categorias', 'campeonatos', 'configuracoes', 'eventos', 'puxadas'] loop
    execute format('drop policy if exists "leitura publica" on public.%I', t);
    execute format('create policy "leitura publica" on public.%I for select using (true)', t);
    execute format('drop policy if exists "admin escreve" on public.%I', t);
    execute format('create policy "admin escreve" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "pilotos leitura" on public.pilotos;
create policy "pilotos leitura" on public.pilotos for select
  using (status = 'aprovado' or user_id = auth.uid() or public.is_admin());
drop policy if exists "pilotos cria" on public.pilotos;
create policy "pilotos cria" on public.pilotos for insert to authenticated
  with check (true); -- o gatilho força user_id = quem está logado; "unique" impede 2 cadastros
drop policy if exists "pilotos edita" on public.pilotos;
create policy "pilotos edita" on public.pilotos for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "pilotos apaga" on public.pilotos;
create policy "pilotos apaga" on public.pilotos for delete to authenticated using (public.is_admin());

drop policy if exists "contato privado" on public.pilotos_contato;
create policy "contato privado" on public.pilotos_contato for all to authenticated
  using (public.is_admin() or public.dono_do_piloto(piloto_id))
  with check (public.is_admin() or public.dono_do_piloto(piloto_id));

drop policy if exists "carros leitura" on public.carros;
create policy "carros leitura" on public.carros for select using (public.piloto_visivel(piloto_id));
drop policy if exists "carros dono" on public.carros;
create policy "carros dono" on public.carros for all to authenticated
  using (public.is_admin() or public.dono_do_piloto(piloto_id))
  with check (public.is_admin() or public.dono_do_piloto(piloto_id));

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
revoke all on public.pilotos_contato from anon;

-- ---------- fotos (Storage) ----------
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

drop policy if exists "fotos leitura" on storage.objects;
create policy "fotos leitura" on storage.objects for select using (bucket_id = 'fotos');
drop policy if exists "fotos envio" on storage.objects;
create policy "fotos envio" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "fotos apaga" on storage.objects;
create policy "fotos apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ---------- dados iniciais ----------
insert into public.configuracoes (nome) values
  ('Aspirado'), ('Turbo'), ('Biturbo'), ('Nitro'), ('Blower')
on conflict do nothing;

-- ---------- tornar-se admin ----------
-- Depois de criar sua conta no site, rode (trocando o e-mail):
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'SEU-EMAIL@exemplo.com');
