'use client';
import { DEFAULT_PTS, BYE } from './regras';
import { excluirOnde, salvarVarios } from './db';

/** Cria um conjunto de dados de exemplo (marcados com exemplo = true). */
export async function carregarExemplo() {
  const ids: Record<string, string> = {};
  const I = (k: string) => (ids[k] ||= crypto.randomUUID());
  const E = { exemplo: true };
  const ano = new Date().getFullYear();

  const cat = [
    { id: I('street8'), nome: 'Street 8.0', tipo: 'tempo', indice: 8.0, descricao: 'Carros de rua, índice 8,000 s' },
    { id: I('fl65'), nome: 'Força Livre 6.5', tipo: 'tempo', indice: 6.5, descricao: 'Índice 6,500 s' },
    { id: I('dt'), nome: 'Dianteira Turbo', tipo: 'caracteristica', indice: null, descricao: 'Tração dianteira com turbo' },
  ];
  const camp = [{ id: I('camp'), nome: 'Copa Exemplo de Arrancada', ano, pontuacao: DEFAULT_PTS }];
  const nomes = [['Rafael Moura', 'Rafa'], ['Diego Santana', 'Dieguinho'], ['Bruna Albuquerque', 'Bru'], ['Tiago Ferraz', 'Ferrari'], ['Marcos Leal', 'Leal'], ['Fernanda Prado', 'Nanda']];
  const cidades = ['Campinas', 'Sorocaba', 'Curitiba', 'Jundiaí', 'Ribeirão Preto', 'Londrina'];
  const pil = nomes.map(([n, a], i) => ({ id: I('p' + i), nome: n, apelido: a, cidade: cidades[i], status: 'aprovado' }));
  const carDef: [string, number, string, string, string[], string, string, string][] = [
    ['c0', 0, 'VW Gol GTI', '11', ['Turbo'], 'dianteira', 'alcool', 'injetado'], ['c1', 0, 'Opala SS', '12', ['Aspirado', 'Nitro'], 'traseira', 'gasolina', 'carburado'],
    ['c2', 1, 'Honda Civic Si', '27', ['Turbo'], 'dianteira', 'gasolina', 'injetado'], ['c3', 2, 'Mitsubishi Lancer Evo', '8', ['Turbo'], '4x4', 'metanol', 'injetado'],
    ['c4', 3, 'Chevette', '33', ['Turbo'], 'traseira', 'alcool', 'carburado'], ['c5', 4, 'Fiat Uno Turbo', '5', ['Turbo'], 'dianteira', 'gasolina', 'injetado'],
    ['c6', 5, 'Ford Maverick V8', '70', ['Blower'], 'traseira', 'metanol', 'carburado'],
  ];
  const car = carDef.map(([k, p, m, n, cf, tr, cb, al]) => ({ id: I(k), pilotoId: I('p' + p), modelo: m, numero: n, configs: cf, tracao: tr, combustivel: cb, alimentacao: al }));
  const carPil = (ci: number) => car[ci].pilotoId;
  const ev = [
    { id: I('e1'), nome: '1ª Etapa', campeonatoId: I('camp'), data: `${ano}-03-15`, local: 'Pista exemplo', status: 'encerrado', categorias: [I('street8'), I('dt')], pontuacao: [], encerradoAntecipado: false, vencedores: {},
      copa: { r1: [{ a: I('c0'), b: I('c6') }, { a: I('c2'), b: I('c5') }, { a: I('c3'), b: I('c4') }, { a: I('c1'), b: BYE }], vencedores: {} } },
    { id: I('e2'), nome: '2ª Etapa', campeonatoId: I('camp'), data: `${ano}-06-21`, local: 'Pista exemplo', status: 'encerrado', categorias: [I('street8'), I('dt')], pontuacao: [30, 24, 19, 15, 12, 10, 8, 6, 4, 2], encerradoAntecipado: true, vencedores: {}, copa: null },
    { id: I('e3'), nome: 'Desafio de Inverno', campeonatoId: null, data: `${ano}-08-09`, local: 'Pista exemplo', status: 'andamento', categorias: [I('fl65')], pontuacao: [], encerradoAntecipado: false, vencedores: {}, copa: null },
  ];

  const pux: Record<string, unknown>[] = [];
  let t = Date.now() - 1e6;
  const mk = (e: string, c: string | null, fase: string, ci: number, r: number, s60: number, s100: number, s201: number, vel: number, extra: object = {}, copaKey: string | null = null) =>
    pux.push({ id: crypto.randomUUID(), eventoId: I(e), categoriaId: c ? I(c) : null, fase, copaKey, pilotoId: carPil(ci), carroId: car[ci].id,
      reacao: r, p60: s60, m100: s100, m201: s201, vel, valida: true, motivo: null, criado: (t += 1000), ...extra });
  // Street 8.0 — 1ª etapa com mata-mata completo
  ([[1, 8.112], [3, 8.201], [4, 8.265], [6, 8.34], [5, 8.455]] as const).forEach(([ci, s], k) => {
    mk('e1', 'street8', 'classificatoria', ci, 0.11 + k * 0.01, 1.71 + k * 0.02, 5.12 + k * 0.03, s, 171 - k * 2);
    mk('e1', 'street8', 'classificatoria', ci, 0.14, 1.75, 5.2, s + 0.09, 169);
  });
  mk('e1', 'street8', 'classificatoria', 5, -0.012, 1.69, 5.05, 8.12, 172);
  mk('e1', 'street8', 'semi1', 1, 0.105, 1.7, 5.1, 8.12, 171); mk('e1', 'street8', 'semi1', 6, 0.18, 1.76, 5.21, 8.33, 168);
  mk('e1', 'street8', 'semi2', 3, 0.15, 1.74, 5.18, 8.23, 170); mk('e1', 'street8', 'semi2', 4, 0.098, 1.72, 5.14, 8.21, 171);
  mk('e1', 'street8', 'final', 1, 0.131, 1.71, 5.12, 8.14, 171); mk('e1', 'street8', 'final', 4, 0.091, 1.7, 5.11, 8.15, 172);
  mk('e1', 'street8', 'terceiro', 3, 0.12, 1.73, 5.16, 7.98, 173); mk('e1', 'street8', 'terceiro', 6, 0.16, 1.77, 5.24, 8.36, 167);
  // Dianteira Turbo — 1ª etapa (3 pilotos: vale a classificatória)
  ([[0, 7.412], [2, 7.53], [5, 7.69]] as const).forEach(([ci, s], k) => mk('e1', 'dt', 'classificatoria', ci, 0.12 + k * 0.015, 1.58 + k * 0.03, 4.71 + k * 0.04, s, 186 - k * 3));
  // 2ª etapa — encerrada por chuva
  ([[4, 8.09], [1, 8.15], [6, 8.21], [3, 8.3], [5, 8.4]] as const).forEach(([ci, s], k) => mk('e2', 'street8', 'classificatoria', ci, 0.115 + k * 0.012, 1.7 + k * 0.02, 5.1 + k * 0.03, s, 172 - k * 2));
  mk('e2', 'street8', 'semi1', 4, 0.11, 1.7, 5.09, 8.1, 172);
  ([[2, 7.38], [0, 7.395], [5, 7.64]] as const).forEach(([ci, s], k) => mk('e2', 'dt', 'classificatoria', ci, 0.11 + k * 0.02, 1.57 + k * 0.03, 4.7 + k * 0.04, s, 187 - k * 3));
  mk('e2', 'dt', 'classificatoria', 0, 0.125, 1.55, 4.66, 7.3, 189, { valida: false, motivo: 'Cruzou a faixa' });
  // Evento avulso
  ([[6, 6.612], [3, 6.705], [2, 6.88]] as const).forEach(([ci, s], k) => mk('e3', 'fl65', 'classificatoria', ci, 0.09 + k * 0.02, 1.32 + k * 0.03, 4.15 + k * 0.05, s, 212 - k * 4));
  mk('e3', 'fl65', 'classificatoria', 1, 0.102, 1.29, 4.02, 6.481, 218);
  // Copa da 1ª etapa (7 carros, um passa direto)
  const mc = (key: string, ci: number, r: number, s201: number, vel: number) => mk('e1', null, 'copa', ci, r, 1.5, 4.6, s201, vel, {}, key);
  mc('r1-0', 0, 0.11, 7.42, 186); mc('r1-0', 6, 0.135, 7.51, 190);
  mc('r1-1', 2, -0.02, 7.48, 185); mc('r1-1', 5, 0.15, 7.7, 182);
  mc('r1-2', 3, 0.098, 7.05, 196); mc('r1-2', 4, 0.12, 7.6, 183);
  mc('r2-0', 0, 0.105, 7.4, 187); mc('r2-0', 5, 0.13, 7.69, 182);
  mc('r2-1', 3, 0.101, 7.03, 197); mc('r2-1', 1, 0.16, 8.05, 170);
  mc('r3-0', 0, 0.099, 7.38, 188); mc('r3-0', 3, 0.112, 7.06, 196);
  mc('t3', 5, 0.14, 7.72, 181); mc('t3', 1, 0.118, 8.01, 171);

  const ex = <T extends object>(l: T[]) => l.map((x) => ({ ...x, ...E }));
  await salvarVarios('cat', ex(cat));
  await salvarVarios('camp', ex(camp));
  await salvarVarios('pil', ex(pil));
  await salvarVarios('car', ex(car));
  await salvarVarios('ev', ex(ev));
  await salvarVarios('pux', ex(pux));
}

export async function limparExemplo() {
  for (const t of ['pux', 'ev', 'car', 'pil', 'camp', 'cat'] as const) await excluirOnde(t, 'exemplo', true);
}
