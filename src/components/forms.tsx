'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './App';
import { FotoCampo, MForm, Modal } from './ui';
import { byDateDesc, byName, ft, num } from '@/lib/format';
import { ALIMENTACAO, aprovados, BYE, COMBUSTIVEL, FORMATO, carLabel, carName, carPil, copaBracket, copaRuns, DEFAULT_PTS, FASES, roundLabel, STATUS, TRACAO, tot, validade, vals } from '@/lib/regras';
import { enviarFoto, salvar } from '@/lib/db';
import type { Alimentacao, Campeonato, Carro, Categoria, Combustivel, Evento, Fase, Formato, Piloto, Puxada, Tracao } from '@/lib/types';

const novoId = () => crypto.randomUUID();
const listaPts = (s: string) => s.split(/[,;\s]+/).filter(Boolean).map(Number).filter((n) => isFinite(n));

export function FormCategoria({ c }: { c?: Categoria }) {
  const [nome, setNome] = useState(c?.nome || '');
  const [tipo, setTipo] = useState<Categoria['tipo']>(c?.tipo || 'tempo');
  const [ind, setInd] = useState(c?.indice != null ? ft(c.indice) : '');
  const [desc, setDesc] = useState(c?.descricao || '');
  return (
    <Modal title={c ? 'Editar categoria' : 'Nova categoria'}>
      <MForm onSubmit={async () => {
        const indice = num(ind);
        if (!nome.trim()) throw new Error('Informe o nome da categoria.');
        if (tipo === 'tempo' && indice == null) throw new Error('Categoria de tempo precisa do índice de 201 m.');
        await salvar('cat', { id: c?.id || novoId(), nome: nome.trim(), tipo, indice: tipo === 'tempo' ? indice : null, descricao: desc.trim() || null });
      }}>
        <label className="f">Nome<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Street 8.0, Dianteira Turbo" autoFocus /></label>
        <div className="fgrid">
          <label className="f">Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value as Categoria['tipo'])}>
            <option value="tempo">Categoria de tempo</option><option value="caracteristica">Por característica</option></select></label>
          {tipo === 'tempo' && <label className="f">Índice 201 m (s)<input inputMode="decimal" value={ind} onChange={(e) => setInd(e.target.value)} placeholder="8,000" /></label>}
        </div>
        <label className="f">Descrição (opcional)<input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: carros nacionais, tração dianteira, turbo" /></label>
      </MForm>
    </Modal>
  );
}

export function FormCampeonato({ c }: { c?: Campeonato }) {
  const [nome, setNome] = useState(c?.nome || '');
  const [ano, setAno] = useState(String(c?.ano || new Date().getFullYear()));
  const [pts, setPts] = useState((c?.pontuacao || DEFAULT_PTS).join(', '));
  const [banner, setBanner] = useState<File | null>(null);
  const { s } = useApp();
  return (
    <Modal title={c ? 'Editar campeonato' : 'Novo campeonato'}>
      <MForm onSubmit={async () => {
        if (!nome.trim()) throw new Error('Informe o nome do campeonato.');
        const p = listaPts(pts);
        const b = banner ? await enviarFoto(banner, s.userId!, 1800) : c?.banner ?? null;
        await salvar('camp', { id: c?.id || novoId(), nome: nome.trim(), ano: +ano || null, pontuacao: p.length ? p : DEFAULT_PTS, banner: b });
      }}>
        <div className="fgrid">
          <label className="f" style={{ gridColumn: 'span 2' }}>Nome<input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Campeonato Paulista de Arrancada" autoFocus /></label>
          <label className="f">Ano<input inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value)} /></label>
        </div>
        <label className="f">Pontuação padrão por posição<input value={pts} onChange={(e) => setPts(e.target.value)} /></label>
        <span className="muted" style={{ fontSize: 13 }}>1º, 2º, 3º… separados por vírgula. Cada etapa pode ter uma pontuação diferente no cadastro do evento.</span>
        <FotoCampo label="Banner do campeonato (opcional)" atual={c?.banner} onFile={setBanner} />
        <span className="muted" style={{ fontSize: 13 }}>Usado nas etapas que não têm banner próprio.</span>
      </MForm>
    </Modal>
  );
}

export function FormEvento({ e }: { e?: Evento }) {
  const { d, s, fechar, toast } = useApp();
  const router = useRouter();
  const [banner, setBanner] = useState<File | null>(null);
  const [formato, setFormato] = useState<Formato>(e?.formato || 'ranking');
  const [f, setF] = useState({
    nome: e?.nome || '', campeonatoId: e?.campeonatoId || '', data: e?.data || '', local: e?.local || '', status: e?.status || 'agendado',
    categorias: e?.categorias || [], pts: (e?.pontuacao || []).join(', '), ant: !!e?.encerradoAntecipado,
  });
  const set = (k: keyof typeof f, v: unknown) => setF({ ...f, [k]: v });
  const cats = vals(d.cat).sort(byName);
  const camps = vals(d.camp).sort((a, b) => (b.ano || 0) - (a.ano || 0));
  return (
    <Modal title={e ? 'Editar evento' : 'Novo evento'}>
      <MForm onSubmit={async () => {
        if (!f.nome.trim()) throw new Error('Informe o nome do evento.');
        if (formato !== 'copa' && !f.categorias.length) throw new Error('Escolha as categorias que vão correr.');
        const id = e?.id || novoId();
        const b = banner ? await enviarFoto(banner, s.userId!, 1800) : e?.banner ?? null;
        await salvar('ev', {
          banner: b, formato,
          id, nome: f.nome.trim(), campeonatoId: f.campeonatoId || null, data: f.data || null, local: f.local.trim() || null, status: f.status,
          categorias: formato === 'copa' ? [] : f.categorias, pontuacao: listaPts(f.pts), encerradoAntecipado: f.ant, vencedores: e?.vencedores || {}, copa: e?.copa ?? null,
        });
        if (!e) { fechar(); toast('Evento criado.'); router.push('/eventos/' + id); return 'keep'; }
      }}>
        <label className="f">Nome do evento<input value={f.nome} onChange={(x) => set('nome', x.target.value)} placeholder="Ex.: 3ª Etapa — Autódromo de Interlagos" autoFocus /></label>
        <div className="fgrid">
          <label className="f">Campeonato<select value={f.campeonatoId} onChange={(x) => set('campeonatoId', x.target.value)}>
            <option value="">Evento avulso (não pontua)</option>
            {camps.map((c) => <option key={c.id} value={c.id}>{c.nome} {c.ano || ''}</option>)}</select></label>
          <label className="f">Data<input type="date" value={f.data} onChange={(x) => set('data', x.target.value)} /></label>
        </div>
        <div className="fgrid">
          <label className="f">Local<input value={f.local} onChange={(x) => set('local', x.target.value)} placeholder="Pista, cidade" /></label>
          <label className="f">Status<select value={f.status} onChange={(x) => set('status', x.target.value)}>
            {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        </div>
        <fieldset><legend>Formato</legend><div className="checks">
          {Object.entries(FORMATO).map(([k, l]) => <label key={k}><input type="radio" name="formato" checked={formato === k} onChange={() => setFormato(k as Formato)} />{l}</label>)}
        </div></fieldset>
        {formato === 'copa' && <div className="note" style={{ fontSize: 13 }}>Na Copa todos os carros escolhidos disputam um mata-mata até o 1º, 2º e 3º, sem categoria e sem pontos no ranking. Depois de salvar, monte a chave na aba ★ Copa do evento.</div>}
        {formato !== 'copa' && <><fieldset><legend>Categorias que correm</legend><div className="checks">
          {cats.length ? cats.map((c) => (
            <label key={c.id}><input type="checkbox" checked={f.categorias.includes(c.id)}
              onChange={(x) => set('categorias', x.target.checked ? [...f.categorias, c.id] : f.categorias.filter((y) => y !== c.id))} />{c.nome}</label>
          )) : <span className="muted">Cadastre categorias na área Admin.</span>}
        </div></fieldset>
        <label className="f">Pontuação desta etapa (opcional)<input value={f.pts} onChange={(x) => set('pts', x.target.value)} placeholder="Vazio = usa a pontuação do campeonato" /></label>
        <div className="checks"><label><input type="checkbox" checked={f.ant} onChange={(x) => set('ant', x.target.checked)} />Encerrado antes do fim (chuva etc.) — vale a classificatória</label></div></>}
        <FotoCampo label="Banner / cartaz do evento (opcional)" atual={e?.banner} onFile={setBanner} />
      </MForm>
    </Modal>
  );
}

/** Cadastro de piloto feito pelo admin (sem conta própria). */
export function FormPilotoAdmin({ p }: { p?: Piloto }) {
  const { d, s } = useApp();
  const ct = p ? d.contatos[p.id] : undefined;
  const [f, setF] = useState({ nome: p?.nome || '', apelido: p?.apelido || '', equipe: p?.equipe || '', cidade: p?.cidade || '', email: ct?.email || '', tel: ct?.telefone || '' });
  const [foto, setFoto] = useState<File | null>(null);
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  return (
    <Modal title={p ? 'Editar piloto' : 'Novo piloto'}>
      <MForm onSubmit={async () => {
        if (!f.nome.trim()) throw new Error('Informe o nome do piloto.');
        const id = p?.id || novoId();
        const fotoPath = foto ? await enviarFoto(foto, s.userId!) : p?.foto ?? null;
        await salvar('pil', { id, nome: f.nome.trim(), apelido: f.apelido.trim() || null, equipe: f.equipe.trim() || null, cidade: f.cidade.trim() || null, foto: fotoPath, status: p?.status || 'aprovado' });
        await salvar('contato', { pilotoId: id, email: f.email.trim() || null, telefone: f.tel.trim() || null }, 'piloto_id');
      }}>
        <div className="fgrid">
          <label className="f">Nome<input value={f.nome} onChange={(e) => set('nome', e.target.value)} autoFocus /></label>
          <label className="f">Apelido<input value={f.apelido} onChange={(e) => set('apelido', e.target.value)} /></label>
        </div>
        <div className="fgrid">
          <label className="f">E-mail<input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
          <label className="f">Telefone<input type="tel" value={f.tel} onChange={(e) => set('tel', e.target.value)} /></label>
        </div>
        <div className="fgrid">
          <label className="f">Equipe<input value={f.equipe} onChange={(e) => set('equipe', e.target.value)} /></label>
          <label className="f">Cidade<input value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></label>
        </div>
        <FotoCampo label="Foto do piloto" atual={p?.foto} onFile={setFoto} />
        <span className="muted" style={{ fontSize: 13 }}>E-mail e telefone ficam visíveis só para o admin e para o próprio piloto.</span>
      </MForm>
    </Modal>
  );
}

export function FormCarro({ c, pilotoFixo }: { c?: Carro; pilotoFixo?: string }) {
  const { d, s } = useApp();
  const pilotos = s.isAdmin ? vals(d.pil).sort(byName) : vals(d.pil).filter((p) => p.id === s.meuPilotoId);
  const [f, setF] = useState({
    pilotoId: c?.pilotoId || pilotoFixo || pilotos[0]?.id || '', modelo: c?.modelo || '', ano: c?.ano || '', numero: c?.numero || '',
    configs: c?.configs || [], tracao: c?.tracao || ('' as Tracao | ''),
    combustivel: c?.combustivel || ('' as Combustivel | ''), alimentacao: c?.alimentacao || ('' as Alimentacao | ''),
  });
  const [fc, setFc] = useState<File | null>(null);
  const [fp, setFp] = useState<File | null>(null);
  const set = (k: keyof typeof f, v: unknown) => setF({ ...f, [k]: v });
  const antigos = ['Etanol', 'Álcool', 'Gasolina', 'Metanol', 'Injeção eletrônica', 'Injetado', 'Carburado'];
  const opcoes = [...new Set([...d.configs, ...(c?.configs || [])])].filter((x) => !antigos.includes(x));
  return (
    <Modal title={c ? 'Editar carro' : 'Novo carro'}>
      <MForm onSubmit={async () => {
        if (!f.pilotoId) throw new Error('Escolha o piloto.');
        if (!f.modelo.trim()) throw new Error('Informe a marca/modelo do carro.');
        if (!f.tracao) throw new Error('Escolha o tipo de tração.');
        if (!f.combustivel) throw new Error('Escolha o combustível.');
        if (!f.alimentacao) throw new Error('Escolha se o carro é injetado ou carburado.');
        const fotoCarro = fc ? await enviarFoto(fc, s.userId!) : c?.fotoCarro ?? null;
        const fotoPiloto = fp ? await enviarFoto(fp, s.userId!) : c?.fotoPiloto ?? null;
        await salvar('car', { id: c?.id || novoId(), pilotoId: f.pilotoId, modelo: f.modelo.trim(), ano: f.ano.trim() || null, numero: f.numero.trim() || null, configs: f.configs, tracao: f.tracao, combustivel: f.combustivel, alimentacao: f.alimentacao, fotoCarro, fotoPiloto });
      }}>
        {s.isAdmin && !pilotoFixo && (
          <label className="f">Piloto<select value={f.pilotoId} onChange={(e) => set('pilotoId', e.target.value)}>
            {pilotos.map((p) => <option key={p.id} value={p.id}>{p.nome}{p.status !== 'aprovado' ? ` (${p.status})` : ''}</option>)}</select></label>
        )}
        <div className="fgrid">
          <label className="f">Marca / modelo<input value={f.modelo} onChange={(e) => set('modelo', e.target.value)} placeholder="Ex.: VW Gol GTI" autoFocus /></label>
          <label className="f">Ano (opcional)<input inputMode="numeric" value={f.ano} onChange={(e) => set('ano', e.target.value)} /></label>
          <label className="f">Número<input value={f.numero} onChange={(e) => set('numero', e.target.value)} /></label>
        </div>
        <fieldset><legend>Configuração (marque todas que se aplicam)</legend><div className="checks">
          {opcoes.map((x) => <label key={x}><input type="checkbox" checked={f.configs.includes(x)}
            onChange={(e) => set('configs', e.target.checked ? [...f.configs, x] : f.configs.filter((y) => y !== x))} />{x}</label>)}
        </div></fieldset>
        <fieldset><legend>Combustível</legend><div className="checks">
          {Object.entries(COMBUSTIVEL).map(([k, l]) => <label key={k}><input type="radio" name="combustivel" checked={f.combustivel === k} onChange={() => set('combustivel', k)} />{l}</label>)}
        </div></fieldset>
        <fieldset><legend>Alimentação</legend><div className="checks">
          {Object.entries(ALIMENTACAO).map(([k, l]) => <label key={k}><input type="radio" name="alimentacao" checked={f.alimentacao === k} onChange={() => set('alimentacao', k)} />{l}</label>)}
        </div></fieldset>
        <fieldset><legend>Tração</legend><div className="checks">
          {Object.entries(TRACAO).map(([k, l]) => <label key={k}><input type="radio" name="tracao" checked={f.tracao === k} onChange={() => set('tracao', k)} />{l}</label>)}
        </div></fieldset>
        <div className="fgrid">
          <FotoCampo label="Foto do carro" atual={c?.fotoCarro} onFile={setFc} />
          <FotoCampo label="Foto do piloto" atual={c?.fotoPiloto} onFile={setFp} />
        </div>
        <div className="note" style={{ fontSize: 13 }}>O melhor tempo do ano é calculado sozinho a partir das puxadas válidas deste carro.</div>
      </MForm>
    </Modal>
  );
}

type Tempos = { r: string; p60: string; m100: string; m201: string; vel: string; anul: boolean; mot: string };
const temposDe = (p?: Partial<Puxada>): Tempos => ({
  r: p?.reacao != null ? ft(p.reacao) : '', p60: p?.p60 != null ? ft(p.p60) : '', m100: p?.m100 != null ? ft(p.m100) : '',
  m201: p?.m201 != null ? ft(p.m201) : '', vel: p?.vel != null ? ft(p.vel, 2) : '', anul: p?.valida === false, mot: p?.motivo || '',
});
const temposVazios = temposDe();
const lerTempos = (t: Tempos) => ({
  reacao: num(t.r), p60: num(t.p60), m100: num(t.m100), m201: num(t.m201), vel: num(t.vel), valida: !t.anul, motivo: t.anul ? t.mot.trim() || null : null,
});

function CamposTempo({ t, set, categoriaId }: { t: Tempos; set: (t: Tempos) => void; categoriaId: string | null }) {
  const { d } = useApp();
  const x = lerTempos(t);
  const v = x.m201 == null ? null : validade(d, { ...x, categoriaId });
  const campo = (k: keyof Tempos, label: string, ph: string) => (
    <label className="f">{label}<input id={'t-' + k} inputMode="decimal" value={t[k] as string} placeholder={ph} onChange={(e) => set({ ...t, [k]: e.target.value })} /></label>
  );
  return (
    <>
      <div className="fgrid">
        {campo('r', 'Reação (s)', '0,120')}{campo('p60', '60 pés (s)', '1,650')}{campo('m100', '100 m (s)', '4,980')}
        {campo('m201', '201 m (s)', '7,850')}{campo('vel', 'Vel. final (km/h)', '185,40')}
      </div>
      <div className="checks"><label><input type="checkbox" checked={t.anul} onChange={(e) => set({ ...t, anul: e.target.checked })} />Anular puxada (cruzou faixa, problema técnico etc.)</label></div>
      {t.anul && <label className="f">Motivo da anulação<input value={t.mot} onChange={(e) => set({ ...t, mot: e.target.value })} /></label>}
      <div className={'live' + (v ? (v.ok ? ' ok' : ' bad') : '')}>
        {!v ? 'Preencha os tempos para ver se a puxada é válida.' : v.ok ? `Válida · reação + 201 m = ${ft(tot(x))} s` : 'Inválida · ' + v.motivo}
      </div>
    </>
  );
}

export function FormPuxada({ p, eventoId, categoriaId }: { p?: Puxada; eventoId?: string; categoriaId?: string }) {
  const { d, toast } = useApp();
  const evs = vals(d.ev).sort(byDateDesc);
  const pils = aprovados(d).sort(byName);
  const [ev, setEv] = useState(p?.eventoId || eventoId || evs[0]?.id || '');
  const catsEv = (d.ev[ev]?.categorias || []).map((c) => d.cat[c]).filter(Boolean);
  const [cat, setCat] = useState(p?.categoriaId || categoriaId || catsEv[0]?.id || '');
  const [fase, setFase] = useState<Fase>(p?.fase || 'classificatoria');
  const [pil, setPil] = useState(p?.pilotoId || pils[0]?.id || '');
  const carros = vals(d.car).filter((c) => c.pilotoId === pil);
  const [car, setCar] = useState(p?.carroId || carros[0]?.id || '');
  const [t, setT] = useState<Tempos>(temposDe(p));
  const catOk = catsEv.some((c) => c.id === cat) ? cat : catsEv[0]?.id || '';
  const carOk = carros.some((c) => c.id === car) ? car : carros[0]?.id || '';
  if (!evs.length) return <Modal title="Lançar puxada"><div className="empty" style={{ margin: 18 }}><b>Cadastre um evento primeiro.</b></div></Modal>;
  return (
    <Modal title={p ? 'Editar puxada' : 'Lançar puxada'}>
      <MForm onSubmit={async () => {
        if (!ev || !catOk) throw new Error('Escolha evento e categoria.');
        if (!carOk) throw new Error('Este piloto não tem carro cadastrado.');
        const x = lerTempos(t);
        if (x.m201 == null) throw new Error('Informe o tempo de 201 m.');
        await salvar('pux', { id: p?.id || novoId(), eventoId: ev, categoriaId: catOk, fase, copaKey: null, pilotoId: pil, carroId: carOk, ...x, criado: p?.criado || Date.now() });
        if (!p) { toast('Puxada salva. Pronto para a próxima.'); setT(temposVazios); document.getElementById('t-r')?.focus(); return 'keep'; }
      }}>
        <div className="fgrid">
          <label className="f">Evento<select value={ev} onChange={(e) => setEv(e.target.value)}>{evs.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
          <label className="f">Categoria<select value={catOk} onChange={(e) => setCat(e.target.value)}>
            {catsEv.length ? catsEv.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>) : <option value="">Evento sem categorias</option>}</select></label>
        </div>
        <div className="fgrid">
          <label className="f">Fase<select value={fase} onChange={(e) => setFase(e.target.value as Fase)}>{Object.entries(FASES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <label className="f">Piloto<select value={pil} onChange={(e) => setPil(e.target.value)}>{pils.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.apelido ? ` (${x.apelido})` : ''}</option>)}</select></label>
          <label className="f">Carro<select value={carOk} onChange={(e) => setCar(e.target.value)}>
            {carros.length ? carros.map((c) => <option key={c.id} value={c.id}>{carName(d, c.id)}</option>) : <option value="">Sem carro cadastrado</option>}</select></label>
        </div>
        <CamposTempo t={t} set={setT} categoriaId={catOk || null} />
      </MForm>
    </Modal>
  );
}

export function FormMontarCopa({ ev }: { ev: Evento }) {
  const { d } = useApp();
  const evCars = useMemo(() => [...new Set(vals(d.pux).filter((p) => p.eventoId === ev.id && p.fase !== 'copa').map((p) => p.carroId))].filter((id) => d.car[id]), [d, ev.id]);
  const outros = vals(d.car).map((c) => c.id).filter((id) => !evCars.includes(id) && d.pil[d.car[id].pilotoId]?.status === 'aprovado');
  const sortL = (ids: string[]) => [...ids].sort((a, b) => carLabel(d, a).localeCompare(carLabel(d, b), 'pt-BR'));
  const inicial = ev.copa?.r1 || [];
  const [sel, setSel] = useState<string[]>(inicial.flatMap((m) => [m.a, m.b]).filter((x) => x && x !== BYE));
  const [slots, setSlots] = useState<string[]>(inicial.flatMap((m) => [m.a, m.b || BYE]));
  const n = Math.ceil(sel.length / 2);
  // completa os confrontos com os carros marcados que ainda não estão em nenhum
  const vis: string[] = [];
  const usados = new Set<string>();
  for (let i = 0; i < n * 2; i++) { const v = slots[i]; if (v && v !== BYE && sel.includes(v) && !usados.has(v)) { usados.add(v); vis.push(v); } else vis.push(''); }
  const resto = sel.filter((x) => !usados.has(x));
  for (let i = 0; i < vis.length; i++) if (!vis[i]) vis[i] = resto.shift() || BYE;
  const toggle = (id: string, on: boolean) => setSel(on ? [...sel, id] : sel.filter((x) => x !== id));
  const setSlot = (i: number, v: string) => { const s2 = [...vis]; s2[i] = v; setSlots(s2); };
  const box = (ids: string[]) => sortL(ids).map((id) => <label key={id}><input type="checkbox" checked={sel.includes(id)} onChange={(e) => toggle(id, e.target.checked)} />{carLabel(d, id)}</label>);
  return (
    <Modal title={inicial.length ? 'Editar chave da Copa' : 'Montar Copa'}>
      <MForm onSubmit={async () => {
        if (sel.length < 2) throw new Error('Escolha pelo menos 2 carros.');
        const r1 = [], used: string[] = [];
        for (let i = 0; i < n; i++) {
          const a = vis[i * 2], b = vis[i * 2 + 1];
          if (!a || a === BYE) throw new Error(`Confronto ${i + 1}: escolha o carro A.`);
          r1.push({ a, b: b || BYE }); used.push(a); if (b && b !== BYE) used.push(b);
        }
        const dup = used.find((x, i) => used.indexOf(x) !== i);
        if (dup) throw new Error(`${carLabel(d, dup)} está em mais de um confronto.`);
        const falta = sel.find((x) => !used.includes(x));
        if (falta) throw new Error(`${carLabel(d, falta)} foi marcado mas não está em nenhum confronto.`);
        await salvar('ev', { ...ev, copa: { r1, vencedores: ev.copa?.vencedores || {} } });
      }}>
        <fieldset><legend>Carros que correram neste evento</legend><div className="checks">
          {evCars.length ? box(evCars) : <span className="muted">Nenhuma puxada lançada neste evento ainda.</span>}</div></fieldset>
        {outros.length > 0 && <details open={!evCars.length}><summary className="muted" style={{ cursor: 'pointer', fontSize: 14 }}>Outros carros cadastrados ({outros.length})</summary>
          <div className="checks" style={{ marginTop: 8 }}>{box(outros)}</div></details>}
        <fieldset><legend>Confrontos da 1ª rodada</legend><div className="stack" style={{ gap: 10 }}>
          {n ? Array.from({ length: n }, (_, i) => (
            <div className="fgrid" key={i}>
              <label className="f">Confronto {i + 1} · carro A<select value={vis[i * 2]} onChange={(e) => setSlot(i * 2, e.target.value)}>
                {sel.map((c) => <option key={c} value={c}>{carLabel(d, c)}</option>)}</select></label>
              <label className="f">Carro B<select value={vis[i * 2 + 1]} onChange={(e) => setSlot(i * 2 + 1, e.target.value)}>
                <option value={BYE}>— passa direto —</option>{sel.map((c) => <option key={c} value={c}>{carLabel(d, c)}</option>)}</select></label>
            </div>
          )) : <span className="muted" style={{ fontSize: 14 }}>Marque os carros acima para montar os confrontos.</span>}
        </div></fieldset>
        <div className="note" style={{ fontSize: 13 }}>Os vencedores avançam sozinhos: vencedor do confronto 1 enfrenta o do 2, o 3 enfrenta o 4, e assim por diante. Os perdedores das semifinais disputam o 3º lugar. Com número ímpar de carros, um carro “passa direto”.{inicial.length ? ' Puxadas já lançadas continuam ligadas ao confronto de mesmo número.' : ''}</div>
      </MForm>
    </Modal>
  );
}

export function FormPuxadaCopa({ ev, chave, p }: { ev: Evento; chave: string; p?: Puxada }) {
  const { d, toast, fechar } = useApp();
  const b = copaBracket(d, ev);
  const m = b ? [...b.rounds.flat(), b.t3].find((x) => x?.key === chave) : undefined;
  const ok = m && m.a && m.b && m.a !== BYE && m.b !== BYE;
  const [car, setCar] = useState(p?.carroId || (m?.ra && !m?.rb ? m.b! : m?.a || ''));
  const [t, setT] = useState<Tempos>(temposDe(p));
  if (!b || !m || !ok) return <Modal title="Copa"><div className="empty" style={{ margin: 18 }}><b>Este confronto ainda não tem os dois carros definidos.</b></div></Modal>;
  const ri = b.rounds.findIndex((r) => r.includes(m));
  const titulo = chave === 't3' ? 'Disputa de 3º' : roundLabel(ri, b.rounds.length);
  return (
    <Modal title={`${p ? 'Editar puxada' : 'Lançar puxada'} · Copa · ${titulo}`}>
      <MForm onSubmit={async () => {
        const x = lerTempos(t);
        if (x.m201 == null) throw new Error('Informe o tempo de 201 m.');
        await salvar('pux', { id: p?.id || novoId(), eventoId: ev.id, categoriaId: null, fase: 'copa', copaKey: chave, pilotoId: carPil(d, car), carroId: car, ...x, criado: p?.criado || Date.now() });
        if (!p) {
          const outro = car === m.a ? m.b! : m.a!;
          if (copaRuns(d, ev.id, chave).some((r) => r.carroId === outro)) { fechar(); toast('Puxada salva.'); return 'keep'; }
          toast('Puxada salva. Agora lance o adversário.'); setCar(outro); setT(temposVazios); document.getElementById('t-r')?.focus();
          return 'keep';
        }
      }}>
        <label className="f">Carro<select value={car} onChange={(e) => setCar(e.target.value)}>
          {[m.a!, m.b!].map((c) => <option key={c} value={c}>{carLabel(d, c)}</option>)}</select></label>
        <CamposTempo t={t} set={setT} categoriaId={null} />
        <span className="muted" style={{ fontSize: 13 }}>Na Copa não há índice de categoria: só reação negativa ou anulação invalidam a puxada.</span>
      </MForm>
    </Modal>
  );
}
