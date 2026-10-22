'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '../App';
import { Ava, Confirma, Empty, ExTag, Slip, StatusPill } from '../ui';
import { FormCampeonato, FormCarro, FormEvento, FormPilotoAdmin, FormPuxada } from '../forms';
import { byDateAsc, byDateDesc, byName, fdate, fotoUrl, ft, initials } from '@/lib/format';
import { aprovados, melhorAno, pilName, rankingCamp, resultado, copaBracket, temCopa, temRanking, carPil, STATUS, TRACAO, COMBUSTIVEL, ALIMENTACAO, validade, vals, yearOf } from '@/lib/regras';
import { apagarFoto, excluir } from '@/lib/db';
import type { Carro, Evento } from '@/lib/types';

export function HomeView() {
  const { d, s, abrir, ano } = useApp();
  const ordem: Record<string, number> = { andamento: 0, agendado: 1, encerrado: 2 };
  const evs = vals(d.ev).sort((a, b) => (ordem[a.status] ?? 3) - (ordem[b.status] ?? 3) || (a.status === 'agendado' ? byDateAsc(a, b) : byDateDesc(a, b)));
  return (
    <>
      <div className="pagehead">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">Temporada {ano}</span>
          <h1>Eventos e campeonatos</h1>
          <span className="muted">{evs.length} eventos · {aprovados(d).length} pilotos · {vals(d.car).length} carros · {vals(d.pux).length} puxadas registradas</span>
        </div>
        {s.isAdmin && <div className="row">
          <button className="btn ghost" onClick={() => abrir(<FormPuxada />)}>Lançar puxada</button>
          <button className="btn primary" onClick={() => abrir(<FormEvento />)}>Novo evento</button>
        </div>}
      </div>
      <div className="section">
        {!evs.length ? (
          <Empty title="Nenhum evento cadastrado" sub={s.isAdmin ? 'Cadastre categorias e um campeonato na área Admin e depois o primeiro evento. Ou carregue dados de exemplo para testar.' : 'Os eventos aparecem aqui assim que a organização cadastrar.'} />
        ) : <div className="grid">{evs.map((e) => <EvCard key={e.id} ev={e} />)}</div>}
      </div>
    </>
  );
}

function EvCard({ ev }: { ev: Evento }) {
  const { d } = useApp();
  const camp = ev.campeonatoId ? d.camp[ev.campeonatoId] : undefined;
  const cats = temRanking(ev) ? ev.categorias.map((c) => d.cat[c]).filter(Boolean) : [];
  const copa = temCopa(ev) ? copaBracket(d, ev) : null;
  const banner = ev.banner || camp?.banner;
  return (
    <Link className={'evcard' + (banner ? ' combanner' : '')} href={'/eventos/' + ev.id}>
      {banner ? <img className="evbanner" src={fotoUrl(banner)!} alt="" /> : <span className="lane" aria-hidden="true" />}
      <div className="row between"><span className="eyebrow">{camp ? camp.nome : 'Evento avulso'}</span><StatusPill s={ev.status} /></div>
      <span className="ttl">{ev.nome}</span>
      <span className="meta">
        <span>{fdate(ev.data)}{ev.local ? ' · ' + ev.local : ''}</span>
        <span>{ev.formato === 'copa' ? 'Copa · mata-mata sem categoria' : `${cats.length} categoria${cats.length === 1 ? '' : 's'}${ev.formato === 'ambos' ? ' + Copa' : ''}`}{ev.encerradoAntecipado ? ' · encerrado antes do fim' : ''}{ev.exemplo ? ' · exemplo' : ''}</span>
      </span>
      {(cats.length > 0 || copa) && (
        <span className="lead">
          <span className="muted">{ev.status === 'encerrado' ? 'Vencedores' : 'Liderando'}</span>
          {cats.slice(0, 3).map((c) => {
            const f = resultado(d, ev.id, c.id).order[0];
            return <span key={c.id}>{c.nome}: {f ? <b>{pilName(d, f.pid)}</b> : <span className="muted">sem tempos</span>}</span>;
          })}
          {copa && <span>★ Copa: {copa.podio[0] ? <b>{pilName(d, carPil(d, copa.podio[0]))}</b> : <span className="muted">em disputa</span>}</span>}
        </span>
      )}
    </Link>
  );
}

export function RankingView() {
  const { d, s, abrir } = useApp();
  const camps = vals(d.camp).sort((a, b) => (b.ano || 0) - (a.ano || 0) || byName(a, b));
  const [campSel, setCamp] = useState<string | null>(null);
  const [catSel, setCat] = useState<string | null>(null);
  if (!camps.length) return (
    <><h1>Ranking do ano</h1><div className="section"><Empty title="Nenhum campeonato cadastrado" sub="O ranking anual soma os pontos das etapas de um campeonato.">
      {s.isAdmin && <button className="btn primary" onClick={() => abrir(<FormCampeonato />)}>Novo campeonato</button>}</Empty></div></>
  );
  const camp = (campSel && d.camp[campSel]) || camps[0];
  const catIds = [...new Set(vals(d.ev).filter((e) => e.campeonatoId === camp.id && temRanking(e)).flatMap((e) => e.categorias))].filter((c) => d.cat[c]);
  const cats = catIds.map((c) => d.cat[c]).sort(byName);
  const cat = catSel && catIds.includes(catSel) ? catSel : cats[0]?.id;
  const rk = cat ? rankingCamp(d, camp.id, cat) : null;
  return (
    <>
      <div className="pagehead">
        <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Pontos por categoria</span><h1>Ranking do ano</h1></div>
        <label className="f" style={{ maxWidth: 340 }}>Campeonato
          <select value={camp.id} onChange={(e) => { setCamp(e.target.value); setCat(null); }}>
            {camps.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.ano ? `(${c.ano})` : ''}</option>)}</select></label>
      </div>
      {camp.banner && <div className="section"><img className="campbanner" src={fotoUrl(camp.banner)!} alt={`Banner: ${camp.nome}`} /></div>}
      <div className="section">
        {!rk ? <Empty title="Sem etapas com categorias" sub="Cadastre eventos neste campeonato para montar o ranking." /> : (
          <>
            <div className="seg" role="group" aria-label="Categoria">
              {cats.map((c) => <button key={c.id} aria-pressed={c.id === cat} onClick={() => setCat(c.id)}>{c.nome}</button>)}
            </div>
            {rk.rows.length ? (
              <div className="tbl"><table>
                <thead><tr><th>Pos.</th><th>Piloto</th>{rk.evs.map((e, i) => <th key={e.id} className="n" title={e.nome}>E{i + 1}</th>)}<th className="n">Vitórias</th><th className="n">Melhor 201 m</th><th className="n">Total</th></tr></thead>
                <tbody>{rk.rows.map((x, i) => (
                  <tr key={x.pid}><td className="pos">{i + 1}º</td>
                    <td><Link href={'/pilotos/' + x.pid} className="who plain"><Ava pid={x.pid} /><b>{pilName(d, x.pid)}</b></Link></td>
                    {rk.evs.map((e) => <td key={e.id} className="n">{e.status !== 'encerrado' ? <span className="muted">·</span> : x.et[e.id] ?? '—'}</td>)}
                    <td className="n">{x.vit}</td><td className="n">{ft(x.best)}</td><td className="n"><b style={{ color: 'var(--amber)', fontSize: 16 }}>{x.total}</b></td></tr>
                ))}</tbody></table></div>
            ) : <Empty title="Nenhuma etapa encerrada nesta categoria" sub="Os pontos entram no ranking quando a etapa é marcada como encerrada." />}
            <div className="muted" style={{ fontSize: 13 }}>
              {rk.evs.map((e, i) => `E${i + 1} = ${e.nome} (${fdate(e.data)}${e.status !== 'encerrado' ? ', ' + STATUS[e.status].toLowerCase() : ''})`).join(' · ')}. Desempate: mais vitórias, depois melhor 201 m.
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function PilotosView() {
  const { d, s, abrir } = useApp();
  const ps = (s.isAdmin ? vals(d.pil) : aprovados(d)).sort(byName);
  return (
    <>
      <div className="pagehead">
        <div className="stack" style={{ gap: 6 }}><span className="eyebrow">{aprovados(d).length} cadastrados</span><h1>Pilotos</h1></div>
        <div className="row">
          {!s.userId && <Link className="btn primary" href="/cadastro">Sou piloto: quero me cadastrar</Link>}
          {s.isAdmin && <button className="btn primary" onClick={() => abrir(<FormPilotoAdmin />)}>Novo piloto</button>}
        </div>
      </div>
      <div className="section">
        {ps.length ? <div className="grid">{ps.map((p) => {
          const cars = vals(d.car).filter((c) => c.pilotoId === p.id);
          const cats = [...new Set(vals(d.pux).filter((x) => x.pilotoId === p.id && x.categoriaId).map((x) => d.cat[x.categoriaId!]?.nome).filter(Boolean))];
          return (
            <Link className="pcard" key={p.id} href={'/pilotos/' + p.id}>
              <Ava pid={p.id} lg />
              <div>
                <b>{p.nome}</b>
                <span className="muted" style={{ fontSize: 13 }}>{p.apelido ? `“${p.apelido}”` : ''}{p.apelido && (p.equipe || p.cidade) ? ' · ' : ''}{[p.equipe, p.cidade].filter(Boolean).join(' · ')}</span>
                <div className="tags" style={{ marginTop: 6 }}>
                  {p.status !== 'aprovado' && <span className={'tag ' + (p.status === 'pendente' ? 'warn' : 'bad')}>{p.status}</span>}
                  <span className="tag">{cars.length} carro{cars.length === 1 ? '' : 's'}</span>
                  {cats.map((c) => <span key={c} className="tag tr">{c}</span>)}
                </div>
              </div>
            </Link>
          );
        })}</div> : <Empty title="Nenhum piloto cadastrado" sub="Pilotos criam a própria conta e enviam o cadastro para aprovação." />}
      </div>
    </>
  );
}

export function AnoSel() {
  const { d, ano, setAno } = useApp();
  const anos = [...new Set([new Date().getFullYear(), ...vals(d.ev).map(yearOf).filter((x): x is number => !!x)])].sort((a, b) => b - a);
  return <label className="f" style={{ maxWidth: 140 }}>Ano<select value={ano} onChange={(e) => setAno(+e.target.value)}>{anos.map((a) => <option key={a}>{a}</option>)}</select></label>;
}

export function CarCard({ c }: { c: Carro }) {
  const { d, s, ano, abrir, atualizar } = useApp();
  const b = melhorAno(d, c.id, ano);
  const pode = s.isAdmin || (s.meuPilotoId && s.meuPilotoId === c.pilotoId);
  return (
    <div className="ccard">
      <div className="ph">
        {c.fotoCarro ? <img src={fotoUrl(c.fotoCarro)!} alt={c.modelo} /> : 'Sem foto do carro'}
        {c.fotoPiloto ? <img className="ava" src={fotoUrl(c.fotoPiloto)!} alt="" /> : <span className="ava">{initials(pilName(d, c.pilotoId))}</span>}
      </div>
      <div className="bd">
        <div className="row between"><h3>{c.modelo}{c.numero ? ' #' + c.numero : ''}</h3><ExTag o={c} /></div>
        <Link className="muted plain" style={{ fontSize: 14 }} href={'/pilotos/' + c.pilotoId}>{pilName(d, c.pilotoId)}{c.ano ? ' · ' + c.ano : ''}</Link>
        <div className="tags"><span className="tag tr">Tração {c.tracao ? TRACAO[c.tracao] : '—'}</span>{c.combustivel && <span className="tag tr">{COMBUSTIVEL[c.combustivel]}</span>}{c.alimentacao && <span className="tag tr">{ALIMENTACAO[c.alimentacao]}</span>}{c.configs.map((x) => <span key={x} className="tag">{x}</span>)}</div>
        <div className="best"><span className="muted" style={{ fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>Melhor 201 m em {ano}</span><span className="t">{b ? ft(b.m201) + ' s' : '—'}</span></div>
        {b && <span className="muted" style={{ fontSize: 12 }}>{d.ev[b.eventoId]?.nome} · R {ft(b.reacao)} · {ft(b.vel, 2)} km/h</span>}
        {pode && <div className="row">
          <button className="btn sm" onClick={() => abrir(<FormCarro c={c} />)}>Editar</button>
          <Confirma small onConfirm={async () => {
            if (vals(d.pux).some((p) => p.carroId === c.id)) throw new Error('Este carro tem puxadas registradas. Peça à organização para removê-las primeiro.');
            await excluir('car', c.id); await apagarFoto(c.fotoCarro); await apagarFoto(c.fotoPiloto); atualizar();
          }}>Excluir</Confirma>
        </div>}
      </div>
    </div>
  );
}

export function CarrosView() {
  const { d, s, abrir } = useApp();
  const cs = vals(d.car).filter((c) => d.pil[c.pilotoId]?.status === 'aprovado' || s.isAdmin).sort((a, b) => pilName(d, a.pilotoId).localeCompare(pilName(d, b.pilotoId), 'pt-BR'));
  return (
    <>
      <div className="pagehead">
        <div className="stack" style={{ gap: 6 }}><span className="eyebrow">{cs.length} cadastrados</span><h1>Carros</h1></div>
        <div className="row"><AnoSel />{s.isAdmin && <button className="btn primary" onClick={() => abrir(<FormCarro />)}>Novo carro</button>}</div>
      </div>
      <div className="section">{cs.length ? <div className="grid">{cs.map((c) => <CarCard key={c.id} c={c} />)}</div> : <Empty title="Nenhum carro cadastrado" sub="Cada piloto cadastra os próprios carros no seu cadastro." />}</div>
    </>
  );
}

export function PilotoView({ id }: { id: string }) {
  const { d, s, abrir, atualizar } = useApp();
  const router = useRouter();
  const p = d.pil[id];
  if (!p) return <Empty title="Piloto não encontrado" sub="Ele pode ter sido removido ou ainda não foi aprovado." />;
  const ct = d.contatos[p.id];
  const dono = s.meuPilotoId === p.id;
  const cars = vals(d.car).filter((c) => c.pilotoId === p.id);
  const pux = vals(d.pux).filter((x) => x.pilotoId === p.id)
    .sort((a, b) => (d.ev[b.eventoId]?.data || '').localeCompare(d.ev[a.eventoId]?.data || '') || (b.criado || 0) - (a.criado || 0));
  const valid = pux.filter((x) => validade(d, x).ok);
  const best = (f: 'reacao' | 'p60' | 'm201') => valid.reduce<number | null>((m, x) => (x[f] != null && (m == null || x[f]! < m) ? x[f] : m), null);
  const vmax = valid.reduce<number | null>((m, x) => (x.vel != null && (m == null || x.vel > m) ? x.vel : m), null);
  return (
    <>
      <p style={{ margin: '0 0 16px' }}><Link className="btn ghost sm" href="/pilotos">← Pilotos</Link></p>
      <div className="pagehead">
        <div className="hero-p">
          <Ava pid={p.id} lg />
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">{[p.equipe, p.cidade].filter(Boolean).join(' · ') || 'Piloto'}</span>
            <h1>{p.nome}<ExTag o={p} /></h1>
            {p.apelido && <span className="muted" style={{ fontSize: 18 }}>“{p.apelido}”</span>}
            {p.status !== 'aprovado' && <span className={'pill ' + (p.status === 'pendente' ? 'st-agendado' : 'bad')}><span className="l" />Cadastro {p.status}</span>}
          </div>
        </div>
        <div className="row">
          {dono && <Link className="btn primary" href="/meu-cadastro">Editar meu cadastro</Link>}
          {s.isAdmin && <>
            <button className="btn ghost" onClick={() => abrir(<FormCarro pilotoFixo={p.id} />)}>Adicionar carro</button>
            <button className="btn ghost" onClick={() => abrir(<FormPilotoAdmin p={p} />)}>Editar</button>
            <Confirma onConfirm={async () => {
              if (pux.length) throw new Error('Este piloto tem puxadas registradas. Remova-as primeiro.');
              await excluir('pil', p.id); router.push('/pilotos'); router.refresh();
            }}>Excluir</Confirma>
          </>}
        </div>
      </div>
      {(s.isAdmin || dono) && ct && (
        <div className="section"><div className="note" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span><span className="muted">E-mail: </span>{ct.email || '—'}</span><span><span className="muted">Telefone: </span>{ct.telefone || '—'}</span>
          <span className="muted">Visível só para você e a organização.</span>
        </div></div>
      )}
      <div className="section"><div className="kv">
        <div><span>Puxadas</span><b>{pux.length}</b></div><div><span>Válidas</span><b>{valid.length}</b></div>
        <div><span>Melhor reação</span><b>{ft(best('reacao'))}</b></div><div><span>Melhor 60 pés</span><b>{ft(best('p60'))}</b></div>
        <div><span>Melhor 201 m</span><b>{ft(best('m201'))}</b></div><div><span>Maior velocidade</span><b>{vmax == null ? '—' : ft(vmax, 2)}</b></div>
      </div></div>
      <div className="section">
        <div className="row between"><h2>Carros</h2><AnoSel /></div>
        {cars.length ? <div className="grid">{cars.map((c) => <CarCard key={c.id} c={c} />)}</div> : <Empty title="Nenhum carro cadastrado" sub="Um piloto pode ter vários carros e correr em várias categorias." />}
      </div>
      <div className="section"><h2>Histórico de puxadas</h2>
        {pux.length ? <div className="slips">{pux.map((x) => <Slip key={x.id} p={x} showEv onEdit={x.fase === 'copa' ? undefined : () => abrir(<FormPuxada p={x} />)} onDelete={async () => { await excluir('pux', x.id); atualizar(); }} />)}</div> : <Empty title="Sem puxadas registradas" />}
      </div>
    </>
  );
}
