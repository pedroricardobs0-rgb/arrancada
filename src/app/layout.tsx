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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
