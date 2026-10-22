'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const traduz = (m: string) => {
  if (/invalid login/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar. Veja a mensagem que enviamos.';
  if (/already registered/i.test(m)) return 'Este e-mail já tem conta. Use “Entrar”.';
  if (/password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  return m;
};

function Caixa({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="authbox">
      <div className="stack" style={{ gap: 6 }}><span className="eyebrow">Área do piloto</span><h1 style={{ fontSize: 36 }}>{titulo}</h1>{sub && <span className="muted">{sub}</span>}</div>
      {children}
    </div>
  );
}

export function EntrarView() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  return (
    <Caixa titulo="Entrar">
      <form className="panel formpanel" noValidate onSubmit={async (e) => {
        e.preventDefault(); setErro(''); setOcupado(true);
        const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password: senha });
        setOcupado(false);
        if (error) return setErro(traduz(error.message));
        router.push('/meu-cadastro'); router.refresh();
      }}>
        <label className="f">E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus /></label>
        <label className="f">Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" /></label>
        {erro && <div className="err">{erro}</div>}
        <button className="btn primary" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        <div className="row between" style={{ fontSize: 14 }}><Link href="/cadastro">Criar conta</Link><Link href="/redefinir-senha">Esqueci a senha</Link></div>
      </form>
    </Caixa>
  );
}

export function CadastroView() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  if (ok) return (
    <Caixa titulo="Confira seu e-mail" sub={`Enviamos um link de confirmação para ${email}. Abra o link neste aparelho para ativar a conta e preencher seu cadastro.`}>
      <Link className="btn" href="/entrar">Ir para “Entrar”</Link>
    </Caixa>
  );
  return (
    <Caixa titulo="Criar conta de piloto" sub="Depois de confirmar o e-mail, você preenche seus dados e cadastra seus carros. A organização aprova o cadastro.">
      <form className="panel formpanel" noValidate onSubmit={async (e) => {
        e.preventDefault(); setErro('');
        if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
        if (senha !== senha2) return setErro('As senhas não conferem.');
        setOcupado(true);
        const { data, error } = await createClient().auth.signUp({
          email: email.trim(), password: senha,
          options: { emailRedirectTo: `${location.origin}/auth/callback?next=/meu-cadastro` },
        });
        setOcupado(false);
        if (error) return setErro(traduz(error.message));
        if (data.session) { location.href = '/meu-cadastro'; return; }
        setOk(true);
      }}>
        <label className="f">E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus /></label>
        <div className="fgrid">
          <label className="f">Senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" /></label>
          <label className="f">Repita a senha<input type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} autoComplete="new-password" /></label>
        </div>
        {erro && <div className="err">{erro}</div>}
        <button className="btn primary" disabled={ocupado}>{ocupado ? 'Criando…' : 'Criar conta'}</button>
        <div style={{ fontSize: 14 }}>Já tem conta? <Link href="/entrar">Entrar</Link></div>
      </form>
    </Caixa>
  );
}

export function RedefinirView() {
  const router = useRouter();
  const [logado, setLogado] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  useEffect(() => { createClient().auth.getUser().then(({ data }) => setLogado(!!data.user)); }, []);
  if (logado === null) return null;
  if (logado) return (
    <Caixa titulo="Nova senha">
      <form className="panel formpanel" noValidate onSubmit={async (e) => {
        e.preventDefault(); setErro('');
        if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
        const { error } = await createClient().auth.updateUser({ password: senha });
        if (error) return setErro(traduz(error.message));
        router.push('/meu-cadastro'); router.refresh();
      }}>
        <label className="f">Nova senha<input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" autoFocus /></label>
        {erro && <div className="err">{erro}</div>}
        <button className="btn primary">Salvar nova senha</button>
      </form>
    </Caixa>
  );
  return (
    <Caixa titulo="Esqueci a senha" sub="Informe seu e-mail. Enviamos um link para criar uma senha nova.">
      <form className="panel formpanel" noValidate onSubmit={async (e) => {
        e.preventDefault(); setErro(''); setMsg('');
        const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/callback?next=/redefinir-senha` });
        if (error) return setErro(traduz(error.message));
        setMsg('Pronto. Se o e-mail tiver conta, o link chega em instantes.');
      }}>
        <label className="f">E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus /></label>
        {erro && <div className="err">{erro}</div>}
        {msg && <div className="note ok">{msg}</div>}
        <button className="btn primary">Enviar link</button>
      </form>
    </Caixa>
  );
}
