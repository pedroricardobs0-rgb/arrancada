'use client';
import { useMemo, useState } from 'react';
import { useApp } from './App';
import { Modal } from './ui';
import { byName, ft } from '@/lib/format';
import { lerLinhas, linhasDoPdf, type LinhaPdf } from '@/lib/importar';
import { salvar, salvarVarios } from '@/lib/db';
import { vals } from '@/lib/regras';
import type { Evento, Fase } from '@/lib/types';

const NOVO = '__novo';
const norm = (s?: string | null) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const titulo = (s: string) => s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m) => m.toUpperCase());

type Lido = { linhas: LinhaPdf[]; ignoradas: string[]; repetidas: number };

export function FormImportarPdf({ ev }: { ev: Evento }) {
  const { d, s, fechar, toast, atualizar } = useApp();
  const [lido, setLido] = useState<Lido | null>(null);
  const [nomeArq, setNomeArq] = useState('');
  const [fase, setFase] = useState<Fase>(ev.formato === 'copa' ? 'treino' : 'classificatoria');
  const [mapaCat, setMapaCat] = useState<Record<string, string>>({});
  const [mapaPil, setMapaPil] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cats = vals(d.cat).sort(byName);
  const pilotos = vals(d.pil).sort(byName);
  const jaImportadas = useMemo(() => new Set(vals(d.pux).filter((p) => p.eventoId === ev.id && p.importKey).map((p) => p.importKey!)), [d, ev.id]);

  const ler = async (f: File | null) => {
    setErro(''); setLido(null);
    if (!f) return;
    setNomeArq(f.name); setOcupado(true);
    try {
      const { ok, ignoradas } = lerLinhas(await linhasDoPdf(f));
      if (!ok.length) throw new Error('Não encontrei puxadas neste PDF. Ele precisa ser o relatório “Tempos por pilotos” do cronometrador.');
      const unicas = [...new Map(ok.map((r) => [r.chave, r])).values()];
      setLido({ linhas: unicas, ignoradas, repetidas: ok.length - unicas.length });
      const mc: Record<string, string> = {};
      for (const l of new Set(unicas.map((r) => r.letra))) mc[l] = cats.find((c) => norm(c.letra) === l)?.id || NOVO;
      setMapaCat(mc);
      const mp: Record<string, string> = {};
      for (const n of new Set(unicas.map((r) => r.nome))) {
        const p = pilotos.find((x) => norm(x.nome) === norm(n) || (x.apelido && norm(x.apelido) === norm(n)));
        mp[n] = p?.id || NOVO;
      }
      setMapaPil(mp);
    } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };

  const resumo = useMemo(() => {
    if (!lido) return null;
    const novas = lido.linhas.filter((r) => !jaImportadas.has(r.chave));
    const porLetra: Record<string, number> = {};
    for (const r of novas) porLetra[r.letra] = (porLetra[r.letra] || 0) + 1;
    const nomes = [...new Set(lido.linhas.map((r) => r.nome))].sort();
    return { novas, porLetra, nomes, invalidas: novas.filter((r) => r.flag !== '_' || r.m201 == null).length };
  }, [lido, jaImportadas]);

  const importar = async () => {
    if (!lido || !resumo) return;
    setErro(''); setOcupado(true);
    try {
      // categorias: cria as que faltam e grava a letra nas existentes
      const catDe: Record<string, string> = {};
      for (const [letra, alvo] of Object.entries(mapaCat)) {
        if (!resumo.porLetra[letra]) continue;
        if (alvo === NOVO) {
          const id = crypto.randomUUID();
          await salvar('cat', { id, nome: `Categoria ${letra}`, tipo: 'caracteristica', indice: null, descricao: 'Criada pela importação do cronômetro', letra });
          catDe[letra] = id;
        } else {
          catDe[letra] = alvo;
          if (!d.cat[alvo]?.letra) await salvar('cat', { ...d.cat[alvo], letra });
        }
      }
      // pilotos e carros
      const pilDe: Record<string, string> = {};
      const novosPil: object[] = [];
      for (const nome of resumo.nomes) {
        const alvo = mapaPil[nome];
        if (alvo && alvo !== NOVO) { pilDe[nome] = alvo; continue; }
        const id = crypto.randomUUID();
        pilDe[nome] = id;
        novosPil.push({ id, nome: titulo(nome), status: 'aprovado' });
      }
      if (novosPil.length) await salvarVarios('pil', novosPil);
      const carDe: Record<string, string> = {};
      const novosCar: object[] = [];
      for (const r of lido.linhas) {
        const pid = pilDe[r.nome], k = `${pid}|${r.carro}`;
        if (carDe[k]) continue;
        const existente = vals(d.car).find((c) => c.pilotoId === pid && (c.numero || '') === r.carro);
        if (existente) { carDe[k] = existente.id; continue; }
        const id = crypto.randomUUID();
        carDe[k] = id;
        novosCar.push({ id, pilotoId: pid, modelo: r.modelo ? titulo(r.modelo) : `Carro ${r.carro || 'sem número'}`, numero: r.carro || null, configs: [] });
      }
      if (novosCar.length) await salvarVarios('car', novosCar);
      // puxadas
      const base = Date.now() - 10_000_000;
      const pux = resumo.novas.map((r) => ({
        id: crypto.randomUUID(), eventoId: ev.id, categoriaId: catDe[r.letra], fase, copaKey: null,
        pilotoId: pilDe[r.nome], carroId: carDe[`${pilDe[r.nome]}|${r.carro}`],
        reacao: r.reacao, p60: r.p60, m100: r.m100, m201: r.m201, vel: r.vel,
        valida: r.flag !== 'B', motivo: r.flag === 'B' ? 'Quebrou o índice (B no cronômetro)' : null,
        criado: base + r.ordem * 1000 + (r.faixa === 'D' ? 1 : 0), importKey: r.chave,
      }));
      await salvarVarios('pux', pux);
      // categorias usadas entram no evento
      const usadas = [...new Set(Object.values(catDe))];
      const faltam = usadas.filter((c) => !ev.categorias.includes(c));
      if (faltam.length) await salvar('ev', { ...ev, categorias: [...ev.categorias, ...faltam], formato: ev.formato === 'copa' && fase !== 'treino' ? 'ambos' : ev.formato });
      atualizar(); fechar();
      toast(`${pux.length} puxadas importadas${novosPil.length ? `, ${novosPil.length} pilotos novos` : ''}${novosCar.length ? `, ${novosCar.length} carros novos` : ''}.`);
    } catch (e) { setErro((e as Error).message); } finally { setOcupado(false); }
  };

  return (
    <Modal title="Importar tempos do cronômetro">
      <div className="formpanel">
        <label className="f">Relatório “Tempos por pilotos” (PDF)
          <input type="file" accept="application/pdf,.pdf" onChange={(e) => ler(e.target.files?.[0] || null)} />
        </label>
        {ocupado && !lido && <div className="live">Lendo {nomeArq}…</div>}
        {lido && resumo && (
          <>
            <div className="note" style={{ fontSize: 14 }}>
              <b>{lido.linhas.length}</b> puxadas encontradas em {nomeArq}
              {lido.repetidas > 0 && <> · {lido.repetidas} linhas repetidas no PDF descartadas</>}
              {lido.linhas.length - resumo.novas.length > 0 && <> · {lido.linhas.length - resumo.novas.length} já importadas antes (serão puladas)</>}
              {lido.ignoradas.length > 0 && <> · <span style={{ color: 'var(--red)' }}>{lido.ignoradas.length} linhas não reconhecidas</span></>}
              <br /><b>{resumo.novas.length}</b> serão importadas, {resumo.invalidas} delas inválidas (queima, quebra de índice ou sem tempo).
            </div>

            <label className="f">Fase
              <select value={fase} onChange={(e) => setFase(e.target.value as Fase)}>
                <option value="treino">Treino (aparece nos tempos e no melhor do ano, não conta na classificação)</option>
                <option value="classificatoria">Classificatória (conta para a posição e o mata-mata)</option>
              </select>
            </label>

            <fieldset><legend>Categorias (letra do cronômetro)</legend>
              <div className="stack" style={{ gap: 8 }}>
                {Object.keys(mapaCat).sort().map((l) => (
                  <label className="f" key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <span style={{ minWidth: 70 }}>“{l}” · {resumo.porLetra[l] || 0}</span>
                    <select value={mapaCat[l]} onChange={(e) => setMapaCat({ ...mapaCat, [l]: e.target.value })}>
                      <option value={NOVO}>Criar categoria nova “Categoria {l}”</option>
                      {cats.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.letra ? ` (${c.letra})` : ''}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset><legend>Pilotos ({resumo.nomes.length})</legend>
              <span className="muted" style={{ fontSize: 13 }}>Quem já tem cadastro com o mesmo nome é ligado sozinho. Para os outros, escolha o cadastro certo ou deixe “criar novo”.</span>
              <div className="tbl" style={{ maxHeight: 280, overflowY: 'auto' }}><table><tbody>
                {resumo.nomes.map((n) => {
                  const r = lido.linhas.find((x) => x.nome === n)!;
                  return (
                    <tr key={n}><td><b>{n}</b><br /><span className="muted" style={{ fontSize: 12 }}>#{r.carro} {r.modelo} · {lido.linhas.filter((x) => x.nome === n).length} puxadas</span></td>
                      <td><select className="inline" value={mapaPil[n]} onChange={(e) => setMapaPil({ ...mapaPil, [n]: e.target.value })}>
                        <option value={NOVO}>Criar piloto novo</option>
                        {pilotos.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.apelido ? ` (${p.apelido})` : ''}</option>)}
                      </select></td></tr>
                  );
                })}
              </tbody></table></div>
            </fieldset>

            <details><summary className="muted" style={{ cursor: 'pointer', fontSize: 14 }}>Ver as primeiras puxadas lidas</summary>
              <div className="tbl" style={{ marginTop: 8 }}><table>
                <thead><tr><th>Cat</th><th>Piloto</th><th className="n">R</th><th className="n">60 pés</th><th className="n">100 m</th><th className="n">201 m</th><th className="n">Vel</th><th>Obs.</th></tr></thead>
                <tbody>{lido.linhas.slice(0, 12).map((r) => (
                  <tr key={r.chave}><td>{r.letra}</td><td>{r.nome}</td><td className="n">{ft(r.reacao)}</td><td className="n">{ft(r.p60)}</td><td className="n">{ft(r.m100)}</td><td className="n">{ft(r.m201)}</td><td className="n">{r.vel ?? '—'}</td>
                    <td>{r.flag === 'B' ? 'Quebrou índice' : r.flag.startsWith('Q') ? 'Queimou' : r.m201 == null ? 'Sem tempo' : ''}</td></tr>
                ))}</tbody></table></div>
            </details>
          </>
        )}
        {erro && <div className="err">{erro}</div>}
        <div className="mfoot">
          <button type="button" className="btn ghost" onClick={fechar}>Cancelar</button>
          <button type="button" className="btn primary" disabled={!resumo?.novas.length || ocupado || !s.isAdmin} onClick={importar}>
            {ocupado && lido ? 'Importando…' : `Importar ${resumo?.novas.length || ''} puxadas`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
