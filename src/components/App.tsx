'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Dados, Sessao } from '@/lib/types';

type Ctx = {
  d: Dados;
  s: Sessao;
  abrir: (n: ReactNode) => void;
  fechar: () => void;
  toast: (m: string) => void;
  atualizar: () => void;
  ano: number;
  setAno: (a: number) => void;
};
const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

export function AppProvider({ dados, sessao, children }: { dados: Dados; sessao: Sessao; children: ReactNode }) {
  const router = useRouter();
  const [modal, setModal] = useState<ReactNode>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ano, setAno] = useState(new Date().getFullYear());
  const toast = useCallback((m: string) => setMsg(m), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2800);
    return () => clearTimeout(t);
  }, [msg]);
  useEffect(() => {
    if (!modal) return;
    document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setModal(null);
    window.addEventListener('keydown', k);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k); };
  }, [modal]);
  const v: Ctx = {
    d: dados, s: sessao, abrir: setModal, fechar: () => setModal(null), toast,
    atualizar: () => router.refresh(), ano, setAno,
  };
  return (
    <C.Provider value={v}>
      {children}
      {modal}
      {msg && <div className="toast" role="status">{msg}</div>}
    </C.Provider>
  );
}
