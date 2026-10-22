'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '../App';
import { Empty, FotoCampo } from '../ui';
import { FormCarro } from '../forms';
import { CarCard } from './Listas';
import { enviarFoto, salvar } from '@/lib/db';
import { vals } from '@/lib/regras';

export function MeuCadastroView() {
  const { d, s, abrir, atualizar, toast } = useApp();
  const p = s.meuPilotoId ? d.pil[s.meuPilotoId] : undefined;
  const ct = p ? d.contatos[p.id] : undefined;
  const [f, setF] = useState({
    nome: p?.nome || '', apelido: p?.apelido || '', email: ct?.email || s.email || '', tel: ct?.telefone || '', equipe: p?.equipe || '', cidade: p?.cidade || '',
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  if (!s.userId) return (
    <Empty title="Entre para fazer seu cadastro" sub="Crie uma conta com seu e-mail para cadastrar seus dados e seus carros.">
      <div className="row"><Link className="btn primary" href="/cadastro">Criar conta</Link><Link className="btn" href="/entrar">Já tenho conta</Link></div>
    </Empty>
  );
  const set = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });
  const cars = p ? vals(d.car).filter((c) => c.pilotoId === p.id) : [];

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('');
    if (!f.nome.trim()) return setErro('Informe seu nome.');
    if (!f.email.trim()) return setErro('Informe seu e-mail.');
    if (!f.tel.trim()) return setErro('Informe seu telefone.');
    setOcupado(true);
    try {
      const id = p?.id || crypto.randomUUID();
      const fotoPath = foto ? await enviarFoto(foto, s.userId!) : p?.foto ?? null;
      await salvar('pil', { id, nome: f.nome.trim(), apelido: f.apelido.trim() || null, equipe: f.equipe.trim() || null, cidade: f.cidade.trim() || null, foto: fotoPath });
      await salvar('contato', { pilotoId: id, email: f.email.trim(), telefone: f.tel.trim() }, 'piloto_id');
      toast(p ? 'Cadastro atualizado.' : 'Cadastro enviado para aprovação.');
      atualizar();
    } catch (x) { setErro((x as Error).message); } finally { setOcupado(false); }
  };

  return (
    <>
      <div className="pagehead">
        <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Área do piloto</span><h1>Meu cadastro</h1></div>
        {p && <Link className="btn ghost" href={'/pilotos/' + p.id}>Ver meu perfil público</Link>}
      </div>

      {p && (
        <div className="section">
          {p.status === 'pendente' && <div className="note">Seu cadastro está <b>aguardando aprovação</b> da organização. Enquanto isso, você já pode cadastrar seus carros.</div>}
          {p.status === 'aprovado' && <div className="note ok">Cadastro <b>aprovado</b>. Seu perfil e seus carros aparecem no site.</div>}
          {p.status === 'recusado' && <div className="note bad">Cadastro <b>recusado</b>{p.motivoRecusa ? `: ${p.motivoRecusa}` : '.'} Corrija os dados e salve para enviar de novo.</div>}
        </div>
      )}

      <div className="section">
        <h2>Meus dados</h2>
        <form className="panel formpanel" noValidate onSubmit={enviar}>
          <div className="fgrid">
            <label className="f">Nome completo<input value={f.nome} onChange={(e) => set('nome', e.target.value)} autoComplete="name" /></label>
            <label className="f">Apelido<input value={f.apelido} onChange={(e) => set('apelido', e.target.value)} placeholder="Como é conhecido na pista" /></label>
          </div>
          <div className="fgrid">
            <label className="f">E-mail<input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" /></label>
            <label className="f">Telefone / WhatsApp<input type="tel" value={f.tel} onChange={(e) => set('tel', e.target.value)} autoComplete="tel" placeholder="(11) 99999-9999" /></label>
          </div>
          <div className="fgrid">
            <label className="f">Equipe (opcional)<input value={f.equipe} onChange={(e) => set('equipe', e.target.value)} /></label>
            <label className="f">Cidade (opcional)<input value={f.cidade} onChange={(e) => set('cidade', e.target.value)} /></label>
          </div>
          <FotoCampo label="Sua foto" atual={p?.foto} onFile={setFoto} />
          <span className="muted" style={{ fontSize: 13 }}>E-mail e telefone ficam visíveis só para você e para a organização.</span>
          {erro && <div className="err">{erro}</div>}
          <div className="mfoot"><button className="btn primary" disabled={ocupado}>{ocupado ? 'Salvando…' : p ? 'Salvar alterações' : 'Enviar cadastro'}</button></div>
        </form>
      </div>

      <div className="section">
        <div className="row between"><h2>Meus carros</h2>{p && <button className="btn primary" onClick={() => abrir(<FormCarro pilotoFixo={p.id} />)}>Adicionar carro</button>}</div>
        {!p ? <Empty title="Envie seus dados primeiro" sub="Depois de salvar o cadastro, você pode adicionar seus carros." />
          : cars.length ? <div className="grid">{cars.map((c) => <CarCard key={c.id} c={c} />)}</div>
          : <Empty title="Nenhum carro cadastrado" sub="Cadastre cada carro com foto, configuração e tração. Você pode ter mais de um." />}
      </div>
    </>
  );
}
