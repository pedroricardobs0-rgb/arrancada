-- Combustível e alimentação viram campos próprios do carro (antes eram "configurações").
alter table public.carros add column if not exists combustivel text check (combustivel in ('alcool', 'gasolina', 'metanol'));
alter table public.carros add column if not exists alimentacao text check (alimentacao in ('injetado', 'carburado'));

update public.carros set combustivel = case
    when 'Metanol' = any(configs) then 'metanol'
    when 'Etanol' = any(configs) or 'Álcool' = any(configs) then 'alcool'
    when 'Gasolina' = any(configs) then 'gasolina'
  end
  where combustivel is null;
update public.carros set alimentacao = case
    when 'Carburado' = any(configs) then 'carburado'
    when 'Injeção eletrônica' = any(configs) or 'Injetado' = any(configs) then 'injetado'
  end
  where alimentacao is null;
update public.carros set configs = array(
    select c from unnest(configs) c where c not in ('Etanol', 'Álcool', 'Gasolina', 'Metanol', 'Injeção eletrônica', 'Injetado', 'Carburado'));

delete from public.configuracoes where nome in ('Etanol', 'Álcool', 'Gasolina', 'Metanol', 'Injeção eletrônica', 'Injetado', 'Carburado');
