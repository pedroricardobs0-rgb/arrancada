import type { Dados, Evento, Puxada } from './types';

export const DEFAULT_PTS = [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
export const FASES: Record<string, string> = {
  classificatoria: 'Classificatória', semi1: 'Semifinal 1 (1º × 4º)', semi2: 'Semifinal 2 (2º × 3º)', final: 'Final', terceiro: 'Disputa de 3º',
};
export const FASE_CURTA: Record<string, string> = {
  classificatoria: 'Classif.', semi1: 'Semi 1', semi2: 'Semi 2', final: 'Final', terceiro: '3º lugar', copa: 'Copa',
};
export const TRACAO: Record<string, string> = { dianteira: 'Dianteira', traseira: 'Traseira', '4x4': '4x4' };
export const STATUS: Record<string, string> = { agendado: 'Agendado', andamento: 'Em andamento', encerrado: 'Encerrado' };
export const BYE = 'BYE';

export const vals = <T,>(o: Record<string, T>) => Object.values(o);
export const tot = (p: Pick<Puxada, 'reacao' | 'm201'>) => (p.reacao ?? 0) + (p.m201 ?? 0);
export const yearOf = (ev?: Evento) => (ev?.data ? +ev.data.slice(0, 4) : null);
export const pilName = (d: Dados, id?: string | null) => (id && d.pil[id]?.nome) || 'Piloto removido';
export const carName = (d: Dados, id?: string | null) => {
  const c = id ? d.car[id] : undefined;
  return c ? [c.modelo, c.numero ? '#' + c.numero : ''].filter(Boolean).join(' ') : 'Carro removido';
};
export const carPil = (d: Dados, id?: string | null) => (id ? d.car[id]?.pilotoId : undefined);
export const carLabel = (d: Dados, id: string) => `${pilName(d, carPil(d, id))} · ${carName(d, id)}`;
export const aprovados = (d: Dados) => vals(d.pil).filter((p) => p.status === 'aprovado');

export function validade(d: Dados, p: Pick<Puxada, 'categoriaId' | 'valida' | 'motivo' | 'reacao' | 'm201'>) {
  const cat = p.categoriaId ? d.cat[p.categoriaId] : undefined;
  if (p.valida === false) return { ok: false, motivo: p.motivo || 'Puxada anulada' };
  if (p.reacao != null && p.reacao < 0) return { ok: false, motivo: 'Queimou a largada (reação negativa)' };
  if (p.m201 == null) return { ok: false, motivo: 'Sem tempo de 201 m' };
  if (cat?.tipo === 'tempo' && cat.indice != null && p.m201 < cat.indice)
    return { ok: false, motivo: `Abaixo do índice da categoria (${cat.indice.toFixed(3).replace('.', ',')} s)` };
  return { ok: true, motivo: '' };
}

export const runs = (d: Dados, evId: string, catId: string, fase?: string) =>
  vals(d.pux).filter((p) => p.eventoId === evId && p.categoriaId === catId && (!fase || p.fase === fase));

export type LinhaClassif = { pid: string; best: Puxada | null; runs: Puxada[] };

export function classificacao(d: Dados, evId: string, catId: string): LinhaClassif[] {
  const by: Record<string, Puxada[]> = {};
  for (const p of runs(d, evId, catId, 'classificatoria')) (by[p.pilotoId] ||= []).push(p);
  const cmp = (a: Puxada, b: Puxada) => tot(a) - tot(b) || (a.m201 ?? 0) - (b.m201 ?? 0) || (a.reacao ?? 0) - (b.reacao ?? 0);
  const rows = Object.entries(by).map(([pid, list]) => ({ pid, best: list.filter((p) => validade(d, p).ok).sort(cmp)[0] || null, runs: list }));
  const v = rows.filter((r) => r.best).sort((a, b) => cmp(a.best!, b.best!));
  const dq = rows.filter((r) => !r.best).sort((a, b) => pilName(d, a.pid).localeCompare(pilName(d, b.pid), 'pt-BR'));
  return [...v, ...dq];
}

export type Confronto = {
  fase: string; key?: string; a: string | null; b: string | null; ra: Puxada | null; rb: Puxada | null;
  w: string | null; l: string | null; motivo: string; bye?: boolean;
};

function decide(d: Dados, m: Confronto, ov: string | null | undefined) {
  if (ov && (ov === m.a || ov === m.b)) { m.w = ov; m.motivo = 'Definido pela organização'; }
  else if (m.ra && m.rb) {
    const va = validade(d, m.ra).ok, vb = validade(d, m.rb).ok;
    if (va && !vb) m.w = m.a; else if (vb && !va) m.w = m.b;
    else if (va && vb) { const x = tot(m.ra) - tot(m.rb); if (x < 0) m.w = m.a; else if (x > 0) m.w = m.b; else m.motivo = 'Empate — organização decide'; }
    else m.motivo = 'Ambas inválidas — organização decide';
  } else m.motivo = 'Aguardando puxada';
  if (m.w) m.l = m.w === m.a ? m.b : m.a;
  return m;
}
const ultima = (list: Puxada[]) => list.sort((a, b) => (b.criado || 0) - (a.criado || 0))[0] || null;

export function confronto(d: Dados, evId: string, catId: string, fase: string, a: string | null, b: string | null): Confronto {
  const m: Confronto = { fase, a, b, ra: null, rb: null, w: null, l: null, motivo: '' };
  if (!a || !b) { m.motivo = 'Aguardando'; return m; }
  m.ra = ultima(runs(d, evId, catId, fase).filter((p) => p.pilotoId === a));
  m.rb = ultima(runs(d, evId, catId, fase).filter((p) => p.pilotoId === b));
  return decide(d, m, d.ev[evId]?.vencedores?.[catId]?.[fase]);
}

export function chave(d: Dados, evId: string, catId: string, cl: LinhaClassif[]) {
  const q = cl.filter((r) => r.best);
  if (q.length < 4) return null;
  const s1 = confronto(d, evId, catId, 'semi1', q[0].pid, q[3].pid);
  const s2 = confronto(d, evId, catId, 'semi2', q[1].pid, q[2].pid);
  const fi = confronto(d, evId, catId, 'final', s1.w, s2.w);
  const te = confronto(d, evId, catId, 'terceiro', s1.l, s2.l);
  return { s1, s2, fi, te };
}

export function pontosEvento(d: Dados, ev: Evento) {
  if (ev.pontuacao?.length) return ev.pontuacao;
  const c = ev.campeonatoId ? d.camp[ev.campeonatoId] : undefined;
  return c?.pontuacao?.length ? c.pontuacao : DEFAULT_PTS;
}

export function resultado(d: Dados, evId: string, catId: string) {
  const ev = d.ev[evId];
  const cl = classificacao(d, evId, catId);
  const valid = cl.filter((r) => r.best).map((r) => r.pid);
  const ch = chave(d, evId, catId, cl);
  const completo = !!(ch && ch.fi.w && ch.te.w);
  let order: string[], modo: string;
  if (ch && completo && !ev.encerradoAntecipado) {
    const top = [ch.fi.w!, ch.fi.l!, ch.te.w!, ch.te.l!];
    order = [...top, ...valid.filter((p) => !top.includes(p))];
    modo = 'mata-mata';
  } else {
    order = valid;
    modo = valid.length < 4 ? 'classificatória (menos de 4 pilotos)' : ev.encerradoAntecipado ? 'classificatória (evento encerrado antes do fim)' : 'classificatória';
  }
  const pts = pontosEvento(d, ev);
  const counts = !!ev.campeonatoId;
  return {
    cl, ch, modo, provisorio: ev.status !== 'encerrado',
    order: order.map((pid, i) => ({ pid, pos: i + 1, pts: counts ? pts[i] || 0 : null })),
    dq: cl.filter((r) => !r.best).map((r) => r.pid),
  };
}

export function rankingCamp(d: Dados, campId: string, catId: string) {
  const evs = vals(d.ev).filter((e) => e.campeonatoId === campId && (e.categorias || []).includes(catId)).sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const rows: Record<string, { pid: string; total: number; et: Record<string, number>; vit: number; best: number | null }> = {};
  for (const ev of evs) {
    if (ev.status !== 'encerrado') continue;
    const r = resultado(d, ev.id, catId);
    for (const o of r.order) {
      const x = (rows[o.pid] ||= { pid: o.pid, total: 0, et: {}, vit: 0, best: null });
      x.total += o.pts ?? 0; x.et[ev.id] = o.pts ?? 0; if (o.pos === 1) x.vit++;
    }
    for (const c of r.cl) if (c.best) { const x = rows[c.pid]; if (x && (x.best == null || c.best.m201! < x.best)) x.best = c.best.m201; }
  }
  return { evs, rows: Object.values(rows).sort((a, b) => b.total - a.total || b.vit - a.vit || (a.best ?? 99) - (b.best ?? 99)) };
}

export function melhorAno(d: Dados, carId: string, ano: number) {
  let best: Puxada | null = null;
  for (const p of vals(d.pux)) {
    if (p.carroId !== carId || !validade(d, p).ok) continue;
    if (yearOf(d.ev[p.eventoId]) !== ano) continue;
    if (!best || p.m201! < best.m201!) best = p;
  }
  return best;
}

// ---------- copa ----------
export const copaRuns = (d: Dados, evId: string, key?: string) =>
  vals(d.pux).filter((p) => p.eventoId === evId && p.fase === 'copa' && (!key || p.copaKey === key));

function copaMatch(d: Dados, ev: Evento, key: string, a: string | null, b: string | null): Confronto {
  const m: Confronto = { fase: 'copa', key, a, b, ra: null, rb: null, w: null, l: null, motivo: '', bye: false };
  if (a === BYE && b === BYE) { m.bye = true; m.w = BYE; return m; }
  if (a === BYE || b === BYE) { m.bye = true; m.w = a === BYE ? b : a; m.motivo = m.w ? 'Passa direto' : 'Aguardando'; return m; }
  if (!a || !b) { m.motivo = 'Aguardando'; return m; }
  m.ra = ultima(copaRuns(d, ev.id, key).filter((p) => p.carroId === a));
  m.rb = ultima(copaRuns(d, ev.id, key).filter((p) => p.carroId === b));
  return decide(d, m, ev.copa?.vencedores?.[key]);
}

export function copaBracket(d: Dados, ev: Evento) {
  const r1 = ev.copa?.r1;
  if (!r1?.length) return null;
  const rounds: Confronto[][] = [];
  let cur: { key: string; a: string | null; b: string | null }[] = r1.map((m, i) => ({ key: `r1-${i}`, a: m.a || null, b: m.b || BYE }));
  let k = 1;
  for (;;) {
    const res = cur.map((m) => copaMatch(d, ev, m.key, m.a, m.b));
    rounds.push(res);
    if (res.length <= 1) break;
    const next: typeof cur = [];
    for (let i = 0; i < res.length; i += 2) {
      const y = res[i + 1];
      next.push({ key: `r${k + 1}-${i / 2}`, a: res[i].w, b: y ? y.w : BYE });
    }
    cur = next; k++;
  }
  const final = rounds[rounds.length - 1][0];
  let t3: Confronto | null = null;
  if (rounds.length >= 2) {
    const semi = rounds[rounds.length - 2];
    const side = (m?: Confronto) => (!m || m.bye ? BYE : m.l);
    const a = side(semi[0]), b = side(semi[1]);
    if (!(a === BYE && b === BYE)) t3 = a === BYE ? copaMatch(d, ev, 't3', b, BYE) : copaMatch(d, ev, 't3', a, b);
  }
  const real = (x?: string | null) => (x && x !== BYE ? x : null);
  return { rounds, final, t3, podio: [real(final.w), final.bye ? null : real(final.l), real(t3?.w)] as (string | null)[] };
}

export function roundLabel(i: number, n: number) {
  return ['Final', 'Semifinal', 'Quartas de final', 'Oitavas de final'][n - 1 - i] || `Rodada ${i + 1}`;
}
