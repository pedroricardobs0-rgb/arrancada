-- Importação do PDF do cronometrador: letra da categoria, fase "treino" e chave anti-duplicação.
alter table public.categorias add column if not exists letra text;
alter table public.puxadas add column if not exists import_key text;
create unique index if not exists puxadas_import_key on public.puxadas (evento_id, import_key) where import_key is not null;
alter table public.puxadas drop constraint if exists puxadas_fase_check;
alter table public.puxadas add constraint puxadas_fase_check
  check (fase in ('treino', 'classificatoria', 'semi1', 'semi2', 'final', 'terceiro', 'copa'));
