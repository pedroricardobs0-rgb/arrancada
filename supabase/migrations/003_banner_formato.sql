-- Banner (foto) de evento e campeonato + formato do evento.
alter table public.campeonatos add column if not exists banner text;
alter table public.eventos add column if not exists banner text;
alter table public.eventos add column if not exists formato text not null default 'ranking'
  check (formato in ('ranking', 'copa', 'ambos'));
update public.eventos set formato = 'ambos' where copa is not null and formato = 'ranking';
