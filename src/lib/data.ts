import 'server-only';
import { createClient } from './supabase/server';
import { deRow } from './mapa';
import type { Dados, Sessao } from './types';

const indexar = <T extends { id: string }>(rows: Record<string, unknown>[] | null) => {
  const o: Record<string, T> = {};
  for (const r of rows || []) { const x = deRow<T>(r); o[x.id] = x; }
  return o;
};

export async function carregar(): Promise<{ dados: Dados; sessao: Sessao }> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [cat, camp, pil, car, ev, pux, cfg, cont, prof] = await Promise.all([
    sb.from('categorias').select('*'),
    sb.from('campeonatos').select('*'),
    sb.from('pilotos').select('*'),
    sb.from('carros').select('*'),
    sb.from('eventos').select('*'),
    sb.from('puxadas').select('*').limit(20000),
    sb.from('configuracoes').select('nome').order('nome'),
    user ? sb.from('pilotos_contato').select('*') : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    user ? sb.from('profiles').select('role').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const contatos: Dados['contatos'] = {};
  for (const r of cont.data || []) { const c = deRow<Dados['contatos'][string]>(r); contatos[c.pilotoId] = c; }
  const dados: Dados = {
    cat: indexar(cat.data), camp: indexar(camp.data), pil: indexar(pil.data), car: indexar(car.data),
    ev: indexar(ev.data), pux: indexar(pux.data), contatos,
    configs: (cfg.data || []).map((r: { nome: string }) => r.nome),
  };
  const meu = user ? Object.values(dados.pil).find((p) => p.userId === user.id) : undefined;
  const sessao: Sessao = {
    userId: user?.id ?? null, email: user?.email ?? null,
    isAdmin: (prof.data as { role?: string } | null)?.role === 'admin',
    meuPilotoId: meu?.id ?? null,
  };
  return { dados, sessao };
}
