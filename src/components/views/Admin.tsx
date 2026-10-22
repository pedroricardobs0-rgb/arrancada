'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '../App';
import { Ava, Confirma, Empty, ExTag } from '../ui';
import { FormCampeonato, FormCategoria } from '../forms';
import { byName, ft } from '@/lib/format';
import { DEFAULT_PTS, vals } from '@/lib/regras';
import { atualizar as atualizarDb, excluir, salvarConfigs } from '@/lib/db';
import { carregarExemplo, limparExemplo } from '@/lib/exemplo';

export function AdminView() {
  const { d, s, abrir, atualizar, toast } = useApp();
  const [nova, setNova] = useState('');
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);
  if (!s.isAdmin) return <Empty title="Área da organização" sub="Só administradores acessam esta página." />;
  const cats = vals(d.cat).sort(byName);
  const camps = vals(d.camp).sort((a, b) => (b.ano || 0) - (a.ano || 0));
  const pend = vals(d.pil).filter((p) => p.status === 'pendente');
  const temEx = ([d.cat, d.camp, d.pil, d.car, d.ev, d.pux] as Record<string, { exemplo?: boolean }>[]).some((o) => vals(o).some((x) => x.exemplo));
  const usoCat = (id: string) => vals(d.ev).some((e) => e.categorias.includes(id));
  const usoCamp = (id: string) => vals(d.ev).some((e) => e.campeonatoId === id);
  const run = async (f: () => Promise<void>, ok: string) => {
    setOcupado(true);
    try { await f(); toast(ok); atualizar(); } catch (e) { toast('Erro: ' + (e as Error).message); } finally { setOcupado(false); }
  };

  return (
    <>
      <div className="pagehead">
        <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Organização</span><h1>Admin</h1></div>
        <div className="row">
          {temEx ? <Confirma onConfirm={() => run(limparExemplo, 'Dados de exemplo removidos.')}>Remover dados de exemplo</Confirma>
            : <button className="btn ghost" disabled={ocupado} onClick={() => run(carregarExemplo, 'Dados de exemplo carregados.')}>{ocupado ? 'Carregando…' : 'Carregar dados de exemplo'}</button>}
        </div>
      </div>

      <div className="section">
        <div className="row between"><h2>Cadastros aguardando aprovação</h2><span className="pill st-agendado"><span className="l" />{pend.length} pendente{pend.length === 1 ? '' : 's'}</span></div>
        {pend.length ? (
          <div className="stack" style={{ gap: 12 }}>{pend.map((p) => {
            const ct = d.contatos[p.id];
            const cars = vals(d.car).filter((c) => c.pilotoId === p.id);
            return (
              <div className="panel" key={p.id}>
                <div className="ph2">
                  <div className="who"><Ava pid={p.id} lg /><div>
                    <b style={{ fontSize: 18 }}>{p.nome}</b>{p.apelido && <span className="muted"> “{p.apelido}”</span>}
                    <small>{[p.equipe, p.cidade].filter(Boolean).join(' · ')}</small>
                    <small>{ct?.email || 'sem e-mail'} · {ct?.telefone || 'sem telefone'}</small>
                    <small>{cars.length ? cars.map((c) => c.modelo).join(', ') : 'Nenhum carro cadastrado ainda'}</small>
                  </div></div>
                  <div className="row">
                    <Link className="btn sm ghost" href={'/pilotos/' + p.id}>Ver cadastro</Link>
                    <button className="btn sm primary" onClick={() => run(() => atualizarDb('pil', p.id, { status: 'aprovado', motivoRecusa: null }), `${p.nome} aprovado.`)}>Aprovar</button>
                  </div>
                </div>
                <div className="cfgrow">
                  <input placeholder="Motivo da recusa (o piloto verá)" value={motivos[p.id] || ''} onChange={(e) => setMotivos({ ...motivos, [p.id]: e.target.value })} className="inline" />
                  <button className="btn sm danger" onClick={() => run(() => atualizarDb('pil', p.id, { status: 'recusado', motivoRecusa: motivos[p.id] || null }), 'Cadastro recusado.')}>Recusar</button>
                </div>
              </div>
            );
          })}</div>
        ) : <Empty title="Nenhum cadastro pendente" sub="Quando um piloto enviar o cadastro, ele aparece aqui para você aprovar." />}
      </div>

      <div className="section two">
        <div className="panel">
          <div className="ph2"><h3>Categorias</h3><button className="btn sm primary" onClick={() => abrir(<FormCategoria />)}>Nova categoria</button></div>
          {cats.length ? cats.map((c) => (
            <div className="cfgrow" key={c.id}>
              <div><b>{c.nome}</b><ExTag o={c} /><br /><span className="muted" style={{ fontSize: 13 }}>{c.tipo === 'tempo' ? `Tempo · índice ${ft(c.indice)} s` : 'Característica'}</span></div>
              <div className="row">
                <button className="btn sm" onClick={() => abrir(<FormCategoria c={c} />)}>Editar</button>
                <Confirma small onConfirm={async () => { if (usoCat(c.id)) throw new Error('Categoria em uso por eventos. Remova dos eventos primeiro.'); await excluir('cat', c.id); atualizar(); }}>Excluir</Confirma>
              </div>
            </div>
          )) : <div className="cfgrow muted">Nenhuma categoria.</div>}
        </div>

        <div className="panel">
          <div className="ph2"><h3>Campeonatos</h3><button className="btn sm primary" onClick={() => abrir(<FormCampeonato />)}>Novo campeonato</button></div>
          {camps.length ? camps.map((c) => (
            <div className="cfgrow" key={c.id}>
              <div><b>{c.nome}</b><ExTag o={c} /><br /><span className="muted" style={{ fontSize: 13 }}>{c.ano || ''} · pontos: {(c.pontuacao || DEFAULT_PTS).slice(0, 6).join('-')}…</span></div>
              <div className="row">
                <button className="btn sm" onClick={() => abrir(<FormCampeonato c={c} />)}>Editar</button>
                <Confirma small onConfirm={async () => { if (usoCamp(c.id)) throw new Error('Campeonato tem etapas. Mova ou exclua os eventos primeiro.'); await excluir('camp', c.id); atualizar(); }}>Excluir</Confirma>
              </div>
            </div>
          )) : <div className="cfgrow muted">Nenhum campeonato.</div>}
        </div>

        <div className="panel">
          <div className="ph2"><h3>Configurações de carro</h3></div>
          <div className="cfgrow"><div className="tags">{d.configs.map((c) => (
            <span className="tag" key={c}>{c} <button aria-label={'Remover ' + c} className="x" onClick={() => run(() => salvarConfigs(undefined, c), 'Removida.')}>×</button></span>
          ))}</div></div>
          <form className="cfgrow" onSubmit={(e) => { e.preventDefault(); const v = nova.trim(); if (v) run(() => salvarConfigs(v), 'Adicionada.').then(() => setNova('')); }}>
            <input className="inline" placeholder="Nova configuração (ex.: Supercharger)" value={nova} onChange={(e) => setNova(e.target.value)} />
            <button className="btn sm primary">Adicionar</button>
          </form>
        </div>

        <div className="panel">
          <div className="ph2"><h3>Como funciona o acesso</h3></div>
          <div className="cfgrow" style={{ display: 'block', fontSize: 14 }}>
            Qualquer pessoa vê eventos, tempos e rankings sem login. Pilotos criam conta com e-mail e senha, preenchem o cadastro e os carros, e só aparecem no site depois da sua aprovação. E-mail e telefone ficam visíveis só para você e para o próprio piloto. Para dar acesso de admin a outra pessoa, siga o passo a passo no README do projeto.
          </div>
        </div>
      </div>
    </>
  );
}
