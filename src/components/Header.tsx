'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from './App';
import { vals } from '@/lib/regras';

const TABS: [string, string][] = [['/', 'Eventos'], ['/ranking', 'Ranking'], ['/pilotos', 'Pilotos'], ['/carros', 'Carros']];

export function Header() {
  const { d, s } = useApp();
  const path = usePathname();
  const ativo = (h: string) => (h === '/' ? path === '/' || path.startsWith('/eventos') : path.startsWith(h));
  const pend = s.isAdmin ? vals(d.pil).filter((p) => p.status === 'pendente').length : 0;
  return (
    <header className="top">
      <div className="wrap">
        <Link className="brand" href="/" aria-label="Início">
          <span className="tree" aria-hidden="true"><i className="a" /><i className="a" /><i className="g" /></span>
          Placar de Arrancada
        </Link>
        <nav className="tabs">
          {TABS.map(([h, l]) => <Link key={h} href={h} aria-current={ativo(h) ? 'page' : undefined}>{l}</Link>)}
          {s.isAdmin && <Link href="/admin" aria-current={ativo('/admin') ? 'page' : undefined}>Admin{pend ? <span className="badge">{pend}</span> : null}</Link>}
        </nav>
        <div className="row" style={{ gap: 8 }}>
          {s.userId ? (
            <>
              <Link className="btn sm" href="/meu-cadastro">{s.meuPilotoId ? 'Meu cadastro' : 'Fazer meu cadastro'}</Link>
              <form action="/sair" method="post"><button className="btn sm ghost">Sair</button></form>
            </>
          ) : <Link className="btn sm primary" href="/entrar">Entrar</Link>}
        </div>
      </div>
    </header>
  );
}
