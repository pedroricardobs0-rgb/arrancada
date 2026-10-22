'use client';
import { useState, type ReactNode } from 'react';
import { useApp } from './App';
import { ft, fotoUrl, initials } from '@/lib/format';
import { carName, FASE_CURTA, pilName, STATUS, tot, validade, vals } from '@/lib/regras';
import type { Puxada } from '@/lib/types';

export function fotoDoPiloto(d: ReturnType<typeof useApp>['d'], pid?: string | null) {
  if (!pid) return null;
  return d.pil[pid]?.foto || vals(d.car).find((c) => c.pilotoId === pid && c.fotoPiloto)?.fotoPiloto || null;
}

export function Ava({ pid, lg, foto, nome }: { pid?: string | null; lg?: boolean; foto?: string | null; nome?: string }) {
  const { d } = useApp();
  const [erro, setErro] = useState(false);
  const f = foto !== undefined ? foto : fotoDoPiloto(d, pid);
  const n = nome ?? pilName(d, pid);
  const cls = 'ava' + (lg ? ' lg' : '');
  if (f && !erro) return <img className={cls} src={fotoUrl(f)!} alt="" onError={() => setErro(true)} />;
  return <span className={cls} aria-hidden="true">{initials(n)}</span>;
}

export const StatusPill = ({ s }: { s?: string }) => (
  <span className={`pill st-${s || 'agendado'}`}><span className="l" />{STATUS[s || 'agendado']}</span>
);
export const ExTag = ({ o }: { o?: { exemplo?: boolean } }) => (o?.exemplo ? <> <span className="pill ex">exemplo</span></> : null);

export function Empty({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return <div className="empty"><b>{title}</b>{sub && <span>{sub}</span>}{children}</div>;
}

/** Botão que pede um segundo clique para confirmar. */
export function Confirma({ onConfirm, children, className = 'btn danger', small }: { onConfirm: () => Promise<void> | void; children: ReactNode; className?: string; small?: boolean }) {
  const [armado, setArmado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const { toast } = useApp();
  return (
    <button type="button" className={className + (small ? ' sm' : '')} data-armed={armado || undefined} disabled={ocupado}
      onClick={async () => {
        if (!armado) { setArmado(true); setTimeout(() => setArmado(false), 3500); return; }
        setOcupado(true);
        try { await onConfirm(); } catch (e) { toast('Erro: ' + (e as Error).message); } finally { setOcupado(false); setArmado(false); }
      }}>
      {armado ? 'Confirmar?' : children}
    </button>
  );
}

export function Slip({ p, showEv, onEdit, onDelete }: { p: Puxada; showEv?: boolean; onEdit?: () => void; onDelete?: () => Promise<void> }) {
  const { d, s } = useApp();
  const v = validade(d, p);
  const ev = d.ev[p.eventoId];
  return (
    <div className="slip">
      <div className="hd"><span>{FASE_CURTA[p.fase] || ''}{showEv && ev ? ' · ' + ev.nome : ''}</span><span>{p.categoriaId ? d.cat[p.categoriaId]?.nome : ''}</span></div>
      <div className="nm">{pilName(d, p.pilotoId)}</div>
      <div style={{ fontSize: 11, opacity: 0.7 }}>{carName(d, p.carroId)}</div>
      <dl>
        <dt>Reação</dt><dd>{ft(p.reacao)}</dd><dt>60 pés</dt><dd>{ft(p.p60)}</dd><dt>100 m</dt><dd>{ft(p.m100)}</dd>
        <dt>201 m</dt><dd>{ft(p.m201)}</dd><dt>Vel. final</dt><dd>{ft(p.vel, 2)} km/h</dd>
      </dl>
      <div className="ft">
        <span className={'v ' + (v.ok ? 'ok' : 'bad')}>{v.ok ? '● VÁLIDA' : '● INVÁLIDA'}</span>
        {s.isAdmin && (onEdit || onDelete) && (
          <span className="act">
            {onEdit && <button type="button" onClick={onEdit}>Editar</button>}
            {onDelete && <Confirma className="" onConfirm={onDelete}>Excluir</Confirma>}
          </span>
        )}
      </div>
      {!v.ok && <div style={{ fontSize: 11, color: '#b3261e', marginTop: 4 }}>{v.motivo}</div>}
      {v.ok && <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>R + 201 m = {ft(tot(p))}</div>}
    </div>
  );
}

export function Modal({ title, children }: { title: string; children: ReactNode }) {
  const { fechar } = useApp();
  return (
    <div className="ov-bg" onMouseDown={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mh"><h2>{title}</h2><button type="button" className="btn ghost sm" onClick={fechar}>Fechar</button></div>
        {children}
      </div>
    </div>
  );
}

/** Formulário de modal com tratamento de erro padrão. `onSubmit` retorna 'keep' para não fechar. */
export function MForm({ onSubmit, children, salvar = 'Salvar' }: { onSubmit: () => Promise<void | 'keep'>; children: ReactNode; salvar?: string }) {
  const { fechar, toast, atualizar } = useApp();
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault(); setErro(''); setOcupado(true);
      try {
        const r = await onSubmit();
        atualizar();
        if (r !== 'keep') { fechar(); toast('Salvo.'); }
      } catch (x) { setErro((x as Error).message || 'Falha ao salvar.'); }
      finally { setOcupado(false); }
    }}>
      {children}
      {erro && <div className="err">{erro}</div>}
      <div className="mfoot">
        <button type="button" className="btn ghost" onClick={fechar}>Cancelar</button>
        <button className="btn primary" disabled={ocupado}>{ocupado ? 'Salvando…' : salvar}</button>
      </div>
    </form>
  );
}

export function FotoCampo({ label, atual, onFile }: { label: string; atual?: string | null; onFile: (f: File | null) => void }) {
  const [prev, setPrev] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 6 }}>
      <label className="f">{label}
        <input type="file" accept="image/*" onChange={(e) => {
          const f = e.target.files?.[0] || null; onFile(f); setPrev(f ? URL.createObjectURL(f) : null);
        }} />
      </label>
      {(prev || atual) && <div className="prev"><img src={prev || fotoUrl(atual)!} alt="" /><span className="muted" style={{ fontSize: 13 }}>{prev ? 'Nova foto' : 'Foto atual. Escolha outra para trocar.'}</span></div>}
    </div>
  );
}
