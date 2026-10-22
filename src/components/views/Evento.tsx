'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '../App';
import { Ava, Confirma, Empty, ExTag, Slip, StatusPill } from '../ui';
import { FormEvento, FormMontarCopa, FormPuxada, FormPuxadaCopa } from '../forms';
import { byName, fdate, ft } from '@/lib/format';
import {
  BYE, carName, carPil, copaBracket, copaRuns, pilName, resultado, roundLabel, runs, tot, validade, type Confronto,
} from '@/lib/regras';
import { atualizar as atualizarDb, excluir } from '@/lib/db';
import type { Evento } from '@/lib/types';

const COPA = '__copa';
const primeiro = (n: string) => n.split(' ')[0];

export function EventoView({ id }: { id: string }) {
  const { d, s, abrir } = useApp();
  const router = useRouter();
  const ev = d.ev[id];
  const [sel, setSel] = useState<string | null>(null);
  if (!ev) return <><Empty title="Evento não encontrado" sub="Ele pode ter sido removido." /><p><Link className="btn" href="/">Voltar aos eventos</Link></p></>;
  const camp = ev.campeonatoId ? d.camp[ev.campeonatoId] : undefined;
  const cats = ev.categorias.map((c) => d.cat[c]).filter(Boolean).sort(byName);
  const showCopa = !!ev.copa?.r1?.length || s.isAdmin;
  const cat = sel === COPA && showCopa ? COPA : cats.find((c) => c.id === sel)?.id || cats[0]?.id || (showCopa ? COPA : null);

  return (
    <>
      <div className="pagehead">
        <div className="stack" style={{ gap: 8 }}>
          <span className="eyebrow">{camp ? `${camp.nome} · ${camp.ano || ''}` : 'Evento avulso — não pontua no ranking anual'}</span>
          <h1>{ev.nome}<ExTag o={ev} /></h1>
          <div className="row">
            <StatusPill s={ev.status} />
            <span className="muted">{fdate(ev.data)}{ev.local ? ' · ' + ev.local : ''}</span>
            {ev.encerradoAntecipado && <span className="pill bad">Encerrado antes do fim (vale classificatória)</span>}
          </div>
        </div>
        {s.isAdmin && (
          <div className="row">
            {cat && cat !== COPA && <button className="btn primary" onClick={() => abrir(<FormPuxada eventoId={ev.id} categoriaId={cat} />)}>Lançar puxada</button>}
            <button className="btn ghost" onClick={() => abrir(<FormEvento e={ev} />)}>Editar evento</button>
            <Confirma onConfirm={async () => { await excluir('ev', ev.id); router.push('/'); router.refresh(); }}>Excluir evento</Confirma>
          </div>
        )}
      </div>
      {!cats.length && !showCopa ? (
        <div className="section"><Empty title="Sem categorias neste evento" sub="Edite o evento e escolha as categorias que vão correr." /></div>
      ) : (
        <>
          <div className="section">
            <div className="seg" role="group" aria-label="Categoria">
              {cats.map((c) => <button key={c.id} aria-pressed={c.id === cat} onClick={() => setSel(c.id)}>{c.nome}</button>)}
              {showCopa && <button aria-pressed={cat === COPA} onClick={() => setSel(COPA)}>★ Copa</button>}
            </div>
          </div>
          {cat === COPA ? <CopaView ev={ev} /> : cat && <CategoriaView ev={ev} catId={cat} />}
        </>
      )}
    </>
  );
}

function CategoriaView({ ev, catId }: { ev: Evento; catId: string }) {
  const { d, s, abrir, atualizar, toast } = useApp();
  const c = d.cat[catId];
  const r = resultado(d, ev.id, catId);
  const top = r.order.slice(0, 4);
  const list = runs(d, ev.id, catId).sort((a, b) => (b.criado || 0) - (a.criado || 0));
  const definir = async (fase: string, p: string | null) => {
    const cur = ev.vencedores || {};
    await atualizarDb('ev', ev.id, { vencedores: { ...cur, [catId]: { ...(cur[catId] || {}), [fase]: p } } });
    toast(p ? 'Vencedor definido.' : 'Voltou ao cálculo automático.'); atualizar();
  };
  const box = (m: Confronto, title: string) => (
    <MatchBox key={m.fase} m={m} title={title} por="piloto"
      override={s.isAdmin && m.a && m.b ? { atual: ev.vencedores?.[catId]?.[m.fase], definir: (p) => definir(m.fase, p) } : undefined} />
  );
  let pos = 0;
  return (
    <>
      <div className="section">
        <div className="muted" style={{ fontSize: 14 }}>
          {c.tipo === 'tempo' ? <>Categoria de tempo · índice 201 m: <b style={{ color: 'var(--fg)' }}>{ft(c.indice)} s</b> (abaixo disso desclassifica)</> : 'Categoria por característica'}
          {c.descricao ? ' · ' + c.descricao : ''}
        </div>
      </div>

      <div className="section">
        <div className="row between"><h2>Resultado {r.provisorio ? 'parcial' : 'final'}</h2>
          <span className="muted" style={{ fontSize: 13 }}>Definido por: {r.modo}{ev.campeonatoId ? '' : ' · evento avulso, sem pontos'}</span></div>
        {!r.order.length ? <Empty title="Sem puxadas válidas ainda" sub="O resultado aparece depois da classificatória." /> : (
          <>
            <div className="podium">
              {top.map((o) => (
                <div className="p" key={o.pid}><span className="k">{o.pos}º</span>
                  <div className="who"><Ava pid={o.pid} /><b>{pilName(d, o.pid)}</b></div>
                  {o.pts != null && <span className="muted">{o.pts} pts</span>}</div>
              ))}
            </div>
            {(r.order.length > 4 || r.dq.length > 0) && (
              <div className="tbl"><table><thead><tr><th>Pos.</th><th>Piloto</th>{ev.campeonatoId && <th className="n">Pontos</th>}</tr></thead>
                <tbody>
                  {r.order.slice(4).map((o) => <tr key={o.pid}><td className="pos">{o.pos}º</td><td>{pilName(d, o.pid)}</td>{o.pts != null && <td className="n">{o.pts}</td>}</tr>)}
                  {r.dq.map((p) => <tr className="dq" key={p}><td className="pos" style={{ color: 'var(--red)' }}>DQ</td><td>{pilName(d, p)} — sem puxada válida</td>{ev.campeonatoId && <td className="n">0</td>}</tr>)}
                </tbody></table></div>
            )}
          </>
        )}
      </div>

      <div className="section">
        <div className="row between"><h2>Mata-mata</h2><span className="muted" style={{ fontSize: 13 }}>Vence quem cruza primeiro: reação + 201 m. Puxada inválida perde.</span></div>
        {!r.ch ? (
          <div className="note">Mata-mata precisa de 4 pilotos com puxada válida na classificatória ({r.cl.filter((x) => x.best).length} até agora). Com menos de 4, vale a posição da classificatória.</div>
        ) : (
          <>
            {ev.encerradoAntecipado && <div className="note">Evento encerrado antes do fim: o resultado oficial segue a classificatória.</div>}
            <div className="bracket">
              <div className="col">{box(r.ch.s1, 'Semi 1 · 1º × 4º')}{box(r.ch.s2, 'Semi 2 · 2º × 3º')}</div>
              <div className="col">{box(r.ch.fi, 'Final')}</div>
              <div className="col">{box(r.ch.te, 'Disputa de 3º')}</div>
            </div>
          </>
        )}
      </div>

      {r.cl.length > 0 && (
        <div className="section"><h2>Classificatória</h2>
          <div className="tbl"><table>
            <thead><tr><th>Pos.</th><th>Piloto / carro</th><th className="n">Reação</th><th className="n">60 pés</th><th className="n">100 m</th><th className="n">201 m</th><th className="n">Vel. final</th><th className="n">R + 201</th><th className="n">Puxadas</th></tr></thead>
            <tbody>{r.cl.map((x) => {
              const b = x.best; if (b) pos++;
              return (
                <tr key={x.pid} className={b ? '' : 'dq'}>
                  <td className="pos" style={b ? undefined : { color: 'var(--red)' }}>{b ? pos + 'º' : 'DQ'}</td>
                  <td><div className="who"><Ava pid={x.pid} /><div><b>{pilName(d, x.pid)}</b><small>{b ? carName(d, b.carroId) : 'Nenhuma puxada válida'}</small></div></div></td>
                  <td className="n">{ft(b?.reacao)}</td><td className="n">{ft(b?.p60)}</td><td className="n">{ft(b?.m100)}</td><td className="n">{ft(b?.m201)}</td>
                  <td className="n">{b ? ft(b.vel, 2) + ' km/h' : '—'}</td><td className="n"><b>{b ? ft(tot(b)) : '—'}</b></td><td className="n">{x.runs.length}</td>
                </tr>
              );
            })}</tbody></table></div>
        </div>
      )}

      <div className="section">
        <div className="row between"><h2>Todas as puxadas</h2><span className="muted" style={{ fontSize: 13 }}>{list.length} registradas · mais recentes primeiro</span></div>
        {list.length ? (
          <div className="slips">{list.map((p) => <Slip key={p.id} p={p} onEdit={() => abrir(<FormPuxada p={p} />)} onDelete={async () => { await excluir('pux', p.id); atualizar(); }} />)}</div>
        ) : <Empty title="Nenhuma puxada nesta categoria" sub={s.isAdmin ? 'Use “Lançar puxada” para registrar os tempos da pista.' : 'Os tempos aparecem aqui conforme forem lançados.'} />}
      </div>
    </>
  );
}

function MatchBox({ m, title, por, override, lancar }: {
  m: Confronto; title: string; por: 'piloto' | 'carro';
  override?: { atual?: string | null; definir: (p: string | null) => void };
  lancar?: () => void;
}) {
  const { d } = useApp();
  const pid = (x: string) => (por === 'carro' ? carPil(d, x) : x);
  const nome = (x: string) => pilName(d, pid(x));
  const side = (x: string | null, run: typeof m.ra) => {
    if (x === BYE) return <div className="s"><span className="muted">— passa direto —</span></div>;
    if (!x) return <div className="s"><span className="muted">A definir</span></div>;
    const v = run ? validade(d, run) : null;
    return (
      <div className={'s' + (m.w === x ? ' w' : '')}>
        <div className="who"><Ava pid={pid(x)} /><div><b>{nome(x)}</b>{por === 'carro' && <small>{carName(d, x)}</small>}</div></div>
        <span className={'t' + (v && !v.ok ? ' bad' : '')}>
          {run ? (v!.ok ? <>{ft(run.reacao)} + {ft(run.m201)}<br />= {ft(tot(run))}</> : v!.motivo) : m.bye ? '' : 'sem puxada'}
        </span>
      </div>
    );
  };
  const live = m.a && m.b && m.a !== BYE && m.b !== BYE;
  return (
    <div className="match">
      <div className="h"><span>{title}</span><span>{m.w && !m.bye ? 'Vencedor: ' + primeiro(nome(m.w)) : m.motivo}</span></div>
      {side(m.a, m.ra)}{side(m.b, m.rb)}
      {live && (override || lancar) && (
        <div className="ov">
          {lancar && <button className="btn sm primary" onClick={lancar}>Lançar puxada</button>}
          {override && <>Vencedor:
            <button className="btn sm" onClick={() => override.definir(m.a)}>{primeiro(nome(m.a!))}</button>
            <button className="btn sm" onClick={() => override.definir(m.b)}>{primeiro(nome(m.b!))}</button>
            {override.atual && <button className="btn sm ghost" onClick={() => override.definir(null)}>Automático</button>}
          </>}
        </div>
      )}
    </div>
  );
}

function CopaView({ ev }: { ev: Evento }) {
  const { d, s, abrir, atualizar, toast } = useApp();
  const b = copaBracket(d, ev);
  if (!b) return (
    <div className="section"><h2>Copa</h2>
      <Empty title="Copa ainda não montada" sub={s.isAdmin ? 'Escolha os carros do evento e monte os confrontos da 1ª rodada. A chave avança sozinha até definir 1º, 2º e 3º.' : 'A chave da Copa aparece aqui quando a organização montar.'}>
        {s.isAdmin && <button className="btn primary" onClick={() => abrir(<FormMontarCopa ev={ev} />)}>Montar Copa</button>}
      </Empty>
    </div>
  );
  const n = b.rounds.length;
  const list = copaRuns(d, ev.id).sort((x, y) => (y.criado || 0) - (x.criado || 0));
  const total = ev.copa!.r1.reduce((acc, m) => acc + (m.b && m.b !== BYE ? 2 : 1), 0);
  const definir = async (key: string, p: string | null) => {
    await atualizarDb('ev', ev.id, { copa: { ...ev.copa!, vencedores: { ...(ev.copa!.vencedores || {}), [key]: p } } });
    toast(p ? 'Vencedor definido.' : 'Voltou ao cálculo automático.'); atualizar();
  };
  const box = (m: Confronto, title: string) => (
    <MatchBox key={m.key} m={m} title={title} por="carro"
      override={s.isAdmin ? { atual: ev.copa?.vencedores?.[m.key!], definir: (p) => definir(m.key!, p) } : undefined}
      lancar={s.isAdmin ? () => abrir(<FormPuxadaCopa ev={ev} chave={m.key!} />) : undefined} />
  );
  return (
    <>
      <div className="section">
        <div className="row between">
          <div className="stack" style={{ gap: 4 }}><h2>Copa{b.podio[0] ? ' — resultado' : ''}</h2>
            <span className="muted" style={{ fontSize: 13 }}>{total} carros · todas as categorias · vence quem cruza primeiro (reação + 201 m) · não pontua no ranking</span></div>
          {s.isAdmin && <div className="row">
            <button className="btn sm" onClick={() => abrir(<FormMontarCopa ev={ev} />)}>Editar chave</button>
            <Confirma small onConfirm={async () => {
              for (const p of copaRuns(d, ev.id)) await excluir('pux', p.id);
              await atualizarDb('ev', ev.id, { copa: null });
              toast('Copa removida.'); atualizar();
            }}>Remover Copa</Confirma>
          </div>}
        </div>
        <div className="podium" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          {['1º', '2º', '3º'].map((l, i) => {
            const c = b.podio[i];
            return <div className="p" key={l}><span className="k">{l}</span>{c ? <div className="who"><Ava pid={carPil(d, c)} /><div><b>{pilName(d, carPil(d, c))}</b><small className="muted">{carName(d, c)}</small></div></div> : <span className="muted">A definir</span>}</div>;
          })}
        </div>
      </div>
      <div className="section"><h2>Chave</h2>
        <div className="cbracket">
          {b.rounds.map((r, i) => (
            <div className="col" key={i}><span className="eyebrow">{roundLabel(i, n)}</span>{r.map((m, j) => box(m, i === n - 1 ? 'Final' : `Confronto ${j + 1}`))}</div>
          ))}
          {b.t3 && <div className="col"><span className="eyebrow">Disputa de 3º</span>{box(b.t3, '3º lugar')}</div>}
        </div>
      </div>
      <div className="section">
        <div className="row between"><h2>Puxadas da Copa</h2><span className="muted" style={{ fontSize: 13 }}>{list.length} registradas</span></div>
        {list.length ? <div className="slips">{list.map((p) => <Slip key={p.id} p={p} onEdit={() => abrir(<FormPuxadaCopa ev={ev} chave={p.copaKey!} p={p} />)} onDelete={async () => { await excluir('pux', p.id); atualizar(); }} />)}</div>
          : <Empty title="Nenhuma puxada da Copa ainda" sub={s.isAdmin ? 'Use “Lançar puxada” em cada confronto.' : undefined} />}
      </div>
    </>
  );
}
