import type { Metadata, Viewport } from 'next';
import './globals.css';
import { carregar } from '@/lib/data';
import { AppProvider } from '@/components/App';
import { Header } from '@/components/Header';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Placar de Arrancada', template: '%s · Placar de Arrancada' },
  description: 'Campeonato de arrancada: eventos, tempos de pista, pilotos, carros, mata-mata, Copa e ranking anual por categoria.',
};
export const viewport: Viewport = { themeColor: '#131211', viewportFit: 'cover', width: 'device-width', initialScale: 1 };

function ConfigIncompleta({ faltando }: { faltando: string[] }) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="wrap" style={{ paddingBlock: 48 }}>
          <div className="empty"><b>Configuração incompleta</b>
            <span>Faltam as variáveis de ambiente {faltando.join(' e ')} na Vercel. Adicione-as em Settings → Environment Variables e publique de novo (Redeploy).</span>
          </div>
        </main>
      </body>
    </html>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const faltando = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ].filter((x): x is string => !!x);
  if (faltando.length) return <ConfigIncompleta faltando={faltando} />;
  const { dados, sessao } = await carregar();
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" />
      </head>
      <body>
        <AppProvider dados={dados} sessao={sessao}>
          <Header />
          <main className="wrap">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
